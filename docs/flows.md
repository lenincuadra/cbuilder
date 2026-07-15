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
| [Generar un CV](#generar-un-cv) | Core |
| [Registrar sin CV (generación diferida)](#registrar-sin-cv-generación-diferida) | Core |
| [Carta con template](#1-carta-con-template) | Cover letter |
| [Carta "Compartir contexto" (IA)](#2-carta-compartir-contexto-ia) | Cover letter · IA |
| [Retomar un borrador de carta](#3-retomar-un-borrador-de-carta) | Cover letter · IA |
| [Sugerir respuesta — pregunta nueva](#4-sugerir-respuesta--pregunta-nueva) | Pre-screening · IA |
| [Sugerir respuesta — vinculada sin respuesta](#5-sugerir-respuesta--vinculada-sin-respuesta) | Pre-screening · IA |
| [Regenerar una respuesta existente](#6-regenerar-una-respuesta-existente) | Pre-screening · IA |
| [Detectar contexto del puesto](#7-detectar-contexto-del-puesto) | Soporte IA |
| [Elegir el modelo](#8-elegir-el-modelo) | Soporte IA |
| [Ver cartas enviadas](#9-ver-cartas-enviadas) | Cover letter |
| [Generar gratis en Claude.ai](#10-generar-gratis-en-claudeai) | Fallback sin costo |

## Generar un CV

El flow principal, del wizard a los tres destinos del entregable. Tabla
completa (a altura de sistema) en [`architecture.md` → "Pipeline de
generación"](architecture.md#pipeline-de-generación).

## Registrar sin CV (generación diferida)

Un proceso que arranca sin entregable (ej. un recruiter escribe primero).
Tabla completa en [`architecture.md` → "Registrar sin
CV"](architecture.md#registrar-sin-cv-generación-diferida).

---

Los flows de IA comparten una base: el bloque de contexto
(`ui/AiContextPanel.tsx` — link del puesto + Detectar, contexto libre,
modelo) es el mismo componente en todos los puntos de generación, y **todo lo
generado por IA se persiste como borrador apenas se genera** (una llamada
paga nunca se pierde por cerrar algo). El armado del prompt y los guardrails
de costo, en [`architecture.md` → "Pipeline AI"](architecture.md#pipeline-ai-cover-letters--respuestas-de-pre-screening).

## 1. Carta con template

Sin IA — un template es sustitución mecánica de variables.

| # | Acción Hecha | Dónde/Qué sucede por detrás |
|---|---|---|
| 1 | En el paso 4 del wizard, elegir un template real del dropdown | `StepCoverLetter.tsx` |
| 2 | El cuerpo aparece con `{company}`/`{role}`/`{who}` ya resueltos | `resolveTemplateVars` — sin llamada a la API |
| 3 | Editar libremente y seguir al paso 5 | Lo que se ve es lo que va al `.docx` |

## 2. Carta "Compartir contexto" (IA)

| # | Acción Hecha | Dónde/Qué sucede por detrás |
|---|---|---|
| 1 | En el dropdown del paso 4, elegir **"Compartir contexto"** (no requiere templates) | Sentinel `COVER_LETTER_AI` (`ui/wizard/types.ts`) |
| 2 | Completar el panel de contexto: link del puesto + "Detectar", contexto libre, modelo | `AiContextPanel` |
| 3 | Click en "Generar con IA" | `POST /api/ai/cover-letter` — una llamada por idioma; `jobContext` capado a 4000 chars; la respuesta ecoa el modelo usado |
| 4 | El borrador cae en el textarea **y se persiste al instante** | Sin fila previa: se crea una con estado **Borrador** (código reservado, `cvPending`) + `coverLetterDraft`. Clicks siguientes actualizan esa misma fila |
| 5 | Editar/regenerar/completar el wizard | Al generar de verdad: estado → **Activo**; el texto final queda en `coverLetter` (registro fiel, `templateName: "Generado con IA"`) |

## 3. Retomar un borrador de carta

| # | Acción Hecha | Dónde/Qué sucede por detrás |
|---|---|---|
| 1 | El wizard se cerró sin terminar — la fila Borrador quedó en la tabla | Badge gris **Borrador** (system-derived, no togglea a mano), filtrable en el embudo de estado |
| 2 | Abrir la fila → card Entrega → "Generar CV" | Wizard en modo diferido, arranca en paso 3 |
| 3 | El paso 4 llega con el borrador exacto precargado | `initialData` lee `coverLetterDraft` — ninguna llamada paga se pierde |

## 4. Sugerir respuesta — pregunta nueva

| # | Acción Hecha | Dónde/Qué sucede por detrás |
|---|---|---|
| 1 | Drawer de la aplicación → tab Detalles → sección Preguntas | El panel "Contexto para IA · \<modelo\>" está colapsado arriba; expandir para ajustar link/contexto/modelo (precargados de la fila) |
| 2 | "Nueva" → escribir la pregunta → **"Sugerir y guardar"** | `POST /api/ai/screening-answer` con empresa/rol/foco/jobContext de la fila |
| 3 | La entrada se crea en el banco al instante, con badge **"IA · sin revisar"** | `draft: true`; también persiste el jobUrl/jobContext editado en el panel |
| 4 | Revisar/editar desde la card Preguntas (lápiz) | Guardar una edición manual limpia `draft` |

## 5. Sugerir respuesta — vinculada sin respuesta

| # | Acción Hecha | Dónde/Qué sucede por detrás |
|---|---|---|
| 1 | Una entrada vinculada muestra "sin respuesta todavía" + **"Sugerir y guardar"** | `ScreeningSection.tsx` → `suggestForEntry` |
| 2 | Click → la respuesta se genera y guarda directo sobre esa entrada | `draft: true`, mismo contexto de la fila |

## 6. Regenerar una respuesta existente

| # | Acción Hecha | Dónde/Qué sucede por detrás |
|---|---|---|
| 1 | Una entrada **con** respuesta muestra un ícono ✦ junto al de copiar | Solo en la sección por-aplicación (el banco global no genera — sin contexto de empresa la respuesta sale genérica) |
| 2 | Click → **diálogo de confirmación** | Pisa texto revisado Y gasta una llamada — ambos irreversibles, por eso confirma (patrón `ConfirmDelete`) |
| 3 | Confirmar → regenera y guarda, vuelve a `draft: true` | Mismo endpoint y contexto; spinner en el ícono mientras corre |

## 7. Detectar contexto del puesto

| # | Acción Hecha | Dónde/Qué sucede por detrás |
|---|---|---|
| 1 | Pegar el link del puesto en el panel → "Detectar" | `POST /api/job-context` — sin llamada a Anthropic, sin headless |
| 2 | El server busca `JobPosting` en JSON-LD; si no hay, en Microdata (`itemprop="description"`) | El fallback Microdata cubre job boards regionales. LinkedIn no funciona: auth wall, sin datos server-side |
| 3 | Si encuentra: llena el campo (máx. 4000 chars). Si no: toast info, se pega a mano | Siempre 200, nunca bloquea |

## 8. Elegir el modelo

| # | Acción Hecha | Dónde/Qué sucede por detrás |
|---|---|---|
| 1 | En cualquier `AiContextPanel`, dropdown "Modelo" con ids reales de Anthropic | Allow-list en `core/ai/models.ts`; default `claude-opus-4-8` |
| 2 | La elección se recuerda **por acción** (carta vs. respuesta, independientes) | `localStorage` vía `ui/useAiModel.ts` |
| 3 | El server valida contra el allow-list y ecoa el modelo usado en la respuesta | Modelo inválido/ausente → cae al default, nunca falla |

## 9. Ver cartas enviadas

| # | Acción Hecha | Dónde/Qué sucede por detrás |
|---|---|---|
| 1 | Card "Cover letters" → tab **"Enviadas"** | `SentLettersList` — toda fila con `coverLetter` seteado (template o IA), más reciente primero; lee `rows`, no duplica data |
| 2 | Click en una carta → se abre el drawer de esa aplicación | Cierra el drawer de Cover Letters primero; ahí está el texto completo enviado |

## 10. Generar gratis en Claude.ai

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
