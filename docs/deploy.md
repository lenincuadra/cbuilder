# Deploy (Vercel + Supabase)

Deploy privado del **registro** (fase 1). Notas y Links estables quedan solo-local
por ahora (usan el file store, que es efímero en Vercel; se suman a Supabase
después si hace falta). El archivo de zips (`data/cvs`) también es efímero en
Vercel — no importa: el sink de Google Docs ya guarda la copia durable en Drive.

## Arquitectura (por qué es privado)

- El browser **nunca** habla con Supabase directo. Va a las **API routes** de la
  app (`/api/registry`), que corren en el server y usan Supabase con la **service
  role key** — que **nunca** se manda al browser (no es `NEXT_PUBLIC`).
- La tabla tiene **RLS on y sin policy** → anon/authenticated denegados. Solo la
  service key (server) accede. Aunque el repo/URL sea público, el registro no.
- Un **middleware** de basic-auth le pone contraseña a toda la app.

## 1. Supabase (una vez)

1. Crear proyecto en [supabase.com](https://supabase.com) (free alcanza).
2. **SQL editor** → pegar y correr `supabase/schema.sql` (crea la tabla + RLS).
3. **Project settings → API** → copiar la **Project URL** y la **`service_role`**
   key (NO la anon). ⚠️ La service key es un secreto total — nunca la pegues en el
   cliente ni la commitees.

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
candado (dev). En Vercel, seteá los cuatro.

## 3. Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → importá el repo
   `lenincuadra/cbuilder`.
2. Framework: Next.js (autodetectado). Agregá las env vars del paso 2.
3. **Deploy**. Al abrir la URL te va a pedir usuario + contraseña (el basic-auth).

## Notas

- Migrar el registro local a Supabase: exportá el CSV (botón "Exportar") o corré
  un insert one-off; el schema mapea 1:1 a `RegistryRow`.
- Para login real (multi-usuario) en el futuro: Supabase Auth + RLS
  `to authenticated`, sin rehacer los datos.
