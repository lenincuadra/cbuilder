import { NextResponse } from "next/server";

// Calls the user's Google Apps Script webhook — never statically cached.
export const dynamic = "force-dynamic";

// Same shape as the delivery folder names (company_code); never trust the client.
const FOLDER_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
// Doc names are the generic delivery names (no tracking data); spaces allowed.
const DOC_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._ -]*$/;

/**
 * Forward a filled document to the user's Google Apps Script webhook, which
 * stores it in Drive as a native Google Doc under one folder per application:
 * `CV Builder/<appFolder>/<language>/<docName>`. Returns the Doc URL and the
 * application folder URL (shared across languages). The script URL and token
 * live server-side only. 501 = integration not configured (silent, client off).
 */
export async function POST(request: Request) {
  const url = process.env.GDOCS_SCRIPT_URL;
  const token = process.env.GDOCS_TOKEN;
  if (!url || !token) {
    return NextResponse.json({ error: "Google Docs integration not configured." }, { status: 501 });
  }

  const body = (await request.json()) as {
    appFolder?: unknown;
    language?: unknown;
    docxBase64?: unknown;
    docName?: unknown;
  };
  const appFolder = typeof body.appFolder === "string" ? body.appFolder : "";
  const language = body.language === "EN" || body.language === "ES" ? body.language : "";
  const docxBase64 = typeof body.docxBase64 === "string" ? body.docxBase64 : "";
  const docName = typeof body.docName === "string" ? body.docName : "";
  if (
    !FOLDER_RE.test(appFolder) ||
    appFolder.includes("..") ||
    !language ||
    docxBase64 === "" ||
    !DOC_NAME_RE.test(docName)
  ) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  try {
    // Apps Script web apps answer via a 302 to googleusercontent; fetch follows it.
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, appFolder, language, docxBase64, docName }),
    });
    const data = (await response.json()) as { url?: string; folderUrl?: string; error?: string };
    if (!response.ok || data.error || !data.url) {
      return NextResponse.json(
        { error: data.error ?? `Apps Script failed (HTTP ${response.status}).` },
        { status: 502 },
      );
    }
    return NextResponse.json({ url: data.url, folderUrl: data.folderUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Apps Script unreachable." },
      { status: 502 },
    );
  }
}
