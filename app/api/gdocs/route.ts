import { NextResponse } from "next/server";

// Calls the user's Google Apps Script webhook — never statically cached.
export const dynamic = "force-dynamic";

// Same shape as the delivery folder names (EN_company_code); never trust the client.
const FOLDER_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Forward a filled CV to the user's Google Apps Script webhook, which stores
 * it in Drive as a native Google Doc (CV Builder/<folder>/Lenin_Cuadra_CV).
 * The script URL and token live server-side only. 501 = integration not
 * configured (the client treats it as "feature off", silently).
 */
export async function POST(request: Request) {
  const url = process.env.GDOCS_SCRIPT_URL;
  const token = process.env.GDOCS_TOKEN;
  if (!url || !token) {
    return NextResponse.json({ error: "Google Docs integration not configured." }, { status: 501 });
  }

  const body = (await request.json()) as { folder?: unknown; docxBase64?: unknown };
  const folder = typeof body.folder === "string" ? body.folder : "";
  const docxBase64 = typeof body.docxBase64 === "string" ? body.docxBase64 : "";
  if (!FOLDER_RE.test(folder) || folder.includes("..") || docxBase64 === "") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  try {
    // Apps Script web apps answer via a 302 to googleusercontent; fetch follows it.
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, folder, docxBase64 }),
    });
    const data = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || data.error || !data.url) {
      return NextResponse.json(
        { error: data.error ?? `Apps Script failed (HTTP ${response.status}).` },
        { status: 502 },
      );
    }
    return NextResponse.json({ url: data.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Apps Script unreachable." },
      { status: 502 },
    );
  }
}
