# Firma de email (Gmail) con tracking

Firma en **HTML, no imagen**. **No** replica el CSS del sitio: los clientes de
email matan fonts custom, tokens, temas e imágenes. Captura el *espíritu* —
minimalista, tipográfica.

## Principios

- **Un solo acento**: `#7c4abf`. Estilos **inline**. **Font-stack web-safe**.
- **Sin fondos de color** (se rompen en dark mode). Nombre/título sin color fijo
  (heredan el del cliente → se adaptan a dark mode); líneas secundarias en gris.
- **< 6 líneas.** Sin imágenes/foto/logo (se bloquean, rompen en dark mode).
- **Solo 2 links, ambos trackeados**: Portfolio + LinkedIn.
- Dos versiones: **EN** (`hi@`, marco remoto/US) y **ES** (`hola@`, MELI/LATAM).

### Núcleo (en las dos)

Nombre · titular ("Senior Product Designer · AI Adoption Lead", = LinkedIn) ·
ubicación ("Córdoba, Argentina · GMT-3 (US hours)", el diferenciador para remoto
USA) · una línea de prueba (el micro-pitch del hero) · Portfolio + LinkedIn.

### Afuera, a propósito

- Repetir el email (redundante con From/Reply-To).
- Foto/logo en imagen (se bloquea, rompe en dark mode; si acaso, monograma "LC" en texto).
- Teléfono (privacidad).
- GitHub / Behance / Medium (máx 2 links; quedan Portfolio + LinkedIn).
- "Open to work" (baja el nivel Senior). Disclaimers legales.

### Opcional de alto valor

- Link **"Book a call"** (Cal.com / Calendly) si montás scheduling — reemplaza o
  suma a los 2 links con la misma estética.

## Tracking

- **Portfolio** → `https://lenincuadra.com/?ref=sig` (directo al index, que
  trackea el ref). Es un link estable — agregalo desde el card "Links estables"
  (sugerencia "Firma de mail").
- **LinkedIn** → `https://lenincuadra.com/go.html?ref=sig&dest=linkedin`
  (go.html loguea la visita y redirige a LinkedIn). Mismo ref `sig` = touchpoint
  "firma de mail"; el `dest` distingue a dónde fue.

## EN — para `hi@lenincuadra.com` (remoto / US)

```html
<div style="font-family: Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.5;">
  <span style="font-weight: 700;">Lenin Cuadra</span><br>
  Senior Product Designer · AI Adoption Lead<br>
  <span style="color: #6b7280;">Córdoba, Argentina · GMT-3 (US hours)</span><br>
  <span style="color: #6b7280;">+221% revenue redesign · design-to-code in days</span><br>
  <a href="https://lenincuadra.com/?ref=sig" style="color: #7c4abf; text-decoration: none; font-weight: 600;">Portfolio</a>
  &nbsp;·&nbsp;
  <a href="https://lenincuadra.com/go.html?ref=sig&amp;dest=linkedin" style="color: #7c4abf; text-decoration: none; font-weight: 600;">LinkedIn</a>
</div>
```

## ES — para `hola@lenincuadra.com` (MELI / LATAM)

```html
<div style="font-family: Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.5;">
  <span style="font-weight: 700;">Lenin Cuadra</span><br>
  Senior Product Designer · Líder de Adopción de IA<br>
  <span style="color: #6b7280;">Córdoba, Argentina · Remoto &amp; Híbrido</span><br>
  <span style="color: #6b7280;">+221% de ingresos con un rediseño UX · de diseño a código en días</span><br>
  <a href="https://lenincuadra.com/?ref=sig" style="color: #7c4abf; text-decoration: none; font-weight: 600;">Portfolio</a>
  &nbsp;·&nbsp;
  <a href="https://lenincuadra.com/go.html?ref=sig&amp;dest=linkedin" style="color: #7c4abf; text-decoration: none; font-weight: 600;">LinkedIn</a>
</div>
```

## Cómo meterla en Gmail

Gmail no acepta HTML crudo en el editor de firma (lo verías como texto). Dos vías:

1. **Render + copiar (simple):** guardá el bloque HTML en un archivo `.html`,
   abrilo en el navegador, seleccioná todo (⌘A), copiá, y pegá en Gmail →
   ⚙️ → Ver todos los ajustes → **General → Firma**. Se pega ya renderizado.
2. **Extensión** (ej. "HTML signature") si preferís pegar el código tal cual.

Firma por dirección: en **Enviar como** podés asignar la EN a `hi@` y la ES a
`hola@`, y que Gmail elija según desde cuál respondés.
