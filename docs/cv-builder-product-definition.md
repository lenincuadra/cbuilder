# cv-builder · Product Definition

Definición de producto del cv-builder, pensado como memoria de decisiones para la futura app web. Documenta qué hace, por qué, y los do's and don'ts que surgieron al diseñarlo.

---

## 1. Qué es y para qué existe

El cv-builder genera el CV de Lenin Cuadra para una aplicación a un trabajo, con el código de tracking ya insertado en los links del header (portfolio y LinkedIn). El objetivo del sistema completo es separar la búsqueda laboral del trabajo de portfolio, y mantener un registro limpio de dónde y cómo se aplicó a cada puesto.

El producto resuelve dos cosas a la vez:
- Generar un CV tailored y trackeado por aplicación, sin trabajo manual de editar links.
- Mantener un audit trail (el registro) de cada aplicación: empresa, rol, canal, fecha, estado.

La versión actual es un skill de línea de comandos. La app web es la evolución: convertir ese skill en una interfaz visual.

---

## 2. Inputs

Lo que el usuario completa para generar un CV.

| Input | Obligatorio/Opcional | Descripción | Tipo de input en UI |
|---|---|---|---|
| Empresa | Obligatorio | Nombre de la empresa a la que se aplica | Text input |
| Idioma | Obligatorio | EN, ES o Ambos | Toggle (3 opciones: EN / ES / Ambos) |
| Fecha | Obligatorio | Forma parte del código de tracking (`MMDD`). Default = fecha actual | Date picker (default hoy) |
| Rol | Opcional | Rol al que se aplica. Default: "UX/UI Designer" | Text input con default |
| Quien | Opcional | Recruiter o contacto | Text input |
| Canal | Opcional | LinkedIn, Email, Bolsa de trabajo, Sitio de la empresa, u "omitir" | Select / Dropdown |
| Link del puesto | Opcional | URL de la publicación | Text input (URL) |
| Notas | Opcional | Texto libre, editable en cualquier momento | Textarea |
| Estado | Opcional (default: Activo) | Binario: Activo / Rechazado | Toggle / Switch |
| Registry | Opcional (auto-detectado) | El `tracking-registry.md` del proyecto | Estado persistente, no upload manual |

En la práctica, con Empresa + Idioma + Fecha alcanza para generar. El resto queda vacío si no se completa.

---

## 3. Output

El resultado es un `.zip` con esta estructura:

```
[idioma]_[empresa]_[código]/
  Lenin_Cuadra_CV.docx
```

Ejemplo: `EN_globallogic_0628r4/`

El formato del CV es **Word editable (`.docx`)**, no PDF. Razón: los master ya son `.docx`, así que se rellena la plantilla sin perder fidelidad ni depender de un render. Más adelante se puede iterar a ofrecer PDF (o las dos), pero por ahora el output es Word.

La lógica detrás de la estructura:
- El nombre de la **carpeta** es único (incluye el código de tracking) y dice todo lo necesario: idioma, empresa, código.
- El nombre del **archivo** es siempre el mismo (`Lenin_Cuadra_CV.docx`), sin importar idioma o empresa. Al enviarlo a la empresa, no deja registro de nada: el recruiter ve solo `Lenin_Cuadra_CV.docx`, sin códigos ni datos de tracking en el nombre.

El **registro no es parte del zip**: es un output aparte. Al generar el CV, la fila nueva de la aplicación se agrega a la tabla del registro, que vive como estado persistente del sistema (no viaja con el CV).

---

## 4. El registro (tracking registry)

El registro es el segundo output del sistema (aparte del zip del CV): al generar cada CV, se agrega una fila a esta tabla. Vive como estado persistente, no viaja con el CV ni se descarga junto a él.

Tabla plana, una fila por aplicación. Estructura de columnas:

`código · empresa · rol · canal · fecha · notas · estado`

Decisiones clave del registro:
- **Empresa es una columna**, no un agrupador visual. Aunque se aplique varias veces a la misma empresa con roles distintos, cada aplicación es una fila independiente (el código es único y no depende del nombre de la empresa).
- **Notas** es editable en cualquier momento, no solo al crear la fila. Sirve para tracking del proceso: "2da entrevista agendada", "cerraron la búsqueda", "recibí oferta".
- **Estado** es binario: Activo / Rechazado. El caso de éxito (oferta) se anota en Notas, no rompe el binario con un tercer estado.

---

## 5. Cómo se rellena el CV master

Hay dos master `.docx` (uno EN, uno ES). Cada uno tiene en el header dos links con un placeholder `ref=li-cv`:
- el del **portfolio** (directo): `https://lenincuadra.github.io/portfolio/?ref=li-cv`
- el de **LinkedIn** (via redirect): `https://lenincuadra.github.io/portfolio/go.html?ref=li-cv&dest=linkedin`

Generar un CV es, mecánicamente, reemplazar ese placeholder `ref=li-cv` por el código real de la aplicación (ej. `ref=0628r4`) en los dos links. El reemplazo se hace sobre el part de relaciones del `.docx` (`word/_rels/document.xml.rels`), donde viven las URLs de los hipervínculos.

Reglas de este paso:
- El reemplazo debe afectar exactamente a los dos links del header. Si el master no contiene el placeholder, la generación falla a propósito (es señal de que el master está mal).
- El idioma elegido determina cuál master se usa.
- Los master conservan siempre el placeholder `ref=li-cv`; nunca se hardcodea un código real en el master.

---

## 6. Do's and Don'ts

### Tracking y código

DO:
- Generar el código con formato `MMDD` (mes primero, lectura US) + una letra + un dígito (ej. `0628r4`).
- Usar un alfabeto sin caracteres ambiguos: letras `abcdefghjkmnpqrstuvwxyz` (sin i, l, o) y dígitos `23456789` (sin 0, 1). Esto evita confusiones visuales al leer o tipear el código.
- Chequear colisiones contra los códigos ya existentes en el registro antes de asignar uno nuevo (reintentar hasta encontrar uno libre).
- Usar la fecha real de la aplicación; la fecha es parte del código, por eso es obligatoria.
- Tratar los códigos reservados (`me`, `li-profile`, `organic`, `li-cv`) como intocables: el generador nunca los usa.

DON'T:
- No usar el nombre de la empresa dentro del código. El código es opaco a propósito: el visitante solo ve el código en la URL, el significado vive en el registro.
- No poner "aplicado" ni texto de estado en la columna de fecha. La fecha es una fecha real.

### Links del CV

DO:
- El link del portfolio va **directo**: `portfolio/?ref=CÓDIGO`.
- El link de LinkedIn va **via `go.html`**: `go.html?ref=CÓDIGO&dest=linkedin`.

DON'T:
- No rutear el portfolio por `go.html`. El redirect existe por UNA razón puntual: LinkedIn strippea los query params en la sección Featured, entonces necesita una capa de redirect para preservar el tracking. Esa razón no aplica al portfolio.
- No generalizar el patrón `go.html` a otros links sin una necesidad paralela concreta.

### Registry / integridad de datos

DO:
- Tratar el registry como la fuente de verdad del audit trail.
- En la app web, el registry debería ser estado persistente (auto-detectado), no un archivo que se sube manualmente cada vez.

DON'T:
- No arrancar de un registry en blanco si el que está cargado se perdió o desincronizó. Reconstruir desde los documentos del proyecto antes de caer en un registro vacío (eso causa pérdida silenciosa de datos y colisiones de código).
- No asumir que el registry se escribe in situ: en el skill actual es read-only, por eso se regenera completo y se devuelve.

### Output / privacidad

DO:
- Mantener el nombre del archivo siempre igual (`Lenin_Cuadra_CV.docx`), genérico, sin datos de tracking.
- Concentrar toda la info identificatoria en el nombre de la carpeta, que no viaja con el archivo.

DON'T:
- No exponer el código de tracking, la empresa ni el idioma en el nombre del archivo que se envía. El recruiter no debe ver nada de eso.

### UX / UI de la app

DO:
- Separar los obligatorios (Empresa, Idioma, Fecha) arriba, marcados claramente, de los opcionales abajo.
- Idioma como toggle de 3 estados (EN / ES / Ambos), visible de un vistazo, no como dropdown.
- Fecha con default a hoy, pero editable (las corridas tarde a la noche en Córdoba, UTC-3, pueden caer al día siguiente).
- Estado como toggle binario; Notas como textarea editable.
- Poner el registro como protagonista (columna izquierda ancha) y la generación en un card angosto a la derecha. El historial es lo recurrente; generar es puntual.
- Dentro del card angosto, usar wizard por pasos en vez de meter todos los campos juntos. Mostrar el preview del nombre de carpeta antes de confirmar.

DON'T:
- No agrupar las filas del registro por empresa: usar tabla plana con columna de empresa.
- No incluir "Referido" como canal. Un referido puede aplicar igual por el sitio de la empresa, LinkedIn, o cualquier otro canal; "referido" no es un canal en sí.
- No forzar al usuario a completar opcionales: lo que no se complete va vacío.
- No reducir ni ocultar columnas del registro para que entre en el ancho: si no entra, scroll horizontal en la tabla. Las 7 columnas se mantienen.

---

## 7. UI: pantalla principal

La app es de una sola pantalla. No hay navegación entre vistas: el registro y la generación conviven.

### Layout

Split de dos columnas, con el registro como protagonista:

- **Izquierda (ancha):** la tabla del registro, con las 7 columnas (`código · empresa · rol · canal · fecha · notas · estado`). Es lo que el usuario mira la mayor parte del tiempo. Si las columnas no entran en el ancho disponible, la tabla tiene scroll horizontal propio (no se reduce ni se ocultan columnas).
- **Derecha (angosta, ~240px):** un card que contiene el flujo de generación de un CV nuevo.

La decisión de poner el registro a la izquierda (y no el formulario) es deliberada: el historial es el centro de gravedad de la herramienta. Generar un CV es una acción puntual; consultar y mantener el registro es lo recurrente.

### El card de generación: wizard por pasos

Dentro del card de la derecha, la generación NO es un formulario con todos los campos a la vista. Es un wizard por pasos, uno por pantalla, con barra de progreso arriba y botones Atrás / Siguiente.

Razón: el card es angosto, no entran todos los campos cómodos a la vez. Y el wizard guía el orden correcto (primero lo obligatorio, después lo opcional), reduciendo errores.

Agrupación de pasos sugerida (4 pasos):
1. Empresa
2. Idioma + Fecha
3. Opcionales (rol, canal, quien, link del puesto)
4. Confirmar y generar

En el último paso, antes de confirmar, el wizard muestra un **preview del nombre de carpeta** que se va a crear (ej. `EN_globallogic_0628r4`), para que el usuario vea el código generado antes de cerrar la acción.

### Estados de la tabla

- **Estado** se muestra como badge de color: Activo (verde) / Rechazado (rojo).
- **Notas** sin contenido se muestran como "sin notas" en gris e itálica (placeholder), no como celda vacía.
- Notas y Estado son editables desde la tabla (no requieren abrir otra pantalla).

### Pendiente de definir (no incluido en esta spec)

Empty state (registro vacío), loading (mientras genera el PDF), y error (fallo de generación o colisión de código). Se documentan cuando se aborden.

---

## 8. Fases de construcción

El proyecto se construye en dos fases, con herramientas distintas.

### Fase 1 — POC visual (v0)

Objetivo: validar el layout y el flujo del wizard, sin lógica real.

- Solo UI: la pantalla principal (registro + wizard) con datos mockeados.
- Sin generación real de PDF, sin tracking real, sin storage.
- Sirve para iterar rápido sobre el diseño y confirmar que la pantalla funciona antes de invertir en la arquitectura.
- Se despliega a Vercel para verlo en vivo.

### Fase 2 — App real

Objetivo: la herramienta funcional completa.

- Generación real del CV en PDF (migración del `.docx` master a HTML/CSS para el render).
- Tracking real: generación del código `MMDD`+sufijo con collision-checking contra el registro.
- Inserción de los links (portfolio directo, LinkedIn via `go.html`) en el header del CV.
- Output del `.zip` con la estructura definida.
- Storage del registro: arranca simple, con un camino hacia Supabase.
- Se despliega a Vercel.

Vercel es la capa de hosting en ambas fases, no una herramienta de build.

---

## 9. Stack y arquitectura

Stack: Next.js, Tailwind CSS, shadcn/ui, Supabase (planeado para storage), Vercel (hosting).

Separación limpia entre:
- **`core/`** — funciones puras: generación del código, validación, armado del nombre de carpeta, lógica del registro. Sin React, testeable de forma aislada.
- **`ui/`** — componentes React: la tabla del registro, el wizard, los inputs.

Esta separación es importante: la lógica de tracking (lo que hace al producto correcto) no debe vivir mezclada con la UI. El `core/` debería poder portarse o testearse sin tocar la capa visual.
