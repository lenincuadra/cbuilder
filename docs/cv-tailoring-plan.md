# Plan: CV tailoreado por Job Description — 3 modos (fase 3)

Fuente de la tesis: `docs/job-strategy/` (material privado, gitignoreado — guía
"How I Got N Interviews" + checklist ATS). Este doc traduce esa guía a un plan de
producto para cbuilder, cruzado contra lo que la app ya hace hoy.

> Fuente de verdad de decisiones: cada decisión no obvia de acá se registra en
> `docs/decisions.md`. Este doc es el mapa; `decisions.md` es el "por qué".

## Tesis

El CV no se escribe una vez: **se genera por aplicación contra la job description**.
Palancas de la guía (todas sobre el **cuerpo del CV**): título alineado al puesto, keywords
**verbatim** de la JD, estructura de experiencia **espejando** los headers de la JD, bullets
**cuantificados**, sección **"Values Alignment"**, formato **ATS-safe**, y aplicar **rápido**.

## Los 3 modos

En vez de un solo enfoque, la app ofrece **3 modos** en un espectro de cuánto se adapta el CV a
la búsqueda. El modo se elige al **inicio del wizard** y gatea el resto del flujo. Cada modo
produce el mismo entregable ATS-safe con los 3 links de tracking; cambia **cómo se arma el
cuerpo del CV**.

| # | Modo | Qué hace | Fuente del texto | Esfuerzo | Match ATS | Riesgo principal |
|---|------|----------|------------------|----------|-----------|------------------|
| 1 | **Base** | Como hoy: master fijo + links de tracking | Master de Lenin (fijo) | Cero | ~30–40% | Ninguno |
| 2 | **Asistido (IA)** | IA reescribe la experiencia real de Lenin en el lenguaje/estructura de la JD | Hechos reales de Lenin, reformulados | Medio | ~70–85% | Drift de tono/IA |
| 3 | **Verbatim** | La app inyecta las frases exactas de la JD (título, keywords, headers, valores) | La búsqueda misma, textual | Bajo-mecánico | 85%+ | **Sobre-declarar** |

**Espectro (whose words):** Modo 1 = palabras del master fijo · Modo 2 = palabras de Lenin
reformuladas por IA (grounded) · Modo 3 = palabras de la búsqueda, textuales. El polo
"IA full-generativa que redacta libre" queda **fuera** (viola la regla inviolable de no
alucinar); Modo 2 es su reemplazo seguro.

### Modo 1 — Base
El comportamiento actual. Sin JD. `fillMaster` reemplaza los 3 targets `ref=li-cv`
(portfolio/linkedin/github) en `public/masters/{EN,ES}.docx`; el resto del contenido es fijo.
Para roles long-shot o cuando no hay tiempo de tailorear.

### Modo 2 — Asistido (IA, grounded)
Intermedio entre "copiar la búsqueda" y "que la IA lo escriba". La IA **reescribe/reordena** la
experiencia **real** de Lenin (spec/background) en el lenguaje y la estructura de la JD, llenando
slots de contenido. **Nunca inventa** (el `VOICE_PREAMBLE` ya lo prohíbe). Draft editable antes
de generar. Slots: título, sección de experiencia espejada, "Values Alignment".

### Modo 3 — Verbatim (copy-paste automatizado)
El más drástico. La app extrae las **frases exactas** de la JD (keywords, headers de sección,
título, valores) y las coloca en los slots del CV — la táctica "copy-paste" de la guía, máximo
match ATS, mínima IA generativa.

> **Guardrail de honestidad (obligatorio).** La guía es explícita: copiar verbatim *solo si
> Lenin realmente tiene esa skill*. Automatizar la inyección corre el riesgo de "la IA inventa"
> a "Lenin declara algo que no hizo" — y eso explota en la entrevista. Por eso Modo 3 **exige un
> gate de verificación humana**: la app propone cada string verbatim y Lenin confirma (toggle)
> que es cierto antes de hornearlo. Sin ese gate, Modo 3 no se envía.

## Selector de modo en el wizard

Nuevo primer paso: "¿Cómo generamos el CV?" con las 3 opciones. Gatea el flujo:

| Modo | Flujo del wizard |
|------|------------------|
| 1 · Base | Sin JD → focus/idioma → generar (flujo actual) |
| 2 · Asistido | JD (parse estructurado) → draft IA de slots → review editable → generar |
| 3 · Verbatim | JD (parse) → extracción de strings exactos → **gate: verificar cada claim** → generar |

Labels UI (español, tentativos): **"CV base"** / **"Adaptado con IA"** / **"Copiar la búsqueda"**.

## Estado hoy (verificado en código)

cbuilder ya tailorea **por aplicación**, pero apuntado a la carta y al tracking, no al CV:

- ✅ `.docx` editable, no PDF (regla inviolable).
- ✅ Cover letter por aplicación con IA (`core/coverLetter/ai.ts`, `core/ai/prompt.ts`),
  templates como data + letterhead programático.
- ✅ Captura de JD como contexto IA: `jobContext` / `/api/job-context` (cap 4000 chars),
  hoy alimenta **solo la carta**.
- ✅ Focus/personalización (`spec.profiles` + proof points).
- ✅ El **registro ES** el application tracker.
- ✅ **Modo 1 ya existe** — es el comportamiento actual; falta cablearlo como elección explícita.
- ❌ Cuerpo del CV = master estático (`fillMaster` solo reemplaza 3 links). **Modos 2 y 3 nuevos.**
- ⚠️ Validación ATS parcial (validate/repair de hyperlinks), sin "ATS-lint" del output.

## Conflictos con la guía — NO adoptar tal cual

- **Nombre de archivo**: la guía pide `FirstName_LastName_JobTitle_Company_CV.docx`. Choca con
  la regla inviolable (siempre `Lenin_Cuadra_CV.docx`; lo identificatorio va en la carpeta
  `[IDIOMA]_[empresa]_[código]`). **Gana la regla de cbuilder.**
- **"Hyperlink text only" como problema ATS**: cbuilder usa links cortos *legibles*
  (`lenincuadra.com/r/0628r4Pp`) → ya cumple. Confirmar que el master los muestra como texto.
- **Sesgo de dominio**: la guía es para roles data/analytics UK (SQL, salarios en £). Lenin es
  **Senior Product Designer** — ejemplos ilustrativos, no literales.

## Arquitectura

### Compartido (lo usan varios modos)
- **Campo de modo en el registro**: `cvMode: "base" | "assisted" | "verbatim"` — registro fiel
  de cómo se armó el CV (como el `CoverLetterRecord`). Default `"base"` para filas existentes.
- **Parse estructurado de la JD** (modos 2 y 3): extender `/api/job-context` de free-text a
  extracción estructurada (keywords requeridas/preferidas, tools, título, headers, valores).
  Persistir en el registro junto a `jobContext`.
- **Slots en `fillMaster`** (modos 2 y 3): de "reemplazar 3 link targets" a "3 link targets **+
  N slots de contenido**" (título, experiencia espejada, "Values Alignment").
  - **Decisión de forma**: los slots se inyectan **como data / programáticamente**, siguiendo el
    precedente de "Cover letters: templates como data + letterhead programático". **No** se
    multiplican archivos `.docx` (un master por focus/rol = fragilidad + drift). Un solo esqueleto
    ATS-safe por idioma.
  - **Incógnita a resolver en un spike (Fase B)**: mecanismo de slot **robusto al editor que
    borra placeholders** (mismo problema que los hyperlinks). Opciones: marcadores + validate/
    repair, o inserción puramente programática de párrafos/secciones. Preferencia: programático.
- **Keyword score** (modos 2 y 3): % de cobertura de keywords de la JD, mostrado en el wizard
  (la guía vende 85%+ vs 30–40%). Modo 1 = N/A o baseline.
- **ATS-lint** (todos): validar que el `.docx` de salida cumple las reglas ATS (una columna,
  fuentes, sin tablas/imágenes/text-boxes, headers como texto). Extiende el validate/repair actual.

### Por modo
- **Modo 1**: ya existe. Solo exponerlo como elección explícita del selector.
- **Modo 2**: prompt de reescritura grounded (reusa `buildContextBlock`/`VOICE_PREAMBLE`),
  draft editable, llenado de slots.
- **Modo 3**: extracción de strings verbatim de la JD parseada + UI de **gate de verificación**
  (toggle por claim) + llenado de slots. **Sin modelo generativo para el cuerpo** (es extracción).

## Orden de construcción sugerido

1. **Selector de modo + campo `cvMode`** (cablea Modo 1 como elección; base de todo).
2. **Parse estructurado de la JD** (compartido por 2 y 3).
3. **Spike de slots en `fillMaster`** (resolver el mecanismo robusto — desbloquea 2 y 3).
4. **Modo 3 (Verbatim)** — más simple (extracción + gate, sin IA generativa), da el mayor
   match ATS primero. Incluye el gate de honestidad.
5. **Modo 2 (Asistido)** — prompt grounded + review; requiere tuning.
6. **Keyword score + ATS-lint** — transversal, mejora los tres.
7. **Carta**: alinear la cover letter a la fórmula de 5 párrafos de la guía (pulido).

## Workflow y modelo

Sin fork. Feature branches chicas (una por pieza del orden de arriba) → Vercel Preview (sin
Supabase, no toca prod) → merge a `main` = deploy. Rama base: `feat/cv-jd-tailoring`.

**Modelo**: el plan (este doc) se cierra en Opus; la implementación se hace en Sonnet fase por
fase. El plan vive en el repo, así que el cambio de modelo no pierde contexto — condición: que
cada pieza quede especificada a nivel archivo antes de codear.
