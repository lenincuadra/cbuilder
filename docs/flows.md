# Flows (cv-builder)

Catálogo único de los flows de la app, a **altura de uso**: qué hace el
usuario y qué pasa por detrás. El detalle de sistema (funciones, storage,
contratos) vive en [`architecture.md`](architecture.md) — acá se linkea, no se
duplica. Convención: cada flow es una tabla `# | Acción Hecha | Dónde/Qué
sucede por detrás` (no prosa narrativa ni diagramas ASCII). Al agregar o
cambiar un flow visible al usuario, actualizá su tabla acá.

## Índice

| Flow | Tipo |
|---|---|
| [Nueva aplicación (generar un CV)](#nueva-aplicación-generar-un-cv) | Core |
| [Registrar sin CV (generación diferida)](#registrar-sin-cv-generación-diferida) | Core |
| [Carta con template](#1-carta-con-template) | Cover letter |
| [Carta "Compartir contexto" (IA)](#2-carta-compartir-contexto-ia) | Cover letter · IA |
| [Sugerir respuesta — pregunta nueva](#3-sugerir-respuesta--pregunta-nueva) | Pre-screening · IA |
| [Sugerir respuesta — vinculada sin respuesta](#4-sugerir-respuesta--vinculada-sin-respuesta) | Pre-screening · IA |
| [Detectar contexto del puesto](#5-detectar-contexto-del-puesto) | Soporte IA |
| [Elegir el modelo](#6-elegir-el-modelo) | Soporte IA |
| [Ver cartas enviadas](#7-ver-cartas-enviadas) | Cover letter |
| [Generar gratis en Claude.ai](#8-generar-gratis-en-claudeai) | Fallback sin costo |
| [Administrar un manager (Preguntas / Cover letters / Links estables)](#9-administrar-un-manager-preguntas--cover-letters--links-estables) | Managers |
| [Generar cover letter (opcional, en Confirmar o después del CV)](#10-generar-cover-letter-opcional-en-confirmar-o-después-del-cv) | Cover letter |
| [Marcar hitos del proceso](#11-marcar-hitos-del-proceso) | Seguimiento |
| [Embudo AARRR](#12-embudo-aarrr) | Analítica |
| [Actualizar el CV del portafolio](#13-actualizar-el-cv-del-portafolio) | CV genérico |

## Nueva aplicación (generar un CV)

El flow principal — la card "Nueva aplicación" registra el inicio de un
proceso y (opcionalmente ahí mismo) genera el CV trackeado; el CTA final del
wizard es "Generar CV". Wizard de **4 pasos** (Empresa y fecha · Opcionales ·
Idioma y foco · Confirmar) donde **nada bloquea salvo Empresa**: el email
inválido avisa y se omite (nunca se guarda roto). La carta y las preguntas
son opcionales, ya no pasos dedicados — viven como acciones opcionales al
final de Confirmar (mismas secciones que el detalle post-generación, ver
[flow 10](#10-generar-cover-letter-opcional-en-confirmar-o-después-del-cv) y
[flow 3](#3-sugerir-respuesta--pregunta-nueva)), y también pueden agregarse
después desde el detalle. Del wizard a los tres destinos del entregable:
tabla completa (a altura de sistema) en [`architecture.md` → "Pipeline de
generación"](architecture.md#pipeline-de-generación).

## Registrar sin CV (generación diferida)

Un proceso que arranca sin entregable (ej. un recruiter escribe primero, o
todavía no sabés qué te van a pedir). **"Registrar sin CV" está en el footer
de todos los pasos previos a Confirmar** — con empresa **o** contacto alcanza
(la empresa se exige recién al generar el CV); guarda todo lo completado hasta
ahí. Tabla completa en
[`architecture.md` → "Registrar sin
CV"](architecture.md#registrar-sin-cv-generación-diferida).

---

Los flows de IA comparten una base: el bloque de contexto
(`ui/AiContextPanel.tsx` — link del puesto + Detectar, contexto libre,
modelo) es el mismo componente en todos los puntos de generación, y **todo lo
generado por IA se persiste como borrador apenas se genera** (una llamada
paga nunca se pierde por cerrar algo). El armado del prompt y los guardrails
de costo, en [`architecture.md` → "Pipeline AI"](architecture.md#pipeline-ai-cover-letters--respuestas-de-pre-screening).

## 1. Carta con template

Sin IA — un template es sustitución mecánica de variables. La carta ya no es
un paso dedicado del wizard: template real o "Compartir contexto" (IA) se
eligen desde la misma acción opcional "Generar cover letter", sea que se
dispare desde Confirmar (antes de generar el CV) o después desde el detalle
de la fila — ver [flow 10](#10-generar-cover-letter-opcional-en-confirmar-o-después-del-cv)
para el detalle completo (mismo componente, mismo takeover, mismo resultado:
un `.docx` que se entrega aparte, nunca dentro del `.zip` del CV).

## 2. Carta "Compartir contexto" (IA)

Misma acción que el flow 1, eligiendo **"Compartir contexto"** en vez de un
template — ver [flow 10](#10-generar-cover-letter-opcional-en-confirmar-o-después-del-cv).
La IA genera el cuerpo (`POST /api/ai/cover-letter`, una llamada por idioma)
sobre el textarea; el resultado se persiste recién al confirmar ("Generar y
entregar" en el takeover), no antes.

## 3. Sugerir respuesta — pregunta nueva

| # | Acción Hecha | Dónde/Qué sucede por detrás |
|---|---|---|
| 1 | Drawer de la aplicación → tab Detalles → sección Preguntas → **"Nueva"** (o, antes de generar el CV, el mismo botón en el paso Confirmar del wizard) | El form toma el drawer/wizard como vista propia (`ScreeningNewForm`, mismo takeover que Editar); Cancelar vuelve al detalle/resumen |
| 2 | Escribir la pregunta → **"Sugerir con IA"** | Paso 1 de la regla de dos pasos (ver `DESIGN.md` → "Generación con IA"): solo **revela** el bloque "Contexto (opcional)" — link + Detectar, contexto extra, modelo (precargados de la fila). No llama a nada |
| 3 | **"Generar y guardar"** | Paso 2 — la única llamada: `POST /api/ai/screening-answer` con empresa/rol/foco/jobContext |
| 4 | La entrada se crea en el banco al instante, con badge **"IA · sin revisar"**, y se vuelve al detalle | `draft: true`; también persiste el jobUrl/jobContext editado en el panel |
| 5 | Revisar/editar clickeando la entrada (en la sección Preguntas del detalle o en la card Preguntas del banco) | Takeover "Editar pregunta" / form del manager; guardar una edición manual limpia `draft` |

**Desde Confirmar (antes de generar el CV)**: la sección Preguntas es la
misma de arriba, solo que sin fila registrada todavía muestra un teaser
colapsado ("Ninguna pregunta registrada…" + "Nueva"); tocar el botón crea
primero, en silencio, la fila Borrador con el código ya mostrado en la
preview de carpeta (`onEnsureRow`), y recién ahí abre el mismo
`ScreeningNewForm`. Si el wizard se cierra sin generar el CV, esa fila
Borrador queda en la tabla (caso ya soportado).

## 4. Sugerir respuesta — vinculada sin respuesta

| # | Acción Hecha | Dónde/Qué sucede por detrás |
|---|---|---|
| 1 | Una entrada vinculada muestra "sin respuesta todavía" + **"Sugerir con IA"** | Paso 1: abre el takeover `ScreeningSuggestForm` (mismo slot que Editar) — pregunta read-only + contexto opcional precargado de la fila. No llama a nada |
| 2 | Ajustar contexto/modelo si hace falta → **"Generar y guardar"** | Paso 2 — la única llamada; la respuesta se guarda directo sobre esa entrada (`draft: true`) y se vuelve al detalle |
| 3 | Cancelar en cualquier momento | Vuelve al detalle sin gastar nada |

## 5. Detectar contexto del puesto

| # | Acción Hecha | Dónde/Qué sucede por detrás |
|---|---|---|
| 1 | Pegar el link del puesto en el panel → "Detectar" | `POST /api/job-context` — sin llamada a Anthropic, sin headless |
| 2 | El server busca `JobPosting` en JSON-LD; si no hay, en Microdata (`itemprop="description"`) | El fallback Microdata cubre job boards regionales. LinkedIn no funciona: auth wall, sin datos server-side |
| 3 | Si encuentra: llena el campo (máx. 4000 chars). Si no: toast info, se pega a mano | Siempre 200, nunca bloquea |

## 6. Elegir el modelo

| # | Acción Hecha | Dónde/Qué sucede por detrás |
|---|---|---|
| 1 | En cualquier `AiContextPanel`, dropdown "Modelo" con ids reales de Anthropic | Allow-list en `core/ai/models.ts`; default `claude-haiku-4-5` (el más barato — subir de modelo es elección explícita) |
| 2 | La elección se recuerda **por acción** (carta vs. respuesta, independientes) | `localStorage` vía `ui/useAiModel.ts` |
| 3 | El server valida contra el allow-list y ecoa el modelo usado en la respuesta | Modelo inválido/ausente → cae al default, nunca falla |

## 7. Ver cartas enviadas

| # | Acción Hecha | Dónde/Qué sucede por detrás |
|---|---|---|
| 1 | Card "Cover letters" → lista única; las enviadas llevan badge **"Enviada"** (después de los templates, más reciente primero) | Toda fila con `coverLetter` seteado (template o IA); lee `rows`, no duplica data. "Template"/"Enviada" es metadata de cada card, no un filtro |
| 2 | Click en una carta enviada → se abre el drawer de esa aplicación | Cierra el drawer de Cover Letters primero; ahí está el texto completo enviado (registro fiel, no editable) |

## 8. Generar gratis en Claude.ai

Fallback sin consumo de API — para iterar gratis o si el crédito se agota a
mitad de una aplicación. Setup completo en
[`claude-ai/README.md`](claude-ai/README.md).

| # | Acción Hecha | Dónde/Qué sucede por detrás |
|---|---|---|
| 1 | Crear el Project "cv-builder AI" en claude.ai (una vez) | Knowledge: `data/profile/background.md` + `data/spec-cache.json`; instrucciones: `docs/claude-ai/project-instructions.md` |
| 2 | (Opcional) Armar el Skill `cv-materials` (una vez) | Copiar los 2 archivos al folder del skill, zippear, subir — solo `SKILL.md` está en git |
| 3 | En un chat: pegar empresa/rol/foco + pregunta o pedido de carta | Mismas reglas de voz que `core/ai/prompt.ts` |
| 4 | Copiar el resultado de vuelta a cbuilder (textarea de carta o respuesta) | Editable ahí como cualquier borrador |
| 5 | Cuando el CV cambie materialmente: re-subir `background.md` a ambos | Igual que la re-extracción del context pack de la app |

## 9. Administrar un manager (Preguntas / Cover letters / Links estables)

Mismo patrón lista ↔ form en los tres managers de la columna derecha (ver
[`DESIGN.md` → "Drawers-manager"](DESIGN.md#drawers--paneles-laterales)).

| # | Acción Hecha | Dónde/Qué sucede por detrás |
|---|---|---|
| 1 | Click en la card compacta → se abre el drawer en la **vista lista** | Solo los items guardados (o el empty state); en Cover letters es una lista única — templates y enviadas se distinguen por badge, no por tabs |
| 2 | Leer/copiar/usar un item desde su card | Íconos de copiar/borrar por item; borrar confirma (`ConfirmDelete`) y no cierra el drawer |
| 3 | **Click en la card de un item** → vista de edición | Takeover del drawer con los campos precargados; en Links estables, editar el ref no toca los links ya pegados afuera (`PUT /api/stable-links/[ref]`) |
| 4 | **"+ Nueva pregunta" / "+ Crear template" / "+ Agregar link"** en el footer pinneado | Misma vista form, vacía; en Links estables incluye los chips de sugerencias |
| 5 | **Guardar** persiste y vuelve a la lista; **Cancelar** vuelve descartando | Siempre se regresa al punto de inicio; en Cover letters las cartas enviadas son registro fiel (click abre su aplicación, no un form) |

## 10. Generar cover letter (opcional, en Confirmar o después del CV)

Una sola acción para dos momentos: desde el paso Confirmar del wizard (antes
de generar el CV) o, para una aplicación cuyo CV ya se entregó, desde su
detalle — mismo componente (`CoverLetterGenerateForm`, comparte
`CoverLetterFields` con el resto de los flows de carta), mismo resultado. La
carta **nunca** se empaqueta en el `.zip` del CV: siempre se entrega como
archivo aparte.

| # | Acción Hecha | Dónde/Qué sucede por detrás |
|---|---|---|
| 1 | Sección Cover letter (sin carta) → **"Generar cover letter"** — en el detalle de la fila, o al final del paso Confirmar del wizard | Takeover (`CoverLetterGenerateForm`, mismo slot que Editar/Preguntas); desde Confirmar, si la fila todavía no existe se crea primero en silencio (`onEnsureRow`, mismo código ya mostrado en la preview de carpeta) |
| 2 | Elegir un template real (variables resueltas) o **"Compartir contexto"** + "Generar con IA" | Mismo componente `CoverLetterFields` en todos los puntos de entrada — nada nuevo que aprender |
| 3 | **"Generar y entregar"** | `buildCoverLetterDocx` por idioma, reusando la(s) misma(s) carpeta(s) del CV (`folderName` con `company`/`code`/`language` de la fila) |
| 4 | Se descarga el `.docx` (o un `.zip` si el idioma es "Ambos"), queda archivado junto al CV y se sube a Drive como Google Doc | `archiveDeliveryFiles` + `createGoogleDoc(…, COVER_LETTER_DOC_NAME)` — siempre **agregando** a `row.deliveryFiles`/`driveLetterDocs`, nunca reemplaza lo del CV ya entregado. Drive apagado (501) es silencioso |
| 5 | La sección pasa a mostrar la carta y "Entrega" suma la fila `EN · Carta` con abrir-en-Drive + descargar | `row.coverLetter` + `row.driveLetterDocs` quedan seteados; si el CV todavía no se generó (`cvPending`), sigue mostrándose igual hasta que se genere |

## 11. Seguimiento del proceso (hitos + anotaciones)

Los hitos estructurados (respuesta / entrevista / oferta / referido) que alimentan
el embudo AARRR, unificados con el timeline en un stepper vertical: cada anotación
cuelga de un hito (`MilestoneTimeline`, reemplaza `MilestonesSection` + `UpdatesTab`).

| # | Acción Hecha | Dónde/Qué sucede por detrás |
|---|---|---|
| 1 | Click en la fila → tab **Actualizaciones** | Stepper de los 5 hitos (**CV enviado** → Respuesta → Entrevista → Oferta → Referido); los alcanzados (con fecha) van con check, el resto con botón **Marcar**. "CV enviado" se auto-marca al generar el CV y se puede desmarcar |
| 2 | **Marcar** un hito (ej. "Oferta") | Se marca alcanzado y **auto-marca los anteriores** con la fecha de hoy (`row.milestones`, conteo acumulativo) — se abre el form de anotación del hito clickeado |
| 3 | Escribir la anotación → **Guardar** | Se agrega a `row.updates` con `milestone` = ese hito; cada hito alcanzado pide ≥1 anotación (hint ámbar si falta) |
| 4 | (Opcional) Ajustar la fecha del hito con el `DatePicker` inline | Persiste en el acto; independiente del timestamp de las anotaciones |
| 5 | **Agregar anotación** en un hito ya alcanzado | Cuantas quieras hasta `MAX_UPDATES`; se editan/borran en su tarjeta |
| 6 | Desmarcar un hito (✕) | Borra ese hito y los posteriores; sus anotaciones caen al grupo **"Sin hito"** (no se pierden) |
| 7 | Items **"Sin hito"** (legacy / marcador "CV generado") | Grupo aparte con dropdown **Asignar hito** para reubicarlos |
| 8 | **Fin del proceso**: **Terminó bien** / **Terminó mal** | Setea `status` = Aceptado (verde) / Rechazado (rojo); colorea las etapas alcanzadas y el embudo. La etapa donde terminó es la punta (hito más profundo). **Reabrir** vuelve a Activo (ámbar) |

Colores del stepper: no alcanzada = gris; activo = neutro con la **punta** en ámbar;
cerrado = todas las alcanzadas en verde (Aceptado) o rojo (Rechazado).

## 12. Embudo AARRR

La búsqueda leída como funnel de conversión de growth marketing (pirate funnel),
con el copy educativo de cada etapa. Todo el histórico: archivadas y Borrador
incluidas.

| # | Acción Hecha | Dónde/Qué sucede por detrás |
|---|---|---|
| 1 | Card **"Embudo AARRR"** (columna derecha; su descripción ya muestra la conversión CVs → respuestas) | `computeFunnel(rows)` (`core/funnel.ts`) sobre todas las filas |
| 2 | Click → drawer con el gráfico de barras horizontales decrecientes (A/A/A/R/R/R), **apiladas por Estado** (verde/ámbar/rojo/gris) | `FunnelChart` (recharts vía `components/ui/chart.tsx`), cargado lazy al abrir; en desktop el drawer se ensancha a 2 columnas (**leyenda a la izquierda, gráfico a la derecha**), apilado en mobile |
| 3 | Leer cada etapa: label, conteo, % del total, definición de marketing y su traducción al job hunt, y entre etapas el % de conversión | Anotaciones HTML desde `FUNNEL_STAGES`; Awareness = todas las filas, Acquisition = `status !== "Borrador"`, el resto = hitos (conteo acumulativo, ver [`architecture.md`](architecture.md)); **Aceptado cuenta en todas las etapas** (llega al final) |
| 4 | Leyenda de colores: Aceptado (verde) · Activo (ámbar) · Rechazado (rojo) · Borrador (gris) | Cada barra se apila por el Estado de las filas que alcanzaron esa etapa (`FunnelStage.byStatus`); el gris sólo aparece en Awareness |

## 13. Actualizar el CV del portafolio

El CV público (ES/EN) que se descarga desde el portafolio, con tracking. Detalle
de sistema en [`architecture.md` → "CV genérico del
portafolio"](architecture.md#cv-genérico-del-portafolio).

| # | Acción Hecha | Dónde/Qué sucede por detrás |
|---|---|---|
| 1 | Card **"CV del portafolio"** (columna derecha). Si un master cambió, muestra ícono de aviso + "Desactualizado" | Compara `MASTER_VERSION` (`lib/version.ts`) con la versión publicada por idioma (`PortfolioCvStore`) |
| 2 | Click → drawer con una fila por idioma (EN/ES): master actual vs. publicada, estado al día/desactualizado | `usePortfolioCv` lee `data/portfolio-cv.json` / tabla `portfolio_cv` |
| 3 | **"Generar EN/ES"** → descarga `Lenin_Cuadra_CV_{EN,ES}.docx` con los 3 links `web-cv` horneados | `generatePortfolioCv` (`buildTrackedLinks("web-cv")` + `fillMaster`) client-side; sin fila de registro, sin código nuevo |
| 4 | Subir ese `.docx` al portafolio (manual, otro repo) → **"Marcar publicado v{N}"** | `setPublished(idioma, MASTER_VERSION)`; limpia el aviso de desactualizado |
