# Decisiones (cv-builder)

Log liviano de decisiones de producto/arquitectura y su **por qué**. Formato ADR:
cada entrada es Decisión + Contexto/razón. Lo más nuevo arriba. El "cómo" de UI vive
en `docs/DESIGN.md`; las reglas inviolables resumidas, en `CLAUDE.md`.

> Cuándo agregar una entrada acá: cuando se toma una decisión que alguien (o Claude en
> otra sesión) podría querer revertir sin contexto — trade-offs, reglas que cambian, o
> elecciones no obvias. No para cosas que el código ya deja claras.

---

## Flechas clavadas: tamaño, radio y rotación están acoplados (2026-07-26)
**Decisión**: se achica la flecha de 113×31px a 88×24px, se orienta
**tangencialmente** al anillo (no en ángulo random) en vez de radial, y se
recorta el radio máximo de aterrizaje — `RANDOM_MODE_MAX_RADIUS` de 30→19, y
`RING_BANDS` (modo funnel) escalados a ~71% de su radio "real" — porque
algunas flechas quedaban con la punta fuera de la diana.

**Contexto/razón**:
- La causa no era un bug de posicionamiento: es geometría. Una flecha
  centrada a radio `R` del centro, orientada tangencialmente, igual tiene sus
  puntas a `sqrt(R² + medioLargo²)` del centro (Pitágoras) — cuanto más larga
  la flecha respecto al radio de la diana, más "se abre" hacia afuera aunque
  esté acostada sobre el anillo. Con la flecha en su tamaño anterior (113px,
  ~39% del ancho del contenedor) esto no cerraba con ningún radio razonable.
- Verificado empíricamente con Playwright (no a ojo): se leen `left/top/rotate`
  reales de cada flecha asentada, se calculan las 4 esquinas rotadas
  analíticamente, y se compara contra el borde real del anillo blanco (~33.2%,
  medido del path del SVG). 80 corridas (8 seeds × 2 modos × 5 counts): máximo
  32.3%, sin overhang.
- **Si se vuelve a agrandar la flecha o el radio en el futuro, hay que
  re-correr esta verificación** — no alcanza con mirar una captura, el
  overhang solo aparece en ciertos ángulos/posiciones (ver `RANDOM_MODE_MAX_RADIUS`
  y `RING_BANDS` en `ArrowToTarget.tsx` para la fórmula).
- El modo funnel pierde algo de precisión (los anillos ya no calzan pixel-perfect
  con el radio real de cada color) a cambio de que ninguna flecha quede afuera —
  trade-off deliberado, no un bug pendiente.

## Vuelo de la flecha: Web Animations API en vez de `@keyframes` CSS (2026-07-26)
**Decisión**: el vuelo de cada flecha (`ArrowToTarget.tsx`) se genera con
`el.animate(keyframes, opts)` (Web Animations API nativa del browser) en vez
de clases CSS con `@keyframes`. Los keyframes se calculan en JS por flecha,
sampleando una parábola real (~16 puntos: horizontal lineal, altura
`peak*(1-distanciaAlPico²)`, rotación = tangente real del camino). Sigue
siendo "sin dependencia nueva" — WAAPI es una API del DOM, no una librería.

**Contexto/razón**:
- Dos rondas de `@keyframes` (una con un pico fijo al 50%, otra con 3
  variantes `lob`/`punch`/`loft` de 5-6 stops cada una) seguían sin sentirse
  naturales — el usuario lo señaló dos veces. La limitación de fondo: un
  `@keyframes` tiene stops en **porcentajes fijos**, no parametrizables por
  custom property — no hay forma de que cada flecha tenga su propio "dónde
  pica el arco" sin escribir un keyframe por combinación posible. JS puede
  generar esa curva por instancia; CSS no.
- "Que termine de golpe" (pedido explícito del usuario) salió gratis de la
  física correcta: una caída acelera, no desacelera — la parábola llega a
  velocidad máxima justo en el aterrizaje, así que la animación simplemente
  termina ahí en vez de planear hasta pararse.
- **Gotcha de React Strict Mode a no repetir**: con un efecto que agenda
  animaciones (sin cleanup, para no cortar flechas ya en vuelo cuando `count`
  sube) y otro efecto separado, solo-para-desmontaje, que cancela todo —
  Strict Mode (dev) duplica el ciclo mount→cleanup→remount de **todos** los
  efectos en el commit inicial, incluidos los de deps `[]`. Eso cancelaba las
  animaciones recién creadas sin des-marcar el set de "ya animadas", dejando
  flechas fantasma (nunca se recreaban). Fix: el cleanup de desmontaje limpia
  el ref de animaciones **y** el set de IDs juntos, para que el remount
  inmediato de Strict Mode se autocorrija.
- **"El modo random no se sentía random"**: el seed de cada flecha dependía
  solo de su índice, así que dos "Replay" con el mismo `count` producían el
  arreglo idéntico. Fix: se suma un `sessionSeed` (`Math.random()`, seteado en
  un `useEffect` para no romper la hidratación SSR — no se puede llamar
  `Math.random()` durante el render sin un mismatch server/cliente) generado
  una vez por montaje. Estable dentro del mismo montaje (una flecha ya
  aterrizada no se reordena si `count` sube), distinto en cada remount.

## Animación de la flecha: los 5 anillos = los 5 hitos del funnel (2026-07-26)
**Decisión**: `ArrowToTarget` suma `mode: "random" | "funnel"`. En `"funnel"`,
dónde cae cada flecha ya no es estético — cada uno de los 5 anillos de la diana
(blanco → oscuro → azul → rojo → dorado) representa, de afuera hacia adentro,
uno de los 5 `MILESTONE_KEYS` (`sent → responded → interview → offer →
referral`, `core/registry/types.ts`). El componente recibe `funnelRanks:
number[]` ya calculado (0-4 por flecha) — no importa `core/registry` ni
calcula el rank él mismo, mantiene la regla dura del contrato (§1 de
`animations.md`). `mode: "random"` (default) preserva el comportamiento
anterior.

**Contexto/razón**:
- Ya existía la idea anotada como "extensión post-v1" (colorear por estado del
  funnel); se implementó como **posición** en vez de color porque la diana ya
  tiene 5 anillos concéntricos de sobra — no hace falta un canal visual nuevo,
  y "más cerca del centro = más lejos en el funnel" es una lectura más directa
  que un código de colores que hay que aprender.
- El adaptador real (`rows → funnelRanks`) todavía no existe — es el mismo
  pendiente que ya bloquea montar la escena en la app real (ver
  `animations.md` §1 "Contrato" y estado del doc).

## Animaciones: sin personaje, solo objetos, sin Rive/Quiver/Lottie (2026-07-25)
**Decisión**: se recorta el plan v1 de `animations.md` en dos pasos. Primero, el
arquero pierde el **arco** — la flecha se autolanza (sin tensar/soltar cuerda) — y
el forjador baja de 4 etapas a **un solo beat en loop** (martillo golpea la
flecha sobre el yunque). Después, se saca **el personaje/mascota por completo**:
no hay muñeco disparando ni forjando, son **objetos animando solos** (flecha,
martillo, diana, yunque). Con esto, "arquero"/"forjador" dejan de ser roles de un
personaje y pasan a ser nombres de escena ("flecha a la diana" / "martillo en el
yunque"). Ambas escenas se implementan con **SVG dibujado en código + CSS puro**
(`@keyframes`, custom properties), sin sumar Rive, Lottie, Quiver AI, Framer
Motion ni GSAP.

**Contexto/razón**:
- El plan original pedía **riggear a mano** en Rive (state machine + number input)
  y generar arte con Quiver AI. El usuario no sabe usar Rive y no quiere pagar esa
  curva de aprendizaje solo para esta feature.
- Con el concepto reducido (sin arco, sin etapas de forja, sin personaje), la
  complejidad que justificaba un motor de rig dedicado desaparece: el vuelo de
  una flecha y un martillo golpeando son animables con `@keyframes` + estado de
  React, sin necesitar una state machine visual ni un input numérico atado a un
  runtime externo. Sacar el personaje además elimina el problema de riguear
  anatomía (articulaciones, solapes) — el único pivot que queda es el del
  martillo.
- **Cero dependencia nueva** era un requisito explícito del usuario, no solo
  preferencia de tooling — descarta también las alternativas de código con
  librería (Framer Motion/GSAP) que ya estaban anotadas como plan B.
- Lo que **no** se recorta: la lógica data-driven de la flecha (registros 1:1 /
  andanadas / lluvia, presupuesto de tiempo, gap decreciente) sigue en pie — esa
  complejidad viene de que `count` puede ir de 0 a cientos, no del personaje, así
  que sacar la mascota no la simplifica.
- Trade-off asumido: el arte sale más geométrico/simple (dibujado a mano en
  código) en vez de ilustrado por una tool dedicada — aceptable porque el pedido
  explícito fue "reducir", no "más fiel visualmente".

## "CV enviado" como hito auto-marcado (2026-07-18)
**Decisión**: sumar `sent` ("CV enviado") como primer hito de `MILESTONE_KEYS`
(Acquisition). Se **auto-marca al generar el CV** (directo y diferido, en
`generateCv.ts`) y se puede **desmarcar** si el CV no salió de verdad.

**Contexto/razón**:
- **Anotaciones desde el arranque**: antes la primera anotación posible era en
  "Respuesta recibida", y muchas veces no hay respuesta (ghosting). Con "CV
  enviado" como hito, el envío queda anotable y la data es consistente.
- **Sin campo aparte**: es un hito más en `row.milestones.sent` (jsonb, sin
  migración). El funnel mantiene el fallback por `status` para filas históricas
  sin el hito; el stepper muestra "alcanzado" de forma **acumulativa** (una etapa
  posterior implica las anteriores) para no dejar huecos en data vieja.

## Estado Aceptado + cierre de proceso y colores del embudo (2026-07-18)
**Decisión**: el embudo (stepper por aplicación y card agregada) pasa a colorearse por el
**Estado** de la aplicación, con un modelo único Estado→color: **Aceptado** (verde, terminó
bien) · **Activo** (ámbar, en curso) · **Rechazado** (rojo, terminó mal) · **Borrador** (gris,
sin CV). Se agrega el Estado **Aceptado** al enum (`ApplicationStatus`). Cerrar un proceso =
setear `status` a Aceptado/Rechazado desde el control **"Fin del proceso"** del stepper (o el
badge de Estado); reabrir vuelve a Activo. Una sola resolución por aplicación.

**Contexto/razón**:
- **Faltaba "terminó"**: el stepper mostraba progreso (hitos alcanzados) pero no distinguía un
  proceso vivo de uno cerrado. Ahora el resultado es explícito y de un solo valor (en curso /
  terminó bien / terminó mal), que es justo lo que ya modela `status` (mutuamente excluyente).
- **La etapa donde terminó no es un campo nuevo**: es la etapa más profunda alcanzada
  (`computeFunnel`/`row.milestones`) + el `status`. Único cambio de datos: sumar `"Aceptado"`
  al enum (jsonb, sin migración). Un rechazo sin hitos (ghost tras enviar) queda cubierto: el
  control existe aunque no haya hitos marcados.
- **Aceptado llega al fondo del embudo**: una aplicación Aceptada cuenta en **todas** las
  etapas (hasta Referral), tenga o no hitos marcados — "terminó bien = llegó al final". Es el
  único estado que rompe el conteo por hitos; el resto sigue saliendo de `milestones`. Regla en
  `reachedStage` (`core/funnel.ts`).
- **Activo pasó de verde a ámbar**: el verde queda reservado para Aceptado (terminó bien). Es
  un cambio visible en todos los badges/tabla/filtro, pero mantiene una sola semántica de color
  en toda la app (`statusBadgeClass`/`statusDotClass` en `ui/StatusToggle.tsx`).
- **Chart agregado apilado por Estado**: cada nivel se apila por el color del Estado de las
  filas que lo alcanzaron (cumulativo), orden verde→ámbar→rojo→gris (`FunnelStage.byStatus` en
  `core/funnel.ts`). El gris (Borrador) sólo aparece en Awareness (no llegó a "CV enviado").
- **Stepper**: un proceso cerrado pinta todas sus etapas alcanzadas con el color del resultado;
  uno activo queda neutro salvo la **punta** (etapa más profunda), en ámbar.
- **Colores como tokens de sistema**: `--success`/`--warning` en `globals.css` (junto a
  `--destructive`), usados tanto por los badges como por el chart.
- **Badge de Estado → dropdown**: con 3 estados seteables (Activo/Aceptado/Rechazado) el toggle
  binario ya no alcanza; `StatusToggle` pasa a un `DropdownMenu`. Borrador sigue system-derived.

## Timeline unificado: hitos + actualizaciones en un solo stepper (2026-07-18)
**Decisión**: fusionar el bloque "Hitos del proceso" y el timeline de "Actualizaciones"
en un único componente `MilestoneTimeline` (reemplaza `MilestonesSection` + `UpdatesTab`),
presentado como **stepper vertical** de los 4 hitos AARRR. Cada actualización cuelga de un
hito (`StatusUpdate.milestone`); reached = el hito tiene fecha (`row.milestones[key]`).

**Contexto/razón**:
- **Toggles → stepper**: los switches independientes no leían como funnel (marcar "Oferta"
  dejaba los anteriores apagados, confuso). El stepper con conteo acumulativo se ve como lo
  que es. Marcar un hito **ahora sí auto-setea los anteriores** con la fecha de hoy (editable)
  — esto **revierte** el "el editor no auto-setea hitos anteriores" de la entrada 2026-07-17:
  como el conteo ya implicaba las etapas previas, la UI ahora coincide con el conteo.
- **Saltar es un atajo**: marcar un hito lejano (ej. oferta directa, o un proceso que se
  actualiza tarde) marca alcanzados los intermedios; cada etapa alcanzada pide **al menos una
  anotación** (hint ámbar), pero no bloquea — es guía, no traba.
- **Todo bajo un hito**: cada item pertenece a un hito; las notas generales van al tab
  **Notas** (que ya existe). Los items sin hito — legacy previos a este cambio y el marcador de
  sistema "CV generado" (`deferredGenerationFields`) — caen en un grupo **"Sin hito"** con un
  dropdown para reasignarlos. No es un bucket permanente para notas nuevas: el alta de items
  siempre es por-hito.
- **Fecha aparte por hito**: cada hito conserva su `DatePicker` editable, independiente de los
  timestamps de los items (el funnel/gráfico usa la fecha del hito, no la de los items).
- **Fuente de verdad intacta**: `computeFunnel` sigue leyendo `row.milestones`; el cambio es de
  UI + un campo opcional `milestone` en `StatusUpdate` (jsonb, sin migración).

## Embudo AARRR: hitos estructurados y conteo acumulativo (2026-07-17)
**Decisión**: leer la búsqueda como un pirate funnel (AARRR) de 6 etapas — Awareness =
vacantes registradas, Acquisition = CV enviado (`status !== "Borrador"`), Activation =
respuesta, Retention = entrevista, Revenue = oferta, Referral = referido — en una card
del aside ("Embudo AARRR") con drawer. Las etapas 3–6 salen de un campo nuevo
`milestones` por fila (fechas `YYYY-MM-DD`, marcadas a mano en el tab Actualizaciones).

**Contexto/razón**:
- **Hitos estructurados, no parsear `updates`**: el timeline es texto libre; inferir
  "entrevista" desde prosa es frágil y no auditable. Cuatro switches con fecha son
  baratos y el funnel queda medible de verdad. _(Switches y timeline separado superados
  el 2026-07-18: ver "Timeline unificado" arriba — ahora cada update cuelga de un hito.)_
- **Conteo acumulativo ("llegó al menos a la etapa N")**: un hito posterior cuenta
  también los anteriores, así el embudo es monotónico aunque falte marcar un hito
  intermedio. ~~El editor **no** auto-setea hitos anteriores~~ _(superado 2026-07-18:
  el stepper sí los auto-setea con la fecha de hoy, editable)_. Un Borrador con hito
  cuenta como Acquisition (recruiter contactó sin CV enviado).
- **Referral va último** por fidelidad al modelo AARRR (es la etapa de mayor
  engagement), aunque en un job hunt un referido puede llegar cronológicamente primero.
  El funnel es una lente de aprendizaje, no una línea de tiempo.
- **Todo el histórico** (archivadas y Borrador incluidas): con N chico, filtrar deja el
  embudo vacío; es la foto global de la búsqueda.
- **Visitas fuera de scope**: cbuilder no puede leer las visitas a los links (viven en
  el repo del portfolio y llegan como mails de Gmail) — la etapa "visitó tu portfolio"
  queda para una futura integración.
- **Chart**: shadcn `chart` + recharts con `BarChart layout="vertical"` (barras
  horizontales decrecientes), no el `FunnelChart` de recharts (trapecio vertical, mal
  control de labels en un drawer de 448px). El copy educativo va como HTML bajo el
  gráfico, no como labels SVG. Recharts carga lazy (`next/dynamic`) solo al abrir el
  drawer.
- El export CSV/Markdown (`core/registry/export.ts`) no incluye `milestones` por ahora.
- Requiere migración en Supabase prod **antes** del merge:
  `alter table public.registry add column if not exists milestones jsonb;`

## Cartas en Drive: contrato del script parametrizado + links directos por doc (2026-07-16)
**Decisión**: la cover letter también se sube a Google Drive como Doc nativo, en ambos
flujos (generación del wizard y post-hoc). Tres piezas:
1. **Contrato del Apps Script parametrizado**: el payload gana `docName` (validado,
   default `Lenin_Cuadra_CV` por compatibilidad) — el script deja de hardcodear el
   nombre, así un tipo de documento futuro no requiere tocarlo de nuevo. Los nombres
   viajan desde constantes derivadas de los filenames de core (`lib/gdocs.ts` →
   `CV_DOC_NAME`/`COVER_LETTER_DOC_NAME`, sin drift). **Requiere redeploy manual del
   script ANTES de usar la app nueva** (el script viejo nombraría la carta como el CV).
2. **Links directos por documento** (elección explícita del usuario sobre "solo la
   carpeta"): campo nuevo `driveLetterDocs` (mirror de `driveDocs`), columna
   `drive_letter_docs` jsonb — `schema_version` 6→7.
3. **Entrega rediseñada**: cada archivo enviado es una fila `EN · CV` / `EN · Carta`
   (idioma primero) con dos íconos — abrir su Google Doc en Drive + re-descargar del
   archivo. La fila "Carpeta en Google Drive" desaparece (reemplazada por los íconos
   por documento) y queda solo como fallback para filas legacy sin `deliveryFiles`.
**Contexto/razón**: la redescarga por archivo ya existía (Supabase Storage); lo que
faltaba era el formato Google Doc (editable/exportable a PDF) para la carta — el gap
diferido en "Cover letters en el sink de Drive (v2)". El usuario pidió que funcione "de
forma escalable": la escalabilidad real está en el contrato por-request del script, no
en sumar más constantes hardcodeadas.

## Click-to-edit generalizado: las cards editables del detalle no llevan botón (2026-07-16)
**Decisión**: en el drawer de detalle, toda card de data **editable** se edita
clickeando la card completa (hover + `role="button"`, sin botón "Editar"), abriendo un
takeover con vuelta atrás — la misma affordance de los items de los managers. Aplica a
**Datos** (→ `RowEditForm`) y a las **entradas de Preguntas** (→ `ScreeningNewForm` en
modo edición: prefill, heading "Editar pregunta", `update` con `draft: false`; sin
"Sugerir con IA" en edición — regenerar sobre una respuesta existente se eliminó a
propósito). Los **registros fieles** (Links de tracking, Carta enviada, Entrega) siguen
read-only por diseño: la regla es de comportamiento para lo editable, no convierte en
editable lo que no debe serlo.
**Contexto/razón**: pedido explícito — una sola regla de comportamiento en todo el
producto en vez de botones de edición dispersos.

## Registro nunca bloqueante: Empresa es el único mínimo (2026-07-16)
**Decisión**: registrar una aplicación no puede quedar bloqueado por ningún campo salvo
Empresa. Cuatro cambios en el wizard:
1. **"Registrar sin CV"** (antes "Guardar sin CV", solo en el paso 2) queda visible en
   **todos los pasos previos a Confirmar**, habilitado apenas Empresa es válida. Registrar
   = escribir la empresa y un click. Guarda todo lo completado hasta ese momento; una
   carta escrita a medias viaja como `coverLetterDraft` (nada se pierde — mismo concepto
   que el draft IA; `PendingRowInput.coverLetterDraft`, pass-through en `buildPendingRow`).
2. **El email deja de bloquear** cuando el canal es Email: un email con texto inválido se
   omite del registro (nunca se guarda roto) con un toast avisando; vacío se omite en
   silencio. `RowEditForm` conserva su validación (el pedido es sobre *empezar* el
   registro, no sobre editar).
3. **Preguntas entra al wizard** como paso 5 propio (el wizard pasa a 6 pasos): captura
   repetible de pregunta + respuesta opcional, creadas en el banco pre-vinculadas al
   código al finalizar (Generar CV o Registrar). Incluye "Sugerir con IA" con la regla de
   dos pasos; **"Generar y guardar" persiste al instante** — para eso reusa el mecanismo
   de la carta IA: `ensureDraftRow` (extraído de `handleSaveCoverLetterDraft` en
   `app/page.tsx`) crea la fila Borrador silenciosa con código reservado en la primera
   llamada paga de la sesión. `useScreening.add` ahora devuelve el id creado (`savedId`
   en el wizard evita duplicar al finalizar; ediciones posteriores hacen `update`).
4. **Registrar con `activeRow`** (la sesión ya creó una fila Borrador por un draft IA):
   actualiza esa fila en vez de crear una segunda — `onSavePending(input, activeRow?)`
   devuelve la fila registrada (el wizard vincula las preguntas capturadas a su código).
   Antes esto era un edge alcanzable volviendo del paso 4 al 2; con Registrar visible en
   todos los pasos se volvía mainstream.
De paso: `requestAiAnswer`/`AiAnswerContext` se mueven de `ui/detail/screeningAi.ts` a
`core/screening/ai.ts` (mismo criterio core/ui que `core/coverLetter/ai.ts`; el hook
`useScreeningAiContext` queda en ui/).
**Contexto/razón**: el post-hoc cover letter cerró la mitad de la simetría (todo se puede
completar después); esto cierra la otra mitad (nada es obligatorio al empezar). El uso
real lo pedía: a veces no sabés si te van a pedir carta o preguntas hasta más adelante, y
el registro no debería esperar a eso.

## Cover letter post-hoc: inline en la sección, sin footer nuevo, sin Drive (2026-07-16)
**Decisión**: se agrega un camino para generar la cover letter de una aplicación cuyo CV
**ya se entregó** (hoy solo era posible durante el paso 4 del wizard). El CTA vive **en la
misma posición** donde se muestra la carta ya generada (sección Cover letter del tab
Detalles) — no en un footer nuevo del drawer. Al confirmarlo, entrega el `.docx` real
(no solo texto): descarga + archivo durable (`archiveDeliveryFiles`, agregado a
`row.deliveryFiles` con lectura-modificación-escritura, nunca reemplazo), reusando la(s)
misma(s) carpeta(s) del CV (`folderName` depende solo de `language`/`company`/`code`, ya
en la fila). **Sin Google Docs**: el Apps Script nombra todo `Lenin_Cuadra_CV` — mandar
la carta ahí requeriría cambiar su contrato + redeploy, ya diferido como v2
(`TODO.md`). Tampoco retoma `row.coverLetterDraft` (borradores del wizard abandonado a
medias) — es un concepto del flujo en vivo/diferido, no de este.

De paso, separación `core`/`ui`: `resolveBodiesFor` y `requestAiDraft` (antes en
`ui/wizard/StepCoverLetter.tsx`, tipadas sobre `WizardData`) se mueven a
`core/coverLetter/types.ts`/`core/coverLetter/ai.ts` con firmas primitivas
(`{company, role, who?, focus?, jobContext?}`), igual que `COVER_LETTER_NONE`/
`COVER_LETTER_AI`/`AI_TEMPLATE_NAME` y `languagesFor` (este último, duplicado entre
`ui/wizard/types.ts` y una copia local en `core/generateCv.ts`, ahora vive una sola vez
en `core/types.ts`). El JSX del picker (dropdown Sin cover letter/Compartir contexto/
templates + `AiContextPanel` + textareas por idioma) se extrae a `ui/CoverLetterFields.tsx`
— componente puro sobre props primitivas, sin acoplar a `WizardData` ni a `RegistryRow`.
`ui/wizard/StepCoverLetter.tsx` y el nuevo `ui/detail/CoverLetterGenerateForm.tsx` son
los dos adaptadores finos sobre ese mismo componente.

**Contexto/razón**: la convención de drawers-manager ya escrita esta sesión (acciones de
sección van inline; el footer del drawer solo existe durante un takeover activo) resuelve
la pregunta de ubicación sin ambigüedad — mismo patrón que "Generar CV" de `DeliveryInfo`
para filas pendientes. Entregar el `.docx` real (no solo el texto) fue elección explícita
del usuario: quería el mismo artefacto que si hubiera salido del wizard, no un texto para
copiar a mano como las respuestas de Preguntas.

## Notas generales: de documento único a lista de notas (título + contenido) (2026-07-15)
**Decisión**: "Notas generales" deja de ser un documento markdown único (preview-first,
click-to-edit vía `NotesTab`) y pasa a ser un **manager lista ↔ form** — mismo patrón que
Preguntas/Cover letters/Links estables: lista de notas (solo título por card, click abre
la edición), footer pinneado **"+ Nueva nota"**, form con **Título** (requerido) +
**Contenido** (Textarea markdown libre). Sin vista de lectura renderizada intermedia
(confirmado con el usuario: prioridad a la consistencia entre managers sobre preservar el
render de markdown que tenía el documento único). `core/notes/types.ts` pasa de
`GeneralNotesStore.get()/set()` a CRUD (`list/add/update/remove`, mismo shape que
`ScreeningStore`) — reemplaza la entrada vieja "Notas generales: card propio + store
separado" de más abajo. Tabla Supabase nueva `general_notes_entries` (`schema_version`
5→6); la `general_notes` vieja (singleton `id=1`) queda de paso para la migración
comentada en `schema.sql` (traspasa su contenido como primera nota, después se dropea a
mano). El file store local (`data/notes.json`) migra la forma vieja **sola**, al primer
`list()` — sin paso manual en dev, el contenido real no se pierde.
**Contexto/razón**: pedido explícito de paridad con Preguntas — varias notas
independientes en vez de un solo bloque de texto que crecía sin estructura. No toca
`ui/detail/NotesTab.tsx` (sigue usándose para `row.notes`, el campo por-fila del tab
Notas del detalle — concepto distinto).

## Cover letters: lista única — Template/Enviada es metadata, no tabs (2026-07-15)
**Decisión**: el drawer de Cover letters deja los tabs Templates/Enviadas y pasa a una
**lista única**: primero los templates (editables — click abre el form, patrón manager)
y después las cartas enviadas (registro fiel — badge "Enviada", click abre su
aplicación), más reciente primero. Cada card lleva su metadata como badges: "Template" /
"Enviada" + idiomas. Footer: "+ Crear template" siempre (lo único creable acá). Un solo
empty state cuando no hay nada de nada.
**Contexto/razón**: Templates y Enviadas no son filtros ni vistas distintas — son
propiedades de cada carta. Partirlas en tabs escondía la mitad del contenido detrás de
un click y duplicaba la navegación para una colección chica; con badges la lista dice
todo de una. Alinea Cover letters con el comportamiento del manager de Preguntas.

## La card principal se llama "Nueva aplicación" (antes "Generar un CV") (2026-07-15)
**Decisión**: la card y el drawer del wizard pasan de "Generar un CV" a **"Nueva
aplicación"**; el botón final del wizard pasa de "Generar" a **"Generar CV"** (más
específico sobre lo que dispara). Empty state de la tabla: "Registrá tu primera
aplicación…". "Guardar sin CV" y el drawer diferido "Generar CV · <empresa>" no cambian.
**Contexto/razón**: el feature evolucionó — registra el **inicio de un proceso de
aplicación**, con el CV como parte opcional (existe "Guardar sin CV" y el borrador por
carta IA). "Generar un CV" describía solo un camino y quedaba atrasado como nombre del
punto de entrada principal; "Nueva aplicación" escala a lo que la acción realmente es.

## Generación IA en dos pasos: el contexto vive dentro de la acción (2026-07-15)
**Decisión**: ninguna llamada paga se dispara con un solo click. "Sugerir con IA" (paso 1)
solo abre los inputs de contexto opcionales (`AiContextPanel`, precargados de la fila);
"Generar y guardar" (paso 2) es la única llamada, y persiste el borrador al instante. El
collapsible fijo "Contexto para IA · <modelo>" desaparece de la sección Preguntas y del
form de pregunta nueva. Implementación: entrada vinculada sin respuesta → takeover
`ScreeningSuggestForm` (mismo slot que `RowEditForm`); pregunta nueva → reveal del bloque
de contexto dentro de `ScreeningNewForm`. `ScreeningSection` queda solo lectura +
navegación (pierde todo el estado de IA); el estado compartido de contexto se extrajo a
`useScreeningAiContext` (`ui/detail/screeningAi.ts`). Regla documentada en `DESIGN.md` →
"Generación con IA". El wizard (paso 4) ya cumplía: elegir "Compartir contexto" es el
paso 1.
**Contexto/razón**: el collapsible siempre-visible empujaba la card al expandirse (anti-
patrón, no es un dropdown del DS) y habilitaba generación one-click ("Sugerir y guardar"
directo) — un click accidental = plata gastada + un draft indeseado. Con dos pasos, el
contexto se revisa a conciencia justo antes de pagar, y el costo queda siempre detrás de
una decisión explícita. Completa la línea de "IA: default Haiku + sin regenerar".

## IA: default Haiku + sin regenerar de un click (2026-07-15)
**Decisión**: (1) `DEFAULT_AI_MODEL` pasa de `claude-opus-4-8` a
`claude-haiku-4-5-20251001` — el más barato del allow-list; subir de modelo es una
elección explícita por acción en el picker (se recuerda en `localStorage`). (2) Se
elimina el ícono ✦ "Regenerar respuesta" por entrada en la sección Preguntas del
detalle (agregado en la pasada preventiva del 2026-07-16 — esto lo revierte). "Sugerir
y guardar" queda solo para entradas **sin** respuesta.
**Contexto/razón**: usando el feature en prod, el shortcut de regenerar quedaba a un
misclick de pisar texto revisado y gastar una llamada — el diálogo de confirmación
mitigaba pero el botón no pagaba su riesgo (regenerar casi no se usa). Y el default en
opus hacía que el camino sin fricción fuera el más caro; con Haiku, el costo por
descuido baja al mínimo y la calidad se elige a propósito. El plan mayor (contexto
dentro de la acción de generar, dos pasos siempre) está en el backlog (`TODO.md`).

## Drawers-manager: leer/usar y crear/editar son vistas separadas (2026-07-15)
**Decisión**: los drawers que administran una colección (Preguntas, Cover letters, Links
estables) separan las dos intenciones en vistas: la **lista** de items guardados es el
default (body solo con items o empty state; la card de cada item es clickeable completa y
abre su edición) y **crear/editar** es un takeover del drawer con footer pinneado
Cancelar/Guardar (`ui/DrawerFormFooter.tsx`) que siempre vuelve a la lista. La acción de
crear vive en el `DrawerFooter` de la vista lista ("+ Nueva pregunta", "+ Crear template",
"+ Agregar link"), no como form inline al fondo del body. Aplica también a "Nueva" de la
sección Preguntas del detalle (`ScreeningNewForm`, mismo slot takeover que `RowEditForm`).
Los links estables ganaron edición (antes add-only): `update()` en `StableLinksStore` +
`PUT /api/stable-links/[ref]`.
**Contexto/razón**: los managers mezclaban leer/copiar/usar con crear en un mismo scroll —
el form empujaba la lista, no había footer y la jerarquía era ambigua. El wizard de Generar
CV ya modelaba lo correcto (body = contenido, footer = acciones primarias del flujo);
abrir un registro es la versión "leer" y Generar CV la versión "crear" del mismo patrón.
Esto reemplaza la regla vieja de DESIGN.md de que todo botón de sección va inline: en un
manager, crear ES la acción primaria de la sección → footer.

## Drawer de detalle: tabs arriba (Detalles/Notas/Actualizaciones), Preguntas como sección (2026-07-16)
**Decisión**: el grupo de tabs del panel de detalle sube a quedar pegado debajo de la
barra de acción (Status/Archivar/Borrar), con un tab **Detalles** nuevo al frente que
absorbe todo lo que antes se mostraba sin tabear (Datos, Links de tracking, Carta,
Entrega) — y **Preguntas deja de ser tab**: pasa a ser la última sección de Detalles,
con el mismo chrome de card que Entrega/Links (misma funcionalidad completa).
**Contexto/razón**: con Preguntas como tercer tab, la info de la aplicación quedaba
partida en dos alturas (secciones arriba + tabs abajo del separator) y Preguntas —
que es info de la aplicación, como Entrega — vivía separada de sus pares. Tabs arriba
dan una jerarquía única: primero elegís *qué* mirar, después scrolleás. Cambios de
comportamiento que siguen de esto: (1) click genérico en la fila abre **Detalles**
(murió la regla "tab por defecto según contenido" — los íconos de Seguimiento siguen
abriendo `notas`/`updates` explícitos); (2) prev/next **conserva el tab actual** (antes
recalculaba el default por fila); (3) en modo edición los tabs quedan **visibles pero
los inactivos disabled** — antes el formulario tapaba todo y no sabías dónde estabas.
`ScreeningTab.tsx` → `ScreeningSection.tsx` (renombrado: ya no es un tab).

## Pipeline AI: API de Anthropic in-app, borrador siempre persistido, estado Borrador real
Objetivo: personalización de cartas y respuestas de pre-screening **a velocidad de
generador de CV** — un click, no copiar/pegar contexto en claude.ai cada vez.
Decisiones (2026-07-13, implementado 2026-07-14/15):
- **API de Anthropic integrada** (`app/api/ai/*`, `ANTHROPIC_API_KEY` server-side,
  mismo contrato 501 que `GDOCS_*`/`SUPABASE_*` — sin key o sin context pack, el
  feature queda apagado) en vez de dejarlo manual en claude.ai: automatizar el
  armado de contexto es el punto entero del feature.
- **Workspace dedicado `cbuilder`** en console.anthropic.com con spend limit propio
  ($5/mes), separado del workspace `Default` de la cuenta — así un uso futuro de la
  API para otra cosa no comparte techo con este feature (ni viceversa). El límite de
  organización queda sin tocar (es el techo que envuelve a todos los workspaces).
- **Modelo Opus 4.8**: calidad para texto que lee un hiring manager; costo trivial al
  volumen actual (~$0.07/generación, $5 ≈ 20 aplicaciones completas).
- **Context pack en dos capas, sin duplicar el spec**:
  - Estático (`data/profile/background.md`): bio/experiencia/skills/voz, extraído del
    master del CV + portfolio. **Excepción trackeada** al gitignore de `/data/` — no
    es data del registro (privada), es el mismo CV/portfolio ya público de Lenin, así
    que tiene que llegar a prod vía git (mismo criterio que `public/masters/`). Se
    re-extrae a mano cuando el CV cambia materialmente — no hay sync automático, y
    Lenin lo revisa antes de que el modelo lo use por primera vez.
  - Dinámico por foco (`core/ai/prompt.ts` → `focusCaseContext`): lee
    `data/spec-cache.json` (el mismo cache del linking spec-driven) y arma los case
    studies/proof points del foco de la aplicación. Se descartó copiar esta data a
    `data/profile/`: viviría en dos lugares y se desalinearía con el portfolio real,
    exactamente el problema que la arquitectura spec-driven ya resolvió una vez.
  - **Contexto extra del puesto** (`RegistryRow.jobContext`, campo libre, opcional):
    revisión de la decisión original ("sin input de la vacante") — empresa/rol/foco
    solos daban poca señal por-posting, y un campo de texto es la forma barata de
    sumar detalle real sin comprometerse a scrapear. **Sin headless browser**: un
    Chromium serverless en Vercel es infra real (tamaño de deploy, límites de
    tiempo) para un tool personal, y tampoco resuelve lo que de verdad bloquea el
    scraping (paywalls/anti-bot de LinkedIn, Workday, etc. — eso persiste con o sin
    JS). En cambio, `/api/job-context` busca el `JobPosting` en JSON-LD
    (schema.org) que la mayoría de los ATS grandes ya emiten sin JS, para Google
    Jobs — mejor esfuerzo con `fetch` común, sin infra nueva; si no lo encuentra,
    el campo queda vacío y se completa a mano. Siempre 200, nunca bloquea.
- **Cover letter AI reutiliza el modelo de datos existente**: el botón "Generar con
  IA" con un template elegido **sobrescribe su cuerpo resuelto**, sin
  `coverLetterTemplateId` sintético — evita tocar el gating de generación
  (`coverLetterTemplateId !== ""`) y el `CoverLetterRecord` persistido; volver a
  elegir el mismo template deshace el borrador (recalcula desde el texto del
  template).
  - **Revisión (2026-07-15)**: se agregó igual un `coverLetterTemplateId` sintético
    (`COVER_LETTER_AI = "__ai__"`) — pero como una **opción explícita más** del
    dropdown ("Compartir contexto"), no como default. Motivo: "elegí un template
    primero, incluso uno mínimo" resultaba en fricción real (templates vacíos
    creados solo como excusa para generar con IA). "Compartir contexto" resuelve
    eso sin tocar el gating existente (`!== ""` sigue funcionando, el sentinel es
    un string no vacío) — el trade-off que se aceptó al principio (no inventar un
    id sintético) se abandonó cuando la fricción resultó peor que el riesgo.
- **Sugerencia de pre-screening auto-guarda apenas se genera** (dos puntos del tab
  Preguntas: al crear una pregunta nueva, y para una ya vinculada con
  `answer === ""`): una llamada a la API no se puede deshacer, así que dejarla en
  estado local (perdible si se cierra el drawer) desperdiciaba la generación sin
  ganar nada — el banco ya trata las respuestas como editables siempre (no
  read-only como `CoverLetterRecord`), así que no hay downside real en persistir
  de una. Ajustes de wording después van por el editor de la card Preguntas
  (lápiz), no por acá — este tab quedó scoped a vincular/crear, como ya estaba.
- **El borrador de carta del wizard también persiste apenas se genera**, por el
  mismo argumento (una llamada pagada, no recuperable, no debería perderse por
  cerrar el wizard) — pero acá la solución es distinta porque el wizard es
  inherentemente efímero (nada se guarda, ni empresa ni nada, hasta el paso final
  "Generar"). Se evaluaron dos caminos:
  - **localStorage del browser**: cubre todo el wizard, cero cambios al modelo de
    datos — descartado a pedido explícito en favor de la fila real, para que el
    borrador sea visible/recuperable desde cualquier lado (no solo el mismo
    browser) y sobreviva un cierre de browser, no solo del wizard.
  - **Elegido: reusar el mecanismo de "Guardar sin CV"** (`cvPending`, código
    reservado). El primer "Generar con IA" sin fila todavía crea una silenciosamente
    (`RegistryRow.coverLetterDraft`, campo nuevo y separado de `coverLetter` — este
    último sigue siendo el registro fiel de lo enviado, nunca se toca pre-envío);
    clicks siguientes actualizan esa misma fila. `Wizard.tsx` trackea la fila activa
    en `activeRow` (arranca en `pendingRow` si ya existía uno, o se completa
    mid-sesión) — la resolución de step 3→4 respeta el draft ya guardado
    (`coverLetterEdited: true` al precargarlo, para no pisarlo con el template sin
    resolver).
  - **Por qué el estado se llama "Borrador" de verdad** (tercer valor de
    `ApplicationStatus`, no un badge derivado de `cvPending`): la alternativa barata
    era mostrar "Borrador" solo visualmente sin tocar el tipo — se descartó a pedido
    explícito. El razonamiento a favor de un estado real: `cvPending` ya existía
    antes de este feature y las filas "Guardar sin CV" mostraban **Activo** (verde),
    que es semánticamente incorrecto — Activo/Rechazado son resultados de una
    aplicación *enviada*, y una fila sin CV generado no es ninguna de las dos. El
    fix corrige eso para *todas* las filas pending, no solo las creadas por IA.
    "Borrador" no es togglea­ble a mano (`StatusToggle` lo renderiza como badge
    fijo, no botón) — pasa a **Activo** solo cuando el CV se genera de verdad
    (`deferredGenerationFields`). Costo real: toca el tipo `ApplicationStatus`,
    `StatusToggle`, `StatusFilterDropdown`, y el constraint de `status` en
    Supabase — **al mergear, re-correr `supabase/schema.sql`** (agrega
    `cover_letter_draft`, `job_context`, y reemplaza el check constraint).

- **Revisión (2026-07-15)**: cuatro ajustes tras usar el feature de verdad.
  - **Modelo elegible por acción, con nombres reales**: `core/ai/models.ts`
    (`AI_MODELS`: `claude-opus-4-8`, `claude-sonnet-5`,
    `claude-haiku-4-5-20251001`, `claude-fable-5` — ids tal cual los devuelve
    la API, sin capa de "rápido/calidad"). Se curó la lista a la generación
    actual (se excluyen snapshots superadas como opus-4-1/4-5/4-6/4-7,
    sonnet-4-5/4-6) para que el selector no crezca sin límite — agregar un
    modelo nuevo es una línea. Elegible por acción (cover-letter vs
    screening-answer usan selectores independientes), persistido en
    `localStorage` (`ui/useAiModel.ts`) — preferencia de uso, no data de la
    app, no hace falta backend para esto.
  - **Se sacó "Generar con IA" del modo template real**: generar con IA sobre
    un template solo sobrescribía lo que `resolveTemplateVars` ya resuelve
    gratis ({company}/{role}/{who}) — pagar una llamada a Opus para eso no
    agregaba nada. La IA ahora vive **solo** en "Compartir contexto"
    (sin template); un template real vuelve a ser 100% mecánico, como antes
    de este feature.
  - **Un solo componente de contexto, reusado tal cual**: `ui/AiContextPanel.tsx`
    (link del puesto + Detectar, contexto libre, modelo) es el mismo en el
    wizard ("Compartir contexto") y en el tab Preguntas — mismo input en los
    dos lugares donde hay un botón de generar, solo cambia el output. Esto
    sacó a `jobContext` del paso 2 del wizard (dejó de tener sentido mostrarlo
    ahí si solo importa cuando se genera con IA); `jobUrl` se queda en el paso
    2 porque es un dato general de la aplicación, no específico de IA — el tab
    Preguntas lo precarga desde la fila y lo re-guarda ahí (`onUpdateJobFields`)
    apenas se usa para generar, no en cada tecla.
  - **Las respuestas de pre-screening también quedan marcadas como borrador**:
    `ScreeningQuestion.draft` (booleano, columna nueva en Supabase). Antes el
    banco no distinguía "generado por IA, sin revisar" de "confirmado" — dado
    que estas respuestas sirven dos veces (se mandan en esta aplicación *y*
    quedan de template para las próximas), tiene sentido saber cuál está
    revisada. A diferencia de `coverLetter`/`coverLetterDraft` (que si
    distinguen un registro final inmutable), acá el banco siempre fue mutable
    por diseño — `draft` es puramente informativo, no bloquea reuso ni
    vinculación, se limpia con cualquier edición manual desde la card
    Preguntas.
  - **Tres bugs reales de esta vuelta, encontrados usando el feature**:
    `/api/screening` y `/api/screening/[id]` tenían un allow-list de campos
    que no incluía `draft` — se mandaba desde el cliente pero el server lo
    tiraba en silencio (compilaba bien, se perdía en runtime; solo apareció
    verificando en browser). `ScreeningTab` no tenía `key={row.code}` — al
    navegar entre filas con prev/next del drawer, React no remontaba el
    componente y `jobUrl`/`jobContext` quedaban pegados a la primera fila
    vista en la sesión. Y `/api/job-context` solo buscaba JSON-LD — algunos
    job boards regionales (ej. empleos.personal.com.ar) usan Microdata
    (`itemprop="description"` como atributos HTML) en cambio; se agregó como
    fallback. LinkedIn sigue sin funcionar — auth wall + vista de búsqueda sin
    datos server-side, no hay fix sin headless + login.

  - **"Enviadas" en la card Cover Letters, no una lista nueva**: se consideró
    y descartó tratar las cartas con IA como si fueran templates (no tiene
    sentido "reusar" una carta armada con contexto específico de una empresa
    para otra). Lo que sí faltaba era **ver todo lo mandado en un lugar**, sin
    entrar fila por fila — se agregó como un segundo tab en la misma card
    (`SentLettersList`, lee `rows` filtradas por `coverLetter` seteado, sin
    duplicar el dato) en vez de una card nueva, para no sumar otro ítem a la
    columna derecha por algo que es, en esencia, otra vista de los templates.

- **Pasada preventiva pre-commit (2026-07-16)** — el feature gasta plata, así
  que los guardrails van del lado del server y las acciones caras confirman:
  - `jobContext` se capa a 4000 chars en `buildContextBlock` (server-side):
    "Detectar" ya cortaba ahí, pero un pegado manual no tenía límite — sin el
    cap, el costo de input escalaba con lo que se pegara.
  - Las rutas de IA **ecoan el modelo usado** en la respuesta: trazabilidad de
    cada llamada paga y verificación de que el selector no cayó al default en
    silencio.
  - **Regenerar** una respuesta existente (ícono ✦ en el tab Preguntas)
    **confirma antes** vía `ConfirmDelete`: pisa texto revisado Y gasta una
    llamada — ambos irreversibles, así que no va directo como el resto de los
    botones de IA (que solo escriben sobre campos vacíos o borradores).
  - La IA **no** se agregó al banco global (card Preguntas): sin contexto de
    aplicación la respuesta sale genérica — gasto con poco valor. Un hint en
    el formulario del banco lo explica y apunta al tab por-aplicación.
  - **Réplica sin costo en claude.ai** (`docs/claude-ai/`): Project + Skill
    espejando `core/ai/prompt.ts`, con `background.md` y `spec-cache.json`
    como knowledge. Para iterar gratis y como fallback si el crédito se agota
    a mitad de una aplicación — el costo nunca bloquea una postulación. Las
    copias del pack dentro del skill folder están gitignoreadas (solo
    `SKILL.md` trackeado) para no duplicar la fuente.

## Versionado: cuatro ejes (app / masters / schema / spec), no un solo número
La app, el contenido del CV, la forma de Supabase y el contrato del portfolio evolucionan
a ritmos distintos — un SemVer único obligaría a bumpear software al editar un `.docx`, o
al revés, y no dice qué re-correr en prod. Decisión: **cuatro convenciones separadas**
(`package.json`, `assets/*_vNN`, `schema_version` en `schema.sql`,
`SUPPORTED_SPEC_VERSION`), más un checklist post-merge a `main` (bump app, re-correr SQL,
sync `public/masters/`, alinear spec). SemVer `0.x` hasta cerrar fase 2; tags git
opcionales; sin `CHANGELOG.md` (git + este log alcanzan). Guía completa para decidir en
el futuro: `docs/versioning.md`.

## Banco de preguntas de pre-screening: global, vinculado por código (sin tags/analytics en v1)
Las aplicaciones hacen preguntas únicas que cuestan tiempo/pensamiento ("Project you are
most proud of", "How well does your portfolio reflect your skills…"). El feature las
registra para (1) reutilizar respuestas rápido y (2) ver qué preguntó cada empresa.
Decisiones:
- **Banco global** (card "Preguntas", triple-store `screening_questions`) y no entradas
  por-fila: el objetivo #1 es reutilizar — si vivieran solo dentro de cada fila, encontrar
  "qué respondí a algo parecido" sería revolver filas a mano. La vista por aplicación se
  deriva: cada entrada referencia los códigos donde se usó (`codes`), y el tab
  **Preguntas** del drawer filtra por el código de la fila (crear pre-vinculada, vincular
  del banco, desvincular, copiar).
- **"Si funcionó" no se trackea**: se lee del estado (Activo/Rechazado) de las filas
  referenciadas. Cero modelo extra.
- **Respuesta vacía permitida**: registra "me preguntaron esto" con la respuesta pendiente.
- **v1 sin tags, buscador ni analytics** — ahí empezaría el feature creep; se escala si la
  práctica lo pide.

## Registrar un proceso sin CV (código reservado, `cvPending`)
Un proceso puede arrancar sin entregable (un recruiter escribe y la charla empieza antes
de mandar nada); antes la única forma de "denotar que inicié el proceso" era generar el CV.
Ahora el paso 2 del wizard ofrece **"Guardar sin CV"**: crea la fila con el **código ya
reservado** (mismo `generateCode`, colisión-checked) y `cvPending: true`. Decisiones:
- **El código se asigna al crear la entrada**, no al generar el CV. El MMDD del código
  refleja el inicio del proceso (dato interno, no afecta el tracking); a cambio la PK y
  todo el storage quedan intactos. Se descartó un ID provisional + refactor de PK.
- **Una entrada puede quedar sin CV para siempre** (procesos que mueren temprano). El
  estado pendiente es ortogonal a Activo/Rechazado y a archivado.
- **UI**: ícono `FileClock` muted en la celda Seguimiento (convive con notas/updates/🚩/
  inactividad); el CTA "Generar CV" vive en la card Entrega del drawer.
- **Generación diferida**: abre el wizard en modo `pendingRow` (arranca en "Idioma y
  foco", usa el código reservado) y actualiza la fila in-place. La **fecha de la fila no
  cambia** (= inicio del proceso); la traza temporal queda en una update automática
  **"CV generado"** en el timeline, y la carta lleva la fecha del día de generación.

## Archivo por archivo, re-descargable (Supabase Storage en deploy)
Reemplaza el archivo de zips: ahora se archivan los **archivos entregados sueltos**
(`<carpeta>/Lenin_Cuadra_CV.docx` + carta si hay), detrás de `CvArchiveStore` — local en
`data/cvs/`, en deploy en el **bucket privado `cvs` de Supabase Storage** (creado por
`schema.sql`; service key, sin URLs públicas). Razón: el objetivo real es **"descargar
este CV"** para compartirlo o subirlo en otro lado rápido — el zip mete fricción, sobre
todo desde el teléfono. Cada archivo se re-descarga con un tap desde la card Entrega
(`GET /api/cvs/<path>`), también en el deploy. El **zip de descarga inmediata al generar
no cambia** (es el empaquetado para enviar); solo cambió la forma del archivo durable.
Los paths archivados se persisten en `row.deliveryFiles` (como `driveDocs`: solo si el
archivado corrió OK). Se descartó Drive/Apps Script para esto (servir bytes de vuelta por
el webhook es más frágil que un GET al bucket; los Docs de Drive siguen cubriendo el caso
"mirar en Drive").

## Columna "Foco" propia (header `Crosshair`), icon-only, entre Código y Empresa
El icono de foco por perfil dejó de vivir junto al código (decisión previa, "Filtro de
estado como dropdown-embudo; foco visible junto al código") y pasó a una **columna propia**
entre Código y Empresa, con el mismo patrón que Canal: **icon-only con icono en el header**
(`Crosshair`) que le da nombre a la columna — sin él, los glifos por perfil flotaban sin
etiqueta y no se entendía qué eran. Las filas conservan el icono por perfil (`FocusIcon`:
payments→CreditCard, ai→Sparkles, conversion→TrendingUp; tooltip `Foco: <label>`), y las que
**no** tienen foco muestran `Dot` (tooltip "Sin foco") en vez de quedar vacías, para que la
columna lea consistente. Todos estos iconos (header y celdas) van en **`text-foreground`**
(`oklch(0.985 0 0)`, el blanco más claro del DS — pedido explícito: sin tokens nuevos), a
diferencia de los demás iconos de la tabla que usan `text-muted-foreground`: marcan estado de
la fila, no texto secundario. A diferencia de Canal (centrado), la columna va **alineada a la
derecha y sin padding derecho** (`pr-0 text-right`): el icono queda a un padding de celda
(8px) del nombre de la empresa, conservando la distancia que tenía cuando vivía inline junto
al nombre (pedido explícito). Anchos rebalanceados para pagar el 5% nuevo (Empresa 18→17,
Rol 22→20, Fecha 12→11 — ahora muestra `DD-MM` sin año, ver commit — Seguimiento 18→17).

## Features locales (archivo data/cvs, Finder) → 501 en deploy, UI en silencio/info
El archivo local de zips y el "Mostrar en Finder" son **features locales**: solo tienen
sentido corriendo la app en la Mac del usuario (en Vercel el filesystem es efímero y no hay
Finder). Se formalizó el mismo contrato que el sink de gdocs: **HTTP 501 = "feature apagado
acá"**, y la UI lo trata como estado, no como error — el archivado en deploy no muestra
nada (antes: toast warning "No se pudo archivar…" en cada generación — ruido esperado), el
botón Finder del toast de éxito solo aparece si el archivado corrió, y el del drawer
responde con un toast **info** explicando la realidad ("solo funciona corriendo la app
local en tu Mac") en vez del error en inglés "Finder reveal is only available on macOS".
`archiveCvZip` devuelve `boolean` (false = off) y `revealCvZip` devuelve `null | mensaje`.
Regla general: si un feature depende del entorno, la ruta responde 501 y el cliente lo
degrada a info/nada — los errores rojos quedan para fallos reales.

## Cover letters: templates como data + letterhead programático (no un master por tipo)
El feature de cover letters por tipo de aplicación se diseñó con **templates como data**
(markdown con variables `{company}`/`{role}`/`{who}`, tabla `cover_letter_templates` con el
patrón triple-store: file + Supabase + API) en vez del instinto natural de replicar el
pipeline del CV con un master `.docx` por tipo × idioma. Razones: (1) escalar un tipo nuevo
= crear una fila desde la card "Cover letters", no 2 archivos más; (2) el editor del usuario
**rompe hyperlinks/placeholders** al editar masters (saga conocida de los v14/v15) — acá no
hay archivo que romper. Por lo mismo, el **letterhead se genera programáticamente**
(`core/coverLetter/docx.ts`: nombre + rol + contacto `hi@`/`hola@` + fecha localizada, misma
paleta/tipografía del CV, **sin links trackeados**) — si algún día se quiere un letterhead
diseñado a mano, se cambia detrás de `buildCoverLetterDocx` sin tocar el resto. Reglas:
- **Flujo**: paso 4 (opcional) del wizard → elegir template → el cuerpo llega con las
  variables resueltas y es **editable por aplicación** (lo que ves es lo que va al docx).
  El texto final se persiste en `row.coverLetter` (`{templateId, templateName, bodies}`),
  **read-only post-creación** — registro fiel de lo enviado, como `links`. Solo se
  persisten los idiomas que efectivamente salieron con carta.
- **Entrega**: `Lenin_Cuadra_Cover_Letter.docx` (sin tracking en el nombre) dentro de la
  misma carpeta del zip → descarga + archivo local (`data/cvs`) la llevan gratis. **No va
  al sink de Drive en v1**: el Apps Script nombra todo `Lenin_Cuadra_CV` (cambiar el
  contrato = redeploy del script); el zip archivado ya es el registro fiel.
- **Markdown mínimo** en el cuerpo: párrafos, saltos de línea, `- ` listas, **negrita**,
  *cursiva*. Es una carta, no un documento.
- Con "Ambos", cada carpeta lleva la carta solo si el template tiene cuerpo en ese idioma
  (el paso avisa si falta).

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
**Reemplazada por "Archivo por archivo, re-descargable" (más abajo)** — el archivo ya no
guarda el zip sino los archivos sueltos, y en deploy va a Supabase Storage. Queda el
razonamiento original: cada generación, además de descargarse, se **archiva** (gitignoreado
vía `/data/`, misma regla de privacidad que el registro). Razón: los masters evolucionan
(v13 → v14 → …), así que un delivery pasado **no se puede regenerar idéntico** — el archivo
es el único registro fiel de lo que se envió. El archivado **nunca bloquea la entrega**:
si falla, el zip igual se descarga y un toast warning lo avisa. Los zips ya archivados
quedan como legacy (la card Entrega los muestra solo con reveal en Finder).

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
_Superseded por "Notas generales: de documento único a lista de notas" más arriba — el
`get()/set()` de un documento único que describe esta entrada ya no es el contrato._

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
