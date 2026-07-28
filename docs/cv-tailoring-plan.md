# Plan: CV tailoreado por Job Description (fase 3)

Fuente de la tesis: `docs/job-strategy/` (material privado, gitignoreado — guía
"How I Got N Interviews" + checklist ATS). Este doc traduce esa guía a un plan de
producto para cbuilder, cruzado contra lo que la app ya hace hoy.

> Fuente de verdad de decisiones: cada decisión no obvia de acá se registra en
> `docs/decisions.md`. Este doc es el mapa de fases; `decisions.md` es el "por qué".

## Tesis

El CV no se escribe una vez: **se genera por aplicación contra la job description**.
Las palancas de la guía (todas sobre el **cuerpo del CV**):

1. Título del CV alineado al título del puesto.
2. Keywords **verbatim** de la JD (no sinónimos).
3. Estructura de la sección de experiencia **espejando** los headers de la JD.
4. Bullets **cuantificados** (números, %, escala, tiempo).
5. Sección **"Values Alignment"** cuando la empresa lista valores.
6. Formato **ATS-safe** (`.docx`, una columna, fuentes estándar, sin tablas/imágenes).
7. Aplicar **rápido** tras la publicación.

## Estado hoy (verificado en código)

cbuilder ya tailorea **por aplicación**, pero apuntado a la carta y al tracking, no al CV:

- ✅ `.docx` editable, no PDF (regla inviolable).
- ✅ Cover letter por aplicación con AI (`core/coverLetter/ai.ts`, `core/ai/prompt.ts`),
  templates como data + letterhead programático.
- ✅ Captura de la JD como contexto AI: `jobContext` / `/api/job-context` (cap 4000 chars),
  hoy alimenta **solo la carta**.
- ✅ Focus/personalización por aplicación (`spec.profiles` + proof points).
- ✅ El **registro ES** el application tracker (la hoja del xlsx es redundante con él).
- ❌ **El cuerpo del CV es un master estático.** Solo hay `public/masters/{EN,ES}.docx`;
  `fillMaster` (`core/docx.ts`) reemplaza mecánicamente **3 targets** `ref=li-cv` (portfolio /
  linkedin / github) y no toca nada más.
- ⚠️ Validación ATS parcial: hay validate/repair de hyperlinks (los masters pierden
  placeholders al editarlos a mano), pero no un "ATS-lint" del output.

**El gap y el core del plan: tailorear el cuerpo del CV por JD.**

## Conflictos con la guía — NO adoptar tal cual

- **Nombre de archivo**: la guía pide `FirstName_LastName_JobTitle_Company_CV.docx`. Choca
  con la regla inviolable de cbuilder (siempre `Lenin_Cuadra_CV.docx`; todo lo identificatorio
  va en el nombre de carpeta `[IDIOMA]_[empresa]_[código]`). **Gana la regla de cbuilder.**
- **"Hyperlink text only" como problema ATS**: cbuilder usa links cortos *legibles*
  (`lenincuadra.com/r/0628r4Pp`), así que ya cumple. Solo confirmar que el master muestra la
  URL como texto, no un "click acá".
- **Sesgo de dominio**: la guía es para roles data/analytics UK (keywords SQL, salarios en £).
  Lenin es **Senior Product Designer** — ejemplos ilustrativos, no literales.

## Decisión de scope (2026-07-27)

**Master + variantes/slots** (no full-AI del cuerpo del CV). Razón: que la AI genere todo el
cuerpo es justo donde se inventan métricas/empleadores → viola la regla inviolable de no
alucinar. Los masters ATS-safe siguen siendo la fuente de verdad; se rellenan **slots** de
contenido por aplicación.

**Precedente que fija la forma**: `decisions.md` → "Cover letters: templates como data +
letterhead programático (no un master por tipo)". Mismo criterio acá: los slots del CV se
inyectan **programáticamente / como data**, **no** multiplicando archivos `.docx`. Un solo
esqueleto ATS-safe por idioma; las variantes son data (por focus/rol), no N masters. Esto evita
multiplicar la fragilidad de editar masters a mano (que borra placeholders).

## Fases

### Fase A — JD-in (parsing estructurado)
- Extender la captura de JD existente: de free-text (`jobContext`) a extracción estructurada
  (keywords requeridas/preferidas, tools, título, headers de secciones, valores).
- Persistir en el registro (junto a `jobContext`), no solo pasarlo a la carta.
- Reusa `/api/job-context` como base.

### Fase B — CV tailoreado (slots, data-driven) — corazón del plan
- `fillMaster` pasa de "reemplazar 3 link targets" a "reemplazar 3 link targets **+ N slots
  de contenido**".
- Slots candidatos: línea de **título**, sección de **focus/experiencia** espejada, sección
  **"Values Alignment"**.
- Contenido de slots desde los **hechos reales** de Lenin (spec/background, `VOICE_PREAMBLE`
  ya prohíbe inventar). La AI **redacta/ordena**, no inventa.
- Mantener intacta la inyección de links de tracking y el formato ATS.
- Abierto a resolver: mecanismo de slot robusto al editor que borra placeholders (validate/
  repair como el de hyperlinks, o inyección puramente programática).

### Fase C — ATS-lint + keyword score
- Validador del `.docx` de salida contra las reglas ATS (una columna, fuentes, sin tablas/
  imágenes/text-boxes, headers como texto).
- Mostrar en el wizard un **% de cobertura de keywords** de la JD (la guía vende 85%+ vs 30–40%).

### Fase D — Carta (refinamiento)
- Alinear la cover letter existente a la fórmula de 5 párrafos de la guía (hook específico →
  match técnico con términos exactos → historia con números → por qué este rol → cierre).
- Ya está casi todo; es pulido, no construcción.

## Workflow

Sin fork. Feature branches chicas (una por fase/pieza) → Vercel Preview (sin Supabase, no toca
data de prod) → merge a `main` = deploy. Prod sigue corriendo en `main` sin tocar.
Rama base de esta fase: `feat/cv-jd-tailoring`.
