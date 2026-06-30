# Prompt para Claude Code — cv-builder app (Fase 2)

> Copiá este prompt en Claude Code, dentro del repo donde tengas el archivo `cv-builder-product-definition.md` y los dos master `.docx`. El prompt es corto a propósito: el contexto completo vive en el `.md`. La única parte que va detallada acá es la lógica de tracking, porque es crítica y no debe quedar ambigua.

---

Vas a construir la **app web del cv-builder**, fase 2 (app real funcional). Antes de escribir código, leé el archivo `cv-builder-product-definition.md` que está en este repo: es la fuente de verdad del producto (inputs, output, registro, UI, fases y do's/don'ts). Tratá ese documento como spec; lo de abajo son las precisiones técnicas de esta fase.

## Stack y estructura

- Next.js + Tailwind CSS + shadcn/ui.
- Separación estricta:
  - `core/` — funciones puras, sin React: generación del código de tracking, validación, armado del nombre de carpeta, lógica del registro, relleno del master. Testeable de forma aislada.
  - `ui/` — componentes React: la tabla del registro y el wizard.
- Deploy target: Vercel.

## Qué tiene que hacer la app

Una sola pantalla (ver sección "UI: pantalla principal" del `.md`): registro a la izquierda (tabla de 7 columnas con scroll horizontal propio si no entra), y a la derecha un card angosto con un wizard de 4 pasos para generar un CV nuevo. El último paso muestra un preview del nombre de carpeta antes de confirmar.

## Generación del CV (output)

- El output es un **`.docx` editable**, NO PDF. Se genera rellenando el master, no renderizando.
- Hay dos master `.docx` en el repo (EN y ES). Según el idioma elegido, se usa el que corresponde.
- El relleno consiste en reemplazar el placeholder `ref=li-cv` por `ref=<código real>` en los dos links del header. Esos links viven en el part de relaciones del `.docx`: `word/_rels/document.xml.rels`. Reemplazá ahí, sobre el XML de relaciones (no sobre el texto visible del documento).
  - Link de portfolio (directo): `https://lenincuadra.github.io/portfolio/?ref=li-cv`
  - Link de LinkedIn (redirect): `https://lenincuadra.github.io/portfolio/go.html?ref=li-cv&dest=linkedin`
- Si el master no contiene el placeholder `ref=li-cv`, fallá con un error claro (es señal de master mal armado). El reemplazo debe afectar exactamente a los 2 links.
- El resultado se entrega como **`.zip`** con esta estructura (esto es parte del core, no opcional):
  ```
  [IDIOMA]_[empresa]_[código]/
    Lenin_Cuadra_CV.docx
  ```
  Ejemplo de carpeta: `EN_globallogic_0628r4/`. El idioma va en mayúscula (EN/ES). El nombre del archivo adentro es SIEMPRE `Lenin_Cuadra_CV.docx`, sin códigos ni datos de tracking.
- Si el idioma elegido es "Ambos", generar las dos variantes (una carpeta por idioma dentro del mismo zip, o dos zips; usá tu criterio pero documentá la decisión).

## Lógica del código de tracking (detallada, implementar exactamente así)

- Formato: `MMDD` + una letra + un dígito. Ejemplo: `0628r4`.
  - `MMDD` = mes y día de la **fecha de la aplicación** (lectura US, mes primero). La fecha es un input obligatorio; default = hoy, pero editable.
  - letra: una de `abcdefghjkmnpqrstuvwxyz` (alfabeto sin `i`, `l`, `o`).
  - dígito: uno de `23456789` (sin `0` ni `1`).
  - El alfabeto excluye caracteres ambiguos a propósito (evitar confundir l/1/i, o/0).
- Códigos reservados, el generador NUNCA los usa: `me`, `li-profile`, `organic`, `li-cv`.
- Collision-checking: antes de asignar un código, leé los códigos ya existentes en el registro (primera columna de la tabla) y regenerá hasta encontrar uno que no exista y no sea reservado. Reintentá hasta ~200 veces antes de error.
- La URL de tracking del portfolio que va en la fila del registro es: `https://lenincuadra.github.io/portfolio/?ref=<código>`.

## Registro (storage)

- El registro es una tabla, una fila por aplicación. Columnas: `código · empresa · rol · canal · fecha · notas · estado`.
- Es el segundo output del sistema (aparte del zip): al generar un CV, se agrega la fila correspondiente.
- **Capa de storage abstraída**: implementá el acceso al registro detrás de una interfaz (ej. `RegistryStore` con métodos tipo `list()`, `add(row)`, `update(code, fields)`, `existingCodes()`). La implementación inicial es **storage local** (archivo JSON o similar). Dejá la interfaz lista para una implementación futura con **Supabase** sin tocar `core/` ni `ui/`. No implementes Supabase ahora, solo no cierres la puerta.
- `notas` y `estado` son editables desde la tabla en cualquier momento. `estado` es binario: `Activo` / `Rechazado` (default `Activo`).

## Inputs del formulario/wizard

Ver la tabla de la sección "Inputs" del `.md`. Resumen: obligatorios = Empresa, Idioma (EN/ES/Ambos), Fecha (default hoy). Opcionales = Rol (default "UX/UI Designer"), Quien, Canal (LinkedIn / Email / Bolsa de trabajo / Sitio de la empresa / omitir — sin "Referido"), Link del puesto, Notas, Estado.

## Importante (do's and don'ts, ver el .md para el detalle)

- El link del portfolio va directo; SOLO el de LinkedIn pasa por `go.html` (porque LinkedIn strippea query params). No rutees el portfolio por `go.html`.
- Tabla del registro plana, con columna de empresa. No agrupar filas por empresa. No reducir ni ocultar columnas para que entren: si no entran, scroll horizontal.
- No exponer código/empresa/idioma en el nombre del archivo `.docx`. Todo eso vive en el nombre de la carpeta.
- No forzar a completar opcionales.

## Orden sugerido de trabajo

1. Andamiaje del proyecto (Next.js + Tailwind + shadcn/ui) y la separación `core/` / `ui/`.
2. `core/`: generación de código + collision-checking, armado del nombre de carpeta, interfaz `RegistryStore` con implementación local, relleno del master y empaquetado en `.zip`. Con tests.
3. `ui/`: la pantalla principal (tabla del registro + wizard de 4 pasos), cableada al `core/`.
4. Edición de `notas`/`estado` desde la tabla.
5. Verificar el flujo completo end-to-end y preparar para deploy a Vercel.

Trabajá por partes y mostrame cada bloque antes de seguir. Si algo del `.md` y de estas instrucciones entra en conflicto, preguntame antes de decidir.
