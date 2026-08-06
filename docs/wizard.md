# Wizard de generación (máquina de pasos)

Cómo funciona por dentro el wizard de "Nueva aplicación" (`ui/wizard/Wizard.tsx`):
el orden de pasos, cuándo aparece el paso-gate de tailoring, y las tres formas de
entrar (fresh / diferido / variante). Para el flow a altura de usuario, ver
[`flows.md`](flows.md) → "Nueva aplicación"; para el pipeline de generación en sí,
ver [`architecture.md`](architecture.md) → "Pipeline de generación".

## Orden de pasos (flow fresh)

| # | Paso | Componente | Recopila | Gate para avanzar (`canAdvance`) |
|---|---|---|---|---|
| 1 | Empresa y contacto | `StepCompany` | empresa, contacto (`who`), fecha | **empresa o contacto** (`identityValid`) |
| 2 | Opcionales | `StepOptional` | rol, canal, email, jobUrl, jobContext + **JD** (Detectar/Analizar) | — |
| 3 | Idioma y foco | `StepLanguage` | idioma (EN/ES/Ambos), foco del portfolio | — |
| 4 | Modo | `StepMode` | modo (base/asistido/verbatim/ATS) | ATS exige JD (si no, deshabilitado) |
| 5 | *(gate, condicional)* | `StepAssisted` / `StepVerify` / `StepAts` | resumen IA / claims verificados / selección ATS | el dato del modo ≠ `null` |
| último | Confirmar | `StepConfirm` | resumen + preview de carpeta/código + acciones opcionales | **empresa** para "Generar CV" |

**Por qué Modo va en 4 y no primero:** 3 de los 4 modos dependen de la JD que se
ingresa en Opcionales (asistido/verbatim la usan, ATS la exige). Elegir la
estrategia antes de tener la JD era al revés. Ver [`decisions.md`](decisions.md) →
"Orden del wizard". En el paso Modo, **ATS se deshabilita con aviso** si no hay JD.

## Paso-gate (tailoring)

Aparece **solo** cuando el modo lo necesita:

- `ats`: siempre (JD obligatoria) → `StepAts` (título verificado, Core Competencies verbatim, Values Alignment).
- `assisted` **con JD**: `StepAssisted` (resumen IA por idioma).
- `verbatim` **con JD**: `StepVerify` (verificación de claims).
- `base`, o asistido/verbatim **sin JD**: sin gate.

`hasJdContent(data.parsedJd)` decide si hay JD. `totalStepsFor(mode, hasJd)` da
**5 pasos** (sin gate) o **6** (con gate); `confirmStep = totalSteps` (Confirmar
siempre último). La barra de progreso y "Paso N de M" cuentan todos los pasos.
Como el modo se elige en el paso 4, el total puede pasar de 5 a 6 recién ahí.

## Formas de entrar (`startStep`)

| Entrada | Prop | Arranca en | Notas |
|---|---|---|---|
| Fresh | — | 1 (Empresa) | flujo completo |
| Diferido | `pendingRow` | 3 (Idioma y foco) — o **1** si la fila no tiene empresa | los pasos 1–2 viven en la fila; **pasa por Modo** (default base, tailoreable) |
| Variante | `variantMode` | 1 | seedea de la fila y recorre todo para elegir otro modo |

El **código** (preview de carpeta) se mintea al **entrar a Confirmar**
(`generateCode`, colisión-checked contra el registro y los reservados del spec), o
se reusa el ya reservado (`activeRow` / `pendingRow`).

## Registrar sin CV

En todos los pasos previos a Confirmar hay **"Registrar sin CV"** (footer):
necesita **empresa o contacto**, crea la fila con `buildPendingRow` (`cvPending:
true`, estado Borrador, código reservado) sin nada del CV. La **empresa se exige
recién al generar** (nombre de carpeta `[IDIOMA]_[empresa]_[código]`): el botón
"Generar CV" se deshabilita sin empresa y `generateCv` tira error como red de
seguridad. Detalle a altura de sistema en [`architecture.md`](architecture.md) →
"Registrar sin CV".

Las acciones opcionales de Confirmar (cover letter / preguntas) crean la fila
Borrador **en silencio** (`onEnsureRow`) reusando el código ya mostrado en la
preview, para no perder nada tipeado ni ninguna generación paga.

## Archivos clave

- `ui/wizard/Wizard.tsx` — la máquina: orden, `canAdvance`, `startStep`, `goNext`, render.
- `ui/wizard/Step*.tsx` — cada paso (`StepCompany`, `StepOptional`, `StepLanguage`, `StepMode`, `StepAssisted`/`StepVerify`/`StepAts`, `StepConfirm`).
- `core/generateCv.ts` — `generateCv` (guard de empresa), `buildPendingRow`, `deferredGenerationFields`.
