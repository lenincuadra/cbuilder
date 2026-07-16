# Guía: ciclo Git → GitHub → Vercel (cbuilder)

Referencia paso a paso del ciclo completo de un cambio: desde el código en tu Mac hasta prod. Pensada para que **vos ejecutes** cada paso (modo copiloto). Complementa a `docs/deploy.md` → "Ambientes", que explica el porqué del workflow.

---

## Los tres lugares

| Lugar | Qué es | Qué vive ahí |
|---|---|---|
| **Tu Mac (local)** | Tu copia de trabajo del repo | El código que editás, más la data privada (`data/*.json`, `TODO.md`) que **nunca** sale de acá |
| **GitHub** (`github.com/lenincuadra/cbuilder`) | La copia compartida + historial | Todos los commits, los branches pusheados, los PRs. **El repo es público**: todo lo que subís lo puede ver cualquiera |
| **Vercel** (`vercel.com`) | El hosting que deploya solo | Un deploy **Preview** por cada PR (efímero, sin data real) y el deploy **Production** (`cbuilder.vercel.app`), que se actualiza solo cuando `main` cambia |

**La regla que ordena todo:** `main` = prod. Nunca se commitea directo a `main`; todo cambio viaja en un branch propio y entra por PR.

---

## El ciclo completo

### 0. Situarse (siempre antes de tocar nada)

```bash
git status
```

Te dice: en qué branch estás (`On branch ...`), qué archivos cambiaron (rojo = sin preparar, verde = preparados para commit) y si estás al día con GitHub.

### 1. Crear el branch

```bash
git switch main
git pull
git switch -c feat/nombre-corto
```

- `git pull` trae lo último de GitHub para que arranques desde prod actual.
- `-c` crea el branch y te mueve a él. Convención de nombres: `feat/...` (funcionalidad nueva) o `fix/...` (arreglo), en inglés, con guiones.

### 2. Hacer los cambios

Editás el código (o lo edita Claude). Git ve los cambios automáticamente; no hay que "avisarle".

### 3. Revisar qué cambió

```bash
git status          # qué archivos
git diff            # qué líneas exactas (q para salir)
```

Hábito clave: nunca commitear sin mirar el diff. Es tu último control de que no se cuele nada (sobre todo data privada, en un repo público).

### 4. Commit

```bash
git add app/ruta/al/archivo.ts otro/archivo.ts
git commit -m "Short message in English explaining the change"
```

- `git add` con archivos **explícitos** (evitá `git add -A` hasta que leer `git status` sea reflejo: te protege de commitear algo por accidente).
- El commit es una foto local: todavía no salió de tu Mac.
- Mensajes en inglés, imperativos y cortos: `Fix error copy in AI routes`.

### 5. Push

```bash
git push -u origin feat/nombre-corto
```

- Sube el branch a GitHub. `-u` lo deja "enganchado" para que la próxima vez alcance `git push` a secas.
- **Mirá la salida**: GitHub te imprime un link directo para crear el PR (`https://github.com/lenincuadra/cbuilder/pull/new/...`). Podés abrirlo con Cmd+click.

### 6. Crear el PR (en GitHub, browser)

Qué vas a ver:

1. Si entrás por el link del push, vas directo al formulario. Si entrás a la página del repo, aparece un **banner amarillo** "feat/nombre-corto had recent pushes" con el botón **Compare & pull request**.
2. En el formulario, verificá la línea de arriba: `base: main ← compare: feat/nombre-corto` (casi siempre viene bien sola).
3. Título (te lo precarga del commit) y descripción opcional. Botón verde **Create pull request**.

### 7. QA en el Preview (Vercel)

1. Al minuto de crear el PR, el **bot de Vercel comenta** en el PR con una tabla: buscá el link **Visit Preview**.
2. Ese link es un deploy real de tu branch, pero **efímero y sin Supabase**: usa file store vacío, así que no ve ni toca la data de prod. Probá ahí lo que cambió.
3. Si te pide login al entrar, es la protección de Vercel: entrá con tu cuenta de Vercel y listo.
4. Si el bot marca ❌ (build failed), el link te lleva a los logs del error. No se puede romper prod desde acá: el error quedó contenido en el Preview.

### 8. Merge (en GitHub, browser)

1. Abajo del PR, botón verde **Merge pull request** → **Confirm merge**.
2. Después del merge aparece **Delete branch**: dale. Borra solo el branch remoto (tu copia local sigue existiendo).

### 9. Deploy a prod (automático)

El merge cambió `main` → Vercel deploya solo. Para verlo: `vercel.com` → proyecto **cbuilder** → pestaña **Deployments** → el de arriba dice `Production`, y pasa de `Building` a `Ready` en ~1-2 min. Después verificá en `cbuilder.vercel.app`.

### 10. Limpieza local

```bash
git switch main
git pull            # trae el merge que acabás de hacer
git branch -d feat/nombre-corto
```

Tu Mac queda igual que prod, sin branches muertos. Fin del ciclo.

---

## Resumen del ciclo

| # | Acción | Dónde / Qué sucede por detrás |
|---|---|---|
| 1 | `git switch -c feat/x` | Local — branch nuevo desde `main` actualizado |
| 2 | Editar código | Local |
| 3 | `git status` + `git diff` | Local — control de qué va a entrar |
| 4 | `git add ...` + `git commit` | Local — foto del cambio, aún privada |
| 5 | `git push -u origin feat/x` | Sube a GitHub — desde acá es público |
| 6 | Create pull request | GitHub — propone mergear `feat/x` en `main` |
| 7 | Visit Preview | Vercel deployó el branch aparte; QA sin riesgo (sin data real) |
| 8 | Merge + Delete branch | GitHub — el cambio entra a `main` |
| 9 | Esperar `Ready` | Vercel detecta `main` nuevo y deploya prod solo |
| 10 | `git pull` + `git branch -d` | Local — sincronizar y limpiar |

---

## Qué es reversible (mapa del miedo)

Casi todo. Git guarda historial de todo lo commiteado; la única pérdida real posible son cambios **sin commitear**.

| Situación | ¿Se pierde algo? | Salida |
|---|---|---|
| Edité un archivo y me arrepiento (sin commit) | ⚠️ Único caso de pérdida real | `git restore <archivo>` — ojo: esto SÍ descarta tus cambios, a propósito |
| Commit local con error | No | Otro commit arriba, o `git commit --amend` si fue el mensaje |
| Ya pusheado con error | No | Otro commit + push; el PR se actualiza solo |
| Ya mergeado y prod se ve mal | No | Botón **Revert** en el PR de GitHub (crea el PR inverso), o en Vercel: deployment anterior → `⋯` → **Instant Rollback** |

Regla práctica mientras aprendés: ante cualquier comando que suene a "borrar" o "forzar" (`restore`, `reset`, `--force`), frená y preguntame primero. Todo lo demás es inofensivo.

---

## Errores comunes

- **`git push` rechazado** (`rejected... fetch first`): GitHub tiene commits que vos no. `git pull` primero, después push.
- **Commiteaste en `main` por accidente**: no pushees. Es recuperable en dos comandos; pedime ayuda ahí mismo.
- **El Preview falla el build**: el link del ❌ muestra los logs. Se arregla con otro commit al mismo branch; el PR y el Preview se regeneran solos.
- **`git status` muestra archivos que no tocaste** (`data/registry.json`, etc.): es la app corriendo en local que escribe data. Está gitignoreado lo importante; no lo agregues al commit.

---

## Glosario mínimo

- **repo**: el proyecto completo con todo su historial.
- **branch**: línea de trabajo paralela; `main` es la principal (= prod acá).
- **commit**: foto con nombre de un conjunto de cambios.
- **stage** (`git add`): la "bandeja" de lo que entra en el próximo commit.
- **push / pull**: subir tus commits a GitHub / traer los de GitHub.
- **origin**: apodo de tu repo en GitHub (`github.com/lenincuadra/cbuilder`).
- **PR (pull request)**: propuesta de mergear un branch en otro, con revisión y Preview en el medio.
- **merge**: incorporar los commits de un branch en otro.
- **working tree**: tus archivos tal como están ahora, commiteados o no.
