# Decisiones (cv-builder)

Log liviano de decisiones de producto/arquitectura y su **por qué**. Formato ADR:
cada entrada es Decisión + Contexto/razón. Lo más nuevo arriba. El "cómo" de UI vive
en `docs/DESIGN.md`; las reglas inviolables resumidas, en `CLAUDE.md`.

> Cuándo agregar una entrada acá: cuando se toma una decisión que alguien (o Claude en
> otra sesión) podría querer revertir sin contexto — trade-offs, reglas que cambian, o
> elecciones no obvias. No para cosas que el código ya deja claras.

---

## Ambientes: dev local (file store) / prod — sin staging; previews inofensivos por scoping
Esquema final: **dev** local con file stores (sin `SUPABASE_*` en `.env.local` — el
aislamiento sale gratis del diseño de las factories) y **prod** = `main` →
cbuilder.vercel.app contra Supabase. Regla de workflow: **no commitear directo a `main`** —
feature branch → push → Vercel Preview (QA visual con URL propia) → merge = deploy a prod.
La clave de seguridad es el **scoping de env vars en Vercel**: `SUPABASE_*` y `GDOCS_*` van
**Production only** — así un preview arranca sin vars, cae al file store efímero (registro
vacío; sink de Drive apagado → 501, ya manejado) y no puede tocar data real. Si quedaran en
"All Environments", un preview escribiría en la DB de prod. `BASIC_AUTH_*` sí va también en
Preview (candado en los previews).

Se evaluó **staging real** (segundo proyecto Supabase para los previews; el esquema
Dev/QA/Staging/Prod espejo del trabajo del usuario) y se **descartó**: con un solo dev y una
capa de datos ya pautada (triple-store probado 3 veces, migraciones aditivas) un staging DB
solo agrega mantenimiento (proyecto extra, schema drift, data de prueba que inventar) sin
mitigar un riesgo real. Criterio explícito del usuario: el objetivo es conseguir trabajo;
el aprendizaje de infra está bien solo si es gratis. Revisitar si un feature de data se
quiere probar deployado antes de prod o si aparece un segundo usuario — agregarlo es
reversible y sin refactor (crear proyecto + correr `supabase/schema.sql` + scopear sus
`SUPABASE_*` a Preview). Pasos operativos en `docs/deploy.md` → "Ambientes".

## Backlog: sigue en `TODO.md` (no GitHub Issues); ambos repos siguen públicos
Se evaluó mover el backlog a GitHub Issues y se descartó **por ahora**: los issues de un
repo público son públicos (no se pueden hacer privados por issue), y parte del backlog
menciona empresas/estrategia — exactamente lo que `TODO.md` gitignoreado protege. Hacer el
repo privado tampoco conviene: el **portfolio** necesita ser público (GitHub Pages free) y
**cbuilder** funciona como work sample durante la búsqueda (el CV lleva un link trackeado a
GitHub; un recruiter que entra debería ver este repo activo). Con un solo dev, `TODO.md` +
el workflow de branches alcanza. Revisar si algún día hay colaboradores o se quiere roadmap
público (ahí: issues solo para features publicables, `TODO.md` para lo privado).

## Notas + Links estables durables en Supabase (mismo patrón que el registro)
Los tres documentos (registro, notas generales, links estables) ahora son durables en
Supabase detrás de una **factory server-side por documento** (`getServerRegistryStore` /
`getServerNotesStore` / `getServerStableLinksStore`), cada una eligiendo Supabase (service
key) o el file store local según las env vars. Las tres comparten un único cliente admin
(`getSupabaseAdmin`, service key, server-only). Antes solo el registro estaba en Supabase; las
notas y los links seguían en el file store, que **es efímero en Vercel** (el filesystem se
resetea en cada deploy → se perdían al redeployar). Motivo: el objetivo del deploy es
**usar la app mientras se sigue implementando**, y para eso todo lo que el usuario escribe en
prod tiene que persistir a través de los redeploys. Trade-off: 2 tablas más
(`general_notes` single-row pinned a `id=1`; `stable_links` keyed por `ref`), ambas con RLS
on sin policy como el registro. Los `Api*Store` del cliente no cambian (siguen pegándole a
las API routes); el swap es 100% server-side. Migración de la data local vía
`data/notes-links-import.sql` (gitignored). Ver `docs/deploy.md` y `docs/architecture.md`.

## Borrado en toda la app: confirmar + avisar (`ConfirmDelete` + `toastDeleted`)
Todo borrado sigue **un** patrón: modal de confirmación (`AlertDialog`) y después un toast
destructivo. Se unificó en `ui/ConfirmDelete.tsx` (componente `ConfirmDelete` + helper
`toastDeleted` + `keepDrawerOnDialogInteraction`). Antes el borrado del **registro** tenía
su `AlertDialog` inline (con toda la maña del diálogo dentro del `vaul` drawer) y el toast
armado a mano en `page.tsx`; el de **links estables** era borrado directo sin confirmar ni
avisar. Ahora ambos usan lo mismo, y el helper del drawer (que evita que clickear el diálogo
cierre el drawer) se comparte entre `RowDetailDrawer` y `PanelCard`. Pedido explícito:
"cuando se le de borrar a algo, en toda la aplicación, modal de confirmación y luego un
alert de que sucedió". Detalle del patrón en `DESIGN.md` ("Borrado: confirmar + avisar").
El `AlertDialog` sigue portaleado a `<body>` (centrado en viewport) con `pointer-events-auto`
+ `z-[60]` (ver la entrada vieja del `AlertDialog` sobre el drawer).

## Columna derecha: cards compactas → drawer (patrón `PanelCard`) + links estables
Las 3 cards de acción (Generar CV, Notas generales, Links estables) pasaron a un patrón
único: **cara compacta clickeable → contenido en drawer** (`ui/PanelCard.tsx` +
`PanelCardFace`). Antes cada una resolvía su UI aparte (el wizard se expandía in-place; las
notas mostraban el editor inline + una flecha). Ahora: **Generar CV** abre el wizard en un
drawer, **Notas** abre el editor, **Links estables** (feature nuevo) abre su manager. Pedido
explícito de unificar el comportamiento y documentarlo para replicarlo. Detalle del patrón
y del layout responsive en `DESIGN.md`.

Notas técnicas: (1) el wizard adentro del drawer necesitaba threadear el **`container`** (el
nodo del drawer) hasta los `IconSelect` de canal/foco para que portaleen bien — `PanelCard`
lo expone como 2º arg de `children`, `Wizard`/steps lo aceptan. El DatePicker sigue sin
container (mismo precedente que el edit form). (2) El layout de las cards es un **grid
`auto-fit`** (responde al ancho del contenedor): 1 col en la columna angosta, 3 en fila
(igual tamaño / wrap a 2+1), apiladas en mobile — así una card futura entra sola.

**Links estables** (feature): tracking de touchpoints permanentes (LinkedIn, Behance…), 1
link por touchpoint, `lenincuadra.com/?ref=<ref>` directo al portfolio. Registro propio
(`StableLink {name, ref}`) con su store (file + API + client, espejo del registro; Supabase
a futuro). No toca el portfolio (el tracker ya loguea cualquier `ref`); el feature es el
**registro** de qué ref le asignaste a cada uno, más ver/copiar/agregar (con sugerencias
`li-profile`/`web-cv`/`behance`).

## Dropdowns con iconos: todos con `DropdownMenu`, no `Select` (`IconSelect`)
Todos los dropdowns seleccionables que muestran iconos pasaron del `Select` (base-ui) a un
componente único **`ui/IconSelect.tsx`** sobre **`DropdownMenu`** (patrón checkboxes+icons,
el mismo del `StatusFilterDropdown`). Aplica a **Foco del portfolio** (`FocusIcon`) y
**Canal** en el wizard y en el edit form (`ChannelIcon`, el mismo icono de la columna Canal).
Razón: consistencia (un solo componente para todos los dropdowns con iconos) + pedido
explícito con referencia al ejemplo *dropdown-menu / checkboxes-icons* de shadcn. Cada opción
usa **el mismo icono que la tabla** para ese valor. Regla y lista completa en `DESIGN.md`.

**Bonus:** esto resolvió de raíz la saga del `Select` adentro del drawer (ver la entrada
"Select del drawer"). El `Menu` de base-ui, portaleado al nodo del drawer vía el nuevo prop
`container` de `DropdownMenuContent` (+ `modal={false}`, `z-[60]`, `pointer-events-auto`),
abre y **permite seleccionar** sin pelear con el focus-trap de vaul — verificado en el
browser (antes el `Select` se cerraba al instante). El componente `Select` queda en el DS
pero **ya no se usa** en la app.

## Entrega visible: una sola alerta (Finder/Drive + Detalles) + card "Entrega"
La generación persiste en la fila **dónde quedó la entrega**: `zipName` (zip archivado en
`data/cvs/`, calculado en `generateCv`), `driveDocs` (URL del Doc por idioma) y
`driveFolder` (la carpeta de la aplicación en Drive). Se guardan vía `update()` tras el
sink. Con eso:
- **Una sola alerta de éxito** (antes eran hasta 3: "CV generado" + un toast por idioma).
  El botón secundario abre la **carpeta de Drive** si el sink corrió, si no revela el zip
  en **Finder** (`POST /api/cvs/reveal` → `open -R`, **solo macOS**, 501 en deploy); el
  principal ("Detalles") abre el panel de la fila recién generada (resetea filtros a
  Vigentes/Todos y usa `openRequest {code, nonce}` que `RegistryTable` honra ajustando
  estado durante render con guarda de nonce — sin useEffect). Fallos (archivo/gdocs) van en
  toasts warning aparte, no ensucian el happy path.
- El **drawer** muestra el card "Entrega" (`ui/detail/DeliveryInfo`): zip archivado + botón
  de Finder, y la **carpeta de Drive** como link clickeable (fallback a Docs por idioma en
  filas viejas). Abrir links de Drive no contamina el tracking.
- El **diálogo de borrado** avisa que el CV en Drive **no se borra** y muestra la carpeta
  (lo que hay que borrar a mano es la carpeta completa). Las URLs usan `break-all`, no
  `truncate`, para no desbordar el modal.

**Estructura en Drive: una carpeta por aplicación** — `CV Builder/<empresa>_<código>/<IDIOMA>/
Lenin_Cuadra_CV` (idioma en subcarpeta). Así una sola URL de carpeta sirve para EN, ES o
Ambos, y el Doc mantiene el nombre limpio `Lenin_Cuadra_CV` (PDF sin tracking). El Apps
Script devuelve `{ url, folderUrl }`; el contrato del sink pasó de `{folder}` a
`{appFolder, language}` (requiere redeploy del script — ver `gdocs-setup.md`). Columnas
`zip_name`/`drive_docs`/`drive_folder` en el schema de Supabase.

## PDF vía Google Docs sink (Apps Script), no conversión local
Para el pedido de "exportar a PDF" se eligió **no convertir localmente** (no hay
docx→PDF fiel sin instalar LibreOffice, y el flujo real del usuario ya pasa por Google
Docs) sino un **sink a Drive**: cada generación crea además el CV en el Drive del usuario
como **Google Doc nativo** (`CV Builder/<carpeta>/Lenin_Cuadra_CV`), desde donde se baja
el PDF con fidelidad de Google (su editor de siempre). Integración vía **webhook de Apps
Script** (sin OAuth/Cloud Console): `POST /api/gdocs` reenvía `{folder, docxBase64}` al
script del usuario con un token compartido — URL y token viven server-side en `.env.local`
(`GDOCS_SCRIPT_URL`/`GDOCS_TOKEN`; ausentes = feature apagado en silencio, HTTP 501).
Setup en `docs/gdocs-setup.md`. El Doc se llama `Lenin_Cuadra_CV` (sin tracking) para que
el PDF descargado herede el nombre correcto; el código va en la carpeta. `GenerateCvResult`
ahora expone `entries` (docx por idioma) para este tipo de sinks. No bloquea nada: zip y
archivado salen igual si el script falla (toast warning).

## Link de GitHub trackeado en el CV (sufijo `G`, masters v15)
El CV suma un tercer link trackeado: **GitHub** (`github.com/lenincuadra` como texto
visible). Como GitHub no acepta `?ref=`, va **vía `go.html?ref=<código>G&dest=github`**
(mismo mecanismo que LinkedIn). Cambios cross-repo en el portfolio (commit `7a6a30f`):
destino `github` en `DESTINATIONS`, sufijo `G` en los tres parsers (`go.html`,
`tracker.js`, `404.html` → links cortos `/r/<código>G`) y en el generador del contrato
(`scripts/seo-build.js` → `link-spec.json`; **ojo: `link-spec.json` es generado, nunca
editarlo a mano** — el pre-commit hook de ese repo lo valida). Acá: `LINK_ID.github`,
`trackedLinks().github`, `fillMaster` ahora exige **exactamente 3 placeholders**
(1 portfolio, 1 `dest=linkedin`, 1 `dest=github`) y el foco se appendea a los tres.
**Masters v15** (desde v14, que queda intacto): hyperlink `github.com/lenincuadra`
insertado después del de LinkedIn en el header, azul canónico + underline. Verificado
E2E en producción: `go.html?ref=me&dest=github` → `github.com/lenincuadra`.
El link extra hacía **wrap accidental** de la línea de contacto. Tras dos iteraciones
(dos líneas con `<w:br/>`; una línea con pipes), el **layout final lo diseñó el usuario
en un docx de referencia** que se transplantó tal cual a los masters: **dos párrafos con
labels bold y `<w:tab/>` entre grupos** — línea 1 `| Portfolio: <link>  | Github: <link>
| Linkedin: <link>`; línea 2 `| Contact: <email>  | +549 351-376-6049`. Labels bold
`111827` (pipe incluido), links azul canónico, teléfono muted. El **email ahora es un
hyperlink `mailto:`** (rId103; hi@/hola@ según master) — vino del ref y se conservó; su
color vino en `1155cc` (azul default del editor) y se normalizó a `1A56DB`. Del ref
también se limpiaron el código horneado (`0708w8`) y el `&focus=` → placeholders
`ref=li-cv`. Workflow que funcionó: el usuario diseña el header en un CV generado y lo
pasa como referencia; se transplanta el bloque XML con los placeholders restaurados.

## Archivo local de los .zip generados (`data/cvs/`)
Cada generación, además de descargarse, se **archiva en `data/cvs/<zipName>`** (gitignoreado
vía `/data/`, misma regla de privacidad que el registro). Razón: los masters evolucionan
(v13 → v14 → …), así que un delivery pasado **no se puede regenerar idéntico** — el archivo
es el único registro fiel de lo que se envió. Ruta `POST /api/cvs?name=` (body binario) →
`saveCvArchive()` en `lib/storage/cvArchive.ts` (nombre validado por allowlist contra path
traversal; escritura atómica tmp+rename como los otros stores; mismo nombre sobreescribe).
El archivado **nunca bloquea la entrega**: si falla, el zip igual se descarga y un toast
warning lo avisa. En Vercel el filesystem es efímero — mismo caveat ya asumido por el file
store del registro (para deploy real, Supabase Storage sería el equivalente).

## Filtro de estado como dropdown-embudo; foco visible junto al código
Dos cambios de UI de la tabla: (1) el filtro de **estado** dejó de ser `SegmentedControl`
y pasó a un **dropdown** (`ui/StatusFilterDropdown.tsx`) con botón de icono embudo
(`Funnel`), siempre icon-only; con filtro activo aparece **al lado** un **badge-chip
coloreado** (verde/rojo, paleta compartida `statusBadgeClass()` extraída de `StatusToggle`)
con una `X`: clickearlo quita el filtro (vuelve a Todos). Items `DropdownMenuCheckboxItem`
con iconos (componente `dropdown-menu` del DS, instalado con shadcn). El filtro de
archivado sigue como `SegmentedControl`. Pedido explícito con referencia a los ejemplos de
shadcn (button#icon y dropdown-menu#checkboxes-icons). (2) El **foco** de cada fila se
muestra como **icono por perfil junto al código** (`ui/FocusIcon.tsx`: payments →
CreditCard, ai → Sparkles, conversion → TrendingUp; tooltip con el label ES) — se eligió
sobre una columna nueva icon-only y sobre un badge bajo la empresa para no gastar ancho de
la tabla fija. Ojo: el icono lleva `shrink-0` — dentro de la celda `truncate` de 9% el flex
lo aplastaba horizontalmente hasta romperlo.

## Links del CV: un solo azul canónico (1A56DB)
Los masters v14 editados a mano traían 5 azules levemente distintos en los links/título
(`1B5ADE`, `1B58DD`, `1B57DC`, `1B58DC`, `1A56DC`) — typos de color del editor. Regla: **todo
link del CV usa el azul canónico `1A56DB`** (el mismo de headers de sección y empresas) +
underline. Paleta final del documento: `111827` (títulos), `1A56DB` (accent/links),
`374151` (body), `6B7280` (muted). Ojo al editar masters: el editor del usuario además
**elimina los hyperlinks** (hubo que reinsertarlos con el placeholder `ref=li-cv`); después
de cualquier edición de master hay que revalidar placeholders y recopiar a `public/masters/`.

## Foco del portfolio por aplicación (`&focus=` en los links trackeados)
El wizard (paso 3, "Idioma y foco") permite elegir un **perfil de foco** opcional que se
appendea a los DOS links trackeados del CV (`&focus=<id>`): el portfolio reordena/destaca
sus casos para ese visitante (regla del portfolio: **ordenar, no ocultar**). El contrato lo
define el repo del portfolio (`data/profiles.js`, público — precedencia: `?focus=` directo
en el index / sessionStorage vía go.html / mapeo por ref): esta app **solo emite el param**.
`FOCUS_PROFILES` en `core/links.ts` es un espejo manual de los perfiles del portfolio
(`payments`, `ai`, `conversion` al 2026-07-07) con sus labels ES — **al agregar un perfil
en el portfolio hay que agregarlo acá** (se descartó fetchear `profiles.js` en runtime por
simplicidad; es un archivo JS, no JSON). El foco va también en el link de LinkedIn porque
go.html lo guarda en sessionStorage y sobrevive a un CV→LinkedIn→portfolio en el mismo tab.
Se persiste en `RegistryRow.focus` y, como `language`/`code`, **no es editable** post-creación
(ya viaja en el CV enviado; editarlo desincronizaría los links del panel de los reales).
Columna `focus` agregada a `supabase/schema.sql` + mapeos del store (si ya corriste el
schema viejo: `alter table public.registry add column focus text;`).

## Dominio propio `lenincuadra.com` + mails `hola@`/`hi@` (masters v14)
El portfolio pasó a servirse desde **`https://lenincuadra.com`** (dominio custom sobre el
mismo GitHub Pages, DNS en Cloudflare). Los masters **v14** (EN y ES, generados por script
desde los v13, que quedan intactos en `assets/`) usan la base nueva en los hyperlinks y en
el texto visible (`lenincuadra.com`), y cambian el email impreso: **`hi@lenincuadra.com`
en el master EN, `hola@lenincuadra.com` en el ES** — aliases de una misma casilla
(Cloudflare Email Routing → reenvío a Gmail + "Send mail as" para responder). Se eligió
saludo-por-idioma en vez de `lenin@` (repetía el nombre) o un neutral único. `PORTFOLIO_BASE`
vive en `core/links.ts` (ahora exportado; `trackingUrl` lo reusa — antes duplicaba la URL).
**El tracking no se pierde**: mismos `?ref=` params, y los links viejos
`lenincuadra.github.io/portfolio/...` hacen 301 al dominio nuevo preservando los query
params (verificado), así que los CVs ya enviados siguen trackeando. Se descartó un
acortador tipo Bitly: el dominio propio ya es corto, es primera parte (sin dependencia de
terceros ni destino oculto) y no requiere un link por aplicación.

## Notas generales: card propio + store separado (misma infra, DB futura)
Se sumó un card **"Notas generales"** en la columna derecha: notas markdown
**genéricas del proceso** (no atadas a ninguna fila del registro). Reusa `NotesTab`
(preview-first, click para editar, Guardar) con un `placeholder` propio. Una flecha
(`ArrowRight`) en el header abre el **mismo editor en un `Drawer`** (right en desktop /
bottom en mobile, mismo patrón que el panel de detalle); card y drawer comparten una sola
instancia de `useGeneralNotes`, así que quedan sincronizados. Persistencia
detrás de una interfaz nueva **`GeneralNotesStore`** (`core/notes/types.ts`, `get()/set()`),
espejo de `RegistryStore`: file store local (`FileGeneralNotesStore` → `data/notes.json`,
gitignoreado, misma cola serial + escritura atómica que el registro) + `PUT/GET /api/notes`
+ `ApiGeneralNotesStore` cliente, elegidos por `getGeneralNotesStore()`. Se modeló como
**documento/tabla propia** (un solo string markdown, no una fila del registro) para mapear
limpio a una tabla de Supabase a futuro. Por ahora el factory devuelve siempre el api store
(no hay tabla Supabase de notas todavía; el branch va acá cuando exista, igual que
`SupabaseRegistryStore`). Razón del pedido: "mantener la misma infra por ahora".

## Card "Generar un CV": empty state como entrada (gate al wizard)
El card de generación ahora **arranca mostrando el `Empty` del DS** (icono + título +
descripción + botón CTA "Generar CV"); el `Wizard` se abre **in place** al clickear y
**colapsa de vuelta al empty state** al cancelar o tras una generación exitosa. Antes el
wizard estaba siempre visible debajo del header. Se agregó `onCancel?` opcional al `Wizard`:
cuando está presente, en el paso 1 el botón "Atrás" (que estaba deshabilitado) pasa a ser
**"Cancelar"** (icono X) y cierra el wizard. Lógica de open/close encapsulada en
`ui/GenerateCard.tsx` (no en `page.tsx`). Razón: pedido explícito de presentar el card como
empty state primero.

## Select del drawer: portalear el popup DENTRO del drawer
El `Select` (base-ui) de canal en el form de edición estaba roto adentro del `Drawer`
(vaul): el popup se portalea a `body`, vaul lo dejaba con `pointer-events: none` y su foco
lo atrapaba de vuelta el focus-trap del drawer, así que el menú no se abría / no se podía
seleccionar. Fix: el popup se portalea **dentro del nodo del drawer** (`container` = ref del
`DrawerContent`, ver `drawerNode` en `RowDetailDrawer` → `RowEditForm` → `SelectContent`),
así queda en el mismo scope de pointer-events/stacking/foco. Ojo: adentro del drawer, que
tiene `will-change: transform` (bloque contenedor), el modo `alignItemWithTrigger` de
base-ui posiciona mal (popup fuera de pantalla) → se usa `alignItemWithTrigger={false}`
(posiciona debajo del trigger vía floating-ui, que sí es transform-aware). Además
`modal={false}` en el `Select` para no pelear el scroll-lock/foco con el drawer, y en el
componente `select.tsx` se dejan `pointer-events-auto` + `z-[60]` como refuerzo (no-op
fuera del drawer). Contraste con el `AlertDialog`, que va al revés: se portalea a `body`
para quedar centrado en viewport (ver esa entrada) porque no está anclado a un trigger.

## File store: acceso serializado + escritura atómica (fix de pérdida de datos)
`FileRegistryStore` hacía read-modify-write sin lock y `writeFile` trunca-y-escribe. Con
requests concurrentes (toggles rápidos, autosave de notas + un delete, un write stale en
vuelo) dos operaciones leían el mismo snapshot y **el último write pisaba al otro (filas
perdidas)**, o un read caía en medio de un write y agarraba JSON parcial → **archivo
corrupto**. Esto explicó filas que desaparecían "solas" (varias archivadas se perdieron).
Fix: (1) **cola serial** — cada op corre después de que la anterior termina, así el
read-modify-write es atómico; (2) **escritura atómica** — se escribe a `registry.json.<pid>.tmp`
y se hace `rename` (atómico en POSIX), así un lector nunca ve un archivo a medio escribir.
Además `read()` **nunca** convierte un error de parseo en `[]` (eso borraría todo en el
próximo write): ante archivo corrupto tira error. Test de concurrencia en
`lib/storage/fileStore.test.ts`. `FileRegistryStore` ahora acepta el path por constructor
(para testear con un archivo temporal); el singleton `fileStore` sigue usando `data/`.

## Borrar fila con confirmación (AlertDialog, no undo)
Cada fila se puede borrar de forma permanente desde el panel de detalle. El botón
"Borrar" (destructivo) abre un `AlertDialog` que muestra qué se va a borrar (empresa,
rol, código, fecha) y avisa que no se puede deshacer; recién al confirmar se borra y se
cierra el panel. Razón: borrar es irreversible (el file store no versiona), así que el DS
pide confirmación explícita para acciones destructivas. Se sumó `remove(code)` a la
interfaz `RegistryStore` (todas las impls) + `DELETE /api/registry/[code]`. No hay
papelera/undo por ahora: si se necesita, sería un `archived`-like o soft-delete.

El botón de confirmar usa el **destructive solid** (`bg-destructive text-white`), no el
destructive tenue del DS (`bg-destructive/10`), porque es una acción irreversible y tiene
que leerse como peligrosa (ver shadcn destructive).

**Detalle técnico (no "simplificar" sin leer esto):** el `AlertDialog` (base-ui) se abre
arriba de un `Drawer` (vaul); son dos capas modales de librerías distintas que no se
coordinan. El diálogo se portalea a `body` para quedar **centrado en el viewport** (su
posición por defecto). Eso trae tres problemas que hay que atender:
(1) vaul pone `body { pointer-events: none }` y solo re-habilita su subárbol → el diálogo
en `body` hereda `pointer-events: none` y los clicks lo atraviesan. Fix: `pointer-events-auto`
en overlay + content del `AlertDialog`. (2) el overlay del drawer es `z-50` y tapaba el
diálogo. Fix: `z-[60]` en overlay + content. (3) clickear el diálogo cuenta como "outside
click" y vaul cierra el drawer. Fix: en `DrawerContent`, `onPointerDownOutside`/
`onInteractOutside` cancelan el dismiss **cuando el target del evento está dentro del
`[data-slot="alert-dialog-*"]`** (chequeo por DOM target, sin estado de React — clave: la
versión con `if (confirmDelete)` fallaba por *stale closure*, no porque vaul ignore el
`preventDefault`). `onEscapeKeyDown` hace lo mismo si hay un alert-dialog montado. Así
Cancelar vuelve al drawer y Borrar cierra vía `onOpenChange` explícito.

## Filas editables post-creación (todo menos el código)
Desde el panel de detalle se puede editar casi todo de una fila después de creada
(empresa, rol, canal, email, fecha, quién, link, + estado/notas/actualizaciones/archivado
que ya lo eran). **No editables: el `código`** (identidad, ya está en el CV enviado y en
los links P/L) y el **`idioma`** (el CV ya se generó en ese idioma; cambiarlo no haría nada
y sería engañoso) — el idioma se muestra read-only en el form. Editar **solo actualiza el
registro** (no regenera el `.docx` ya generado). `EditableFields` = todo `RegistryRow`
menos `code`/`createdAt`. Form en `ui/detail/RowEditForm.tsx`.

## Alerta de inactividad (clock-alert amber, 14 días)
Si una fila lleva **14+ días sin actividad**, la celda de Seguimiento muestra un
`clock-alert` en amber (`text-amber-500`) con tooltip ("pedí feedback o cerrá la
búsqueda"). El contador es desde la **última actividad**: la última actualización de
seguimiento, o la fecha de aplicación si no hay ninguna (agregar un update reinicia el
reloj). Aplica a **todas** las filas (cualquier estado/archivado). Un solo nivel de alerta
(no escalonado). Lógica pura en `core/staleness.ts` (`isStale`, `STALE_AFTER_DAYS=14`).
Nota de color: shadcn solo trae `destructive`; para amber/warning se usan colores Tailwind.

## Links de tracking en el panel: texto plano, no clickeables
El panel muestra los 2 links trackeables de la fila (portfolio `?ref=<code>P`, LinkedIn
`go.html?ref=<code>L&dest=linkedin`) como **texto plano (no `<a>`)** + botón de copiar.
Razón: clickearlos dispararía el tracker con una visita/mail falsos (auto-contaminación).
Helper `trackedLinks()` en `core/links.ts`; componente `ui/detail/TrackedLinks.tsx`.

## Identificador de link en el `ref` del CV (P / L)
Los 2 links trackeables del CV llevan, además del código, un identificador de link
apendeado: portfolio → `ref=<código>P`, LinkedIn → `ref=<código>L`. Así un click se
atribuye al link específico (no solo a la aplicación): `0628r4P` = abrieron el portfolio
del CV `0628r4`. Definido en `core/links.ts` (`LINK_ID`), aplicado en `fillMaster`. El
`go.html`/analytics (repo del portfolio) parsea el sufijo — fuera de esta app. El sufijo
va en mayúscula para no confundirse con la letra del código (minúscula).

## Canal "Email" exige el email aplicado
Si en el wizard se elige canal **Email**, aparece un campo de email **requerido** (no se
puede avanzar sin un email válido). Se guarda en `RegistryRow.email` y solo se persiste
cuando el canal es Email. Razón: si aplicaste por mail, el dato clave es a qué dirección.

## Componentes: usar siempre el del DS antes que custom
Regla de proceso (ver `docs/DESIGN.md`): primero el componente del DS, si no existe
preguntar por suplente, recién después custom con confirmación. Surgió de haber hecho un
toggle custom donde correspondía el `Switch` del DS.

## Tabla: sin scroll horizontal salvo en pantallas chicas
La tabla usa `table-fixed` y trunca columnas largas para entrar siempre en el contenedor;
solo por debajo de 640px (sm) se reactiva el scroll. **Reemplaza** la regla original
("si no entran, scroll horizontal; nunca ocultar/reducir columnas"). Razón: el scroll
lateral permanente molestaba; truncar + tooltip da mejor lectura en desktop.

## Filtros: archivado + estado (ortogonales); "Vigentes" ≠ "Activo"
Dos filtros arriba de la tabla que se combinan: (1) archivado — **Vigentes** (no archivadas)
/ Archivado; (2) estado — Todos / Activo / Rechazado. Son dimensiones distintas: una fila
Activa o Rechazada puede estar archivada o no. Se renombró la vista no-archivada de
"Búsquedas activas" a **"Vigentes"** porque "Activas" chocaba con el estado "Activo". Una
sola `RegistryTable` para todas las vistas (la página filtra por `archived` + `status` y le
pasa las filas) — misma estructura/columnas siempre, sin drift.

## Archivar es un flag independiente del estado
`archived: boolean` separado de `status` (Activo/Rechazado). Se puede archivar sin importar
el estado. Razón: "archivado" (sacar de la vista activa) y "rechazado" (resultado) son
dimensiones distintas.

## Dark mode siempre (sin toggle)
Clase `dark` fija en `<html>` + `color-scheme: dark`. Razón: pedido explícito; menos
esfuerzo que seguir el tema del SO. Para volver a system: `next-themes` con
`defaultTheme="system"` (ya instalado).

## Repo público → data del registro fuera de git
El repo es **público**; el registro es privado (a quién aplicó Lenin). `data/` y
`docs/*tracking-registry*.md` están gitignoreados. El file store persiste en
`data/registry.json` (disco, no git). Razón: no exponer el historial; GitHub privado es
gratis pero se prefirió mantenerlo público.

## Storage: file store local ahora, Supabase después
Detrás de la interfaz `RegistryStore`: hoy el default es un **archivo JSON local** vía API
routes (`fileStore` + `apiStore`), durable en disco y compartido entre navegadores de la
máquina. `SupabaseRegistryStore` queda listo (se activa con las env vars). Se descartó
localStorage como default por ser por-navegador. Razón: durabilidad real sin backend,
corriendo local; Supabase para deploy/compartir. Ver `docs/supabase-setup.md`.

## Output `.docx` (no PDF) por relleno de placeholder
Se rellena el master reemplazando `ref=li-cv` en `word/_rels/document.xml.rels` (no se
renderiza). Razón: los master ya son `.docx`; fidelidad sin depender de un render.

## Idioma "Ambos" = 1 código, 1 fila, 1 zip
Una aplicación = un código de tracking; el `.zip` lleva dos carpetas (EN + ES). Razón: el
registro no tiene columna de idioma; dos filas serían duplicados indistinguibles.

## Reservado extra `web-cv`
Sumado a `me`/`li-profile`/`organic`/`li-cv` porque el registro vivo lo usa. El registro
vivo es la fuente de verdad sobre reservados (la spec original no lo tenía).

## Código en inglés, UI en español
Identificadores/comentarios/commits en inglés; textos visibles al usuario en español
(contenido de producto). Pedido explícito del usuario.
