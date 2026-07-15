# cv-builder app

App web que genera el CV de Lenin Cuadra con tracking, fase 2 (app real).

## Fuente de verdad
- La spec original del producto está en `docs/cv-builder-product-definition.md`. Es la spec histórica; algunas reglas se actualizaron después (ver `docs/decisions.md`). Si algo entra en conflicto, priorizá `docs/decisions.md` y preguntá ante la duda.
- **`docs/architecture.md`**: mapa del "qué/cómo" (pipeline de generación, capas de storage, rutas API, modelo de tracking). Leelo para orientarte antes de tocar el flujo de generación, storage o sinks; actualizalo si agregás/cambiás una pieza de la arquitectura.
- **`docs/decisions.md`**: log de decisiones (el "por qué", trade-offs y reglas que cambiaron). Leelo antes de tomar/revertir decisiones de producto o arquitectura, y agregá una entrada cuando tomes una decisión no obvia.
- **`docs/flows.md`**: catálogo único de los flows a altura de uso (qué hace el usuario, paso a paso, en tablas). Linkea a `architecture.md` para el detalle de sistema — no duplica. Al agregar/cambiar un flow visible al usuario, actualizá su tabla ahí.
- El pedido concreto de esta fase está en `docs/claude-code-prompt-fase2.md`.
- Los CV master están en `assets/` (EN y ES). No los modifiques salvo que se pida explícitamente.

## Reglas inviolables (no alucinar sobre esto)
- **Spec-driven**: cbuilder no conoce nada del portfolio salvo la URL del spec (`link-spec.json`). Dominio, formato del código, reservados, templates de links y perfiles salen del spec (fetch + cache + fallback, ver `docs/spec-driven.md`). El único valor hardcodeado es `SPEC_URL`.
- El código de tracking es `MMDD` + una letra de `abcdefghjkmnpqrstuvwxyz` (sin i, l, o) + un dígito de `23456789` (sin 0, 1). Ej: `0628r4`. Debe cumplir `spec.tracking.codeFormat` y no colisionar con el registro ni con `spec.tracking.reservedRefs`. Generación en `core/spec/code.ts`.
- El output del CV es `.docx` editable (no PDF). `fillMaster` (`core/docx.ts`) reemplaza los **3 targets** marcados con `ref=li-cv` en el master por los links ya armados (no toca el archivo master).
- Cada link del CV lleva un identificador (portfolio `P` / LinkedIn `L` / GitHub `G`) horneado en el template del spec. Los links son **cortos** (`{base}r/{code}P{focusLetter}`, ej. `lenincuadra.com/r/0628r4Pp`) y se arman con `buildTrackedLinks` (`core/spec/links.ts`) desde el spec.
- Los links cortos redirigen por el 404-router → `go.html` (que registra la visita y setea la personalización). Por eso **el portfolio ya no va "directo"** (la regla vieja quedó obsoleta): con links cortos + personalización, el paso por `go.html` es inherente.
- El nombre del archivo entregable es siempre `Lenin_Cuadra_CV.docx` (y `Lenin_Cuadra_Cover_Letter.docx` si la aplicación lleva carta), sin datos de tracking. Todo lo identificatorio va en el nombre de la carpeta `[IDIOMA]_[empresa]_[código]`.
- Separación estricta `core/` (lógica pura) y `ui/` (React). El storage va detrás de la interfaz `RegistryStore` (`core/registry/types.ts`). Implementaciones en `lib/storage/`: `supabaseStore.ts` (durable, futuro), `fileStore.ts` (server, escribe `data/registry.json` local, default actual vía API routes + `apiStore.ts` en el cliente) y `localStorageStore.ts` (alternativa por-browser, no usada por default). La factory `lib/storage/index.ts` elige Supabase si están las env vars `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`, si no usa el file store local.
- **Privacidad: el repo es PÚBLICO.** La data del registro es privada (a quién aplicó Lenin). Nunca commitear data real: `data/` y `docs/*tracking-registry*.md` están gitignoreados. El file store local persiste en `data/registry.json` (en disco, fuera de git). Para deploy/durabilidad compartida, Supabase (`docs/supabase-setup.md`, `supabase/schema.sql`).

## Convenciones de código
- **Todo el código va en inglés**: identificadores, comentarios, nombres de archivo, docstrings y mensajes de commit. Sin español en el código.
- Excepción: los **textos de UI que ve el usuario** van como los define la spec (español): labels de inputs, badges (`Activo`/`Rechazado`), placeholders (`sin notas`), opciones de canal, etc. Son contenido de producto, no código.

## Diseño / DS
- Convenciones de UI en `docs/DESIGN.md` (drawers responsive, Markdown, tabla del registro, empty states). Leelo antes de construir/ajustar componentes de UI.
- **Regla de componentes**: antes de crear UI, (1) usar el componente del DS si existe (`components/ui/`, instalar con `npx shadcn add` el que falte); (2) si no existe el específico, preguntar por un suplente del DS; (3) recién ahí proponer custom y pedir confirmación. Nunca reimplementar a mano algo que el DS ya tiene (ej. Switch).
- Reglas clave: drawers = right en desktop / bottom en mobile; tabla `table-fixed` sin scroll horizontal salvo <640px (columnas truncan); todas las vistas comparten la misma tabla. Filtros: archivado (Vigentes/Archivado) + estado (Todos/Borrador/Activo/Rechazado), ortogonales. "Vigentes" (no archivadas) ≠ estado "Activo". "Borrador" es system-derived (mirror de `cvPending`), no togglea manualmente — ver `docs/decisions.md` → "Pipeline AI".

## Workflow (ambientes)
- `main` = prod (auto-deploy a cbuilder.vercel.app). **No commitear directo a `main`**: feature branch → push → Vercel Preview (QA visual; sin Supabase — file store efímero, no toca data de prod) → merge a `main` = deploy. Detalle en `docs/deploy.md` → "Ambientes".
- Dev local corre con file stores (`data/*.json`): `.env.local` **no** lleva vars de Supabase — así dev nunca toca data de prod.
- El backlog vive en `TODO.md` (gitignoreado — puede nombrar empresas). No usar GitHub Issues (repo público → issues públicos; ver `docs/decisions.md`).

## Stack
Next.js, Tailwind CSS, shadcn/ui. Deploy a Vercel.