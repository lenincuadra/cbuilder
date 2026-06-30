# Design system conventions (cv-builder)

Convenciones de UI a seguir al construir componentes. Referenciado desde `CLAUDE.md`
para que se detecte automáticamente cuando haga falta.

## Drawers / paneles laterales
- **Desktop: right-drawer (panel a la derecha). Mobile: bottom drawer (sube desde abajo).**
- Implementación: shadcn `Drawer` (vaul) con `direction` responsive:
  `direction={isMobile ? "bottom" : "right"}`, usando el hook `useIsMobile()`
  (`ui/useIsMobile.ts`, breakpoint 768px).
- Referencia: `ui/notes/NotesDrawer.tsx`.

## Contenido Markdown
- Render con `react-markdown` + `remark-gfm`, estilado con Tailwind Typography
  (`prose prose-sm dark:prose-invert`). Sin HTML crudo (seguro por default).
- Referencia: `ui/notes/MarkdownView.tsx`.

## Tabla del registro
- Tabla plana, 7 columnas, scroll horizontal propio (no se ocultan ni reducen columnas).
- Orden de columnas: `Código · Empresa · Rol · Canal · Fecha · Estado · Notas`
  (Notas siempre al final).
- Edición inline: `Estado` como badge-toggle; `Notas` abre el drawer con editor Markdown.
