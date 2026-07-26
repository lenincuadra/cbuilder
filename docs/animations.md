# Animaciones (cv-builder)

Plan y **contrato** de las animaciones de marca de la app. El **por qué** de las
decisiones no obvias va a [`decisions.md`](decisions.md); las convenciones de UI,
a [`DESIGN.md`](DESIGN.md); el modelo de datos que alimenta la animación
data-driven, a [`architecture.md`](architecture.md). Este doc es la fuente de
verdad del sistema de animación — pensado también para pasárselo a otra
herramienta/IA que produzca los assets sin tocar data privada.

> Estado: **implementado (v1, reducido)**. Los dos componentes de escena
> existen y están probados visualmente (ver §4), pero **todavía no están
> montados en la app real** — falta el adaptador `core/registry` → `count` y
> decidir dónde vive cada uno (§2/§3 "Dónde vive"). Decisiones de alcance ya
> resueltas (ver §6); quedan solo valores tuneables.

---

## 1. El backbone — un objeto compartido, dos escenas

**Sin personaje.** Ninguna de las dos escenas tiene muñeco/mascota — son objetos
animando solos: la flecha vuela sola hasta la diana; el martillo golpea solo
sobre el yunque. Lo que las conecta es que **la flecha es el mismo asset** en las
dos escenas: nace en el yunque (forjada) y termina en la diana (disparada). Ese
es el pago compartido: un solo objeto viajando entre dos escenas, no dos mundos
separados.

**Principio rector: un objeto, dos escenas.** Toda animación futura debería
reusar la flecha antes que inventar un objeto nuevo.

Tres piezas fijas que todo lo futuro reusa:

| Pieza | Qué es | Por qué escala |
|---|---|---|
| **Asset set** | La flecha, la diana, el yunque, el martillo | Sin mascota que dibujar: 4 formas simples que cualquier escena nueva recombina |
| **Motion tokens** | Duraciones, easings y umbrales en un solo lugar (ver §5) | Todas las escenas se sienten coherentes y se tunean centralizado — el "DESIGN.md del movimiento" |
| **Contrato** | La animación recibe **solo props**, nunca toca la DB | Un adaptador finito traduce datos→props; la animación es tonta y portable |

### Taxonomía de roles

Clasificar toda animación futura en uno de estos tres roles (define cómo se
dispara y qué la cierra):

- **Data-driven** — refleja números reales. Se **auto-cronometra** (la cierra su
  propio presupuesto de tiempo). → la flecha a la diana.
- **Ambient / loading** — loop decorativo mientras algo carga. La cierra el
  **evento real** (el pipeline termina), no el reloj. → el martillo en el yunque.
- **Intro / brand** — secuencia narrativa. Martillo forja la flecha → la flecha
  sale disparada → da en el blanco, como títulos. Reusa las dos escenas
  anteriores.

### Contrato (para que lo que se construya afuera encaje)

```ts
type Scene =
  | { kind: "arrow"; count: number; scope: "vigentes" | "all"; onDone?: () => void }
  | { kind: "hammer"; onDone: () => void }   // loop hasta que el pipeline real termina
  | { kind: "intro" };
```

Regla dura: **la animación no importa nada de `core/registry` ni hace fetch.** Un
adaptador delgado (fuera del componente de animación) lee las filas y pasa
`count`. Así el asset es portable y testeable, y la data privada nunca vive dentro
de la animación.

---

## 2. Animación 1 — Flecha a la diana (data-driven)

Cada flecha lanzada = un CV enviado. **Sin arco, sin muñeco**: la flecha se
autolanza sola hacia la diana — solo el objeto viajando y clavándose.

### De dónde sale el conteo

Un CV **enviado** es una fila con `cvPending` falso (cuando `cvPending: true` la
fila es "Borrador", registrada pero sin CV — mismo criterio que el embudo AARRR:
`status !== "Borrador"`).

El alcance por defecto es **`"all"`** → `!cvPending`, incluidas archivadas y
rechazadas: "toda flecha que voló alguna vez". Un CV enviado y luego archivado
**igual fue una flecha lanzada**, así que es lo más fiel a la metáfora. El prop
`scope` se mantiene para instancias acotadas: `"vigentes"` → `!archived &&
!cvPending` filtra a la búsqueda activa (útil si algún día se incrusta esta
escena dentro de la vista Vigentes).

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
| 0 | Idle | Diana vacía, sin flechas clavadas (empty state) |
| 1–8 | **Literal 1:1** | Cada CV = un tiro apuntado, escalonado. Las flechas se clavan y quedan. Termina con N flechas visibles. Caso "héroe", satisfactorio |
| 9–30 | **Andanadas** | Ráfagas de 3–5 flechas por tanda. Comprimido pero aún "contable". La diana se llena en racimo |
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
idle → lanzar → (en vuelo) → impacto
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

### Modo funnel — los 5 anillos son los 5 hitos (implementado)

En vez de posición aleatoria, `mode="funnel"` ubica cada flecha en el anillo
que corresponde a **cuán lejos llegó esa aplicación en el funnel** — enlaza la
animación con el embudo AARRR real (`MILESTONE_KEYS` en
`core/registry/types.ts`: `sent → responded → interview → offer → referral`).
Mapeo 1:1, de afuera hacia adentro:

| Anillo | Hito | `funnelRanks[i]` |
|---|---|---|
| Blanco (borde) | `sent` (todas — es el piso: ya están en el scope "CVs enviados") | 0 |
| Gris oscuro | `responded` | 1 |
| Azul | `interview` | 2 |
| Rojo | `offer` | 3 |
| Dorado (bullseye) | `referral` | 4 |

El componente no calcula esto — recibe `funnelRanks: number[]` (uno por
flecha, mismo orden que el `count`) de un adaptador externo (regla del
contrato, §1): `rows.filter(!cvPending).map(row => milestoneRank(row))`, con
`milestoneRank` clampeado a `[0,4]`. `mode="random"` (default) mantiene el
comportamiento anterior — posición uniforme dentro de toda la diana, sin leer
data. Ambos modos conviven en `ArrowToTarget`; el adaptador real todavía no
existe (mismo pendiente que el resto de §1 "Contrato").

---

## 3. Animación 2 — Martillo en el yunque (ambient / loading)

El cbuilder generando el CV, representado como forja: **el martillo golpea la
flecha sobre el yunque** — sin muñeco que lo sostenga, el martillo golpea solo.

- **Rol:** loading state mientras el pipeline de IA genera el CV/carta. Es un
  **loop**, no data-driven — lo cierra el pipeline real (`onDone`), no el reloj.
- **Beats (un solo beat en loop):** el martillo golpea la flecha sobre el yunque
  — cada golpe es un flash/chispazo en el punto de impacto. Sin etapas de
  calentar punta / forjar astil / emplumar.
- **El puente narrativo (por esto comparten assets):** al terminar, la flecha
  forjada **sale volando** y se convierte en la flecha que se autolanza en la
  escena de la diana. Forjar → disparar → dar en el blanco es el arco completo,
  con el **mismo objeto** pasando de una escena a la otra. Esto justifica el
  backbone compartido (§1).

---

## 4. Implementación (v1, hecha)

**Sin herramienta externa, sin dependencia nueva.** No hay Rive, no hay
Lottie, no hay Quiver, no hay Framer Motion/GSAP — solo React/Next/Tailwind
(ya estaban en el stack) más la **Web Animations API** (`el.animate(...)`),
que es una API nativa del browser, no una librería. El martillo (un loop fijo
simple) sigue siendo CSS puro; la flecha pasó de CSS a WAAPI (ver por qué
abajo).

| Pieza | Dónde vive |
|---|---|
| Assets SVG (React) | `ui/animations/assets/{Arrow,Diana,Hammer,AnvilFire}.tsx` |
| Motion tokens + registros | `ui/animations/motionTokens.ts` |
| Hook de accesibilidad | `ui/animations/usePrefersReducedMotion.ts` |
| Escena "flecha a la diana" | `ui/animations/ArrowToTarget.tsx` |
| Escena "martillo en el yunque" | `ui/animations/HammerAnvil.tsx` |
| Keyframes del martillo | `app/globals.css` (`cb-hammer-swing`, `cb-hammer-flash`) |
| Harness de QA + playground de tuning (dev-only, no linkeado desde la app) | `app/dev/animations/page.tsx` |

| Animación | Naturaleza | Cómo se resuelve |
|---|---|---|
| **Martillo en el yunque** | Loop sin datos | `.cb-hammer-swing`/`.cb-hammer-flash` en loop infinito, con los porcentajes del `@keyframes` compartiendo línea de tiempo (el flash pulsa justo en el punto de contacto, ~75%). `active` (prop) controla si el loop corre |
| **Flecha a la diana** | `count` varía en runtime | `buildShots(...)` arma todas las flechas de una vez (posición final, offset de spawn, timing de pico, `delay`); cada una se anima con `el.animate(keyframes, opts)` (Web Animations API), con los keyframes sampleados de una parábola real en JS (ver abajo). Un solo `requestAnimationFrame` deriva el contador visible a partir del tiempo transcurrido; no hay `setTimeout` encadenados |

### El vuelo de la flecha: por qué WAAPI y no `@keyframes`

Dos rondas de `@keyframes` con `--custom-properties` (una con un solo pico
hardcodeado, otra con 3 variantes `lob`/`punch`/`loft` de 5-6 stops) seguían
sin verse naturales — el usuario lo marcó dos veces. La razón de fondo: un
`@keyframes` de CSS es una forma **fija**, tenés que elegir de antemano
cuántos stops y en qué % — no podés parametrizar *dónde* pica el arco por
custom property (los `%` de un keyframe no son variables). Terminaba viéndose
"quebrado" en vez de curvo, y el timing-function global (`ease-in-out`)
deformaba encima la forma que ya estaba en los stops.

**La solución fue sampleá la trayectoria en JS, no en CSS.** `buildFlightKeyframes`
(`ArrowToTarget.tsx`) genera ~16 puntos de una parábola real por flecha, sobre
un progreso `te = t^1.7` (no `t` crudo — ver "acelera y llega de golpe" abajo):

- Horizontal: lineal **en `te`** (no en tiempo real) — de ahí sale la
  aceleración.
- Vertical: `h(te) = peak * (1 - distanciaAlPico²)` sobre el mismo `te` — la
  misma parábola de antes/después del pico, solo que `peakAt` (dónde cae el
  pico en `te` ∈ [0,1]) es **por flecha**, cosa que un `@keyframes` no puede
  parametrizar.
- Rotación: la tangente real del camino en cada punto (diferencia finita
  entre puntos consecutivos), no un ángulo elegido a mano — la punta siempre
  apunta hacia donde se mueve.
- El último frame fuerza rotación 0 así el ángulo visible final calza con
  `restRotation` (aplicado por el wrapper estático exterior).
- **Contrarrotación:** el wrapper exterior aplica `rotate(restRotation)` sin
  animar, desde el primer frame — no solo en el reposo final. Eso rota todo
  el sistema de coordenadas local de la flecha durante *todo* el vuelo, no
  solo la pose final. Sin corregir esto, cada flecha entraba rotada por un
  ángulo distinto según el valor de `restRotation` de esa flecha — un camino
  armado para "venir de la izquierda" terminaba entrando desde abajo/arriba/la
  derecha según el caso. `buildFlightKeyframes` contrarrota el camino
  sampleado por `-restRotation` antes de devolverlo, así el wrapper la vuelve
  a rotar de vuelta a la forma real — el *approach* visual es el mismo
  (viene de la izquierda) sin importar dónde cae. Esto era **el bug de fondo
  del reporte "caen en espiral"**.

**`restRotation` (el ángulo en el que queda clavada cada flecha) pasó por
tres diseños.** Vale la pena dejar registradas las dos primeras vueltas, no
solo la final: ambas parecían razonables y fallaban por motivos no obvios, y
es fácil reintroducir cualquiera de los dos errores si se vuelve a tocar este
código sin este contexto.

1. **Tangente al anillo** (original) → cada flecha rota para quedar "apoyada"
   contra la curva del anillo donde cae, así se lee como naturalmente
   clavada. Funciona bien para una flecha aislada, pero la tangente varía
   muchísimo según en qué punto del círculo cae cada flecha (casi horizontal
   arriba/abajo del anillo, casi vertical a los costados). Como el vuelo real
   de **todas** las flechas viene del mismo lado (§ arriba), flechas que
   volaron idéntico terminaban clavadas en ángulos finales muy distintos
   entre sí. Reporte del usuario, con captura de una flecha casi vertical al
   lado de varias casi horizontales: "el punto de caída está bien, pero la
   dirección de donde viene es rara, parece que salió desde abajo".
2. **Mezcla de un ángulo fijo + el ángulo "real" de llegada de cada flecha**
   (calculado con las mismas fórmulas del vuelo, evaluadas un sample antes de
   aterrizar) → soluciona la inconsistencia del #1, pero el ángulo "real"
   resultó ser una mala señal: por el ease-in del vuelo (`easeInPower`), el
   *último* tramo antes de aterrizar es desproporcionadamente
   empinado/vertical comparado con la dirección general del vuelo (que es
   sobre todo horizontal — el rango de `ox`/`spawnOffset*` es 2-3 veces el de
   `peak`/`arcHeight*`). Entonces aunque se mezclara 50/50 con un ángulo fijo
   más bajo, las flechas seguían leyendo más paradas de lo que realmente
   volaron — "se ven como que cayeron desde arriba aunque la trayectoria no
   fue así".
3. **Actual: un ángulo de reposo casi fijo (~horizontal) + jitter, sin física
   de por medio** — `restAngleBaseDeg: 0` (flecha acostada, apuntando a la
   derecha) y `restAngleJitterDeg: 14` (campos de `ArrowTuning`, ver §4 "el
   prop de tuning y el playground"). Ajustado contra una foto de
   referencia que trajo el usuario (flechas reales clavadas en una diana):
   todas quedan cerca de la horizontal y casi paralelas entre sí, con
   variación menor y no sistemática — ni tangente al anillo, ni atada al arco
   de vuelo de cada flecha individual. El rango del jitter salió de medir los
   ángulos de esas flechas en la foto (~-14° a +12° respecto a la
   horizontal).

Estos keyframes se pasan a `el.animate(keyframes, { duration, delay, easing:
"linear", fill: "forwards" })` — `linear` porque el ritmo ya está en la
densidad/valores de los puntos, no hace falta (ni conviene) otra curva de
easing encima.

**"Acelera y llega de golpe" (pedido explícito):** dos mecanismos, uno físico
y uno de timing. Físico: una caída bajo gravedad **acelera** — la velocidad
vertical es máxima justo en el impacto, no mínima; con `h(te)` así, la
flecha llega a máxima velocidad vertical y la animación simplemente termina
ahí, sin deceleration hacia el final. Timing: el progreso `te = t^1.7`
(`easeInPower` en `ArrowTuning`) además hace que la posición apenas cambie al
principio del tiempo real y se mueva la mayor parte de la distancia sobre el
final — un ease-in aplicado al *progreso*, no una curva de easing de WAAPI
encima (que deformaría la parábola ya sampleada). `flightDurationMin`/`Max`
se bajaron ~20% (253–360ms → 211–300ms) para la velocidad extra pedida.

**Random real entre replays:** `buildShots` sigue siendo determinístico por
índice (una flecha ya aterrizada no se reordena si `count` sube — misma
escena, mismo montaje), y el seed incluye un `sessionSeed` generado una vez
por montaje (`Math.random()`, seteado en un `useEffect` para no romper la
hidratación SSR). Antes el seed dependía solo del índice, así que cada
"Replay" (mismo `count`) producía exactamente el mismo arreglo — de ahí el
reporte original "no se siente random".

Esa primera solución tenía un bug residual: `sessionSeed` arrancaba en `0`
(placeholder para el primer render SSR-safe) y `shots` se computaba —y
**animaba**— con ese placeholder antes de que el `useEffect` lo re-sorteara.
El efecto que agenda `el.animate(...)` marca cada flecha como "ya animada" en
un `Set` indexado por `shot.id` (no por sus valores), así que cuando
`sessionSeed` cambiaba al valor real un render después, ese mismo `id` ya
estaba marcado — el efecto lo saltea y la animación real (con los valores
random correctos, incluida la `restRotation` que usa la contrarrotación de
arriba) **nunca se crea**. El wrapper estático sí se re-renderiza con los
valores nuevos, así que el resultado era una flecha que aterriza en el lugar
correcto pero vuela con la forma/rotación de un shot completamente distinto
— la otra mitad del reporte "caen en espiral" / "no se siente random".
Arreglado haciendo que `sessionSeed` arranque en `null` (no en `0`) y que
`shots` sea `[]` mientras tanto: así el placeholder nunca llega a agendarse,
y la única tanda de animaciones que se crea es la del seed real.

**Gotcha de implementación (para no repetirlo):** con dos `useEffect`
separados — uno que agenda animaciones (sin cleanup, para no cortar flechas
ya en vuelo cuando `count` sube) y otro solo-para-desmontaje que cancela todo
— **React Strict Mode** (dev) duplica el ciclo mount→cleanup→remount de
*todos* los efectos, incluidos los de deps `[]`, en el mismo commit inicial.
Eso cancelaba las animaciones recién creadas sin des-marcarlas del set de
"ya animadas", dejándolas fantasma (creadas, canceladas, nunca recreadas). El
fix: el cleanup de desmontaje limpia *ambos* refs (las animaciones y el set de
IDs) juntos, así el remount inmediato de Strict Mode se autocorrige en vez de
quedar en un estado inconsistente.

### Assets (SVG, sin arco, sin personaje)

Los 4 objetos (**flecha, diana, yunque+fuego, martillo**) son ilustraciones ya
hechas por el usuario en `assets/illustrations/*.svg` (no dibujadas a mano en
código como se planteaba originalmente) — se copiaron a componentes React en
`ui/animations/assets/`. Sin arco, sin cuerda, sin mascota.

- La **flecha es el mismo asset** en las dos escenas (martillo en el yunque →
  flecha a la diana), como ya establece el backbone (§1).
- Sin personaje no hay rig: el único pivot que hace falta es el del **martillo**
  (`transform-origin` cerca de la base del mango) para el swing arriba/abajo.
- El `hammer.svg` viene dibujado ya en diagonal (mid-swing); el `@keyframes`
  rota desde ahí, no arranca en 0°.
- **Reduced motion:** ambas leen `prefers-reduced-motion` y saltan a su estado
  final sin animar (diana con N flechas + contador; martillo/yunque quietos).
- **Sin data adentro:** el componente recibe `count` (o `active`) por prop; el
  adaptador que lee las filas de `core/registry` todavía no existe — es el
  próximo paso para montar esto en la app real (splash/intro, §2 "Dónde vive").

### `ArrowTuning` — el prop de tuning y el playground

Todos los "feel knobs" del vuelo (duración, ease-in, offset de spawn, altura
del arco, ángulo de reposo + jitter, tamaño de la flecha, tope de flechas
dibujadas, radio máximo en modo random) viven en un solo tipo exportado,
`ArrowTuning` (`ArrowToTarget.tsx`), con sus valores de producción en
`DEFAULT_ARROW_TUNING`. `ArrowToTarget` acepta un prop opcional
`tuning?: Partial<ArrowTuning>` que pisa cualquier subconjunto de esos
valores — no pasar el prop reproduce exactamente el comportamiento de
producción.

`/dev/animations` expone un control (slider) por cada campo de `ArrowTuning`,
agrupados en Timing / Trayectoria / Ángulo final / Tamaño-densidad, con botón
de reset a los valores por defecto — pensado para iterar visualmente sobre el
"feel" de la escena sin tocar código, y para reproducir escenarios (ej.
`dianaVisualCap` bajo + `count` alto, o `arrowScalePct` extremo) al debuggear.
Cualquier cambio de tuning fuerza un remount completo de `ArrowToTarget` (va
en el `key`, junto con `replayKey` y `mode`) — necesario porque `shots` sólo
se re-anima para ids no vistos antes (ver el comentario sobre `sessionSeed`
más arriba); sin el remount, cambiar un slider cambiaría los valores pero no
la animación ya agendada para esos mismos ids.

`DEFAULT_ARROW_TUNING` tiene su propia historia documentada largo en el
código (ángulo de reposo y altura del arco pasaron por varias iteraciones
rechazadas — ver el comentario ahí, resumido también en §6 más abajo).

---

## 5. Motion tokens (valores de arranque, tuneables)

Un solo lugar para las constantes de movimiento — todas las escenas las comparten.

| Token | Valor inicial | Qué controla |
|---|---|---|
| `T_max` | ~3000 ms | Presupuesto total de la escena de la flecha, independiente de N |
| `gap_max` | ~500 ms | Gap entre flechas con N chico (tiros apuntados) |
| `gap_min` | ~60 ms | Piso del gap en barrage (nunca 0 → flechas discretas) |
| `T1` (literal→andanada) | 8 | Fin del registro 1:1 |
| `T2` (andanada→barrage) | 30 | Fin del registro de andanadas |
| `volleySize` | 4 | Flechas por tanda en andanadas |
| `dianaVisualCap` | ~40 | Máximo de flechas clavadas dibujadas (el resto lo carga el contador) |
| `hammerCycle` | ~1500 ms | Duración de un ciclo de golpe de martillo (loop) |
| `flightDurationMin`/`Max` | 211–300 ms | Rango de duración del vuelo — cada flecha sortea un valor propio (~20% más rápido que el original 253–360) |
| `easeInPower` | 1.7 | Exponente del ease-in de progreso (`te = t^1.7`) — acelera el vuelo y hace que "llegue de golpe". Campo de `ArrowTuning` (`ArrowToTarget.tsx`), no de `motionTokens.ts` — no es compartido entre escenas, y es tuneable en vivo desde el playground de `/dev/animations` (§4) junto con el resto de `ArrowTuning` |

Easings: vuelo de la flecha = `linear` sobre una parábola ya sampleada en JS
con progreso ease-in (§4 — el ritmo vive en los puntos, no en la curva de
easing), golpe de martillo = ease-in (acelera hacia el impacto), tick del
contador = ease-out.

---

## 6. Decisiones

**Resueltas:**

1. **Alcance del conteo** → **`"all"`** (`!cvPending`, incluye archivadas): "toda
   flecha que voló". El prop `scope` deja `"vigentes"` disponible para instancias
   acotadas.
2. **Dónde vive la escena de la flecha** → **splash / intro** como uso primario
   (automático al cargar), **reusable on-demand** en otros lados (celebración de
   milestone, card de stats). Mismo componente, cambia quién lo dispara (§2
   "Dónde vive").
3. **Concepto reducido: solo objetos, sin herramienta externa** (2026-07-25) →
   sin arco (la flecha se autolanza) y **sin personaje/mascota en ninguna
   escena** — son objetos animando (flecha, martillo, diana, yunque). El
   martillo baja a un solo beat en loop (golpea la flecha en el yunque). Ambas
   escenas se construyen con **SVG + CSS puro**, sin Rive/Lottie/Quiver ni Framer
   Motion/GSAP — cero dependencia nueva y cero curva de aprendizaje de una tool
   de rig manual. Detalle y razón completa en `decisions.md`.
4. **Modo funnel** (2026-07-26) → se agrega `mode="funnel"`: la posición
   dentro de la diana deja de ser solo estética y pasa a representar el hito
   real del funnel de cada aplicación (§2 "Modo funnel"). `mode="random"`
   sigue disponible como default.
5. **Vuelo de la flecha: de `@keyframes` CSS a Web Animations API**
   (2026-07-26) → dos rondas de `@keyframes` (una con pico fijo, otra con 3
   variantes `lob`/`punch`/`loft`) seguían sin verse naturales. Se reemplazan
   por una parábola real sampleada en JS por flecha y reproducida con
   `el.animate(...)` — sigue siendo "sin dependencia nueva" (WAAPI es API de
   browser, no librería). Detalle técnico completo, incluido un gotcha de
   React Strict Mode a no repetir, en §4 "El vuelo de la flecha: por qué WAAPI
   y no `@keyframes`".
6. **Fix: flechas "en espiral" / poco random + ajuste de sensación** (2026-07-26)
   → dos bugs de fondo detrás del reporte "caen en espiral, no se siente
   random": (1) el wrapper exterior aplica `rotate(restRotation)` sin animar
   desde el primer frame, así que rotaba el sistema de coordenadas local de
   la flecha durante todo el vuelo, no solo en el reposo — un camino armado
   para "venir de la izquierda" terminaba entrando desde cualquier lado según
   dónde caía esa flecha en el anillo; (2) `sessionSeed` arrancaba en un
   placeholder (`0`) que llegaba a **animarse de verdad** antes de que el
   `useEffect` lo re-sorteara, y el `Set` de "ya animada" (indexado por
   `shot.id`, no por valores) bloqueaba que la animación real (con el seed
   correcto) se creara — la flecha aterrizaba en el lugar correcto pero volaba
   con la forma/rotación de un shot completamente distinto. Fixes: contrarrotar
   el camino sampleado por `-restRotation` en `buildFlightKeyframes`, y hacer
   que `sessionSeed`/`shots` arranquen en `null`/`[]` en vez de `0` para que el
   placeholder nunca se agende. De paso, pedido explícito del usuario: vuelo
   ~20% más rápido (`flightDurationMin`/`Max` bajan a 211–300ms) con un ease-in
   de progreso (`te = t^1.7`) para que acelere y "llegue de golpe", y la flecha
   dibujada ~20% más grande (24×88px → 29×106px — verificado que sigue sin
   pisar el borde de la diana en ambos modos a `dianaVisualCap`). Detalle
   técnico completo en §4.
7. **Fix: ángulo de reposo, de tangente al anillo a casi-fijo/horizontal**
   (2026-07-26) → con el fix anterior, el *vuelo* ya venía consistentemente
   del mismo lado, pero el *ángulo final* (`restRotation`, tangente al punto
   de aterrizaje) seguía sin relación con eso — variaba mucho según dónde
   caía cada flecha en el anillo (casi horizontal arriba/abajo, casi vertical
   a los costados). Reporte del usuario, con captura: "el punto de caída está
   bien, pero la dirección de donde viene es rara, parece que salió desde
   abajo […] deberían lucir que todas vienen de la izquierda, más o menos de
   la misma dirección". Pasó por dos vueltas antes de resolverse: primero una
   mezcla 50/50 entre el ángulo real de llegada de cada flecha y un ángulo
   fijo de referencia (49°) — visualmente mejor, pero el usuario notó que
   seguían leyendo "como caídas desde arriba" pese a que el vuelo real era
   sobre todo horizontal (el ángulo "real" resultó ser una mala señal — ver
   §4). Se resolvió con una foto de referencia (flechas reales clavadas en
   una diana, casi horizontales y casi paralelas) que el usuario aportó
   directamente: ángulo de reposo casi fijo (`restAngleBaseDeg: 0`) con
   jitter ±14° (`restAngleJitterDeg`), sin ninguna relación con la física
   del vuelo ni con el anillo — ver §4 "`restRotation` … pasó por tres
   diseños" para el detalle completo y el razonamiento de por qué las dos
   vueltas anteriores fallaban (documentado también como comentario largo en
   `ArrowToTarget.tsx`, a pedido explícito del usuario, para no repetir el
   mismo camino la próxima vez que se toque este código).
8. **Fix: arco del vuelo demasiado alto (lob) → casi plano** (2026-07-26) →
   con el ángulo de reposo ya casi horizontal (#7), el `peak` del vuelo
   (45–110px) seguía generando un arco alto — la flecha subía bastante antes
   de bajar, un lob más que un tiro directo, que además no calzaba con
   aterrizar casi plana. Reporte del usuario con una captura anotada
   (trayectoria alta marcada como incorrecta, trayectoria casi plana con
   apenas una leve curva marcada como correcta). Se bajó el rango de `peak` a
   10–25px — el vuelo entero queda casi horizontal, con solo un leve
   arqueo, consistente de punta a punta con el ángulo de reposo.
9. **Todos los "feel knobs" del vuelo pasan a un prop `tuning` + playground
   en `/dev/animations`** (2026-07-26) → todas las constantes tocadas en la
   sesión de fixes de #6-#8 (duración de vuelo, ease-in, offset de spawn,
   altura/pico del arco, ángulo de reposo + jitter, tamaño de la flecha,
   `dianaVisualCap`, radio máximo en modo random) se juntaron en un solo tipo
   exportado `ArrowTuning` con defaults en `DEFAULT_ARROW_TUNING`, pisables
   vía `tuning?: Partial<ArrowTuning>` en `ArrowToTarget`. El harness de dev
   expone un slider por campo, agrupados, con reset a valores por defecto —
   pedido explícito del usuario ("un playground agregando los controles para
   manejar todo, incluyendo todos los cambios que hemos hecho en este chat")
   para poder iterar visualmente sobre el feel sin volver a tocar código cada
   vez. Ver §4 "`ArrowTuning` — el prop de tuning y el playground".

**Valores por defecto (tuneables, no bloquean):**

- Umbrales `T1=8` / `T2=30` y `dianaVisualCap≈40` — buenos para 10–150 CVs. Se
  suben si la búsqueda tiende a más volumen. Viven en los motion tokens (§5).
