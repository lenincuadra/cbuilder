import { promises as fs } from "node:fs";
import path from "node:path";
import type { LinkSpec } from "@/core/spec/types";

// Last-known-good spec on disk. Gitignored (/data/): the fallback used when the
// live fetch fails, so a CV can still be generated offline (after the first fetch).
const DEFAULT_CACHE_FILE = path.join(process.cwd(), "data", "spec-cache.json");

export async function readSpecCache(
  file: string = DEFAULT_CACHE_FILE,
): Promise<LinkSpec | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as LinkSpec;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    // A corrupt cache shouldn't crash generation — treat as "no cache".
    return null;
  }
}

export async function writeSpecCache(
  spec: LinkSpec,
  file: string = DEFAULT_CACHE_FILE,
): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}
