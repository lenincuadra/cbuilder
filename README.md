# cv-builder

App web que genera el CV de Lenin Cuadra para una aplicación concreta, con un
**código de tracking** insertado en los links del header, y mantiene un registro
privado de a dónde y cómo se aplicó a cada puesto. El output es un `.docx`
editable; opcionalmente se archiva el `.zip` y se crea una copia en Google Docs.

> **Privacidad:** el repo es público, pero la data del registro (a quién aplicó
> Lenin) es privada y está fuera de git (`data/` gitignoreado). No commitear data
> real.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Sin ninguna configuración, la app corre 100% local: guarda el registro en
`data/registry.json` (en disco, fuera de git). Los sinks opcionales (Supabase,
Google Docs) se activan con variables de entorno — ver más abajo.

Otros comandos:

```bash
npm run test         # vitest (lógica de core/ + storage)
npm run lint         # eslint
npm run build        # build de producción
```

## Cómo funciona (en un párrafo)

Un wizard captura empresa, idioma, foco y opcionales. `generateCv()` elige un
código único, rellena el/los master(s) `.docx` reemplazando los placeholders por
los links de tracking reales, empaqueta un `.zip` y arma la fila del registro. El
zip se descarga, se archiva en `data/cvs/` y (si está configurado) se crea en tu
Drive como Google Doc. Todo lo identificatorio va en el nombre de la carpeta
(`[IDIOMA]_[empresa]_[código]`); el archivo entregable siempre se llama
`Lenin_Cuadra_CV.docx`, sin tracking.

Para el detalle completo (pipeline, storage, rutas API, modelo de tracking):
**[`docs/architecture.md`](docs/architecture.md)**.

## Documentación

| Doc | Qué contiene |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | **Empezá acá.** Mapa qué/cómo: pipeline, storage, rutas API, tracking |
| [`docs/decisions.md`](docs/decisions.md) | Log de decisiones (el *por qué*, trade-offs, reglas que cambiaron) |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Convenciones de UI (drawers, tabla, filtros, wizard) |
| [`docs/gdocs-setup.md`](docs/gdocs-setup.md) | Setup del sink a Google Docs (Apps Script) |
| [`docs/supabase-setup.md`](docs/supabase-setup.md) | Setup de Supabase (registro durable para deploy) |
| [`docs/cv-builder-product-definition.md`](docs/cv-builder-product-definition.md) | Spec original del producto (histórica) |
| [`CLAUDE.md`](CLAUDE.md) | Reglas inviolables + convenciones para trabajar en el repo |

## Features

- **Tracking por link** — código `MMDD`+letra+dígito, con identificador de link
  (portfolio `P` / LinkedIn `L` / GitHub `G`) apendeado.
- **Foco del portfolio** — opción en el wizard para que el link del CV reordene
  los casos del portfolio según la industria (fintech, IA, e-commerce).
- **Registro** — tabla filtrable (vigentes/archivado × estado), panel de detalle
  editable, seguimiento (notas + timeline), alerta de inactividad, borrado.
- **Entrega** — descarga del zip + archivo local en `data/cvs/` + copia en Google
  Docs; el drawer muestra dónde quedó cada cosa (Finder / URL de Drive).
- **Links estables** — tracking de touchpoints permanentes (LinkedIn, Behance…),
  no atados a una aplicación: 1 link por perfil, para ver/copiar/agregar.

## Stack

Next.js · Tailwind CSS · shadcn/ui (base-ui) · Vitest. Deploy a Vercel (requiere
Supabase para el registro durable — ver [`docs/supabase-setup.md`](docs/supabase-setup.md)).
