# Animaciones (cv-builder)

Plan y **contrato** de las animaciones de marca de la app. El **por qué** de las
decisiones no obvias va a [`decisions.md`](decisions.md); las convenciones de UI,
a [`DESIGN.md`](DESIGN.md); el modelo de datos que alimenta la animación
data-driven, a [`architecture.md`](architecture.md). Este doc es la fuente de
verdad del sistema de animación — pensado también para pasárselo a otra
herramienta/IA que produzca los assets sin tocar data privada.

> Estado: **plan v1**. Nada implementado todavía. Decisiones de alcance ya
> resueltas (ver §6); quedan solo valores tuneables.

---

## 1. El backbone escalable — un mundo, muchas escenas

La escalabilidad no está en el código: está en que **las dos animaciones
comparten universo**. El arquero y el forjador son el **mismo muñeco** con
distinta herramienta, y la **flecha es el mismo objeto**. Ese es el pago: un solo
set de assets, muchas escenas.

**Principio rector: un personaje, muchos roles.** Toda animación futura debería
recombinar el asset set antes que dibujar de cero.

Tres piezas fijas que todo lo futuro reusa:

| Pieza | Qué es | Por qué escala |
|---|---|---|
| **Asset set** | Un personaje (muñeco), la flecha, la diana, el fondo/yunque | Una escena nueva = recombinás estos, no dibujás de cero |
| **Motion tokens** | Duraciones, easings y umbrales en un solo lugar (ver §5) | Todas las escenas se sienten coherentes y se tunean centralizado — el "DESIGN.md del movimiento" |
| **Contrato** | La animación recibe **solo props**, nunca toca la DB | Un adaptador finito traduce datos→props; la animación es tonta y portable |

### Taxonomía de roles

Clasificar toda animación futura en uno de estos tres roles (define cómo se
dispara y qué la cierra):

- **Data-driven** — refleja números reales. Se **auto-cronometra** (la cierra su
  propio presupuesto de tiempo). → el arquero.
- **Ambient / loading** — loop decorativo mientras algo carga. La cierra el
  **evento real** (el pipeline termina), no el reloj. → el forjador.
- **Intro / brand** — secuencia narrativa. Forjar → disparar → dar en el blanco,
  como títulos. Reusa las dos escenas anteriores.

### Contrato (para que lo que se construya afuera encaje)

```ts
type Scene =
  | { kind: "archer"; count: number; scope: "vigentes" | "all"; onDone?: () => void }
  | { kind: "forger"; onDone: () => void }   // loop hasta que el pipeline real termina
  | { kind: "intro" };
```

Regla dura: **la animación no importa nada de `core/registry` ni hace fetch.** Un
adaptador delgado (fuera del componente de animación) lee las filas y pasa
`count`. Así el asset es portable y testeable, y la data privada nunca vive dentro
de la animación.

---

## 2. Animación 1 — El arquero (data-driven)

Cada flecha lanzada = un CV enviado. El muñeco dispara a una diana.

### De dónde sale el conteo

Un CV **enviado** es una fila con `cvPending` falso (cuando `cvPending: true` la
fila es "Borrador", registrada pero sin CV — mismo criterio que el embudo AARRR:
`status !== "Borrador"`).

El alcance por defecto es **`"all"`** → `!cvPending`, incluidas archivadas y
rechazadas: "toda flecha que voló alguna vez". Un CV enviado y luego archivado
**igual fue una flecha lanzada**, así que es lo más fiel a la metáfora. El prop
`scope` se mantiene para instancias acotadas: `"vigentes"` → `!archived &&
!cvPending` filtra a la búsqueda activa (útil si algún día se incrusta el arquero
dentro de la vista Vigentes).

### El problema central: duración acotada, pero reflejar que se lanzaron todas

Se resuelve separando **el vuelo** (acotado en tiempo) del **resultado** (fiel al
número):

> **La diana es el libro contable.** El vuelo está time-boxed; la diana termina
> *sosteniendo* el total — clavada de flechas + un contador con el N exacto.
> "Se lanzaron todas" queda expresado en el resultado, no en la duración.

### Mapeo por registros

En vez de 1 flecha = 1 CV siempre, cambia el **lenguaje visual** según la escala:

| N (CVs enviados) | Registro | Qué se ve |
|---|---|---|
| 0 | Idle | Muñeco quieto, respirando, carcaj vacío (empty state) |
| 1–8 | **Literal 1:1** | Cada CV = un tiro apuntado, escalonado. Las flechas se clavan y quedan. Termina con N flechas visibles. Caso "héroe", satisfactorio |
| 9–30 | **Andanadas** | Ráfagas de 3–5 flechas por tensada. Comprimido pero aún "contable". La diana se llena en racimo |
| 31+ | **Lluvia + contador** | Una o dos barridas de "lluvia de flechas". La diana se vuelve alfiletero (tope visual de flechas clavadas) y un **número tickea hasta el N real** ("187 flechas"). El número carga la exactitud que el dibujo ya no puede |

**Qué es un umbral acá:** el número de CVs en el que la animación *cambia de
lenguaje*. Con 8 flechas todavía tiene sentido dibujar una por una; con 40 ya no
—se satura y se vuelve ilegible—, así que a partir de cierto N conviene pasar a
andanadas, y más arriba a lluvia. Esos puntos de corte (8 y 30) son los umbrales.
No son sagrados: si tu búsqueda tiende a tener muchos más CVs, se suben. Viven
como motion tokens (§5) para tunearlos en un lugar.

### Presupuesto de tiempo fijo

El total se acota a `T_max` pase lo que pase. Adentro del presupuesto, **el gap
entre flechas se encoge a medida que N crece**, asintótico hacia "chorro" — nunca
llega a cero, así que aun en barrage se perciben flechas discretas.

```
gap = clamp(T_budget / f(N), gap_min, gap_max)   // f sublineal (log o √N)
```

- 5 flechas → tiros lentos y apuntados (gap cerca de `gap_max`).
- 300 flechas → barrage veloz que igual entra en `T_max` (gap cerca de `gap_min`).

### Máquina de estados

```
idle → tensar → soltar → (en vuelo) → impacto
                  └──────── repetir hasta agotar presupuesto/conteo ────────┘
                                                        ↓
                                     asentado (diana con N + contador) → reposo
```

### Dónde vive

- **Uso primario: el splash / intro de la app** (arranque). Ahí corre en rol
  **intro**: automático al cargar, sin que el usuario lo pida.
- **Reusable on-demand en otros lados** — "on-demand" = se dispara por una acción
  del usuario (abrir una vista, tocar un botón), no automático. Ej.: una card de
  stats que se abre a propósito, o una celebración al marcar un milestone.

El mismo componente sirve para ambos porque el contrato (§1) ya lo contempla: en
el splash se monta con `count` del scope `"all"` y arranca solo; on-demand se
monta cuando el usuario abre la vista. La escena es la misma; cambia solo **quién
la dispara**.

### Extensión opcional (post-v1)

Colorear las flechas por el estado del funnel que ya vive en el modelo
(`status`, `milestones`): rechazado = flecha que cae/erra, activo = clavada,
oferta = en el centro/bullseye. Enlaza la animación con el embudo AARRR real. **No
va en la v1** — se anota como camino futuro.

---

## 3. Animación 2 — El forjador (ambient / loading)

El cbuilder haciendo un CV, pero en lugar de escribir **forja la flecha**.

- **Rol:** loading state mientras el pipeline de IA genera el CV/carta. Es un
  **loop**, no data-driven — lo cierra el pipeline real (`onDone`), no el reloj.
- **Beats:** calienta y martilla la punta → forja el astil → emplumado → flecha
  "lista" (brilla y se enfría) → al carcaj. Loopea sin costura si la generación
  tarda más que un ciclo.
- **El puente narrativo (por esto comparten assets):** al terminar, la flecha
  forjada **sale volando** y se convierte en la flecha que el arquero dispara.
  Forjar → disparar → dar en el blanco es el arco completo, con el **mismo objeto**
  pasando de una escena a la otra. Esto justifica todo el backbone compartido.

---

## 4. Notas de implementación / handoff a otra IA

Distinción técnica que **cambia qué herramienta conviene** en cada una:

| Animación | Naturaleza | Formato viable |
|---|---|---|
| **Forjador** | Loop sin datos | **Fácil** — Lottie/GIF pre-renderizado. Cualquier tool sirve |
| **Arquero** | `count` varía en runtime | **Necesita motor param-driven** — NO puede ser video/GIF fijo. Lottie con *segments* + control de velocidad/repeticiones, o (más flexible para la lógica por registros) rig SVG animado con GSAP/Framer Motion |

Si el arquero se produce en otra IA, pedir el **rig + los estados** (§2 máquina de
estados), no un clip cerrado.

### Herramientas recomendadas

| Rol | Herramienta | Por qué |
|---|---|---|
| **Arquero** (data-driven) | **Rive** (rive.app) | Es literalmente su modelo: una *state machine* dentro del `.riv` con un **number input** que la app setea en runtime → la animación reacciona sola. El `count` entra como ese input y maneja los registros/andanadas. Runtime de React limpio, corre a ~60fps, archivos 10–15× más chicos que Lottie. En 2026 es el estándar para animación atada a datos/lógica |
| **Forjador** (loop ambient) | **Lottie** (diseñado en After Effects → export por LottieFiles) | Es un loop sin datos; Lottie brilla justo ahí. También sirve un GIF/APNG o un Rive simple si ya se paga la curva de Rive |
| **El pegamento (código)** | **Claude / Claude Code** | Lo mejor donde encaja Claude: el **adaptador** que lee las filas → `count`, la integración del `.riv`/Lottie en Next.js, el fallback de `prefers-reduced-motion`, y la lógica de umbrales si se hace 100% en código (SVG + Framer Motion / GSAP). No es la mejor opción para **dibujar** el personaje/arte — eso lo hace mejor Rive o un ilustrador |

**Camino sugerido:** el arte se genera como SVG editable con **Quiver AI** y se
riggea en Rive (ver "Generación de assets" abajo). El forjador puede salir de un
export Lottie de ese personaje; el arquero se arma en Rive con la state machine +
number input. Claude cablea ambos al Next.js y escribe el adaptador de datos. Así
un solo set de arte alimenta las dos escenas (principio §1).

### Generación de assets (Quiver AI → Rive)

Quiver AI (modelo *Arrow*) genera **SVG vectorial editable** desde texto/imagen;
Rive **importa SVG** como paths editables. Regla de rol: Quiver solo para el **arte
estático**; **toda la animación, el rig y la state machine van en Rive** (la
animación CSS de Quiver no hace la lógica data-driven del `count`).

Se genera **un personaje neutro + los props sueltos** — las poses (tensar, martillar)
se arman rigueando en Rive, no se prompteán. Tres claves para que el SVG sea
rig-eable: (1) generar el personaje **primero** y adjuntarlo como **imagen de
referencia** en el resto → estilo/paleta consistentes; (2) la flecha se genera **una
vez** (viaja del forjador al arquero); (3) pedir siempre **partes en grupos con
nombre** (un SVG aplanado no se riggea).

Si el personaje sale genérico: adjuntá a su propio prompt una **imagen de
referencia** (una silueta/estilo de búho que te guste — no un personaje con
copyright, solo guía de estilo) y sumá 1–2 rasgos distintivos concretos (paleta,
forma de las orejas, anteojos). La referencia manda sobre el texto para look y
silueta.

Prompts (uno por asset, en orden; el bloque de estilo va tal cual al inicio de cada
uno):

```
1. CHARACTER
Flat vector mascot art, clean geometric shapes, minimal detail, bold even line
weight, limited flat palette (2–3 base colors + 1 accent), side or three-quarter
view, transparent background, no text, no gradients. A friendly humanoid owl
mascot for a tool called "cbuilder": large round expressive eyes, small curved
beak, two ear tufts, rounded feathered body, small work apron, standing on two
taloned feet. Humanoid feathered arms ending in small hands that can hold tools.
Neutral standing pose, arms slightly bent and away from the body. Output every
part as a separate NAMED group: head, ear-tufts, torso, upper-arm-front,
forearm-front, hand-front, upper-arm-back, forearm-back, hand-back, thigh, shin,
taloned-foot. Both arms fully drawn and separated so it can be rigged. Centered.

2. ARROW  (attach CHARACTER as style reference)
<style block> One simple stylized arrow, horizontal, pointing right: triangular
head, straight shaft, two-feather fletching. Three separate NAMED groups:
arrowhead, shaft, fletching. Readable at small size.

3. BOW  (attach CHARACTER as reference)
<style block> A simple recurve bow with string, vertical, front-on, sized for the
mascot to hold. Separate NAMED groups: bow-limb, string.

4. TARGET / DIANA  (attach CHARACTER as reference)
<style block> A classic archery target: concentric rings with a bullseye center,
on a simple stand, front view. Clean face so arrows can be placed on top later.
Separate NAMED groups: rings, bullseye, stand.

5. ANVIL  (attach CHARACTER as reference)
<style block> A small blacksmith anvil, side view, chunky and simple. Optional
small forge flame as a separate NAMED group. Groups: anvil, fire.

6. HAMMER  (attach CHARACTER as reference)
<style block> A simple blacksmith hammer, side view, sized for the mascot to hold.
Separate NAMED groups: hammer-head, handle.
```

`<style block>` = las dos primeras oraciones del prompt 1 (de "Flat vector mascot
art…" hasta "…no gradients."), pegadas al inicio de cada prompt. No se escribe la
etiqueta literal.

**Checklist antes de importar a Rive** (por cada SVG):

- Fondo **transparente** (sin `<rect>` blanco detrás) y **sin `<text>`** colgado
  (Quiver a veces hornea los nombres de los grupos como rótulos).
- Cada parte es un **grupo/path con nombre**, no un path aplanado; paths cerrados
  (rellenan bien).
- Personaje: las piezas deben **solaparse en las articulaciones** (hombro/codo/
  cadera). Vienen despiezadas con huecos; si no solapan, al doblar se ven cortes.
- Arco: verificar que la **cuerda** sea un elemento aparte y tirable. Si no lo es,
  se dibuja en Rive — conviene igual: la cuerda tiene que **deformarse** al tensar.
- **Vista del personaje**: si salió de frente y la pose de arquero (tensar de
  costado) no lee bien, se rota el torso en Rive antes de regenerar en 3/4.
- **Escala relativa**: al ensamblar, dimensionar props respecto del búho (arco ≈
  alto del torso, martillo más chico).

> Alternativa sin herramienta de diseño: si preferís no salir del código, Claude
> puede generar el arquero como componente React (SVG + Framer Motion/GSAP) con
> toda la lógica de §2. Da más control y cero dependencias nuevas, a costa de un
> arte más geométrico/simple que el de una tool dedicada.

- **Reduced motion:** ambas necesitan fallback estático (`prefers-reduced-motion`)
  — la diana con N flechas + el número, sin movimiento.
- **Sin data adentro:** el asset recibe `count` por prop; el adaptador que lee las
  filas vive fuera del componente (ver §1 contrato).

---

## 5. Motion tokens (valores de arranque, tuneables)

Un solo lugar para las constantes de movimiento — todas las escenas las comparten.

| Token | Valor inicial | Qué controla |
|---|---|---|
| `T_max` | ~3000 ms | Presupuesto total del arquero, independiente de N |
| `gap_max` | ~500 ms | Gap entre flechas con N chico (tiros apuntados) |
| `gap_min` | ~60 ms | Piso del gap en barrage (nunca 0 → flechas discretas) |
| `T1` (literal→andanada) | 8 | Fin del registro 1:1 |
| `T2` (andanada→barrage) | 30 | Fin del registro de andanadas |
| `volleySize` | 3–5 | Flechas por tensada en andanadas |
| `dianaVisualCap` | ~40 | Máximo de flechas clavadas dibujadas (el resto lo carga el contador) |
| `forgerCycle` | ~1500 ms | Duración de un ciclo de forja (loop) |

Easings sugeridos: tensar = ease-in (tensión que sube), soltar = ease-out rápido,
vuelo = cubic-bezier de parábola, tick del contador = ease-out.

---

## 6. Decisiones

**Resueltas:**

1. **Alcance del conteo** → **`"all"`** (`!cvPending`, incluye archivadas): "toda
   flecha que voló". El prop `scope` deja `"vigentes"` disponible para instancias
   acotadas.
2. **Dónde vive el arquero** → **splash / intro** como uso primario (automático al
   cargar), **reusable on-demand** en otros lados (celebración de milestone, card
   de stats). Mismo componente, cambia quién lo dispara (§2 "Dónde vive").

**Valores por defecto (tuneables, no bloquean):**

- Umbrales `T1=8` / `T2=30` y `dianaVisualCap≈40` — buenos para 10–150 CVs. Se
  suben si la búsqueda tiende a más volumen. Viven en los motion tokens (§5).
