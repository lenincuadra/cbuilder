# Bitácora: sistema de animaciones (cv-builder)

Este documento **no es** una spec — para eso está [`animations.md`](animations.md),
que describe el sistema tal como es *hoy*. Esto es una **bitácora**: la historia
completa de cómo se llegó hasta acá, en orden cronológico, con los callejones sin
salida, los pivotes, y los motivos exactos (a veces citados textual) detrás de cada
cambio. No aplica ningún criterio de "qué es relevante" — es el registro completo,
reconstruido de los commits (`git log`) y de las conversaciones que los produjeron.

Si `animations.md` responde "¿qué hace el sistema y por qué está diseñado así?",
este documento responde "¿cómo se llegó a que estuviera diseñado así, y qué se
probó antes que no funcionó?".

---

## 2026-07-19 — El plan original: un personaje, dos escenas, Rive + Quiver AI

Commit: `d0273c5` — *"docs: add brand animation plan (archer + forger)"*.

Arranca como un doc de plan puro (`docs/animations.md`, 315 líneas), sin una sola
línea de código todavía. Estado declarado: **"plan v1. Nada implementado
todavía."**

La visión original era bastante más ambiciosa que lo que terminó implementándose:

- **Un personaje central** (un muñeco/mascota) que protagoniza las dos escenas,
  no objetos animando solos. La idea explícita: "el arquero y el forjador son el
  **mismo muñeco** con distinta herramienta, y la **flecha es el mismo objeto**".
  El "pago" de esa decisión era reusar un solo set de arte para múltiples escenas.
- **El arquero** (rol data-driven): el muñeco dispara flechas a una diana, una
  por CV enviado. Ya en esta primera versión estaba resuelto el problema central
  que sigue vigente hoy — duración acotada (`T_max`) vs. fidelidad al número real
  — con la misma idea que sobrevivió intacta: *"la diana es el libro contable"*,
  el vuelo está time-boxed pero el resultado final (diana + contador) es fiel al
  N exacto. También estaba ya la idea de "registros" (1:1 literal / andanadas /
  lluvia+contador) según la escala de N, con umbrales tuneables.
- **El forjador** (rol ambient/loading): el muñeco forja la flecha sobre un
  yunque mientras el pipeline de IA genera el CV — loop cerrado por el evento
  real (`onDone`), no por el reloj. Cuatro etapas: calentar punta → forjar astil
  → emplumar → flecha lista (brilla y se enfría) → al carcaj.
- **El puente narrativo** entre ambas escenas (por qué comparten personaje/assets
  desde el día uno): la flecha que forja el forjador **es la misma flecha** que
  dispara el arquero. Forjar → disparar → dar en el blanco, un arco completo.
- **Contrato de props**, ya definido desde el plan: la animación nunca toca
  `core/registry` ni hace fetch — un adaptador afuera del componente traduce
  filas → `count`. Esta regla sobrevivió sin cambios hasta hoy.

Lo que **no** sobrevivió fue el plan de tooling. La idea era:

- **Rive** para el arquero — su modelo de *state machine* con un *number input*
  encajaba perfecto con un `count` que la app setea en runtime.
- **Lottie** para el forjador — un loop sin datos es exactamente para lo que
  sirve Lottie.
- **Quiver AI** para generar el arte del personaje como SVG editable, con un
  personaje-mascota (**un búho**, según los prompts detallados en el doc: "ojos
  grandes y expresivos, pico curvo pequeño, dos mechones de orejas, cuerpo
  emplumado redondeado, delantal de trabajo"), riggeado después a mano en Rive.
- El doc incluía prompts completos, por asset, en el orden en que había que
  generarlos (personaje primero como referencia de estilo, después brazo/flecha/
  arco/yunque referenciando esa imagen), con la regla de que las partes debían
  salir en **grupos con nombre** para poder riggearse.

Ese plan **nunca se implementó tal cual**. Seis días después empezó a recortarse.

---

## 2026-07-25 — Dos recortes el mismo día: primero el arco, después el personaje entero

Commit relevante: `51adb27` (más abajo), pero el pivote en sí está documentado en
`docs/decisions.md` → *"Animaciones: sin personaje, solo objetos, sin
Rive/Quiver/Lottie"*, fechado 2026-07-25.

**Primer recorte:** el arquero pierde el arco — la flecha se autolanza, sin
tensar/soltar cuerda. El forjador baja de 4 etapas a **un solo beat en loop**
(el martillo golpea la flecha sobre el yunque, sin las etapas intermedias de
calentar/forjar/emplumar).

**Segundo recorte, más profundo:** se saca **el personaje/mascota por completo**.
No hay muñeco disparando ni forjando — pasan a ser **objetos animando solos**
(flecha, martillo, diana, yunque). Con este cambio, "arquero" y "forjador" dejan
de ser *roles de un personaje* y pasan a ser directamente **nombres de escena**:
"flecha a la diana" y "martillo en el yunque" — los nombres que se usan hoy.

El motivo, según quedó registrado: *"el usuario no sabe usar Rive y no quiere
pagar esa curva de aprendizaje solo para esta feature"*. Con el concepto reducido
(sin arco, sin etapas de forja, sin personaje) la complejidad que originalmente
justificaba un motor de rig dedicado — sobre todo riguear anatomía, articulaciones
y solapes de un personaje — desaparece: un vuelo de flecha y un martillo golpeando
se pueden animar con `@keyframes` de CSS + estado de React, sin state machine
visual ni input numérico atado a un runtime externo.

**Cero dependencia nueva** era un requisito explícito del usuario, no solo
preferencia de tooling — eso descartó también el plan B que ya estaba anotado
(Framer Motion / GSAP como alternativa de código con librería).

Lo que **no** se recortó: toda la lógica data-driven de la flecha (registros
1:1/andanadas/lluvia, presupuesto de tiempo fijo, gap decreciente) siguió en pie
— esa complejidad viene de que `count` puede ir de 0 a cientos, no del personaje,
así que sacar la mascota no la simplificaba.

Trade-off asumido explícitamente en el momento de esta decisión: el arte iba a
salir más geométrico/simple (dibujado a mano, sea en código o por el usuario)
en vez de ilustrado por una tool dedicada — aceptable porque el pedido
explícito fue "reducir", no "quedar más lindo". En la práctica no fue así: el
arte terminó siendo generado por Quiver AI de todas formas (ver más abajo),
solo que sin el rig de Rive ni el personaje.

---

## 2026-07-26, madrugada — Primera implementación real (commit `51adb27`)

*"feat(animations): add arrow-to-target and hammer-to-anvil scenes"* — el primer
commit que agrega código de verdad. 17 archivos, 1343 líneas insertadas. Este
commit, aunque aparece como uno solo en el log, empaquetó una sesión larga con
varios sub-episodios propios:

### El arte no se dibuja en código — y el paso de Quiver AI sí se ejecutó

El plan de "sacar el personaje" (07-25) suponía dibujar los objetos (flecha,
diana, yunque, martillo) a mano en código, como trade-off aceptado a cambio de
reducir alcance (ver la cita de `decisions.md` en la sección anterior). Eso no
fue lo que pasó: el paso de generación de arte del plan **original** —
Quiver AI, con referencias visuales, tal como estaba prompteado desde el
día 1 (07-19) — sí se ejecutó, y se ejecutó **completo**: se generó el set
entero que se había planeado, mascota-búho incluida, no solo los 4 objetos
que terminaron en el proyecto. Lo que se cortó fue el paso *siguiente*
(riguear en Rive) y, con él, la decisión de usar personaje — no la
generación en sí.

De ese set completo, solo 4 objetos (flecha, diana, yunque+fuego, martillo)
se trajeron a `assets/illustrations/*.svg` y se portaron a componentes React
en `ui/animations/assets/`. El resto — la mascota y otros assets generados
para el plan original — existe fuera del repo, generado pero nunca
importado. Un caso menor de esto mismo que sí quedó adentro del repo, a modo
de rastro: `assets/illustrations/arc.svg` (un arco/bow) se generó y se
copió, pero como el recorte del día anterior ya había sacado el arco de la
escena, quedó sin componente React ni uso alguno — nunca se borró, solo
nunca se convirtió en un `.tsx`.

### Dos rondas de `@keyframes` que no se sentían naturales

El vuelo de la flecha se intentó primero con CSS puro (`@keyframes`), como decía
el plan reducido. Dos rondas:

1. Una versión con un solo pico de arco fijo (hardcodeado al 50% del vuelo).
2. Una versión con 3 variantes nombradas — `lob`/`punch`/`loft` — de 5-6 stops
   cada una, para variar la forma del arco.

Ninguna de las dos se sintió natural — **el usuario lo marcó dos veces**. La
razón de fondo, no un detalle de afinación: un `@keyframes` de CSS tiene sus
stops en **porcentajes fijos**, no parametrizables por custom property. No hay
forma de que cada flecha individual tenga su propio "dónde pica el arco" sin
escribir un keyframe distinto por cada combinación posible — la forma queda
"quebrada" en vez de curva, y el timing-function global (`ease-in-out`) deforma
encima la forma que ya estaba en los stops.

**La solución fue sampleá la trayectoria en JS, no en CSS.** Se reemplazó
`@keyframes` por la **Web Animations API** nativa del browser (`el.animate(...)`)
— sigue siendo "cero dependencia nueva" porque WAAPI es una API del DOM, no una
librería. `buildFlightKeyframes` genera ~16 puntos de una parábola real **por
flecha**, en JS: horizontal lineal, altura `peak * (1 - distanciaAlPico²)`,
rotación = la tangente real del camino en cada punto (diferencia finita entre
puntos consecutivos), no un ángulo elegido a mano.

De regalo, "que termine de golpe" (que ya era un pedido explícito en esta primera
ronda, no algo que apareció recién en la sesión de hoy) salió gratis de la física
correcta: una caída bajo gravedad **acelera**, no desacelera — la parábola llega
a velocidad máxima justo en el aterrizaje, así que la animación simplemente
termina ahí en vez de planear hasta pararse.

### El gotcha de React Strict Mode

Con un efecto que agenda animaciones (sin cleanup, a propósito, para no cortar
flechas ya en vuelo cuando `count` sube) y otro efecto separado, solo para
desmontaje, que cancela todo — React Strict Mode (dev) duplica el ciclo
mount→cleanup→remount de **todos** los efectos en el commit inicial, incluidos
los de deps `[]`. Eso cancelaba las animaciones recién creadas sin
des-marcarlas del set de "ya animadas", dejando flechas fantasma: creadas,
canceladas, nunca recreadas. El fix — que sigue vigente sin cambios — fue que el
cleanup de desmontaje limpia el ref de animaciones **y** el set de IDs juntos,
para que el remount inmediato de Strict Mode se autocorrija en vez de quedar en
un estado inconsistente.

### "El modo random no se sentía random" — primera vez

Primera aparición de un bug que iba a volver a aparecer, en otra forma, en la
sesión de hoy. En esta primera implementación, el seed de cada flecha dependía
**solo de su índice** — así que dos "Replay" con el mismo `count` producían
exactamente el mismo arreglo. El fix (de esta ronda): sumar un `sessionSeed`
(`Math.random()`, seteado en un `useEffect` para no romper la hidratación SSR —
no se puede llamar `Math.random()` durante el render sin un mismatch
server/cliente) generado una vez por montaje. Estable dentro del mismo montaje,
distinto en cada remount.

(Este fix tenía un defecto residual que nadie notó todavía — recién iba a
aparecer y arreglarse en la sesión de hoy, ver más abajo.)

### Geometría de la flecha clavada, verificada con Playwright (no a ojo)

Con las flechas ya volando, aparecieron casos con la punta afuera del borde de
la diana. No era un bug de posicionamiento — era geometría: una flecha centrada
a radio `R` del centro, orientada tangencialmente, igual tiene sus puntas a
`sqrt(R² + medioLargo²)` del centro (Pitágoras). Cuanto más larga la flecha
respecto al radio de la diana, más "se abre" hacia afuera aunque esté acostada
sobre el anillo.

Fix de esta ronda: la flecha se achica de 113×31px a **88×24px**, se orienta
**tangencialmente** al anillo (no en ángulo random ni radial), y se recorta el
radio máximo de aterrizaje — `RANDOM_MODE_MAX_RADIUS` de 30→19, `RING_BANDS`
(modo funnel) escalados a ~71% de su radio "real". Verificado **empíricamente
con Playwright**, no mirando una captura: se leen `left/top/rotate` reales de
cada flecha ya asentada, se calculan las 4 esquinas rotadas analíticamente, y se
compara contra el borde real del anillo blanco (~33.2%, medido del path del
SVG). 80 corridas (8 seeds × 2 modos × 5 counts): máximo alcanzado 32.3%, sin
overhang. Quedó anotado en `decisions.md` que si se vuelve a agrandar la flecha
o el radio en el futuro hay que re-correr esta verificación — el overhang solo
aparece en ciertos ángulos/posiciones, no se ve con cualquier captura suelta.

*(Este mismo problema — flecha saliéndose del borde — iba a reaparecer en la
sesión de hoy, por una causa distinta: `arrowScalePct` se volvió un slider del
playground y nadie había verificado tamaños por encima del 120% de producción.)*

### Modo funnel

Se agrega `mode: "random" | "funnel"`. En modo funnel, dónde cae cada flecha deja
de ser estético — cada uno de los 5 anillos de la diana (blanco → oscuro → azul →
rojo → dorado) representa, de afuera hacia adentro, uno de los 5
`MILESTONE_KEYS` del funnel real (`sent → responded → interview → offer →
referral`). La idea ya estaba anotada en el plan original como "extensión
post-v1" (colorear por estado del funnel) — se implementó como **posición** en
vez de color porque la diana ya tenía 5 anillos concéntricos de sobra: no hacía
falta un canal visual nuevo, y "más cerca del centro = más lejos en el funnel"
es una lectura más directa que aprender un código de colores. El componente
recibe `funnelRanks: number[]` ya calculado — sigue sin importar
`core/registry` ni calcular el rank él mismo, respetando la regla dura del
contrato desde el plan original.

### Estado al cierre de este commit

`docs/animations.md` se reescribe de "plan v1" a **"implementado (v1,
reducido)"**. Las dos escenas existen, probadas visualmente vía
`app/dev/animations/page.tsx` (un harness dev-only, no linkeado desde la app
real todavía). El adaptador `core/registry` → `count`/`funnelRanks` sigue sin
existir — nadie sabía todavía dónde iba a vivir cada escena en la app real.

---

## 2026-07-26 — La sesión larga: siete rondas de feedback visual iterativo

Todo lo que sigue pasó en una sola sesión de trabajo, ese mismo día, arrancando
con un pedido de cinco puntos sobre la escena de la flecha y terminando con el
playground completo, más este mismo documento.

### Ronda 1 — "¿Vienen del mismo lado?" y el bug del espiral (commit `df70dad`)

El usuario abre con cinco pedidos numerados sobre "Flecha a la diana":

1. Que las flechas caigan como si vinieran del mismo ángulo — el punto de caída
   estaba bien, pero la dirección de la que parecían venir era rara ("parece que
   caen en espiral").
2. Que aceleren y aterricen de golpe — pidió, textualmente, "agrega un 20% más
   de velocidad en general".
3. Verificar que el modo random realmente se sienta random ("no se siente nada
   random, se ve muy predecible, de hecho").
4. Agrandar la flecha un 20% más.
5. Commit y push.

La investigación de la "espiral" pasó por varios callejones sin salida antes de
encontrar la causa real — vale la pena dejarlos anotados porque cualquiera de
los dos, revisados sueltos, parecía razonable:

- Primera hipótesis: un error de signo en la matemática de rotación usada para
  contrarrotar el camino de vuelo. Se armaron pruebas aisladas con Playwright
  (un div `rotate(90deg)` con un hijo `translate(-100px, 0px)`, verificando la
  posición final contra la fórmula esperada) — la matemática resultó correcta.
  Descartada.
- Segunda pista, real: capturas de pantalla mostraban una sola flecha entrando
  siempre desde el mismo lado, pero los `keyframes` leídos directo del DOM vía
  Playwright (`getAnimations()[0].effect.getKeyframes()`) no coincidían con los
  parámetros random (`ox`, `restRotation`) que el componente estaba usando para
  esa misma flecha en ese mismo instante — como si la animación estuviera
  usando datos de **otra tirada**.

Eso llevó al verdadero **bug 1**: el wrapper exterior aplica `rotate(restRotation)`
sin animar, desde el primer frame — no solo en el reposo final. Eso rota todo
el sistema de coordenadas local de la flecha durante **todo** el vuelo, no solo
la pose final. Como `restRotation` variaba según en qué punto del anillo caía
cada flecha, sin corregir esto cada flecha entraba rotada por un ángulo
distinto según dónde aterrizaba — un camino armado para "venir de la izquierda"
terminaba entrando desde abajo, arriba o la derecha según el caso. Fix:
`buildFlightKeyframes` contrarrota el camino sampleado por `-restRotation`
antes de devolverlo, así el wrapper la vuelve a rotar de vuelta a la forma
real.

Ese fix por sí solo no alcanzó — las capturas seguían sin verse bien. Ahí
apareció el **bug 2**, encontrado agregando un `console.log` temporal dentro de
`buildFlightKeyframes` para imprimir el shot real que estaba usando cada
animación: `sessionSeed` arrancaba en un placeholder (`0`, para no romper la
hidratación SSR) que **llegaba a animarse de verdad** — la primera pasada de
render (con `sessionSeed=0`, determinística) alcanzaba a agendar animaciones
reales antes de que el `useEffect` re-sorteara `sessionSeed` a un valor random.
El `Set` de "ya animada" (`animatedIds`, indexado por `shot.id`, no por los
valores del shot) bloqueaba entonces que la animación real (con el seed
correcto) se creara — la flecha aterrizaba en el lugar correcto (el wrapper sí
se re-renderizaba con los valores nuevos) pero volaba con la forma/rotación de
un shot completamente distinto, el del placeholder. Fix: `sessionSeed` arranca
en `null` en vez de `0`, y `shots` es un array vacío mientras tanto — así el
placeholder nunca llega a agendarse.

Sobre los otros pedidos de esta ronda: se agregó una curva de ease-in al
progreso del vuelo (`te = t^1.7`) para que acelere visiblemente y pare de
golpe, se bajó `flightDurationMin`/`Max` ~20% (253–360ms → 211–300ms), y la
flecha se agrandó ~20% (24×88px → 29×106px) — reverificando que seguía sin
salirse del borde en ambos modos a `dianaVisualCap`. Sobre la aleatoriedad
(pedido 3): se verificó que `seededRandom` en sí mismo no tenía patrón (se
simuló en Node), y una vez arreglado el bug del `sessionSeed`, tres replays
consecutivos mostraron layouts genuinamente distintos — el problema nunca fue
el generador de números, era el mismo bug del `sessionSeed` haciendo que
siempre se animara la misma tirada.

### Ronda 2 — El ángulo de reposo, en tres vueltas (commit `c81efeb`)

El usuario manda una captura: una flecha clavada casi vertical, al lado de
varias casi horizontales, con el comentario *"el punto de caída está bien, pero
la dirección de donde viene la flecha es rara, está pegada como si fuera
salido desde abajo"* — y pide explícitamente: *"deberían lucir que todas
vienen de la izquierda, más o menos de la misma dirección. haz preguntas para
clarificar"*.

La causa: `restRotation` (el ángulo final en el que queda la flecha) se
calculaba **tangente al anillo** en el punto de aterrizaje — para que se lea
como naturalmente apoyada en la curva. Ese ángulo varía muchísimo según dónde
cae la flecha en el círculo (casi horizontal arriba/abajo, casi vertical a los
costados) — completamente desconectado de que el *vuelo real* de todas las
flechas venía ahora, consistentemente, del mismo lado (fix de la ronda 1).

Se preguntó al usuario, con `AskUserQuestion`, qué debía definir el ángulo
final — un ángulo casi fijo (paralelas), el ángulo real de llegada de cada
flecha, o una mezcla — y cuánta variación azarosa. El usuario eligió
**"mezcla"**, con jitter **"más notorio"**: *"probemos la 2 [±20-25°], pero
sino volvamos a la opción 1 [±12°]. tengo que verlo."*

Primera implementación: mezcla 50/50 entre un ángulo fijo de referencia (49°,
calculado del ángulo de llegada de un tiro de parámetros medios) y el ángulo
real de llegada de cada flecha (calculado con las mismas fórmulas del vuelo,
un sample antes de aterrizar), con jitter ±22°. Capturas mostradas — el
usuario pidió comparar contra ±12° ("quedan casi en fila, muy parejas") y
después un punto medio, ±17°.

Con ±17° mostrado, la respuesta fue *"no estoy seguro, al final se ven como
que cayeron desde arriba aunque la trayectoria no fue así. puede ser
alrededor de 14°?"* — una observación que no encajaba con "solo bajar el
jitter". La causa real: el ángulo "real de llegada" se mide en el **último
instante** del vuelo, que por la curva de ease-in queda desproporcionadamente
empinado/vertical comparado con la dirección general del vuelo (que es sobre
todo horizontal — el rango de `ox` es 2-3 veces el de `peak`). Aunque se
mezclara con un ángulo fijo más bajo, el resultado seguía leyendo más parado
de lo que realmente había volado.

Se le explicó al usuario la diferencia entre "ángulo base/centro" y "jitter" (a
pedido suyo — *"no estoy entendiendo qué ángulo es cuál, ¿podrías explicarlo
mejor?"*), y en ese momento mandó una **foto de referencia**: flechas reales
clavadas en una diana de arquería, casi horizontales, casi paralelas entre sí.
Con eso como ancla, se abandonó por completo el ángulo derivado de la física
del vuelo: `BASE_REST_ANGLE_DEG = 0` (acostada, apuntando a la derecha) +
`REST_ANGLE_JITTER_DEG = 14` — el rango de jitter salió de medir a ojo los
ángulos de las flechas en la foto (~-14° a +12° respecto a la horizontal). El
usuario confirmó: *"entiendo. quiero que luzca más como esto. creo que tienes
razón."* — y pidió explícitamente documentar toda la vuelta larga ("anota toda
esta info como documentación del componente"), lo que quedó como un comentario
largo en `ArrowToTarget.tsx` además de en `animations.md`.

### Ronda 3 — El arco de vuelo, demasiado alto (commit `3e40b6c`)

Con el ángulo de reposo ya casi horizontal, el arco vertical del vuelo (`peak`,
45–110px) seguía generando un lob visible — la flecha subía bastante antes de
bajar, algo que ya no calzaba con aterrizar casi plana. Otra captura anotada:
una trayectoria roja alta marcada con una X, una trayectoria verde casi plana
(con apenas una leve curva) marcada con un check. Fix: `peak` baja a 10–25px —
el vuelo entero queda casi horizontal, con un arqueo apenas perceptible,
consistente de punta a punta con el ángulo de reposo.

### Ronda 4 — El playground (commit `918c266`)

Después de estas tres rondas de ajuste fino con capturas y feedback, apareció
la pregunta obvia: ¿por qué no exponer estos valores para poder tunearlos sin
tocar código? Todas las constantes tocadas hasta acá (duración de vuelo,
ease-in, offset de spawn, altura/pico del arco, ángulo de reposo + jitter,
tamaño de la flecha, tope de flechas dibujadas, radio máximo en modo random) se
consolidaron en un tipo exportado `ArrowTuning`, con los valores de producción
en `DEFAULT_ARROW_TUNING`, pisables vía un prop opcional
`tuning?: Partial<ArrowTuning>` — no pasar el prop reproduce exactamente el
comportamiento de producción. `/dev/animations` pasó a mostrar un slider por
cada campo, agrupados, con un botón de reset. Cualquier cambio de tuning
fuerza un remount completo del componente (mismo motivo que el bug del
`sessionSeed`: el efecto de agendado solo anima ids que no vio antes).

### Ronda 5 — Layout, componentes del DS, presets guardables (commit `d338111`)

Tres pedidos explícitos sobre el playground recién creado:

1. Animación a la izquierda, controles a la derecha (antes todo apilado
   verticalmente).
2. Usar los componentes del design system en vez de `<input>`/`<select>`/
   `<button>` planos — no había un `Slider` en `components/ui/`, así que se
   instaló vía `npx shadcn add slider` (siguiendo la regla del DS: instalar el
   que falte antes de improvisar uno custom) y se migraron el resto de los
   controles a `Button`/`Input`/`Label`/`Select`/`Card`/`Separator`.
3. *"si bien me gusta lo de valores por defecto, podemos hacer algo para
   almacenar animaciones que me gusten? porque al hacer reset los pierdo."* —
   se agregaron presets con nombre, guardados en `localStorage`
   (`cbuilder:dev-animations:arrow-tuning-presets`), puramente client-side y
   dev-only: guardar/cargar/borrar, sobreviven a un refresh de página; "Reset
   a valores por defecto" no los toca.

### Ronda 6 — Sticky, tooltips, y la flecha saliéndose del borde otra vez (commit `c666ed6`)

Tres pedidos más, "pensando en cadena" (el usuario lo pidió así explícitamente):

1. Que la animación y los controles principales queden fijos al scrollear —
   con 14 sliders + presets, el panel de la derecha ya no entraba en una
   pantalla.
2. Un tooltip por control, en lenguaje simple, explicando qué hace si lo
   movés.
3. Un bug, con captura: al tamaño máximo de flecha, la punta quedaba por fuera
   de la diana — *"solucionar solo para esos casos, no cambiar toda la lógica
   en base a eso"*.

El bug era el mismo problema geométrico de la primera implementación (radio +
tamaño de flecha acoplados), reaparecido porque `arrowScalePct` ahora era un
slider que llegaba hasta 250% y los márgenes de radio nunca se habían
verificado más allá del 120% de producción. Fix acotado, tal como se pidió: el
radio de aterrizaje se multiplica por `min(1, 120 / arrowScalePct)` — sin
efecto en o por debajo del tamaño ya verificado, se achica recién por encima de
ahí. No se tocó `RING_BANDS` ni la fórmula general.

Para el sticky, se usó `lg:sticky lg:top-4` en la columna de la animación y en
la fila de controles principales. Para los tooltips, el DS ya tenía
`Tooltip`/`TooltipTrigger`/`TooltipContent` — la parte no obvia fue envolver
elementos que ya eran interactivos (un `Button`, el `Label` de `count`) sin
anidar dos elementos interactivos uno adentro del otro: `TooltipTrigger` usa el
prop `render` de base-ui para renderizarse **como** ese botón en vez de
envolverlo en un elemento extra.

### Ronda 7 — Legend del funnel, sticky sin huecos, y el primer uso real en la app

El pedido que dio lugar a este mismo documento. Cuatro puntos:

1. La data del modo funnel (un array crudo de hasta ~150 números 0-4) era
   ilegible — se reemplazó por una leyenda de conteos por hito, con un punto
   de color por milestone tomado directo de los fills reales de
   `Diana.tsx` (blanco/`#333335`/`#30ABE2`/`#DF3C38`/`#DAA737`), y el array
   crudo colapsado detrás de un `<details>` para quien lo necesite.
2. El sticky de la ronda 6 (`lg:top-4`) dejaba un hueco de 16px arriba del
   elemento pegado — al scrollear, la primera fila de sliders se asomaba en
   ese hueco. Se convirtió en una navbar de sección completa: el título entra
   a la misma barra pegajosa que `count`/modo/Replay, todo a `lg:top-0` (sin
   hueco) con fondo opaco, y la columna de la animación se offsetea por la
   altura real medida de esa barra (93px, medidos con Playwright, no
   estimados).
3. *"esta animación esta aplicado en la app realmente??"* — no, ninguna de las
   dos escenas estaba montada fuera del harness de dev hasta este punto. Se
   identificó el `"Cargando registro…"` de `RegistryTable` como primer punto
   de integración real, y se usó **Martillo en el yunque** (no Flecha a la
   diana) porque calza exacto con el rol que `animations.md` ya le tenía
   documentado (loading ambient, sin dato todavía) y porque su aspect-ratio
   (156:91) encaja en una fila de tabla mucho mejor que la diana cuadrada —
   que además necesita un `count` real, precisamente lo que no existe
   mientras se está cargando.
4. Este documento.

### Ronda 8 — Correcciones, los assets que faltaban, y la flecha entra a la app de verdad

Después de publicado este documento, el usuario corrigió dos cosas de la
crónica arriba y pidió una tercera:

**Corrección 1 — provenance de los assets.** El documento decía que los 4
objetos usados (flecha, diana, yunque+fuego, martillo) eran "ilustraciones
que el propio usuario hizo". Eso estaba mal: *"los dibujos no fueron
generados a mano, fueron generados por Quiver con referencias visuales"* —
exactamente el paso de generación de arte que el plan original de 07-19 ya
tenía prompteado, y que sí se ejecutó tal cual, mascota incluida. Se corrigió
tanto acá como en `animations.md`.

**Corrección 2 — el búho sí existe.** El documento también decía "el
personaje-búho... nunca se dibujó". Tampoco: *"el buho y otros assets si se
dibujaron, pero no están en el proyecto (si quieres las agrego)"* — es decir,
se generó el set completo planeado (4 variantes de personaje incluidas), pero
nunca se integró a ninguna escena. El usuario los guardó en
`assets/illustrations/originals/` (archivos crudos de Quiver, sin limpiar) y
se agregaron al repo como archivo histórico — sin componente React, sin uso
en código.

**El pedido nuevo — la flecha real, no el martillo.** Sobre la integración de
la ronda 7 (punto 3 arriba): *"el loading que te dije no muestra la diana y
la flecha, muestra el yunke. la idea es la diana y las flechas basado en los
datos de la tabla. haz preguntas si hace falta."* — el usuario no quería el
martillo ahí, quería la escena de la flecha, con datos reales de la tabla.

Como la flecha es data-driven y necesita un `count` real que literalmente no
existe mientras el fetch sigue en curso, se preguntó (con `AskUserQuestion`,
como se pidió) para resolver la tensión entre "datos reales" y "todavía no
hay datos":

1. **¿Cuándo se ve?** — reveal único al terminar de cargar (elegido) vs.
   coexistir en paralelo con la tabla en otro lado.
2. **¿Modo?** — funnel, posición = etapa real del embudo (elegido) vs.
   random, solo importa el número.
3. **¿Alcance?** — todas las aplicaciones enviadas alguna vez, incluidas
   archivadas (elegido, además ya era el default de la spec) vs. solo
   vigentes.
4. **¿Qué se ve durante el fetch real, antes de tener filas?** — esta
   pregunta no se entendió en la primera pasada ("no entiendo esta
   pregunta"); se reformuló con un ejemplo concreto (el instante puntual,
   generalmente menos de medio segundo, entre pedirle los datos al server y
   recibirlos) y se resolvió con el default recomendado sin insistir más,
   dado lo acotado del detalle: el martillo sigue cubriendo ese hueco
   puntual, la flecha toma la posta apenas hay datos.

Con las cuatro respuestas, se implementó el adaptador que la spec pedía desde
el plan original y que hasta ese momento no existía: `funnelRanksFor(rows)`,
un nuevo export en `core/funnel.ts` que reusa el `milestoneRank` privado que
ya alimentaba `computeFunnel` (el cálculo agregado que usa `FunnelCard`) —
clampeado a `[0,4]`, porque el caller ya filtra a filas enviadas antes de
llamarlo. El caller es `app/page.tsx`: ahí vive el `rows` **sin** filtrar por
la tab Vigentes/Archivado (el que le llega a `RegistryTable` como prop `rows`
sí está filtrado por tab, para la tabla en sí — dos conjuntos de datos
distintos, con el mismo nombre corto en la cabeza si no se presta atención).
`RegistryTable` gana un estado `revealDone`, arranca en `false`, y una
tercera rama en el render (entre `loading` y la tabla/empty state) muestra
`<ArrowToTarget mode="funnel" .../>` hasta que su propio `onDone` la marca
`true` — de ahí en más, esa misma sesión de la página nunca vuelve a mostrar
el reveal (`loading` tampoco vuelve a `true` después de la carga inicial, así
que no hace falta lógica extra para "solo una vez").

Verificado contra datos reales del usuario (su registro real, 25 filas, no
datos de prueba inventados) interceptando el fetch con Playwright para poder
capturar el instante exacto de cada fase: martillo durante el fetch
retrasado artificialmente → flechas volando en modo funnel con la
distribución real de su embudo → tabla real asentada.

### Ronda 9 — El martillo se va: una sola escena para toda la espera

La ronda 8 duró poco. Apenas se vio en uso real, el diseño "martillo mientras
carga, flecha cuando hay datos" mostró su problema: un corte visible de una
animación a otra justo en el momento en que llegaban los datos. El reporte
del usuario fue directo: *"por un segundo se muestra el yunke antes de que
aparezca la animación de la diana, podemos quitar eso? si eso está definido,
esta mal."* — y la instrucción de reemplazo, igual de directa: *"dejemos la
misma diana, y mientras no carga nada pues no se lanzan flechas."*

La solución no fue "esconder mejor" el corte — fue darse cuenta de que
`ArrowToTarget` ya tenía todo lo necesario para no necesitarlo. El componente
ya soporta `count` subiendo en vivo sobre el mismo montaje sin perder las
flechas ya aterrizadas (es el mecanismo, ya documentado, que usan las
andanadas/lluvia cuando `count` sigue subiendo durante la propia animación).
Pasar de `count=0` a `count=N` en la misma instancia no era un caso nuevo a
programar — era el camino que el componente ya sabía andar. Con `count=0` la
escena ya cae sola en su registro "idle" (diana quieta, sin flechas, "0 CVs
enviados"), que es exactamente el estado que hacía falta para el hueco real
sin datos.

El único detalle no obvio: con `count=0`, el efecto interno que dispara
`onDone` se completa casi al instante (no hay nada que animar). Si el
`onDone` real (el que le da paso a la tabla) estuviera siempre conectado,
se dispararía de inmediato **mientras todavía se está cargando**, mostrando
la tabla vacía antes de tiempo. Se resolvió pasando `onDone={undefined}`
mientras `loading` es `true`, y recién conectando la función real una vez
que hay datos — así el "done" del `count=0` no cuenta para nada, y el único
"done" que importa es el de la animación real con las flechas de verdad.

Con esto, el martillo queda completamente afuera de `RegistryTable` — vuelve
a ser, por ahora, una escena que solo vive en el harness de dev, a la espera
de su rol original (loading del pipeline de IA).

**Segundo pedido, sobre tamaño responsivo:** *"en resoluciones responsive,
reduzcamos el tamaño total de la animación a un 80% y hasta 50% máximo
(dependiendo del tamaño)."* El contenedor de la escena, antes un ancho fijo
(`w-64`, 256px) sin importar la pantalla, pasa a `w-32 sm:w-52 lg:w-64` —
50% en pantallas chicas, ~80% en medianas, 100% en desktop. Verificado en
1200px y 375px de ancho: en mobile la diana se ve considerablemente más
chica, dentro del mismo scroll horizontal que ya tenía la tabla en esos
anchos (comportamiento previo de la tabla, no algo nuevo de este cambio).

### Ronda 10 — El reveal no necesitaba scroll, y lo estaba forzando

Chequeo rápido de responsive sobre la ronda 9: en mobile, mientras se
mostraba el reveal (diana quieta o animando), aparecía scroll horizontal en
la tabla — pero el reveal es una sola celda con una sola animación centrada,
nada que justifique scrollear para verla completa. El pedido del usuario fue
puntual: *"tiene que estar siempre centrado al viewport del contenedor, es
scroleable la tabla y eso está bien, pero al momento de cargar el scroll es
completamente innecesario porque lo único que contiene es la animación."*

La causa: `RegistryTable` fuerza `min-w-[720px]` por debajo de 640px para
que las columnas reales (Código, Foco, Empresa, Rol...) no se aplasten en
pantallas angostas. Ese mínimo se aplicaba también durante el reveal, que no
tiene columnas — nada que aplastar, pero el ancho mínimo empujaba igual la
diana fuera del centro del viewport visible, exigiendo scrollear para verla
completa. El header de columnas (`<TableHeader>`) también se seguía
renderizando durante el reveal, y sin el `min-width` sus labels con
`whitespace-nowrap` se apretujaban entre sí, ilegibles.

Fix: tanto el `min-width` como el `<TableHeader>` pasan a condicionales
sobre el mismo booleano `showingReveal` que ya decidía qué mostrar en el
body de la tabla — sin `min-width` y sin header mientras se muestra el
reveal, ambos vuelven en cuanto hay filas reales que mostrar.

Un detalle de la verificación, no del fix en sí: el primer intento de medir
"¿hay scroll?" con Playwright dio un falso negativo — la query apuntaba a
`.overflow-x-auto`, que en el DOM matcheaba el div **externo** (el que
`RegistryTable.tsx` envuelve alrededor de `<Table>`, que resultó ser
redundante e inerte) en vez del contenedor **interno** que el propio
componente `Table` de shadcn ya arma (`[data-slot="table-container"]`, con
su propio `overflow-x-auto`) y que es el que efectivamente scrollea. Se
descubrió leyendo `components/ui/table.tsx` directamente en vez de seguir
adivinando. Corregida la query, la verificación confirmó lo esperado: sin
scroll durante carga/reveal a 375px, scroll de vuelta apenas renderizan
filas reales.

### Ronda 11 — Las flechas se pintan del color que tocaron

Con la escena data-driven ya asentada en la tabla real, el siguiente pedido
fue sobre lo que comunica visualmente el color de cada flecha. Punto de
partida: una captura de la leyenda de colores del embudo (sent blanco,
responded gris oscuro, interview azul, offer rojo, referral dorado) y el
pedido en cadena:

> ahora. podemos hacer la flecha base gris claro? y cuando toquen la
> superficie se pinten del color que tocaron? debería seguir esa misma
> lógica de colores. habría que definir exactamente como pintarse cada
> flecha, si bien el color base es el de la leyenda, tiene tonos y luces y
> el borde de la flecha, elige la más apropiada para cada color y luego
> vamos verificando color por color.
>
> la lógica de todo esto es que al ver todas las flechas en la diana los
> colores de las flechas comuniquen tu proceso visualmente

Hasta este punto toda flecha usaba el mismo naranja/marrón decorativo
(`Arrow.tsx`), heredado del asset original de Quiver, sin relación alguna
con dónde caía — el color no comunicaba nada del funnel, solo el `ringIndex`
de posición ya lo hacía (indirectamente, vía qué tan cerca del centro
aterrizaba).

Implementación en tres piezas:

1. **`Arrow.tsx` gana un prop `palette`** (fill / fillLight / fillDark /
   shaftFill / line — un color por cada parte pintada del dibujo: plumas,
   punta con sus dos facetas, asta, y el borde compartido), con default =
   los mismos 5 valores hex que ya tenía hardcodeados. El uso decorativo en
   `HammerAnvil` no pasa `palette`, así que queda pixel-idéntico a como
   estaba.
2. **Dos familias de paleta en `ArrowToTarget.tsx`**: `UNPAINTED_ARROW_PALETTE`
   (un gris claro único, para toda flecha en vuelo, sin importar destino) y
   `RING_ARROW_PALETTES` (5 paletas, una por anillo, `fill` calcado del
   propio anillo pintado en `Diana.tsx`). Los tonos de luz/sombra/asta/borde
   de cada paleta de anillo se eligieron a mano, no con una fórmula de
   aclarar/oscurecer aplicada parejo — probado que un tinte plano se veía
   sucio en algunos colores (el blanco necesitaba un off-white para que la
   faceta de brillo siguiera siendo visible contra él; el anillo casi negro
   necesitaba mucho más levante en `fillLight` o esa faceta directamente
   desaparecía).
3. **`ringIndex` por flecha, para los dos modos.** En `mode="funnel"` ya
   existía la banda (el `funnelRank` clampeado); en `mode="random"` no había
   ese dato, así que se agregó `ringIndexForRadius`, que ubica el radio de
   aterrizaje contra las mismas `RING_BANDS` que ya definían las bandas de
   funnel — el anillo físico dibujado es el mismo objeto en ambos modos, así
   que "el color que tocó" también aplica en modo random sin necesitar datos
   de funnel detrás.

El disparo del color usa el resultado de `anim.finished` (la promesa nativa
de Web Animations API que resuelve cuando termina esa animación puntual) —
no el conteo agregado que ya se usaba para el contador de texto — así cada
flecha cambia de color exactamente cuando *ella* aterriza, no cuando aterriza
la última del grupo. El cambio de color no es un salto: las paths llevan
`transition-colors` (300ms) para que se lea como "se moja" del color del
anillo en vez de teletransportarse a él.

Verificado visualmente en `/dev/animations`, en ambos modos y con
`prefers-reduced-motion` activado (que salta directo al color de aterrizaje,
sin fase gris intermedia, porque tampoco hay vuelo que mostrar): las flechas
en vuelo se ven todas del mismo gris, y al aterrizar cada una toma el color
de su anillo — de un vistazo a la diana llena se puede leer la distribución
del embudo por color, sin necesitar la leyenda de texto al lado. Primer
pase, no cerrado: el propio pedido preveía revisar "color por color" contra
el arte real en una vuelta futura.

---

## Notas sueltas que no encajan en la cronología pero valen la pena dejar anotadas

- **El personaje-búho del plan original sí se generó** — vía Quiver AI, con
  referencias visuales, siguiendo los prompts del plan de 2026-07-19 — pero
  nunca se integró a ninguna escena (se redujo el alcance de qué se
  **integraba**, no de qué se **generaba**). Los archivos crudos, tal como
  salieron de Quiver (incluidas 4 variantes distintas del personaje que se
  probaron), se agregaron después al repo como archivo histórico en
  `assets/illustrations/originals/` — sin componente React, sin uso en
  código, solo para dejar constancia de lo que existió.
- **`assets/illustrations/arc.svg` existe y no se usa.** Se generó (vía
  Quiver AI) y se limpió/recortó para el lote de ilustraciones traído al
  proyecto en el commit `51adb27`, pero el arco ya había sido cortado de la
  escena un día antes — quedó copiado igual, sin componente React. Su
  versión cruda (sin limpiar) está en `assets/illustrations/originals/`
  junto con el resto de lo generado y no usado.
- **El bug de "no se siente random" apareció dos veces, por causas
  relacionadas pero distintas.** La primera vez (commit `51adb27`) el
  problema era que no existía ningún `sessionSeed` — el seed dependía solo del
  índice. La segunda vez (commit `df70dad`, sesión de hoy) el `sessionSeed` ya
  existía, pero un placeholder inicial (`0`) alcanzaba a animarse de verdad
  antes de que se re-sorteara — un bug distinto, en la misma zona del código,
  con el mismo síntoma visible.
- **El ángulo de reposo de la flecha pasó por tangente → mezcla física+fija →
  fijo puro**, con cada parada intermedia pareciendo razonable hasta que una
  captura mostraba lo contrario. Documentado en detalle (código + doc) a
  pedido explícito del usuario, específicamente para que esta vuelta no se
  repita si alguien vuelve a tocar `restRotation` sin este contexto.
