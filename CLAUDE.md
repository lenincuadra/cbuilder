# cv-builder app

App web que genera el CV de Lenin Cuadra con tracking, fase 2 (app real).

## Fuente de verdad
- La spec completa del producto está en `docs/cv-builder-product-definition.md`. Leela antes de tomar decisiones de producto o arquitectura. Si algo de lo que te pido entra en conflicto con ese documento, preguntá antes de decidir.
- El pedido concreto de esta fase está en `docs/claude-code-prompt-fase2.md`.
- Los CV master están en `assets/` (EN y ES). No los modifiques salvo que se pida explícitamente.

## Reglas inviolables (no alucinar sobre esto)
- El código de tracking es `MMDD` + una letra de `abcdefghjkmnpqrstuvwxyz` (sin i, l, o) + un dígito de `23456789` (sin 0, 1). Ej: `0628r4`.
- Reservados, nunca generarlos: `me`, `li-profile`, `organic`, `li-cv`.
- Chequear colisiones contra los códigos del registro antes de asignar uno.
- El output del CV es `.docx` editable (no PDF), rellenando el master por reemplazo del placeholder `ref=li-cv`.
- Link de portfolio va directo; SOLO el de LinkedIn pasa por `go.html`. No rutear el portfolio por `go.html`.
- El nombre del archivo entregable es siempre `Lenin_Cuadra_CV.docx`, sin datos de tracking. Todo lo identificatorio va en el nombre de la carpeta `[IDIOMA]_[empresa]_[código]`.
- Separación estricta `core/` (lógica pura) y `ui/` (React). El storage va detrás de una interfaz, con implementación local ahora y puerta abierta a Supabase.

## Stack
Next.js, Tailwind CSS, shadcn/ui. Deploy a Vercel.