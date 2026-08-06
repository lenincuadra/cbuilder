import packageJson from "../package.json";

/** Bump with package.json — see docs/versioning.md §1. */
export const APP_VERSION = packageJson.version;

/** Bump when supabase/schema.sql changes — see docs/versioning.md §3. Mirrors the
 * schema_version header in supabase/schema.sql (13 as of registry.reach). */
export const SCHEMA_VERSION = 13;

/** Highest CV master vNN in assets/ — see docs/versioning.md §2. */
export const MASTER_VERSION = 15;

const gitSha = process.env.NEXT_PUBLIC_GIT_SHA?.slice(0, 7) || "local";

/** Compact label for the app header and debugging. */
export function formatAppVersionLabel(): string {
  return `v${APP_VERSION} · ${gitSha} · masters v${MASTER_VERSION} · schema v${SCHEMA_VERSION}`;
}
