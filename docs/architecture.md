# Arquitectura y features (cv-builder)

Mapa del **qué y cómo** del sistema. El **por qué** (trade-offs, decisiones que
cambiaron) vive en [`decisions.md`](decisions.md); las convenciones de UI, en
[`DESIGN.md`](DESIGN.md); las reglas inviolables resumidas, en
[`CLAUDE.md`](../CLAUDE.md). Este doc conecta las piezas.

## Qué hace la app

Genera el CV de Lenin Cuadra para una aplicación concreta, con un **código de
tracking** insertado en los links del header, y mantiene un **registro** privado
de a dónde y cómo se aplicó a cada puesto. El output es un `.docx` editable
(nunca PDF renderizado): se rellena un master por reemplazo de un placeholder.

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
  - `folderName.ts`, `zip.ts` — nombre de carpeta `[IDIOMA]_[empresa]_[código]`, empaquetado.
  - `generateCv.ts` — orquesta todo: código → llena master(s) → zip → fila del registro.
  - `staleness.ts`, `dates.ts` — alerta de inactividad, formato de fechas.
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
   ├─ 2. Archivo   → POST /api/cvs        → data/cvs/<zipName>   (local)         │
   └─ 3. Google Docs → POST /api/gdocs (por idioma) → Drive del usuario (opcional)
        └─ las URLs se guardan en row.driveDocs vía update()
   │
   ▼
Toast de éxito con dos CTAs: [Finder] (revela el zip) · [Detalles] (abre el drawer)
```

Detalles de cada destino:

1. **Descarga** — el `.zip` con `<carpeta>/Lenin_Cuadra_CV.docx` (o dos carpetas
   para "Ambos"). El nombre del archivo entregable nunca lleva tracking.
2. **Archivo local** (`data/cvs/`) — copia fiel de lo enviado. Los masters
   evolucionan (v13 → v14 → v15…), así que un CV pasado no se puede regenerar
   idéntico; este archivo es el único registro exacto. Gitignoreado. Ver
   [`decisions.md`](decisions.md) → "Archivo local de los .zip".
3. **Google Docs sink** (opcional) — cada CV se crea en el Drive del usuario como
   Google Doc nativo, listo para bajar como PDF. Apagado si faltan las env vars.
   Setup: [`gdocs-setup.md`](gdocs-setup.md).

`zipName` y `driveDocs` se **persisten en la fila**, así el drawer muestra dónde
quedó la entrega para siempre (no solo recién generado) — card `DeliveryInfo`.

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

Dos documentos independientes, cada uno detrás de su interfaz, elegidos por una
factory (`lib/storage/index.ts`). Se puede cambiar la implementación sin tocar
`core/` ni `ui/`.

| Documento | Interfaz | Default local | Durable (deploy) |
|---|---|---|---|
| Registro | `RegistryStore` | File store (`data/registry.json`) vía API + `ApiRegistryStore` | `SupabaseRegistryStore` (si están las env vars) |
| Notas generales | `GeneralNotesStore` | File store (`data/notes.json`) vía API | Supabase a futuro (aún no) |

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
| `/api/cvs` | POST | Archiva un zip en `data/cvs/` (nombre validado, escritura atómica) |
| `/api/cvs/reveal` | POST | Revela un zip archivado en Finder (`open -R`, **solo macOS**; 501 en otros lados) |
| `/api/gdocs` | POST | Reenvía el `.docx` al webhook de Apps Script del usuario (501 si no configurado) |

## Variables de entorno

En `.env.local` (gitignoreado; ver `.env.local.example`). Todas opcionales — sin
ellas la app corre 100% local con file stores.

| Var | Para qué | Doc |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | Registro durable en Supabase (deploy) | [supabase-setup.md](supabase-setup.md) |
| `GDOCS_SCRIPT_URL` / `GDOCS_TOKEN` | Sink a Google Docs (server-side, nunca al browser) | [gdocs-setup.md](gdocs-setup.md) |

## Masters del CV

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
