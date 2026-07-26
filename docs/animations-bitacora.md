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

Trade-off asumido explícitamente: el arte iba a salir más geométrico/simple
(dibujado a mano, sea en código o por el usuario) en vez de ilustrado por una
tool dedicada — aceptable porque el pedido explícito fue "reducir", no "quedar
más lindo".

---

## 2026-07-26, madrugada — Primera implementación real (commit `51adb27`)

*"feat(animations): add arrow-to-target and hammer-to-anvil scenes"* — el primer
commit que agrega código de verdad. 17 archivos, 1343 líneas insertadas. Este
commit, aunque aparece como uno solo en el log, empaquetó una sesión larga con
varios sub-episodios propios:

### El arte ya no se dibuja en código

El plan de "sacar el personaje" (07-25) todavía suponía dibujar los objetos
(flecha, diana, yunque, martillo) a mano en código — pero terminaron siendo
**ilustraciones que el propio usuario hizo** en `assets/illustrations/*.svg`,
después portadas a componentes React en `ui/animations/assets/`. Un detalle
arqueológico de este commit: se generó también `assets/illustrations/arc.svg`
(un arco/bow) — pero como el recorte del día anterior ya había sacado el arco de
la escena, ese asset quedó generado y sin componente React ni uso alguno. Nunca
se borró; simplemente no se convirtió en un `.tsx`.

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

---

## Notas sueltas que no encajan en la cronología pero valen la pena dejar anotadas

- **El personaje-búho del plan original nunca se dibujó.** El plan de
  2026-07-19 tenía prompts completos para generarlo en Quiver AI; se abandonó
  antes de que existiera un solo asset del personaje.
- **`assets/illustrations/arc.svg` existe y no se usa.** Se generó como parte
  del primer lote de ilustraciones (commit `51adb27`), pero el arco ya había
  sido recortado de la escena un día antes. Sigue en el repo.
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
