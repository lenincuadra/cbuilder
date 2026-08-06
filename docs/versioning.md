# Versionado (cv-builder)

Cómo se versiona la app, por qué hay **cuatro ejes independientes** (y no un solo
número), y qué hacer en cada cambio para no romper prod ni perder trazabilidad.

El **por qué** de decisiones puntuales vive en [`decisions.md`](decisions.md); el
deploy y ambientes, en [`deploy.md`](deploy.md). Este doc es la guía para **entender
y decidir** en el futuro.

---

## Por qué no un solo número de versión

cbuilder no es un paquete npm que otros consumen: es una app personal con deploy
continuo, contenido editable (los masters `.docx`), data durable en Supabase y un
contrato externo (el `link-spec.json` del portfolio). Cada pieza evoluciona a
ritmo distinto:

| Eje | Qué versiona | Cambia cuando… | Afecta a… |
|---|---|---|---|
| **App** | El software (UI, lógica, API) | Mergeás features/fixes a `main` | Lo que corre en Vercel |
| **Masters** | El contenido base del CV | Editás el `.docx` de Lenin | CVs **nuevos** (no los ya entregados) |
| **Schema** | La forma de la DB / Storage | Agregás tablas, columnas o buckets | Data durable en Supabase |
| **Spec** | El contrato con el portfolio | Cambia `link-spec.json` en el repo del portfolio | Links, dominio, perfiles de foco |

Mezclarlos en un `v2.3.1` único obligaría a bumpear la app cada vez que tocás el
master, o al revés — y no reflejaría qué hay que re-correr en Supabase. Cuatro
números (o convenciones) separados = decisiones más claras.

---

## 1. Versión de la app (software)

### Qué es

SemVer en `package.json`: `MAJOR.MINOR.PATCH` (hoy en fase 2: `0.x.y`).

- **PATCH** (`0.2.0` → `0.2.1`): fix de bug, ajuste visual, copy, refactor sin
  feature nueva visible.
- **MINOR** (`0.2.0` → `0.3.0`): feature nueva mergeada a `main` (card, tab del
  drawer, flujo del wizard, etc.).
- **MAJOR** (`0.x` → `1.0.0`): cuando la fase 2 del producto esté cerrada según
  `docs/claude-code-prompt-fase2.md` — no antes.

Mientras `0.x`, la app sigue en evolución activa; no hay compromiso de estabilidad
de API pública (no hay API pública externa).

### Qué **no** es

- No refleja el contenido del CV (eso es el eje **Masters**).
- No dice si Supabase está al día (eso es **Schema**).
- No se incrementa en cada commit: solo cuando mergeás algo a `main` que valga la
  pena distinguir (feature o fix user-visible).

### Cómo se genera / dónde se ve

- **Fuente humana:** `package.json` → campo `version` (lo bumpás vos en el PR o
  justo antes del merge).
- **Fuente automática:** el commit de git que Vercel despliega. En runtime podés
  leer `VERCEL_GIT_COMMIT_SHA` (prod/preview) para saber *exactamente* qué build
  corre — útil para el bug de previews viejos con env vars horneadas (ver `TODO.md`).

Recomendación futura (opcional): endpoint `/api/version` con el mismo payload que
muestra el header (`lib/version.ts` → `formatAppVersionLabel()`).

### Tags de git

Opcionales. Crear `v0.2.0` solo en hitos que quieras recordar ("screening bank
shipped"). El deploy **no** depende del tag: `main` → prod automático.

### Changelog

No mantener `CHANGELOG.md`. El historial de git + entradas en `decisions.md` alcanza
para este proyecto. Si un tag importa, la razón va en el mensaje del tag.

### Decisiones futuras

| Situación | Qué hacer |
|---|---|
| Fix de typo en un label | PATCH |
| Nueva card o tab | MINOR |
| Solo cambio en `schema.sql` sin UI | MINOR si el feature ya mergeó; si es solo migración silenciosa, PATCH + bump de **schema_version** |
| Romper compatibilidad con data vieja | MINOR (o MAJOR si ya estás en `1.x`) + entrada en `decisions.md` |
| ¿CalVer (`2026.7.0`) en vez de SemVer? | Solo si SemVer te resulta artificial; hoy SemVer alcanza porque el volumen de releases es bajo |

---

## 2. Versión de CV masters (contenido)

### Qué es

Archivos en `assets/` con sufijo `_vNN`:

```
assets/Lenin_Cuadra_CV_EN_v15.docx
assets/Lenin_Cuadra_CV_ES_v15.docx
```

`NN` sube de a uno **por idioma** cuando el contenido del CV cambia (texto, secciones,
links estáticos, formato). Los viejos **no se borran**: quedan como historial.

### Qué **no** es

- No es la versión de la app: podés shippear `0.3.0` sin tocar el master, o subir a
  `v16` sin bump de app si solo corregís una coma en el CV.
- No afecta CVs ya generados: cada entrega se archiva en `delivery_files` (y/o el
  zip del día). Un master nuevo solo impacta **generaciones futuras**.

### Cómo la app los usa

La app **no** lee `assets/` en runtime. Lee copias fijas en:

```
public/masters/EN.docx
public/masters/ES.docx
```

Esas copias deben ser siempre el `vNN` **vigente** que querés usar para generar.
Detalle en [`architecture.md`](architecture.md) → "Masters del CV".

### Workflow al editar un master

1. **Abrir** el `vNN` actual en Word (o duplicar a `v(N+1)` antes de editar).
2. **Editar** contenido. Cuidado: Word suele **romper** los 3 hyperlinks con
   `ref=li-cv` (portfolio, LinkedIn, GitHub). Si los pierde, `fillMaster` falla.
3. **Guardar** como `assets/Lenin_Cuadra_CV_{EN,ES}_v(N+1).docx` (ambos idiomas si
   ambos cambiaron; si solo uno, solo ese archivo nuevo).
4. **Copiar** el nuevo `vNN` → `public/masters/{EN,ES}.docx`.
5. **Probar**: generar un CV de prueba y abrir el `.docx` — verificar links azules
   con tracking.
6. **Documentar** en `decisions.md` solo si hay trade-off de producto (ej. nuevo
   perfil de foco que exige cambio en el spec del portfolio).

Script futuro posible: `npm run sync-masters` que copie el `vNN` más alto de
`assets/` a `public/`. Hoy es manual a propósito (el paso de validar placeholders
no se puede automatizar sin riesgo).

### Decisiones futuras

| Situación | Qué hacer |
|---|---|
| Cambio de copy en el CV | Nuevo `vNN`, copiar a `public/masters/` |
| Cambio solo de links trackeados (dominio, formato) | Actualizar **spec** del portfolio + `SUPPORTED_SPEC_VERSION`; el master puede quedar igual si los placeholders siguen siendo `ref=li-cv` |
| ¿Un solo número de master para EN y ES? | Hoy van separados porque pueden divergir; si siempre editás los dos juntos, podés mantener el mismo `NN` en ambos por convención |
| ¿Subir a `v16` sin bump de app? | Sí, es normal — son ejes distintos |

---

## 3. Versión del schema (Supabase)

### Qué es

Entero `schema_version` en el header de `supabase/schema.sql`. Indica la **última
migración lógica** que el archivo define. La app no lo lee en runtime (por ahora):
es para vos y para quien re-corre el SQL en prod.

### Qué **no** es

- No reemplaza migraciones formales si algún día hacés un `DROP` o un `ALTER`
  destructivo. Hoy el archivo es **aditivo** (`create table if not exists`,
  `add column if not exists` en comentarios) — se puede re-correr entero sin miedo.
- No versiona el **contenido** de las tablas (filas del registro). Solo la **forma**.

### Cuándo subir `schema_version`

Incrementá en **+1** cuando el PR agrega o modifica estructura en `schema.sql`:

- Nueva tabla (`screening_questions`, etc.)
- Nueva columna en `registry`
- Nuevo bucket de Storage
- Cualquier cambio que requiera que prod ejecute SQL nuevo

Dejá una línea de comentario con qué cambió:

```sql
-- schema_version: 4  (2026-08-01: added foo_column to registry)
```

### Qué hacer después del merge a `main`

1. Abrí el **SQL editor** del proyecto Supabase de prod.
2. Pegá y corré **`supabase/schema.sql` completo** (no solo el trozo nuevo).
3. Confirmá que la app en prod carga (tabla, notas, links, preguntas, etc.).

Si te olvidás este paso, el deploy de Vercel puede ir bien pero **fallará en runtime**
al tocar la feature nueva (tabla inexistente).

Dev local con file store **no** necesita este paso. Preview en Vercel tampoco (no
tiene `SUPABASE_*`).

### Historial de versiones (referencia)

| `schema_version` | Contenido |
|---|---|
| **1** | `registry` inicial |
| **2** | `general_notes`, `stable_links`, `cover_letter_templates` |
| **3** | `screening_questions`, bucket `cvs`, columnas `cv_pending` / `delivery_files` |
| **4–11** | ver el header de `supabase/schema.sql` (Borrador, `cover_letter_draft`/`job_context`, `general_notes_entries`, `drive_letter_docs`, `milestones`, `cv_mode`/`parsed_jd`, `verified_claims`, `ats_overrides`) |
| **12** | tabla `portfolio_cv` (versión publicada del CV genérico por idioma) |
| **13** | columna `registry.reach` (inbound / outbound) |

(Ajustá esta tabla cuando subas la versión.) La fuente de verdad del número es el
header de `supabase/schema.sql`; `lib/version.ts` (`SCHEMA_VERSION`) lo espeja.
**Nota**: `SCHEMA_VERSION` venía desincronizado (quedó en 7 mientras el header ya
estaba en 11) — se realineó a **13** (última: `registry.reach`).

### Decisiones futuras

| Situación | Qué hacer |
|---|---|
| Solo cambio de comentario en `schema.sql` | No bump |
| `ALTER` que borra datos | Archivo aparte `supabase/migrations/NNN_descripcion.sql` + entrada en `decisions.md`; reconsiderar staging DB |
| ¿Automatizar migraciones? | Solo si el schema deja de ser aditivo o hay más de un ambiente con DB real |

---

## 4. Versión del contrato spec (portfolio)

### Qué es

El portfolio publica `link-spec.json` con un campo `version` (entero). cbuilder
declara hasta qué versión entiende en `core/spec/types.ts`:

```ts
export const SUPPORTED_SPEC_VERSION = 1;
```

### Cómo interactúan

- **`spec.version` ≤ `SUPPORTED_SPEC_VERSION`:** todo OK.
- **`spec.version` > `SUPPORTED_SPEC_VERSION`:** warning en UI (`SpecProvider`), uso
  best-effort — podés generar CVs pero algo del spec nuevo puede ignorarse.
- **Portfolio atrás de cbuilder:** sin drama; campos extra en cbuilder no se usan.

### Cuándo cambiar `SUPPORTED_SPEC_VERSION`

Cuando el portfolio sube `version` y vos actualizás cbuilder para soportar el
contrato nuevo (nuevo campo, perfil de foco, formato de link, etc.):

1. Implementar soporte en `core/spec/`.
2. Subir `SUPPORTED_SPEC_VERSION` al valor del spec.
3. Actualizar tests en `core/spec/validate.test.ts`.
4. Entrada en `decisions.md` si el cambio no es obvio.

Detalle del modelo spec-driven: [`spec-driven.md`](spec-driven.md).

### Decisiones futuras

| Situación | Qué hacer |
|---|---|
| Solo cambia la URL base en el spec | Bump de versión en portfolio + verificar que `buildTrackedLinks` sigue alineado; puede no requerir subir `SUPPORTED_SPEC_VERSION` si el shape JSON es el mismo |
| Nuevo perfil de foco | Spec + cbuilder + posible entrada en masters si el CV menciona el foco |
| ¿Hard-fail si spec es más nuevo? | Hoy warning; cambiar a block solo si un spec nuevo rompe generación de links de forma silenciosa |

---

## Checklist al mergear a `main`

Corré esto mentalmente (o en el PR) **después** del merge. No todo aplica en cada PR.

```
□ App: ¿bump en package.json? (feature → MINOR, fix → PATCH)
□ Schema: ¿el PR tocó schema.sql? → re-correr en Supabase prod + subir schema_version
□ Masters: ¿nuevo vNN? → copiar a public/masters/ y probar generación
□ Spec: ¿cambió link-spec en el portfolio? → SUPPORTED_SPEC_VERSION + tests
□ Preview: ¿registro vacío en preview nuevo? (aislamiento OK)
□ Prod: smoke rápido — tabla carga, generar CV de prueba, descargar
```

### Por qué cada paso

| Paso | Si lo saltás… |
|---|---|
| Bump app | No sabés qué "release" tenés; difícil hablar de "la versión con screening" |
| Re-correr schema | Prod rompe en la feature que usa la tabla/columna nueva |
| Sync masters | La app sigue generando desde el CV viejo en `public/masters/` |
| Spec | Links mal armados o perfiles de foco incorrectos sin error claro |
| Preview vacío | Riesgo de previews escribiendo en DB de prod (env vars mal scopeadas) |
| Smoke prod | Descubrís el fallo cuando vas a aplicar de verdad |

---

## Estado vigente (referencia)

Actualizá esta sección y **`lib/version.ts`** (`SCHEMA_VERSION`, `MASTER_VERSION`) cuando
cambien los números. `APP_VERSION` sale de `package.json` automáticamente; el git SHA se
inyecta en build (`next.config.ts`).

| Eje | Valor actual | Dónde actualizar |
|---|---|---|
| App | `0.2.0` | `package.json` |
| Masters | **v15** (EN y ES) | `lib/version.ts` → `MASTER_VERSION` + `public/masters/` |
| Schema | **7** | `lib/version.ts` → `SCHEMA_VERSION` + header de `schema.sql` |
| Spec | **1** | `core/spec/types.ts` → `SUPPORTED_SPEC_VERSION` |

---

## Qué no se versiona (a propósito)

| Cosa | Por qué |
|---|---|
| `data/registry.json` y similares | Data privada, no software |
| `TODO.md` | Backlog personal, gitignored |
| Templates de cover letter en DB | Son filas editables; el schema ya versiona la tabla |
| Deployments de preview | Efímeros; identificados por URL + git SHA de Vercel |

---

## Cuándo replantear esta estrategia

- **Staging DB real** (segundo Supabase para previews): agregar columna "schema en
  staging" al checklist.
- **Multi-usuario / Auth:** posible `MAJOR` de app y políticas RLS versionadas.
- **Pipeline AI** (ver `TODO.md`): nueva dependencia (`ANTHROPIC_API_KEY`) — no
  cambia el esquema de versiones, solo el checklist de env vars en `deploy.md`.
- **Volumen alto de releases:** reconsiderar CalVer o automatizar bump + tag.

Si cambiás las reglas, agregá una entrada arriba de todo en `decisions.md` y
actualizá este doc.
