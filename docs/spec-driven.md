# Spec-driven links (cbuilder ← link-spec.json)

cbuilder no conoce nada del portfolio **salvo la URL del spec**. Al generar un CV,
lee `link-spec.json` del portfolio y de ahí saca **todo**: dominio (`base`),
formato del código, reservados, templates de links y perfiles de personalización.
Dominio, formatos o perfiles nuevos fluyen solos, sin tocar código de cbuilder.

- **Contrato**: `https://lenincuadra.com/link-spec.json` (lo genera el portfolio;
  su doc completa es `docs/personalization.md` del repo del portfolio).
- **Regla de oro**: cbuilder consume **datos, no lógica** — lee el resultado ya
  decidido por el portfolio, no replica su lógica.
- **Links cortos**: el CV usa los templates cortos del spec
  (`{base}r/{code}P{focusLetter}`, ej. `lenincuadra.com/r/0705q4Pp`). Estos
  redirigen por el 404-router → `go.html`, que registra la visita y setea la
  personalización. Por eso **el portfolio ya no va "directo"** (regla vieja
  obsoleta): con links cortos + personalización, el paso por `go.html` es
  inherente.

## Estado por fases

- **A — fetch + cache + fallback + version** ✅
  - `GET /api/spec` fetchea el spec vivo; **cachea** en `data/spec-cache.json`
    (gitignoreado, escritura atómica); si el fetch falla usa la **copia local**;
    si nunca hubo, 503 con mensaje claro ("necesitás conexión la primera vez").
  - Cliente `lib/spec.ts` + hook `ui/useSpec.ts`. Si `spec.version` es mayor a
    `SUPPORTED_SPEC_VERSION` (`core/spec/types.ts`), warning y uso best-effort.
  - Tipos/validación en `core/spec/`. El **único** valor hardcodeado es
    `SPEC_URL` (overridable por env), que es lo que el contrato permite.
- **B — código + links desde el spec (cortos)** ✅
  - `core/spec/code.ts` (`generateCode` desde `spec.codeFormat`/`reservedRefs`) y
    `core/spec/links.ts` (`buildTrackedLinks` con los templates **cortos** +
    `focusLetters`). Jubilados `PORTFOLIO_BASE`/`LINK_ID`/`trackedLinks` y
    `core/tracking.ts`. `stableLinkUrl` toma el `base` del spec.
  - `generateCv` recibe el `spec` en sus deps; arma los links una vez y los
    hornea en el `.docx` (**sin re-editar los masters**: `fillMaster` reemplaza
    los 3 targets marcados con `ref=li-cv`) y los persiste en `row.links`.
  - UI cableada: `page`/`GenerateCard`/`Wizard` (preview code), `TrackedLinks`
    (muestra `row.links`, o reconstruye del spec para filas viejas),
    `StableLinksCard` (base del spec). Columna `links` en Supabase.
  - Verificado E2E: CV generado con `Target="…/r/<code>P|L|G"`, 0 `ref=li-cv`.
- **C — masters** — **absorbido en B**: `fillMaster` reemplaza el target completo,
  así los masters v15 quedan como están (no hizo falta v16).
- **D — perfiles + preview desde el spec** ✅
  - El selector de foco lee `spec.profiles` (id + label ES) en vez del espejo
    manual; se **borró `core/links.ts`** (`FOCUS_PROFILES`/`focusLabel`/
    `FocusProfileId`). `focus` es ahora un `string` (id del perfil). Helpers en
    `core/spec/profiles.ts` (`profileLabel`/`profileIds`/`profilePreview`).
  - **Preview (Uso A)**: al elegir un perfil, el paso muestra lo que verá quien
    abra el link — el case destacado (`cases[featured]`) + las `proofs`, en ES,
    todo del spec (verificado: cambia por perfil).
  - `FocusIcon` mapea los ids conocidos con un icono default (`Target`) para
    perfiles nuevos. El spec se carga **una vez** vía `SpecProvider` (contexto),
    así la tabla no lo re-fetchea por fila.
- **E — persistencia + export CSV/markdown** — pendiente
- **F — prueba E2E** — pendiente
- **G — firma como link estable** — pendiente
