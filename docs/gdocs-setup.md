# Google Docs sink — setup

Cada CV generado se crea también en tu Drive como **Google Doc nativo**, listo
para *File → Download → PDF*. Cada aplicación tiene **una carpeta propia** con
subcarpetas por idioma adentro:

```
CV Builder/
  <empresa>_<código>/          ← una por aplicación (la URL que abre la app)
    EN/  Lenin_Cuadra_CV
    ES/  Lenin_Cuadra_CV        ← sólo si generaste "Ambos"
```

El doc se llama `Lenin_Cuadra_CV` (sin tracking) a propósito: así el PDF
descargado respeta la regla del naming; el idioma va en la subcarpeta y el código
en la carpeta de la aplicación. La app abre la **carpeta** de la aplicación
(no el archivo), así funciona igual para EN, ES o ambos.

La integración es un **webhook de Google Apps Script** (sin Cloud Console ni
OAuth): la app le manda el .docx a tu script, y el script lo guarda en tu Drive.
Si las env vars no están, el feature queda apagado en silencio.

## 1. Crear el script (una vez, ~10 min)

1. Ir a [script.google.com](https://script.google.com) → **Nuevo proyecto**.
2. Pegar el código de abajo, reemplazando `PUT_A_LONG_RANDOM_TOKEN_HERE` por un
   token largo aleatorio (ej. `openssl rand -hex 24` en la terminal).
3. En el panel izquierdo: **Servicios (+)** → agregar **Drive API** (identificador
   `Drive`, versión v3). Esto habilita la conversión a Google Doc nativo.
4. **Implementar → Nueva implementación → Aplicación web**:
   - *Ejecutar como*: **Yo**.
   - *Quién tiene acceso*: **Cualquier usuario** (el token del paso 2 es el candado).
5. Autorizar los permisos cuando lo pida y copiar la **URL de la aplicación web**.

```javascript
// CV Builder -> Drive sink. Receives a filled CV (.docx, base64) and stores it
// as a native Google Doc under: CV Builder/<appFolder>/<language>/Lenin_Cuadra_CV
// Returns the Doc URL and the application folder URL (shared across languages).
const TOKEN = "PUT_A_LONG_RANDOM_TOKEN_HERE";
const ROOT_FOLDER = "CV Builder";
const DOC_NAME = "Lenin_Cuadra_CV"; // no tracking data: downloads inherit this name

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.token !== TOKEN) return json_({ error: "unauthorized" });
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(body.appFolder)) return json_({ error: "bad folder" });
    if (body.language !== "EN" && body.language !== "ES") return json_({ error: "bad language" });

    const root = findOrCreate_(DriveApp.getRootFolder(), ROOT_FOLDER);
    const appFolder = findOrCreate_(root, body.appFolder);   // one per application
    const langFolder = findOrCreate_(appFolder, body.language); // EN / ES inside

    const blob = Utilities.newBlob(
      Utilities.base64Decode(body.docxBase64),
      MimeType.MICROSOFT_WORD,
      DOC_NAME + ".docx",
    );
    // Advanced Drive service (v3): upload with conversion to a native Google Doc.
    const file = Drive.Files.create(
      { name: DOC_NAME, parents: [langFolder.getId()], mimeType: "application/vnd.google-apps.document" },
      blob,
    );
    return json_({
      url: "https://docs.google.com/document/d/" + file.id + "/edit",
      folderUrl: "https://drive.google.com/drive/folders/" + appFolder.getId(),
    });
  } catch (err) {
    return json_({ error: String(err) });
  }
}

function findOrCreate_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
```

## 2. Configurar la app

En `.env.local` (gitignoreado):

```
GDOCS_SCRIPT_URL=https://script.google.com/macros/s/XXXX/exec
GDOCS_TOKEN=el-mismo-token-del-script
```

Reiniciar el dev server. Listo: al generar un CV, la alerta de éxito trae un
botón **Drive** que abre la carpeta de la aplicación.

## Actualizar un script ya deployado

Si ya tenías una versión vieja del script (que guardaba en
`CV Builder/<carpeta>/…` y devolvía sólo `{ url }`), **reemplazá el código por
el de arriba y redeployá**: **Administrar implementaciones → editar (lápiz) →
Versión: Nueva versión → Implementar**. Eso mantiene la misma URL (no hace falta
tocar `.env.local`). Hasta actualizarlo, el sink falla y el CV igual se descarga
(toast warning).

## Notas

- El token viaja server-to-server (la URL/token nunca llegan al browser).
- El token viaja server-to-server (la URL/token nunca llegan al browser).
- Fallos del script solo muestran un toast de warning: el .zip ya se descargó.
