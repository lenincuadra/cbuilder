# cv-builder app

App web que genera el CV de Lenin Cuadra con tracking, fase 2 (app real).

## Fuente de verdad
- La spec completa del producto está en `docs/cv-builder-product-definition.md`. Leela antes de tomar decisiones de producto o arquitectura. Si algo de lo que te pido entra en conflicto con ese documento, preguntá antes de decidir.
- El pedido concreto de esta fase está en `docs/claude-code-prompt-fase2.md`.
- Los CV master están en `assets/` (EN y ES). No los modifiques salvo que se pida explícitamente.

## Reglas inviolables (no alucinar sobre esto)
- El código de tracking es `MMDD` + una letra de `abcdefghjkmnpqrstuvwxyz` (sin i, l, o) + un dígito de `23456789` (sin 0, 1). Ej: `0628r4`.
- Reservados, nunca generarlos: `me`, `li-profile`, `organic`, `li-cv`, `web-cv`. (`web-cv` viene del registro vivo, que es la fuente de verdad; no estaba en la spec original.)
- Chequear colisiones contra los códigos del registro antes de asignar uno.
- El output del CV es `.docx` editable (no PDF), rellenando el master por reemplazo del placeholder `ref=li-cv`.
- Link de portfolio va directo; SOLO el de LinkedIn pasa por `go.html`. No rutear el portfolio por `go.html`.
- El nombre del archivo entregable es siempre `Lenin_Cuadra_CV.docx`, sin datos de tracking. Todo lo identificatorio va en el nombre de la carpeta `[IDIOMA]_[empresa]_[código]`.
- Separación estricta `core/` (lógica pura) y `ui/` (React). El storage va detrás de la interfaz `RegistryStore` (`core/registry/types.ts`). Implementaciones en `lib/storage/`: `supabaseStore.ts` (durable, futuro), `fileStore.ts` (server, escribe `data/registry.json` local, default actual vía API routes + `apiStore.ts` en el cliente) y `localStorageStore.ts` (alternativa por-browser, no usada por default). La factory `lib/storage/index.ts` elige Supabase si están las env vars `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`, si no usa el file store local.
- **Privacidad: el repo es PÚBLICO.** La data del registro es privada (a quién aplicó Lenin). Nunca commitear data real: `data/` y `docs/*tracking-registry*.md` están gitignoreados. El file store local persiste en `data/registry.json` (en disco, fuera de git). Para deploy/durabilidad compartida, Supabase (`docs/supabase-setup.md`, `supabase/schema.sql`).

## Convenciones de código
- **Todo el código va en inglés**: identificadores, comentarios, nombres de archivo, docstrings y mensajes de commit. Sin español en el código.
- Excepción: los **textos de UI que ve el usuario** van como los define la spec (español): labels de inputs, badges (`Activo`/`Rechazado`), placeholders (`sin notas`), opciones de canal, etc. Son contenido de producto, no código.

## Stack
Next.js, Tailwind CSS, shadcn/ui. Deploy a Vercel.