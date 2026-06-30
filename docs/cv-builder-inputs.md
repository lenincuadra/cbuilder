# Inputs del cv-builder

| Input | Obligatorio/Opcional | Descripción | Tipo de input en UI |
|---|---|---|---|
| **Empresa** | Obligatorio | Nombre de la empresa a la que se aplica | Text input |
| **Idioma** | Obligatorio | EN, ES o Ambos | Radio buttons / Toggle (3 opciones: EN / ES / Ambos) |
| **Rol** | Opcional | Rol al que se aplica | Text input (default: "UX/UI Designer") |
| **Quien** (`--who`) | Opcional | Recruiter o nombre del rol | Text input |
| **Canal** (`--channel`) | Opcional | LinkedIn, Email, Bolsa de trabajo, Sitio de la empresa, u "omitir" | Select / Dropdown (con opción "omitir") |
| **Link del puesto** (`--link`) | Opcional | URL de la publicación del puesto | Text input (tipo URL) |
| **Registry actual** (`--registry`) | Opcional (recomendado) | El `tracking-registry.md` del proyecto | File upload (o auto-detectado si ya está en el proyecto) |
| **Fecha** | Obligatorio | Forma parte del código de tracking (`MMDD`) | Date picker (con default = fecha actual) |
| **Notas** | Opcional | Texto libre, editable en cualquier momento (ej. "2da entrevista agendada") | Textarea |
| **Estado** | Opcional (default: Activo) | Binario: Activo / Rechazado. Casos de éxito (oferta) se anotan en Notas, no rompen el binario | Toggle / Switch (2 estados) |

## Nota: misma empresa, rol diferente

Se puede aplicar más de una vez a la misma empresa con un rol distinto. Cada aplicación sigue generando un código único (no hay colisión, ya que el código no depende del nombre de la empresa). En el registro, **Empresa** es una columna más de la tabla (no se agrupan filas visualmente); cada fila se diferencia por su código y por el campo **Rol**.

## Output: estructura del .zip

El resultado de generar el CV no es un PDF suelto, es un `.zip` con esta estructura:

```
[idioma]_[empresa]_[código]/
  Lenin_Cuadra_CV.pdf
  tracking-registry.md
```

Ejemplo: `EN_globallogic_0628r4/`

- El nombre de la carpeta es único (incluye el código de tracking) y es lo único que identifica la aplicación.
- El nombre del PDF adentro es siempre el mismo: `Lenin_Cuadra_CV.pdf`, sin importar idioma o empresa.
- El `tracking-registry.md` actualizado (con la fila nueva) viaja en la misma carpeta, no como archivo suelto aparte, para que quede todo junto al descargar.
- Al enviar el CV, el nombre de la carpeta queda como contexto invisible (no viaja con el archivo si se sube solo el PDF), y el archivo en sí no expone ningún dato de tracking en su nombre.
