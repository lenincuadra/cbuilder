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
- **B — código + links desde el spec (cortos)** — pendiente
- **C — masters a links cortos (v16)** — pendiente
- **D — perfiles + preview desde el spec** — pendiente
- **E — persistencia + export CSV/markdown** — pendiente
- **F — prueba E2E** — pendiente
- **G — firma como link estable** — pendiente
