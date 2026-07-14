import type { NextConfig } from "next";
import { execSync } from "node:child_process";

function resolveGitSha(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA;
  }
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_GIT_SHA: resolveGitSha(),
  },
};

export default nextConfig;
