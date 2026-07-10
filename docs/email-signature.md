# Firma de mail (Gmail) con tracking

La firma lleva un link **trackeado al portfolio** (`?ref=sig`), así sabés cuántas
visitas vienen de tus mails. El ref `sig` es un **link estable** (agregalo desde el
card "Links estables" — está en las sugerencias). LinkedIn/GitHub van directos
(sin tracking) para no complicar; si algún día querés trackearlos también, hay que
rutearlos por `go.html` (extensión del feature de links estables).

Dos direcciones (misma casilla): **hi@** para EN, **hola@** para ES. Podés tener
una firma por idioma (Gmail → "Enviar como" permite una firma por dirección).

## HTML para pegar en Gmail

Ajustes de Gmail → ⚙️ → Ver todos los ajustes → **General → Firma** → Crear nueva.
Pegá esto en el editor (Gmail acepta HTML al pegar; si querés el HTML crudo,
usá una extensión o pegalo como texto enriquecido):

**EN (para hi@):**

```html
<div style="font-family: Arial, sans-serif; font-size: 13px; color: #111827;">
  <strong style="font-size: 15px;">Lenin Cuadra</strong><br>
  <span style="color: #1A56DB;">Senior Product Designer · AI Adoption Lead</span><br>
  <a href="https://lenincuadra.com/?ref=sig" style="color: #1A56DB;">lenincuadra.com</a>
  &nbsp;·&nbsp; <a href="mailto:hi@lenincuadra.com" style="color: #1A56DB;">hi@lenincuadra.com</a><br>
  <a href="https://www.linkedin.com/in/lenincuadra" style="color: #1A56DB;">linkedin.com/in/lenincuadra</a>
  &nbsp;·&nbsp; <a href="https://github.com/lenincuadra" style="color: #1A56DB;">github.com/lenincuadra</a>
  &nbsp;·&nbsp; <span style="color: #6B7280;">+54 9 351-376-6049</span>
</div>
```

**ES (para hola@):** igual, cambiando el título a
`Senior Product Designer · Líder de Adopción de IA` y el mail a `hola@lenincuadra.com`.

## Nota

El link del portfolio es `lenincuadra.com/?ref=sig` (directo al index, que trackea
el ref). No usa `/r/` ni `go.html` porque los links estables no llevan sufijo P/L/G
ni personalización — son touchpoints, no CVs. Ver `docs/spec-driven.md` y el card
"Links estables".
