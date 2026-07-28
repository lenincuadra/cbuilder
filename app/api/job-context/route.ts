import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { buildJdParsePrompt, parseJdResponse } from "@/core/jdParse/prompt";
import type { ParsedJd } from "@/core/jdParse/types";

// Fetches an external URL live — never statically cached.
export const dynamic = "force-dynamic";

const LD_JSON_RE = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const MAX_CONTEXT_LENGTH = 4000;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Depth-first search for a JobPosting node (schema.org) in a JSON-LD tree. */
function findJobPosting(value: unknown): { description?: string } | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJobPosting(item);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const type = obj["@type"];
    const isJobPosting = type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"));
    if (isJobPosting) {
      return { description: typeof obj.description === "string" ? obj.description : undefined };
    }
    if ("@graph" in obj) return findJobPosting(obj["@graph"]);
  }
  return null;
}

/**
 * Fallback for the other common way to mark up a JobPosting: schema.org
 * Microdata (`itemscope itemtype=".../JobPosting"` + `itemprop="description"`
 * as plain HTML attributes, no JSON-LD block at all — some regional job
 * boards use this instead). Regex can't safely match nested HTML by pairing
 * open/close tags, so this walks forward counting depth for the *specific*
 * tag that carries `itemprop="description"`.
 */
function findMicrodataDescription(html: string): string | null {
  const propMatch = /<([a-z][a-z0-9]*)\b[^>]*\bitemprop=["']description["'][^>]*>/i.exec(html);
  if (!propMatch) return null;
  const tag = propMatch[1];
  const start = propMatch.index + propMatch[0].length;
  const tagRe = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
  tagRe.lastIndex = start;
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html))) {
    depth += match[1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(start, match.index);
  }
  return null;
}

/**
 * Best-effort structured parse of a job description via Claude Haiku — runs
 * after the raw text is extracted from the URL. Gracefully skipped when the
 * API key is absent (same contract as all AI features).
 */
async function tryParseJd(text: string, apiKey: string | undefined): Promise<ParsedJd | null> {
  if (!apiKey || text.length < 20) return null;
  try {
    const client = new Anthropic({ apiKey });
    const { system, user } = buildJdParsePrompt(text);
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system,
      messages: [{ role: "user", content: user }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "";
    return parseJdResponse(raw);
  } catch {
    return null;
  }
}

/**
 * Best-effort extraction of a job posting's description from its JobPosting
 * markup — tries JSON-LD first (schema.org, most large ATS platforms emit
 * this for Google Jobs), then schema.org Microdata (`itemprop="description"`,
 * used by some regional job boards instead). Both are server-rendered, no JS
 * execution needed. No headless browser: doesn't solve every posting
 * (bot-walled or JS-only pages, e.g. LinkedIn's search views, come back
 * empty — no markup of either kind exists in the raw HTML), but
 * needs no new infra and never blocks — always 200, `context: null` on any
 * failure (bad URL, unreachable, no JobPosting schema found).
 *
 * Response: `{ context: string | null; parsed: ParsedJd | null }`.
 * When `context` is found and the API key is set, `parsed` holds the
 * AI-extracted structured JD; otherwise `parsed` is null.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as { url?: unknown };
  const url = typeof body.url === "string" ? body.url.trim() : "";

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ context: null, parsed: null });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ context: null, parsed: null });
  }

  try {
    const response = await fetch(parsed, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; cv-builder)" },
    });
    if (!response.ok) return NextResponse.json({ context: null, parsed: null });
    const html = await response.text();
    for (const match of html.matchAll(LD_JSON_RE)) {
      try {
        const posting = findJobPosting(JSON.parse(match[1]));
        const text = posting?.description ? stripHtml(posting.description) : "";
        if (text.length > 20) {
          const context = text.slice(0, MAX_CONTEXT_LENGTH);
          const parsedJd = await tryParseJd(context, process.env.ANTHROPIC_API_KEY);
          return NextResponse.json({ context, parsed: parsedJd });
        }
      } catch {
        // Not valid/relevant JSON in this block — try the next <script> tag.
      }
    }
    const microdata = findMicrodataDescription(html);
    const microdataText = microdata ? stripHtml(microdata) : "";
    if (microdataText.length > 20) {
      const context = microdataText.slice(0, MAX_CONTEXT_LENGTH);
      const parsedJd = await tryParseJd(context, process.env.ANTHROPIC_API_KEY);
      return NextResponse.json({ context, parsed: parsedJd });
    }
    return NextResponse.json({ context: null, parsed: null });
  } catch {
    return NextResponse.json({ context: null, parsed: null });
  }
}
