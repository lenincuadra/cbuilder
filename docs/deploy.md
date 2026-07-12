# Deploy (Vercel + Supabase)

Deploy privado. **Registro, Notas generales y Links estables** son durables en
Supabase (cada uno detrás de su store: `getServerRegistryStore` /
`getServerNotesStore` / `getServerStableLinksStore`, que eligen Supabase con la
service key o el file store local según las env vars). El archivo de zips
(`data/cvs`) sí es efímero en Vercel — no importa: el sink de Google Docs ya
guarda la copia durable en Drive.

## Arquitectura (por qué es privado)

- El browser **nunca** habla con Supabase directo. Va a las **API routes** de la
  app (`/api/registry`), que corren en el server y usan Supabase con la **service
  role key** — que **nunca** se manda al browser (no es `NEXT_PUBLIC`).
- Las tablas (`registry`, `general_notes`, `stable_links`) tienen **RLS on y sin
  policy** → anon/authenticated denegados. Solo la service key (server) accede.
  Aunque el repo/URL sea público, la data no.
- El **proxy** de basic-auth (`proxy.ts`, ex-`middleware`) le pone contraseña a
  toda la app.

## 1. Supabase (una vez)

1. Crear proyecto en [supabase.com](https://supabase.com) (free alcanza).
2. **SQL editor** → pegar y correr `supabase/schema.sql` (crea las 3 tablas +
   RLS: `registry`, `general_notes`, `stable_links`).
3. **Credenciales** (Settings):
   - **Project URL**: en **Data API** → copiar la **"Project URL"** base
     (`https://XXXX.supabase.co`). ⚠️ NO el "RESTful endpoint" (`.../rest/v1/`): la
     librería ya agrega `/rest/v1`, y una URL con path da
     `Invalid path specified in request URL` al insertar.
   - **Service key**: en **API Keys** → la **"Secret key"** (`sb_secret_…`, reemplazo
     de la vieja `service_role`; NO la publishable/anon). Va en
     `SUPABASE_SERVICE_ROLE_KEY`. ⚠️ Secreto total — nunca al cliente ni al repo.

## 2. Variables de entorno

Local (`.env.local`, gitignored) para probar contra Supabase; en Vercel, en
**Project → Settings → Environment Variables**:

```
SUPABASE_URL=https://XXXX.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role>
BASIC_AUTH_USER=lenin
BASIC_AUTH_PASSWORD=<contraseña larga y aleatoria>     # openssl rand -hex 16
# opcionales (mismo valor que ya usás):
GDOCS_SCRIPT_URL=...
GDOCS_TOKEN=...
```

Sin `SUPABASE_*` → el registro usa el file store local. Sin `BASIC_AUTH_*` → sin
candado (dev). En Vercel, seteá los cuatro **scoped por ambiente** (ver
"Ambientes" abajo — si `SUPABASE_*` queda en "All Environments", los previews
escriben en la DB de prod).

## 3. Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → importá el repo
   `lenincuadra/cbuilder`.
2. Framework: Next.js (autodetectado). Agregá las env vars del paso 2.
3. **Deploy**. Al abrir la URL te va a pedir usuario + contraseña (el basic-auth).

## Ambientes (dev / prod)

Dos ambientes + previews descartables. Objetivo: **usar la app en prod todos
los días mientras se sigue desarrollando**, sin que un branch en progreso pueda
romper prod ni ensuciar su data. Se evaluó un staging real (segundo proyecto
Supabase para los previews) y se descartó — ver `decisions.md` → "Ambientes".

| Ambiente | Dónde corre | Data |
|---|---|---|
| **Dev** | `npm run dev` local | File stores (`data/*.json`) — `.env.local` **sin** vars de Supabase |
| **Preview** (QA visual) | Vercel Preview (automático por branch) | File store **efímero y vacío** (sin vars de Supabase en Preview) |
| **Prod** | `main` → cbuilder.vercel.app | Supabase prod |

### Workflow

- `main` = prod. **No se commitea directo a `main`**: cada feature va en un
  branch (`feat/<nombre>`); al pushearlo, Vercel crea un Preview deployment con
  URL propia — sirve para QA visual (desktop + teléfono). Merge a `main` =
  deploy a prod.
- Dev local nunca toca Supabase: sin `SUPABASE_*` en `.env.local`, las
  factories caen al file store (`data/*.json`). Ese es el aislamiento de dev.
- Los previews son **inofensivos por diseño**: sin `SUPABASE_*` arrancan con
  registro vacío en el file store efímero de Vercel; la data de prueba muere
  con el preview.

### Scoping de env vars en Vercel

Vercel scopea cada env var por ambiente (Production / Preview / Development):

| Var | Production | Preview |
|---|---|---|
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | ✓ | ✗ — ⚠️ en "All Environments" un preview escribiría en la DB de **prod** |
| `GDOCS_SCRIPT_URL` / `GDOCS_TOKEN` | ✓ | ✗ (sink apagado → 501, ya manejado; evita Docs reales en Drive desde pruebas) |
| `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` | ✓ | ✓ (los previews también con candado) |

Si algún día hace falta staging real (un feature de data que se quiera probar
deployado antes de prod, o un segundo usuario): crear un proyecto Supabase
aparte, correr `supabase/schema.sql`, y scopear sus `SUPABASE_*` a Preview.
Cero refactor — es solo env vars.

## Notas

- Migrar data local a Supabase: correr en el SQL editor los scripts generados
  desde los JSON de `data/` — `registry-import.sql` (registro) y
  `notes-links-import.sql` (notas + links estables). Ambos gitignoreados,
  `on conflict do nothing`/`do update` (seguros de re-correr).
- Para login real (multi-usuario) en el futuro: Supabase Auth + RLS
  `to authenticated`, sin rehacer los datos.
