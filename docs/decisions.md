# Decisiones (cv-builder)

Log liviano de decisiones de producto/arquitectura y su **por qué**. Formato ADR:
cada entrada es Decisión + Contexto/razón. Lo más nuevo arriba. El "cómo" de UI vive
en `docs/design-system.md`; las reglas inviolables resumidas, en `CLAUDE.md`.

> Cuándo agregar una entrada acá: cuando se toma una decisión que alguien (o Claude en
> otra sesión) podría querer revertir sin contexto — trade-offs, reglas que cambian, o
> elecciones no obvias. No para cosas que el código ya deja claras.

---

## Canal "Email" exige el email aplicado
Si en el wizard se elige canal **Email**, aparece un campo de email **requerido** (no se
puede avanzar sin un email válido). Se guarda en `RegistryRow.email` y solo se persiste
cuando el canal es Email. Razón: si aplicaste por mail, el dato clave es a qué dirección.

## Componentes: usar siempre el del DS antes que custom
Regla de proceso (ver `docs/design-system.md`): primero el componente del DS, si no existe
preguntar por suplente, recién después custom con confirmación. Surgió de haber hecho un
toggle custom donde correspondía el `Switch` del DS.

## Tabla: sin scroll horizontal salvo en pantallas chicas
La tabla usa `table-fixed` y trunca columnas largas para entrar siempre en el contenedor;
solo por debajo de 640px (sm) se reactiva el scroll. **Reemplaza** la regla original
("si no entran, scroll horizontal; nunca ocultar/reducir columnas"). Razón: el scroll
lateral permanente molestaba; truncar + tooltip da mejor lectura en desktop.

## Activas y Archivado comparten la misma tabla
Una sola `RegistryTable`; la página filtra por `archived` y pasa las filas. Estructura,
columnas y comportamiento 100% idénticos entre vistas. Razón: evitar drift entre dos
tablas y mantener consistencia.

## Archivar es un flag independiente del estado
`archived: boolean` separado de `status` (Activo/Rechazado). Se puede archivar sin importar
el estado. Razón: "archivado" (sacar de la vista activa) y "rechazado" (resultado) son
dimensiones distintas.

## Dark mode siempre (sin toggle)
Clase `dark` fija en `<html>` + `color-scheme: dark`. Razón: pedido explícito; menos
esfuerzo que seguir el tema del SO. Para volver a system: `next-themes` con
`defaultTheme="system"` (ya instalado).

## Repo público → data del registro fuera de git
El repo es **público**; el registro es privado (a quién aplicó Lenin). `data/` y
`docs/*tracking-registry*.md` están gitignoreados. El file store persiste en
`data/registry.json` (disco, no git). Razón: no exponer el historial; GitHub privado es
gratis pero se prefirió mantenerlo público.

## Storage: file store local ahora, Supabase después
Detrás de la interfaz `RegistryStore`: hoy el default es un **archivo JSON local** vía API
routes (`fileStore` + `apiStore`), durable en disco y compartido entre navegadores de la
máquina. `SupabaseRegistryStore` queda listo (se activa con las env vars). Se descartó
localStorage como default por ser por-navegador. Razón: durabilidad real sin backend,
corriendo local; Supabase para deploy/compartir. Ver `docs/supabase-setup.md`.

## Output `.docx` (no PDF) por relleno de placeholder
Se rellena el master reemplazando `ref=li-cv` en `word/_rels/document.xml.rels` (no se
renderiza). Razón: los master ya son `.docx`; fidelidad sin depender de un render.

## Idioma "Ambos" = 1 código, 1 fila, 1 zip
Una aplicación = un código de tracking; el `.zip` lleva dos carpetas (EN + ES). Razón: el
registro no tiene columna de idioma; dos filas serían duplicados indistinguibles.

## Reservado extra `web-cv`
Sumado a `me`/`li-profile`/`organic`/`li-cv` porque el registro vivo lo usa. El registro
vivo es la fuente de verdad sobre reservados (la spec original no lo tenía).

## Código en inglés, UI en español
Identificadores/comentarios/commits en inglés; textos visibles al usuario en español
(contenido de producto). Pedido explícito del usuario.
