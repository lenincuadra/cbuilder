import { promises as fs } from "node:fs";
import path from "node:path";

// Static AI context pack. Tracked in git (exception to /data/'s gitignore —
// it's Lenin's own public CV/portfolio content, not registry data) so it
// ships to prod. See data/profile/background.md for what it contains.
const DEFAULT_BACKGROUND_FILE = path.join(process.cwd(), "data", "profile", "background.md");

/** Reads the background brief; null if it hasn't been set up yet. */
export async function readProfileBackground(
  file: string = DEFAULT_BACKGROUND_FILE,
): Promise<string | null> {
  try {
    return await fs.readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    return null;
  }
}
