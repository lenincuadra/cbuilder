# Google Docs sink — setup

Cada CV generado se crea también en tu Drive como **Google Doc nativo**
(`CV Builder/<carpeta>/Lenin_Cuadra_CV`), listo para *File → Download → PDF*.
El doc se llama `Lenin_Cuadra_CV` (sin tracking) a propósito: así el PDF
descargado respeta la regla del naming; el código va en el nombre de la carpeta.

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
// as a native Google Doc under: CV Builder/<folder>/Lenin_Cuadra_CV
const TOKEN = "PUT_A_LONG_RANDOM_TOKEN_HERE";
const ROOT_FOLDER = "CV Builder";
const DOC_NAME = "Lenin_Cuadra_CV"; // no tracking data: downloads inherit this name

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.token !== TOKEN) return json_({ error: "unauthorized" });
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(body.folder)) return json_({ error: "bad folder" });

    const root = findOrCreate_(DriveApp.getRootFolder(), ROOT_FOLDER);
    const folder = findOrCreate_(root, body.folder);

    const blob = Utilities.newBlob(
      Utilities.base64Decode(body.docxBase64),
      MimeType.MICROSOFT_WORD,
      DOC_NAME + ".docx",
    );
    // Advanced Drive service (v3): upload with conversion to a native Google Doc.
    const file = Drive.Files.create(
      { name: DOC_NAME, parents: [folder.getId()], mimeType: "application/vnd.google-apps.document" },
      blob,
    );
    return json_({ url: "https://docs.google.com/document/d/" + file.id + "/edit" });
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

Reiniciar el dev server. Listo: al generar un CV aparece el toast
"…creado en Google Docs → Abrir".

## Notas

- Si redeployás el script (cambios de código), la URL puede cambiar según cómo
  publiques: usá **Administrar implementaciones → editar (lápiz) → Nueva versión**
  para mantener la misma URL.
- El token viaja server-to-server (la URL/token nunca llegan al browser).
- Fallos del script solo muestran un toast de warning: el .zip ya se descargó.
