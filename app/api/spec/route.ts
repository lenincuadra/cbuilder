import { NextResponse } from "next/server";
import { assertLinkSpec } from "@/core/spec/validate";
import { readSpecCache, writeSpecCache } from "@/lib/storage/specCache";

// Fetches the network + reads/writes a local file — never statically cached.
export const dynamic = "force-dynamic";

// The ONE thing cbuilder hardcodes about the portfolio: where the spec lives.
// Everything else flows from the spec. Overridable for tests/local.
const SPEC_URL = process.env.SPEC_URL ?? "https://lenincuadra.com/link-spec.json";

/**
 * The link contract, fetched live from the portfolio with a durable fallback:
 * - live fetch OK  → validate, cache to disk, return { source: "live" }
 * - live fetch bad → return the last cached spec { source: "cache" }
 * - neither        → 503 with a clear "necesitás conexión la primera vez" error
 * The client checks `spec.version` and warns if it's ahead of what we support.
 */
export async function GET() {
  try {
    const response = await fetch(SPEC_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const spec = await response.json();
    assertLinkSpec(spec);
    await writeSpecCache(spec).catch(() => {
      // Caching is best-effort; a write failure shouldn't fail the response.
    });
    return NextResponse.json({ spec, source: "live" });
  } catch (liveError) {
    const cached = await readSpecCache();
    if (cached) {
      return NextResponse.json({ spec: cached, source: "cache" });
    }
    return NextResponse.json(
      {
        error:
          "No se pudo leer el link-spec del portfolio y no hay copia local. " +
          "Necesitás conexión la primera vez. Detalle: " +
          (liveError instanceof Error ? liveError.message : "fetch falló"),
      },
      { status: 503 },
    );
  }
}
