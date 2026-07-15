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
- **Desktop: right-drawer (panel a la derecha, alto completo). Mobile: bottom drawer
  siempre full-screen** — full width y altura fija = pantalla − 24px (gap superior de
  24px donde se ve el overlay), sin ajustarse al contenido.
- **Estructura fija en 3 zonas** (patrón shadcn "scrollable content"): `DrawerHeader`
  (título + metadata + acciones de la entidad) **fijo arriba**, **`DrawerBody`** (el
  medio, único scroll) y `DrawerFooter` (acciones primarias del flujo: nav del wizard,
  Guardar/Cancelar de un editor) **fijo abajo**. No armar scroll a mano dentro del
  drawer: el body es siempre `DrawerBody`.
- Al `DrawerFooter` van las **acciones primarias de la vista actual**: nav del wizard,
  "+ Crear …" de un manager en vista lista, Cancelar/Guardar de un form. Botones
  contextuales de una sección dentro del contenido (ej. "Nueva" de la sección Preguntas
  del detalle) quedan inline — pero si abren un form, el form toma el drawer como vista
  propia (takeover), nunca se expande inline dentro del scroll.
- **Drawers-manager (lista ↔ form)**: los drawers que administran una colección
  (Preguntas, Cover letters, Links estables) separan leer/usar de crear/editar:
  - **Vista lista (default)**: body solo con los items guardados (o el `Empty`); la card
    de cada item es **clickeable completa** y abre su edición (patrón accesible de
    `PanelCardFace`: `role="button"` + Enter/Space; los íconos internos — copiar,
    borrar — van en un contenedor con `stopPropagation`). Footer pinneado con la acción
    de crear.
  - **Vista form (crear/editar)**: takeover del drawer — body = heading ("Nueva/Editar …",
    porque el header del PanelCard es estático) + campos; footer = **`DrawerFormFooter`**
    (`ui/DrawerFormFooter.tsx`): Cancelar vuelve a la lista descartando, Guardar persiste
    y vuelve. Siempre se vuelve al punto de inicio (misma vista/tab).
  - Estado local por manager: `view: { mode: "list" } | { mode: "form"; item: T | null }`
    (`item: null` = crear). El borrado queda en la vista lista (ConfirmDelete).
- Implementación: shadcn `Drawer` (vaul) con `direction` responsive:
  `direction={isMobile ? "bottom" : "right"}`, usando el hook `useIsMobile()`
  (`ui/useIsMobile.ts`, breakpoint 768px).
- Referencia: `ui/detail/RowDetailDrawer.tsx` (takeovers `edit`/`screening-new`),
  `ui/wizard/Wizard.tsx` (body + nav en footer) y `ui/ScreeningCard.tsx` /
  `ui/CoverLettersCard.tsx` / `ui/StableLinksCard.tsx` (managers lista ↔ form).

## Contenido Markdown
- Render con `react-markdown` + `remark-gfm`, estilado con Tailwind Typography
  (`prose prose-sm dark:prose-invert`). Sin HTML crudo (seguro por default).
- Referencia: `ui/detail/MarkdownView.tsx`.

## Empty states
- Usar el componente `Empty` de shadcn (`components/ui/empty.tsx`) en todos los vacíos
  (registro vacío, actualizaciones vacías, etc.), no texto suelto.

## Generación con IA → siempre dos pasos (patrón global)
**Ninguna llamada paga se dispara con un solo click.** Toda generación es: (1) una acción
explícita ("Sugerir con IA", elegir "Compartir contexto" en el wizard) que **abre** los
inputs de contexto opcionales (`ui/AiContextPanel.tsx`: link del puesto + Detectar,
contexto extra, modelo — precargados de la fila); (2) recién ahí el botón que genera
("Generar y guardar" / "Generar con IA") dispara la llamada y **persiste el borrador al
instante** (`draft`/"IA · sin revisar" — una llamada nunca se pierde por cerrar algo).
- El contexto **no vive fijo** (ni collapsible) en vistas de lectura: aparece solo dentro
  de la acción de generar, pegado al botón que dispara.
- En el drawer de detalle, sugerir abre un **takeover** (mismo slot que `RowEditForm`):
  `ScreeningSuggestForm` (entrada vinculada sin respuesta) y el reveal dentro de
  `ScreeningNewForm` (pregunta nueva).
- Sin atajos de regenerar sobre respuestas existentes (un misclick = pisar texto revisado
  + gastar una llamada).

## Borrado → confirmar + avisar (patrón global)
**Todo borrado en la app** sigue el mismo patrón: un **modal de confirmación** primero, y
después un **toast destructivo** de lo que pasó. Nunca borrar directo (sin confirmar) ni en
silencio (sin avisar). Componente único: **`ui/ConfirmDelete.tsx`**:
- **`ConfirmDelete`** — `AlertDialog` controlado (media destructiva + título + descripción +
  `children` opcional para contenido extra, ej. un warning). Botón de confirmar en
  **destructive solid** (`bg-destructive text-white`), porque es irreversible.
- **`toastDeleted(mensaje)`** — el toast destructivo estándar (icono `Trash2`, texto/borde
  destructivos). Llamalo **después** de que el borrado tenga éxito.
- Lo usan: **registro** (fila, en el panel de detalle) y **links estables**. Para un borrado
  nuevo: `ConfirmDelete` + `toastDeleted`, no reinventar.
- **Dentro de un drawer**: el diálogo portalea a `<body>` (fuera del drawer); pasá
  `keepDrawerOnDialogInteraction` (mismo archivo) a los `onPointerDownOutside`/
  `onInteractOutside` del `DrawerContent` para que el drawer no se cierre al clickear el
  diálogo. `PanelCard` y `RowDetailDrawer` ya lo hacen.

## Cards de la columna derecha → patrón "card compacta → drawer"
Cada card de acción de la columna derecha es una **cara compacta y clickeable** cuyo
contenido completo vive en un **drawer** (right en desktop / bottom en mobile). Patrón
reusable en **`ui/PanelCard.tsx`**:
- **`PanelCard`** — maneja el drawer; recibe `title`/`description`, un render `card(open)`
  (la cara) y `children(close, container)` (todo lo que va debajo del header: envolvé el
  contenido en `DrawerBody` y, si el flujo tiene acciones primarias, agregá un
  `DrawerFooter` — ver la sección de drawers). `container` es el nodo del drawer: pasalo
  a cualquier **popout** adentro (dropdowns, etc.) para que portalee en el scope del
  drawer (ver la regla de dropdowns).
- **`PanelCardFace`** — la cara compacta compartida (icono + título + descripción), para que
  las 3 cards se vean idénticas. `h-full` para que estiren al mismo alto en fila. Usá `cta`
  (un botón) para una card con acción explícita (Generar CV) o `onOpen` para hacer toda la
  card clickeable (Notas, Links estables).
- Lo usan: **Nueva aplicación** (wizard en el drawer), **Notas generales** (editor), **Links
  estables**, **Cover letters** y **Preguntas** (managers lista ↔ form — ver la sección
  de drawers). **Para una card nueva**: reusá `PanelCard` + `PanelCardFace`; el contenido
  pesado va en el cuerpo del drawer.

**Layout responsive de las cards** (`aside` en `app/page.tsx`): grid **`auto-fit` con
`minmax`** que responde al **ancho del contenedor**, no de la pantalla → 1 columna en la
columna angosta (lg), 3 en fila (mismo tamaño, o wrap a 2+1 igual) cuando la tabla las
empuja abajo, 1 apilada en mobile. Una card nueva entra sola al grid.

## Dropdowns seleccionables con iconos → un solo componente
- **Regla:** todo dropdown seleccionable que muestre iconos usa **`DropdownMenu`** del DS
  (patrón *checkboxes + icons*), **no** el `Select`. Así todos los dropdowns con iconos son
  visualmente consistentes y comparten el mismo componente.
- **`ui/IconSelect.tsx`** — wrapper reusable (single-select) sobre `DropdownMenu` +
  `DropdownMenuCheckboxItem`: trigger con look de select (icono + label + chevron) y ✓ a la
  derecha del item elegido. Cada opción lleva **el mismo icono que se muestra en la tabla**
  para ese valor.
- Dónde se usa (cada dropdown con iconos):
  - **Foco del portfolio** (wizard, `StepLanguage`) → `IconSelect` + `FocusIcon`.
  - **Canal** (wizard `StepOptional` **y** edit form `RowEditForm`) → `IconSelect` +
    `ChannelIcon` (mismo icono que la columna Canal de la tabla).
  - **Filtro de estado** (`StatusFilterDropdown`) → `DropdownMenu` directo (trigger embudo +
    chip), mismo componente base.
- **Dentro del drawer**: `IconSelect` acepta `container` (el nodo del drawer) y se porta
  ahí (`DropdownMenuContent` con `container`, `modal={false}`, `z-[60]`, `pointer-events-auto`)
  — misma solución que se usaba para el `Select`, ahora resuelta de una vez en el DS.

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
- **Filtros (dos dimensiones ortogonales, arriba de la tabla)**:
  (1) archivado — **Vigentes** (no archivadas) / **Archivado**, con `SegmentedControl`;
  (2) estado — Todos / Borrador / Activo / Rechazado, como **dropdown con icono de embudo**
  (`ui/StatusFilterDropdown.tsx`): botón siempre icon-only; con filtro activo aparece **al
  lado** un badge coloreado (paleta de `StatusToggle`) con una `X`, y clickearlo **quita el
  filtro** (vuelve a Todos); items `DropdownMenuCheckboxItem` con icono. Se combinan. Ojo
  con la semántica: "Vigentes" ≠
  estado "Activo" (por eso no se llama "Activas"). **Borrador** es system-derived (mirror de
  `cvPending`) — `StatusToggle` lo renderiza como badge no interactivo (sin toggle manual),
  distinto de Activo/Rechazado.
- **Todas las vistas comparten exactamente la misma tabla**: misma estructura, columnas y
  comportamiento; lo único que cambia es qué filas se muestran (filtradas por `archived` +
  `status` en la página). No duplicar componentes ni variar columnas entre vistas.
- **Fila clickeable**: abre el panel de detalle en el tab **Detalles**. Click en un ícono
  de Seguimiento abre su tab explícito (`notas` / `updates`). El badge de Estado y los
  íconos hacen `stopPropagation`; el resto de la celda cae al click del row. La navegación
  prev/next dentro del panel **conserva el tab actual** (no lo resetea).
- **Panel de detalle: tabs Detalles / Notas / Actualizaciones.** El `TabsList` es
  full-width y va **fijo debajo de la barra de acción** (Status/Archivar/Borrar) — no
  scrollea con el body. **Detalles** concentra todos los datos de la aplicación: card
  Datos (con "Editar"), Links de tracking, Carta (si aplica), Entrega, y **Preguntas**
  como sección al final con el mismo chrome de card (label + border): el pre-screening de
  esa aplicación — entradas del banco global vinculadas por código, copiar respuesta,
  crear pre-vinculada, vincular/desvincular, sugerir con IA; el banco se administra en la
  card "Preguntas" de la columna derecha. **Modo edición** ("Editar" en Datos): el
  formulario toma el área bajo los tabs; los triggers **inactivos se deshabilitan** hasta
  guardar/cancelar y el activo queda marcado — se ve dónde estás parado.
- Seguimiento: tabs **Notas** (markdown) y **Actualizaciones** (timeline, tope 12, más
  reciente abajo). Cada actualización es un item
  **editable** (texto, fecha/hora, flag). El **flag 🚩** marca algo por hacer/importante:
  se muestra en el item y, en la celda de Seguimiento, tras los íconos. La celda muestra
  íconos según contenido, o un link "Agregar" si está vacía. Íconos de **estado de la
  fila** (tooltip, no clickeables): `ClockAlert` ámbar al frente (sin actividad 2+
  semanas) y `FileClock` muted **al final** (CV pendiente de generar — el CTA "Generar
  CV" vive en la card Entrega del panel de detalle), para que el link "Agregar" quede
  siempre a la izquierda.
- Referencias: `ui/RegistryTable.tsx`, `ui/detail/*`.
