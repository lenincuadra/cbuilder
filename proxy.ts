import { NextResponse, type NextRequest } from "next/server";

/**
 * Basic-auth gate for the whole app (Next 16's `proxy` convention, formerly
 * `middleware`). The registry is private, so a public deployment must be behind
 * a credential. Set BASIC_AUTH_USER + BASIC_AUTH_PASSWORD (both) to enable;
 * unset (local dev) leaves the app open. Runs on the Edge runtime — `atob` is
 * available there. See docs/deploy.md.
 */
export function proxy(request: NextRequest): NextResponse {
  const user = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;
  if (!user || !password) return NextResponse.next(); // no gate configured (dev)

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const [givenUser, givenPassword] = atob(header.slice(6)).split(":");
      if (givenUser === user && givenPassword === password) {
        return NextResponse.next();
      }
    } catch {
      // malformed header → fall through to the 401
    }
  }

  return new NextResponse("Autenticación requerida.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="cv-builder"' },
  });
}

// Gate everything except Next's static assets and the favicon.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
