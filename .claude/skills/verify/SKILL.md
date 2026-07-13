---
name: verify
description: How to build, run and drive cv-builder to verify a change end-to-end (dev server, Playwright recipe, data hygiene, cleanup).
---

# Verifying cv-builder changes

## Build / launch

- `npm test` (vitest) and `npm run build` are CI checks — the real surface is
  the web app.
- Dev server: `npm run dev` (port 3000). **Next 16 refuses a second dev server
  for the same dir** — if one is already running (check
  `lsof -nP -iTCP:3000 -sTCP:LISTEN`), drive that one: it hot-reloads the
  working tree, so it already serves your changes.

## Data hygiene (important)

- Local dev uses the user's REAL data: `data/registry.json` (private
  applications) and `data/cvs/`. Create test rows with obviously fake company
  names, then clean up: `curl -X DELETE localhost:3000/api/registry/<code>`
  and `rm -rf data/cvs/<folder>`.
- `.env.local` may have `GDOCS_*` set — a real generation then creates REAL
  Google Docs in the user's Drive. The app cannot delete them; capture
  `driveFolder` from the row before deleting it and tell the user to remove
  the folder manually (or unset the env vars first and restart the server).

## Driving the UI (Playwright)

- Playwright isn't a project dep. A working copy lives in the npx cache:
  `find ~/.npm/_npx -maxdepth 3 -name playwright -type d` → import
  `<that-path>/index.mjs` directly from a scratchpad `.mjs` script
  (NODE_PATH does not work for ESM).
- Selector gotchas:
  - "Empresa" label is ambiguous (table cells carry aria-labels) — use
    `#company`, `#email`, etc.
  - `IconSelect` dropdowns (Canal, Foco…) are DS DropdownMenus: options are
    `getByRole("menuitemcheckbox", { name: ... })`, not `option`.
  - Toasts: `[data-sonner-toast]` filtered by text.
  - Wizard steps: wait on `getByText("Paso N de 5")`.
  - Generation fires a browser download — grab `page.waitForEvent("download")`
    before clicking Generar.

## Flows worth driving

- Wizard: card "Generar un CV" → step 1 empresa → step 2 opcionales (fork
  "Guardar sin CV" lives here; canal Email + empty email disables both exits)
  → 3 idioma/foco → 4 carta → 5 confirmar (code preview) → Generar.
- Pending flow: row shows muted FileClock in Seguimiento; drawer → card
  Entrega → "Generar CV" opens the deferred wizard at step 3 with the
  reserved code.
- Delivery archive: `GET /api/cvs/<folder>/<file>.docx` (200 attachment),
  invalid paths → 400, missing → 404; files land in `data/cvs/<folder>/`.
