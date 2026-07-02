# Design system conventions (cv-builder)

Convenciones de UI a seguir al construir componentes. Referenciado desde `CLAUDE.md`
para que se detecte automáticamente cuando haga falta. El "por qué" de las decisiones
de producto/arquitectura va en `docs/decisions.md`.

## Uso de componentes (regla — siempre)
Antes de crear cualquier componente o comportamiento de UI:
1. **Buscar si el componente específico ya existe en el DS** (shadcn, en `components/ui/`).
   Si existe, usarlo — nunca reimplementarlo a mano (ej. `Switch`, `Tabs`, `Empty`, `Item`,
   `Drawer`, `Badge`, `Select`). Instalar el que falte con `npx shadcn add <comp>`.
2. Si **no existe el específico**, **preguntar** si está bien usar un componente X o Y del
   DS como **suplente**.
3. Si tampoco hay suplente razonable, **proponer** un componente/comportamiento custom y
   pedir confirmación (con ideas) **antes** de construirlo. No crear custom sin avisar.

## Drawers / paneles laterales
- **Desktop: right-drawer (panel a la derecha). Mobile: bottom drawer (sube desde abajo,
  casi hasta el borde superior).**
- Implementación: shadcn `Drawer` (vaul) con `direction` responsive:
  `direction={isMobile ? "bottom" : "right"}`, usando el hook `useIsMobile()`
  (`ui/useIsMobile.ts`, breakpoint 768px).
- Referencia: `ui/detail/RowDetailDrawer.tsx`.

## Contenido Markdown
- Render con `react-markdown` + `remark-gfm`, estilado con Tailwind Typography
  (`prose prose-sm dark:prose-invert`). Sin HTML crudo (seguro por default).
- Referencia: `ui/detail/MarkdownView.tsx`.

## Empty states
- Usar el componente `Empty` de shadcn (`components/ui/empty.tsx`) en todos los vacíos
  (registro vacío, actualizaciones vacías, etc.), no texto suelto.

## Inputs
- Usar `InputGroup` (`components/ui/input-group.tsx`) para inputs con addon (íconos,
  botones). Campos **read-only/disabled** en un form: `InputGroup` con el valor + un
  `Lock` en `InputGroupAddon align="inline-end"`, y el "por qué no editable" como
  **tooltip** (no texto inline). Ref: `ui/detail/RowEditForm.tsx` (idioma).
- Mostrar el idioma con `languageLabel()` — "Ambos" se muestra como "EN · ES", no la palabra.

## Wizard
- **Todo campo que se rellena en el wizard se muestra en el review final** (`StepConfirm`).
  Al agregar un input al wizard, agregarlo también al resumen del último paso (los opcionales
  vacíos se omiten).
- Requeridos condicionales: si un canal/opción exige un dato (ej. canal Email → email),
  el paso no avanza hasta completarlo.

## Tabla del registro
- Tabla plana, 7 columnas. Orden: `Código · Empresa · Rol · Canal · Fecha · Estado · Seguimiento`
  (Seguimiento siempre al final).
- **Sin scroll horizontal en resoluciones normales.** Usa `table-fixed` con anchos por
  columna; las celdas largas (Empresa, Rol, Canal) **truncan**. `Rol` va angosto (~21%).
  Solo **por debajo de 640px (sm)** se reactiva el scroll horizontal (`min-w`) para que
  las columnas no queden ilegibles. (Reemplaza la regla vieja "si no entran, scroll".)
- **Filtros (dos dimensiones ortogonales, arriba de la tabla, con `SegmentedControl`)**:
  (1) archivado — **Vigentes** (no archivadas) / **Archivado**; (2) estado — Todos / Activo /
  Rechazado. Se combinan. Ojo con la semántica: "Vigentes" ≠ estado "Activo" (por eso no se
  llama "Activas").
- **Todas las vistas comparten exactamente la misma tabla**: misma estructura, columnas y
  comportamiento; lo único que cambia es qué filas se muestran (filtradas por `archived` +
  `status` en la página). No duplicar componentes ni variar columnas entre vistas.
- **Fila clickeable**: abre el panel de detalle en el **tab por defecto según contenido**
  (regla genérica): si solo hay actualizaciones → Actualizaciones; si no (hay notas, o
  ambas, o ninguna) → Notas. Click en un ícono de Seguimiento abre su tab explícito
  (`notas` / `updates`). El badge de Estado y los íconos hacen `stopPropagation`; el resto
  de la celda cae al click del row.
- Seguimiento: el panel tiene tabs **Notas** (markdown) y **Actualizaciones** (timeline,
  tope 12, más reciente abajo). El `TabsList` es full-width. Cada actualización es un item
  **editable** (texto, fecha/hora, flag). El **flag 🚩** marca algo por hacer/importante:
  se muestra en el item y, en la celda de Seguimiento, tras los íconos. La celda muestra
  íconos según contenido, o un link "Agregar" si está vacía.
- Referencias: `ui/RegistryTable.tsx`, `ui/detail/*`.
