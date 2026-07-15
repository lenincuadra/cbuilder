# Claude.ai replica of the AI pipeline (zero API cost)

Reproduces `/api/ai/cover-letter` and `/api/ai/screening-answer` inside
claude.ai, on the subscription (no API credit consumed). Two setups that
complement each other — do the Project first; add the Skill if you want the
one-command flow:

| Setup | What it gives you | Effort |
|---|---|---|
| **Project** (below) | A dedicated space where every chat already knows your profile + voice rules. Paste the application details, get the draft. | ~3 min, no files to maintain beyond re-uploading the knowledge when the CV changes |
| **Skill** (below) | `/`-invokable command usable from ANY chat (inside or outside the Project), with the same rules baked in. | ~5 min; re-zip when the CV changes |

Both consume the same two source files, which already live in this repo /
your machine — **never edit the copies, re-copy from the source**:

- `data/profile/background.md` — the profile brief (tracked in git; the same
  file the app's API routes read).
- `data/spec-cache.json` — the portfolio's focus profiles + case studies
  (gitignored but always present locally; the app refreshes it on every spec
  fetch).

## Setup 1 — Project

1. claude.ai → **Projects → Create project** → name it `cv-builder AI`.
2. **Project knowledge** → upload `data/profile/background.md` and
   `data/spec-cache.json`.
3. **Set custom instructions** → paste the full content of
   [`project-instructions.md`](project-instructions.md).
4. Done. In any chat inside the project, write for example:

   ```
   Cover letter EN — company: Acme, role: Senior Product Designer,
   focus: ai, who: Jane Doe.
   Posting context: <paste requirements or leave out>
   ```

   or

   ```
   Screening answer — company: Acme, role: Senior Product Designer, focus: payments.
   Question: "What project are you most proud of?"
   ```

5. Copy the draft back into cbuilder (the letter body textarea in the wizard,
   or the answer field in the Preguntas tab). Everything stays editable there,
   same as an API-generated draft.

## Setup 2 — Skill

1. Copy the two source files into the skill folder (they are inputs, not
   duplicates — always re-copy, never hand-edit):

   ```sh
   cp data/profile/background.md docs/claude-ai/skill/cv-materials/
   cp data/spec-cache.json docs/claude-ai/skill/cv-materials/
   ```

2. Zip the folder: `cd docs/claude-ai/skill && zip -r cv-materials.zip cv-materials`
3. claude.ai → **Settings → Capabilities → Skills → Upload skill** → pick the zip.
4. In any chat: invoke `cv-materials` and give it the same inputs as the
   Project examples above.

> The two copied files and the zip are gitignored (see `.gitignore`) — only
> `SKILL.md` is tracked. This avoids committing a second copy of the profile
> that would drift from the source.

## Keeping it in sync

When the master CV changes materially (new role, new metric), the app-side
pack gets re-extracted (`data/profile/background.md`) — re-upload it to the
Project knowledge and re-zip the Skill. `spec-cache.json` refreshes itself
locally; re-upload it whenever the portfolio's cases/profiles change.

## When to use which pipeline

- **In-app (API)**: the default day-to-day path — one click, auto-saved as
  draft, tracked per application.
- **Claude.ai (this)**: free experimentation (iterating on tone, trying many
  variants), and the fallback if API credit runs out mid-application — the
  cost never blocks a submission.
