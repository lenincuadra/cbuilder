# Arquitectura y features (cv-builder)

Mapa del **qué y cómo** del sistema. El **por qué** (trade-offs, decisiones que
cambiaron) vive en [`decisions.md`](decisions.md); los flows a **altura de
uso** (qué hace el usuario, paso a paso, catálogo completo), en
[`flows.md`](flows.md); las convenciones de UI, en [`DESIGN.md`](DESIGN.md);
el plan de las animaciones de marca, en [`animations.md`](animations.md);
las reglas inviolables resumidas, en [`CLAUDE.md`](../CLAUDE.md). Este doc
conecta las piezas.

## Qué hace la app

Genera el CV de Lenin Cuadra para una aplicación concreta, con un **código de
tracking** insertado en los links del header, y mantiene un **registro** privado
de a dónde y cómo se aplicó a cada puesto. El output es un `.docx` editable
(nunca PDF renderizado): se rellena un master por reemplazo de un placeholder.
Además lee la búsqueda como un **embudo AARRR** (card Embudo AARRR): las dos
primeras etapas salen de las filas y su estado; las profundas, de los hitos
manuales por aplicación (`milestones`). Cada nivel se colorea/apila por el
**Estado** de las aplicaciones que lo alcanzaron (Aceptado=verde, Activo=ámbar,
Rechazado=rojo, Borrador=gris) — mismo modelo de color en el stepper por
aplicación (ver decisions.md → "Estado Aceptado + cierre de proceso").

Dos sistemas separados, en repos distintos:

| Repo | Rol | Público |
|---|---|---|
| **cv-builder** (este) | Escribe los links de tracking en el `.docx`; back-office privado del registro. Corre local. | Código sí, data no |
| **portfolio** (`lenincuadra.com`, repo aparte) | Recibe los clicks, trackea, redirige, personaliza. GitHub Pages. | Sí |

La regla de oro: **cv-builder ESCRIBE los links, el portfolio los RECIBE.** El
único acoplamiento es el contrato del `ref` (ver "Modelo de tracking").

## Separación core / ui / lib

- **`core/`** — lógica pura, sin React ni I/O. Testeable en aislamiento.
  - `tracking.ts` — generación del código (`MMDD` + letra + dígito), reservados, colisiones.
  - `links.ts` — `PORTFOLIO_BASE`, `LINK_ID` (P/L/G), `trackedLinks()`, perfiles de foco.
  - `docx.ts` — `fillMaster()`: reemplaza los placeholders `ref=li-cv` por los links reales.
  - `coverLetter/` — templates por tipo de aplicación (`types.ts`: modelo + variables
    `{company}`/`{role}`/`{who}` + store interface) y `docx.ts`:
    `buildCoverLetterDocx()` genera la carta completa (letterhead programático con la
    paleta del CV + cuerpo markdown → párrafos docx). Sin links trackeados.
  - `folderName.ts`, `zip.ts` — nombre de carpeta `[IDIOMA]_[empresa]_[código]`, empaquetado.
  - `generateCv.ts` — orquesta todo: código → llena master(s) → carta(s) opcionales → zip →
    fila del registro.
  - `staleness.ts`, `dates.ts` — alerta de inactividad, formato de fechas.
  - `funnel.ts` — embudo AARRR: `FUNNEL_STAGES` (6 etapas con su copy educativo) y
    `computeFunnel(rows)` (conteo acumulativo "llegó al menos a la etapa N" sobre
    `status` + `milestones`; ver decisions.md → "Embudo AARRR"). Cada etapa trae
    además `byStatus` (desglose por Estado: accepted/active/rejected/draft) para
    apilar/colorear las barras.
  - `registry/types.ts`, `notes/types.ts` — modelos + interfaces de storage.
- **`ui/`** — componentes React (la tabla, el wizard, el drawer, los cards).
- **`lib/`** — pegamento con el navegador/servidor: storage, descarga, sinks
  (`archive.ts`, `gdocs.ts`), carga de masters (`masters.ts`).
- **`app/`** — Next.js: `page.tsx` (orquesta la UI) + `api/*` (rutas server).

## Pipeline de generación

Desde el wizard hasta los tres destinos del CV. `generateCv()` es puro (dados sus
deps); `page.tsx#handleGenerate` maneja los efectos.

```
Wizard (empresa, idioma, foco, opcionales)
   │
   ▼
generateCv()  ── código único (colisión-checked) ── fillMaster() por idioma ── zip
   │                                                                             │
   ▼ devuelve { code, entries[], zipName, zip, row }                            │
   │                                                                             │
handleGenerate reparte a TRES destinos (ninguno bloquea a otro):               │
   │                                                                             │
   ├─ 1. Descarga  → downloadBytes(zip, zipName)          (siempre)             │
   ├─ 2. Archivo   → POST /api/cvs?path= (por archivo entregado)                │
   │        → data/cvs/<carpeta>/ (local) o Supabase Storage (deploy)           │
   └─ 3. Google Docs → POST /api/gdocs (por idioma) → Drive del usuario (opcional)
        └─ las URLs se guardan en row.driveDocs vía update()
   │
   ▼
Toast de éxito con dos CTAs: [Finder] (revela el CV archivado) · [Detalles] (abre el drawer)
```

Detalles de cada destino:

1. **Descarga** — el `.zip` con `<carpeta>/Lenin_Cuadra_CV.docx` (o dos carpetas
   para "Ambos"), más `Lenin_Cuadra_Cover_Letter.docx` en cada carpeta cuyo idioma
   tenga carta (paso opcional del wizard: template resuelto + editable por
   aplicación; el texto final se persiste en `row.coverLetter`, read-only). El
   nombre del archivo entregable nunca lleva tracking.
2. **Archivo durable, por archivo** — copia fiel de cada archivo entregado
   (`<carpeta>/<archivo>.docx`), detrás de `CvArchiveStore`: local en `data/cvs/`
   (gitignoreado), en deploy en el bucket privado `cvs` de Supabase Storage. Los
   masters evolucionan (v13 → v14 → v15…), así que un CV pasado no se puede
   regenerar idéntico; este archivo es el único registro exacto **y la fuente para
   re-descargar un CV después** (card `DeliveryInfo` → `GET /api/cvs/<path>`, un
   tap incluso desde el teléfono). Ver [`decisions.md`](decisions.md) → "Archivo
   por archivo, re-descargable".
3. **Google Docs sink** (opcional) — cada CV **y su cover letter** se crean en el
   Drive del usuario como Google Docs nativos, listos para bajar como PDF. El nombre
   del doc viaja por request (`docName`, validado — contrato escalable del Apps
   Script; constantes `CV_DOC_NAME`/`COVER_LETTER_DOC_NAME` en `lib/gdocs.ts`).
   Apagado si faltan las env vars. Setup: [`gdocs-setup.md`](gdocs-setup.md).

`zipName`, `deliveryFiles`, `driveDocs` y `driveLetterDocs` se **persisten en la
fila**, así el drawer muestra dónde quedó la entrega para siempre (no solo recién
generado) — card `DeliveryInfo`: una fila por archivo (`EN · CV`, `EN · Carta`) con
abrir-en-Drive + re-descargar.

**Segunda vía: cover letter siempre post-hoc, nunca dentro del `.zip` del CV.** La
carta no es un paso del wizard — es una acción opcional (`CoverLetterSection`/
`CoverLetterGenerateForm`) disponible en dos puntos: el detalle de la fila (CV ya
entregado) y el paso Confirmar del wizard, antes de generar el CV (ver "Confirmar:
acciones opcionales" abajo). Mismo componente en los dos, reusando el mismo picker
de template/IA (`ui/CoverLetterFields.tsx`, compartido) pero **sin** tocar
`generateCv()`: `core/coverLetter/deliver.ts` construye el/los `.docx` con
`buildCoverLetterDocx()` y reconstruye la(s) misma(s) carpeta(s) del CV con `folderName()`
(depende solo de `language`/`company`/`code`, ya en la fila). Mismos tres destinos
siempre: descarga + archivo durable + Drive (`archiveDeliveryFiles` /
`createGoogleDoc`, siempre **agregando/mergeando** sobre `deliveryFiles`/
`driveLetterDocs`, nunca reemplazo — lectura-modificación-escritura).

**Confirmar: acciones opcionales (cover letter / preguntas).** El último paso del
wizard (`StepConfirm.tsx`) suma, al final del resumen y la preview de carpeta, las
mismas secciones `CoverLetterSection`/`ScreeningSection` que usa `RowDetailDrawer` —
no pasos dedicados. Sin fila real todavía muestran un teaser colapsado ("Sin cover
letter todavía." / "Ninguna pregunta registrada…" + botón); al tocar el botón,
`Wizard.tsx` llama `onEnsureRow` (`ensureDraftRow`, `app/page.tsx`) pasándole el
`previewCode` **ya mostrado** en la preview de carpeta — así la fila Borrador que se
crea en silencio siempre cae en el mismo código, nunca uno distinto — y recién ahí
abre el takeover real (`CoverLetterGenerateForm` / `ScreeningNewForm` /
`ScreeningSuggestForm`, idénticos a los que usa el detalle post-generación),
reemplazando el body + footer del wizard igual que cualquier otro takeover. Si el
wizard se cierra sin generar el CV, esa fila Borrador queda en la tabla (mismo caso
que "Registrar sin CV", arriba). Al generar el CV de verdad, `deferredGenerationFields`
preserva el `coverLetter` que ya haya quedado seteado en la fila (no lo pisa con
`undefined` solo porque la generación en sí ya no carga una carta).

## Registrar sin CV (generación diferida)

Un proceso puede arrancar sin entregable (ej. un recruiter escribe y la charla
empieza antes de mandar nada, o todavía no sabés qué te van a pedir). Todos los
pasos previos a Confirmar ofrecen **"Registrar sin CV"** (con **empresa o
contacto** alcanza — un recruiter puede escribir antes de saber la empresa; la
empresa se exige recién al generar el CV, que la usa en el nombre de carpeta):
`buildPendingRow()` (`core/generateCv.ts`) crea la fila con un **código reservado**
(mismo `generateCode`, o el ya reservado si se pasa uno explícito — ver abajo —
chequeado contra colisiones) y `cvPending: true` — sin idioma, foco, links ni
delivery. Si la sesión ya creó una fila Borrador silenciosa (una carta o
pregunta opcional generada desde Confirmar, ver más abajo), Registrar la
**actualiza** en vez de duplicar. En la tabla, la celda Seguimiento muestra un
`FileClock` muted; puede quedar así para siempre (procesos que mueren
temprano).

Cuando el CV hace falta, la card Entrega del drawer abre el wizard en **modo
diferido** (`PendingCvDrawer` + prop `pendingRow`): arranca en "Idioma y foco"
(los pasos 1–2 viven en la fila, editables desde el panel) —salvo que la fila no
tenga empresa todavía, en cuyo caso arranca en "Empresa y contacto" para
completarla (obligatoria para generar)— y confirma con el código ya reservado. `deferredGenerationFields()` actualiza la fila in-place:
limpia el flag, aplica los campos del CV y agrega la update automática
**"CV generado"** al timeline. La fecha de la fila (inicio del proceso) no cambia;
la carta lleva la fecha del día de generación.

## Modelo de tracking

- **Código**: `MMDD` + una letra de `abcdefghjkmnpqrstuvwxyz` + un dígito de
  `23456789`. Ej. `0628r4`. Único por aplicación, colisión-checked contra el
  registro. Reservados nunca generados: `me`, `li-profile`, `organic`, `li-cv`,
  `web-cv`.
- **Identificador de link** (`LINK_ID`): se apenda al código para saber qué link
  se clickeó — portfolio `P`, LinkedIn `L`, GitHub `G`. Ej. `0628r4P`.
- **Ruteo**: el portfolio va **directo** (`lenincuadra.com/?ref=<código>P`);
  LinkedIn y GitHub pasan por **`go.html`** (`?ref=<código>L&dest=linkedin` /
  `G&dest=github`) porque esos hosts no aceptan el `?ref=`.
- **Foco** (`&focus=<perfil>`): opcional, appendeado a los tres links. El
  portfolio reordena/destaca sus casos para ese visitante (regla: ordenar, no
  ocultar). Perfiles en `FOCUS_PROFILES` (`core/links.ts`), espejo manual de
  `data/profiles.js` del portfolio — **al agregar un perfil allá, actualizar
  acá**. Ver [`decisions.md`](decisions.md) → "Foco del portfolio".
- Todo esto se hornea en el `.docx` en `fillMaster()`, que exige **exactamente 3
  placeholders** `ref=li-cv` (1 portfolio, 1 linkedin, 1 github) o falla.

## Capas de storage

Varios documentos independientes, cada uno detrás de su interfaz. El cliente siempre
habla con las API routes (`Api*Store`); en el server, una factory por documento
(`getServer*Store`) elige Supabase con la service key (si están las env vars) o el
file store local. Se puede cambiar la implementación sin tocar `core/` ni `ui/`.

| Documento | Interfaz | Default local | Durable (deploy) — factory server |
|---|---|---|---|
| Registro | `RegistryStore` | File store (`data/registry.json`) vía API + `ApiRegistryStore` | `SupabaseRegistryStore` — `getServerRegistryStore`. Incluye `milestones` (jsonb `{responded?, interview?, offer?, referral?}`, fechas `YYYY-MM-DD`) para el embudo AARRR |
| Notas generales (lista) | `GeneralNotesStore` (`core/notes/types.ts`) | File store (`data/notes.json`) vía API — migra sola el documento único viejo a la primera nota | `SupabaseGeneralNotesStore` contra `general_notes_entries` — `getServerNotesStore` |
| Links estables | `StableLinksStore` | File store (`data/stable-links.json`) vía API | `SupabaseStableLinksStore` — `getServerStableLinksStore` |
| CV del portafolio (versión publicada) | `PortfolioCvStore` (`core/portfolioCv/types.ts`) | File store (`data/portfolio-cv.json`) vía API | `SupabasePortfolioCvStore` (tabla `portfolio_cv`) — `getServerPortfolioCvStore` |
| Cover letters (templates) | `CoverLetterTemplatesStore` | File store (`data/cover-letter-templates.json`) vía API | `SupabaseCoverLetterTemplatesStore` — `getServerCoverLetterTemplatesStore` |
| Preguntas de pre-screening | `ScreeningStore` (`core/screening/types.ts`) | File store (`data/screening-questions.json`) vía API | `SupabaseScreeningStore` — `getServerScreeningStore` |
| Archivo de CVs (binarios) | `CvArchiveStore` (`lib/storage/cvArchive.ts`) | File store (`data/cvs/<carpeta>/`) vía API | `SupabaseCvArchiveStore` — Storage bucket privado `cvs` — `getServerCvArchiveStore` |

Las factories usan un cliente admin compartido (`getSupabaseAdmin`, service
key, server-only). Las tablas Supabase (`registry`, `general_notes_entries`,
`stable_links`, `cover_letter_templates`, `screening_questions`, `portfolio_cv`)
tienen RLS on sin policy → solo la service key entra.

Notas de los file stores: **acceso serializado** (cola serial → read-modify-write
atómico) + **escritura atómica** (tmp + rename), para no perder filas ni corromper
el JSON con requests concurrentes. Ver [`decisions.md`](decisions.md) → "File
store". `LocalStorageRegistryStore` existe como alternativa pero ya no es default
(era por-navegador).

**Privacidad**: el repo es público, la data del registro es privada. `data/` está
gitignoreado; nada de a quién aplicó Lenin llega a git. Para deploy compartido,
Supabase ([`supabase-setup.md`](supabase-setup.md)).

## Rutas API

| Ruta | Método | Qué hace |
|---|---|---|
| `/api/registry` | GET/POST | Lista / agrega filas (file store) |
| `/api/registry/[code]` | PATCH/DELETE | Edita / borra una fila |
| `/api/notes` | GET/PUT | Lee / guarda las notas generales |
| `/api/cvs` | POST | Archiva un archivo entregado (`?path=<carpeta>/<archivo>.docx`, body binario, path validado). Local → `data/cvs/`; deploy → Supabase Storage. **501** si no hay store acá (deploy sin Supabase) |
| `/api/cvs/[...path]` | GET | Descarga un archivo archivado (attachment `.docx`) — la re-descarga de la card Entrega |
| `/api/cvs/reveal` | POST | Revela un archivo archivado (o un zip legacy) en Finder (`open -R`). **501 en deploy o fuera de macOS** — la UI lo muestra como info, no error |
| `/api/gdocs` | POST | Reenvía el `.docx` al webhook de Apps Script del usuario (501 si no configurado) |
| `/api/stable-links` | GET/POST | Lista / agrega links estables (touchpoints permanentes) |
| `/api/stable-links/[ref]` | DELETE | Quita un link estable del registro |
| `/api/portfolio-cv` | GET/POST | Lee el estado de publicación del CV genérico / marca una versión publicada por idioma |
| `/api/cover-letters` | GET/POST | Lista / crea templates de cover letter |
| `/api/cover-letters/[id]` | PATCH/DELETE | Edita / borra un template |
| `/api/screening` | GET/POST | Lista / crea preguntas de pre-screening (banco global) |
| `/api/screening/[id]` | PATCH/DELETE | Edita / borra una pregunta (incl. vincular códigos) |
| `/api/ai/cover-letter` | POST | Borrador de carta por idioma (Opus 4.8), grounded en el context pack. **501** si falta `ANTHROPIC_API_KEY` o el context pack |
| `/api/ai/screening-answer` | POST | Respuesta sugerida a una pregunta de pre-screening (Opus 4.8), misma base. **501** en las mismas condiciones |
| `/api/job-context` | POST | Mejor esfuerzo: extrae la descripción de `JobPosting` (JSON-LD) de una URL de posting, sin headless. Siempre 200, `{context: null}` si no encuentra nada |

## Pipeline AI (cover letters / respuestas de pre-screening)

Dos rutas server (`/api/ai/cover-letter`, `/api/ai/screening-answer`) llaman a
la API de Anthropic para producir un **borrador** — el usuario siempre
revisa/edita, nunca se persiste como final sin pasar por ahí. Un solo flow,
repetido en los dos puntos donde se genera (el porqué en
[`decisions.md`](decisions.md) → "Pipeline AI"; los use cases concretos, paso
a paso, en [`flows.md`](flows.md)):

| # | Acción hecha | Dónde/qué sucede por detrás |
|---|---|---|
| 1 | Una acción explícita abre el bloque de contexto (**dos pasos siempre**, ver `DESIGN.md` → "Generación con IA"): "Compartir contexto" al generar una carta, "Sugerir con IA" en preguntas | `ui/AiContextPanel.tsx` — un solo componente, usado tal cual en `CoverLetterGenerateForm` (detalle de la fila o paso Confirmar del wizard) y en los takeovers de sugerencia del drawer (`ScreeningSuggestForm`, reveal en `ScreeningNewForm`); nunca fijo en vistas de lectura |
| 2 | Usuario ajusta el contexto opcional: link del puesto + "Detectar", contexto libre, modelo (precargados de la fila) | "Detectar": `POST /api/job-context` — busca `JobPosting` en JSON-LD del HTML (sin headless), `context: null` si no encuentra nada; nunca bloquea ni llama a Anthropic |
| 3 | Click en "Generar con IA" (carta) / "Generar y guardar" (pregunta) — la única llamada paga | Sin atajos one-click ni regenerar sobre respuestas existentes (misclick = texto pisado + llamada gastada) |
| 4 | Llamada a `/api/ai/cover-letter` o `/api/ai/screening-answer` con el contexto compartido + el modelo elegido + lo específico del caso | `core/ai/prompt.ts` arma el prompt igual en ambos (capa `jobContext` a 4000 chars — un pegado gigante no infla el costo de input); `core/ai/models.ts` valida el `model` contra el allow-list (`DEFAULT_AI_MODEL` si falta o es inválido); la respuesta **ecoa el modelo usado** |
| 5 | El resultado se persiste — momento distinto en cada caso | Pregunta: **inmediatamente**, entrada del banco con `draft: true` (una llamada paga nunca se pierde por cerrar algo). Carta: recién al enviar el form con **"Generar y entregar"** — el texto generado vive en el textarea hasta ahí, sin persistencia intermedia (ver "Carta" abajo) |
| 6 | El usuario sigue editando después | Carta: mismo textarea, hasta entregar. Pregunta: editor de la card Preguntas (click en el item) — guardar ahí limpia `draft` |

La card Preguntas (banco global) **no genera** — solo gestiona/edita: sin
contexto de aplicación la respuesta saldría genérica (gasto con poco valor);
un hint en el formulario del banco apunta a la sección por-aplicación.

**Réplica sin costo en claude.ai**: `docs/claude-ai/` — un Project (custom
instructions + `background.md`/`spec-cache.json` como knowledge) y un Skill
(`cv-materials`), ambos espejando `core/ai/prompt.ts`. Para experimentar
gratis y como fallback si el crédito de API se agota a mitad de una
aplicación. Setup completo en [`claude-ai/README.md`](claude-ai/README.md).

**Modelo elegible por acción, sin abstracción**: `core/ai/models.ts` define
`AI_MODELS` (ids reales de Anthropic — `claude-opus-4-8`, `claude-sonnet-5`,
`claude-haiku-4-5-20251001`, `claude-fable-5`, sin nombres de marketing) y
`DEFAULT_AI_MODEL` (**Haiku**, el más barato — subir de modelo es elección
explícita). Cada `AiContextPanel` trae su propio selector
(`IconSelect`, mismo componente que el resto de los dropdowns), persistido en
`localStorage` **por acción** (`ui/useAiModel.ts`, key
`cbuilder:ai-model:<action>`) — cover letters y respuestas de pre-screening
recuerdan modelos distintos. El cliente manda `model` en el body; la ruta lo
valida con `isAiModel()` y cae a `DEFAULT_AI_MODEL` si falta o no es válido.

**Context pack** (el resto de la base, común a ambas rutas):

- **Estático** (`data/profile/background.md` — excepción trackeada del
  gitignore de `/data/`, porque es CV/portfolio ya público de Lenin, no data
  del registro; tiene que llegar a prod): bio, experiencia, skills y guía de
  voz, extraídos del master del CV y del portfolio. Se re-extrae a mano cuando
  el CV cambia materialmente.
- **Dinámico por foco**: `core/ai/prompt.ts` (`focusCaseContext`) lee
  `data/spec-cache.json` (mismo cache del linking spec-driven) y arma los case
  studies/proof points del foco de la aplicación. No se duplica en
  `data/profile/`.
- **Contexto extra del puesto** (`jobUrl`/`jobContext`, capturados por el
  `AiContextPanel` — ver flow arriba): la ganancia por-aplicación más allá de
  empresa/rol/foco. `jobUrl` también vive en el paso 2 "Opcionales" del wizard
  (dato general de la aplicación); `jobContext` **solo** vive donde se genera
  con IA — dejó de estar en el paso 2 (ver decisión).

**Carta — dos caminos, uno mecánico y uno con IA, nunca mezclados**: el
dropdown de `CoverLetterFields.tsx` (compartido por `CoverLetterGenerateForm`,
el único lugar donde una carta se genera hoy) ofrece un template real
(resuelve `{company}`/`{role}`/`{who}` con `resolveTemplateVars`, sin IA — es
sustitución de variables, no hace falta un LLM) **o** "Compartir contexto"
(`COVER_LETTER_AI` sentinel en `core/coverLetter/types.ts`, sin template, el
`AiContextPanel` completo). La IA nunca toca el cuerpo resuelto de un template
real. En modo IA, `CoverLetterRecord.templateId` queda `"__ai__"` /
`templateName: "Generado con IA"` (`AI_TEMPLATE_NAME`).

**La carta no tiene draft intermedio — se genera y se entrega en el mismo
paso.** A diferencia de una respuesta de pre-screening (persiste apenas se
genera, ver arriba), el texto que "Generar con IA" pone en el textarea de
`CoverLetterGenerateForm` vive solo en estado local hasta que el usuario hace
click en **"Generar y entregar"**: ahí se arma el `.docx`, se descarga, se
archiva y se sube a Drive, y recién ahí `row.coverLetter` queda seteado —
cerrar el form antes pierde el texto (y la llamada paga). Es el mismo
trade-off que ya tenía el flujo post-hoc para una aplicación con CV ya
entregado; ahora es el único camino, disparado desde el detalle de la fila o
desde el paso Confirmar del wizard (que primero asegura la fila Borrador si
todavía no existe — ver "Confirmar: acciones opcionales" arriba). Al generar
el CV de verdad después de haber cargado una carta ahí, `deferredGenerationFields`
preserva ese `row.coverLetter` en vez de pisarlo.

**La respuesta de pre-screening también queda marcada como borrador hasta que
un humano la confirma**: `ScreeningQuestion.draft` (booleano) — `true` cuando
"Generar y guardar" la generó, se limpia solo al guardar una edición manual
desde la card Preguntas. Aplica el mismo criterio que la carta (algo generado
por IA no es "definitivo" hasta que se revisa) pero sin el split
draft-vs-record-final de `coverLetter`: el banco entero siempre fue mutable
(no hay "lo que se envió", solo "la respuesta actual"), así que acá el flag es
puramente informativo — no bloquea reuso ni vinculación.

**Dónde queda una carta ya enviada**: `row.coverLetter` (por aplicación,
visible en su drawer). La card "Cover Letters" (`ui/CoverLettersCard.tsx`)
muestra una **lista única**: los templates reutilizables (editables, patrón
manager) y después cada fila con `coverLetter` seteado (template o IA, más
reciente primero, badge "Enviada", click abre su drawer) — la distinción
Template/Enviada es metadata de cada card, no tabs ni filtros. Sin duplicar
el dato: solo lee `rows` (las mismas que la tabla) filtradas.

## Variables de entorno

En `.env.local` (gitignoreado; ver `.env.local.example`). Todas opcionales — sin
ellas la app corre 100% local con file stores.

| Var | Para qué | Doc |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | Registro durable en Supabase (deploy) | [supabase-setup.md](supabase-setup.md) |
| `GDOCS_SCRIPT_URL` / `GDOCS_TOKEN` | Sink a Google Docs (server-side, nunca al browser) | [gdocs-setup.md](gdocs-setup.md) |
| `ANTHROPIC_API_KEY` | Pipeline AI (cover letters / respuestas de pre-screening), server-side | esta sección |

## Masters del CV

Versionado y workflow al editar: [`versioning.md`](versioning.md) §2.

- `assets/Lenin_Cuadra_CV_{EN,ES}_vNN.docx` — los master versionados. **No
  editar salvo pedido explícito.** La app **no** genera desde `assets/` sino desde
  `public/masters/{EN,ES}.docx` (copiados del vNN vigente).
- Cada master tiene 3 hyperlinks con el placeholder `ref=li-cv` (portfolio,
  linkedin, github) que `fillMaster` reemplaza. Todo link del CV va en el azul
  canónico `1A56DB` + underline.
- ⚠️ **Al editar un master a mano**: el editor del usuario suele **eliminar los
  hyperlinks** (dejando el texto como plano) — hay que revalidar los 3
  placeholders y recopiar a `public/masters/`. Detalle en
  [`decisions.md`](decisions.md) → entradas de masters.

## CV genérico del portafolio

El CV público descargable del portafolio (ES/EN). No es un CV por-aplicación:
`generatePortfolioCv` (`core/generatePortfolioCv.ts`) rellena el master con los 3
links horneados bajo el **código reservado fijo `web-cv`** (sin foco), reusando
`buildTrackedLinks` + `fillMaster` — la misma tubería que `generateCv`, pero sin
mintear código, sin fila de registro y sin zip. Al ser un archivo estático subido
a mano, todos los que lo descarguen comparten `web-cv`: se trackean los **clics**
agregados en `/r/web-cvP|L|G` (vía go.html), no las personas; el evento de
"descarga" en sí es del portafolio (otro repo).

- La card **CV del portafolio** (`ui/PortfolioCvCard.tsx`) genera el `.docx` por
  idioma (`Lenin_Cuadra_CV_{EN,ES}.docx`) para descargarlo y subirlo a mano.
- El store `PortfolioCvStore` (`data/portfolio-cv.json` / tabla `portfolio_cv`)
  guarda por idioma qué `MASTER_VERSION` está publicada. Cuando `MASTER_VERSION`
  (`lib/version.ts`) supera esa versión, la card avisa **desactualizado** (el
  master *es* la versión genérica, así que cualquier bump la deja vieja). "Marcar
  publicado" registra la versión actual tras subir el archivo.
- ⚠️ Depende de que el portafolio rutee la forma corta `/r/web-cv*` a `go.html`.
