# Decisiones (cv-builder)

Log liviano de decisiones de producto/arquitectura y su **por qué**. Formato ADR:
cada entrada es Decisión + Contexto/razón. Lo más nuevo arriba. El "cómo" de UI vive
en `docs/DESIGN.md`; las reglas inviolables resumidas, en `CLAUDE.md`.

> Cuándo agregar una entrada acá: cuando se toma una decisión que alguien (o Claude en
> otra sesión) podría querer revertir sin contexto — trade-offs, reglas que cambian, o
> elecciones no obvias. No para cosas que el código ya deja claras.

---

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
