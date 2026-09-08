# Zapping Fiestas Patrias — guía de traspaso para otro agente

## Encargo principal

Continúa este proyecto sin reemplazar su arquitectura ni perder las funciones existentes. Antes de modificarlo, revisa esta guía y el código actual. Mantén el branding de Zapping, la temática de Fiestas Patrias, la separación entre participación pública y administración, y la salida transparente para vMix.

La prioridad es conservar un flujo estable para eventos en vivo:

1. El público envía una foto con nombre, correo y un mensaje breve.
2. La foto queda pendiente de revisión.
3. Un administrador u operador la aprueba o rechaza.
4. Solo las fotos aprobadas aparecen en la salida vMix.

## Estado actual

- Sitio publicado: <https://mural-vivo-eventos.a-aviles-armijo.chatgpt.site>
- Participación pública: `/`
- Panel de administración: `/admin`
- Salida transparente para vMix: `/vmix`
- Último estado de código incluido: transición de vMix tipo rollo, de derecha a izquierda, recortada dentro de un marco fijo.
- Rama principal: `main`
- Commit de referencia: `7e944f38b7932734e3c59dd422470f1fdead4b77`

## Reglas funcionales que deben conservarse

### Participación pública

- Solicita nombre, correo y fotografía.
- La fotografía admite hasta 10 MB.
- Formatos aceptados: JPG, PNG y WEBP.
- Cada envío nuevo queda con estado `pending`.
- El correo nunca se expone en los endpoints públicos.
- La interfaz usa lenguaje simple para público general.

### Moderación

- Estados disponibles: `pending`, `approved` y `rejected`.
- Las fotografías pueden abrirse en una vista grande antes de decidir.
- El administrador principal puede aprobar, rechazar, devolver a pendiente y eliminar.
- Los operadores pueden revisar, aprobar y rechazar.
- Los operadores no pueden eliminar envíos, cambiar el loop, cargar fondos ni gestionar accesos.

### Equipo operador

- El administrador principal agrega operadores mediante su correo institucional.
- El operador debe iniciar sesión con exactamente el mismo correo agregado.
- El alta no envía una invitación por correo: concede acceso dentro de la aplicación.
- El máximo actual es de 50 operadores.
- Los operadores se guardan en la tabla `event_operators`.

### Loop y salida vMix

- Solo se muestran fotos aprobadas.
- La lista y la configuración se actualizan automáticamente cada 10 segundos.
- Duración configurable por foto: entre 2 y 30 segundos.
- Tiempo configurable del cambio: entre 0,3 y 5 segundos.
- Se pueden usar hasta tres fondos para fotografías verticales.
- Los fondos pueden ser colores o imágenes JPG, PNG y WEBP.
- Las fotos horizontales llenan el marco; las verticales se contienen y muestran el fondo configurado.
- El nombre aparece sobre la foto y el mensaje en una banda superpuesta.

### Salida vMix

- La página `/vmix` tiene fondo transparente para usarla como Browser Input.
- El paño de trabajo esperado es 1920 × 1080, aunque el diseño responde al tamaño de la ventana.
- El marco está en la zona inferior izquierda.
- Medidas actuales del marco: ancho `36vw`, izquierda `1.3vw`, borde inferior `4.8vh` y proporción 16:9.
- El marco debe permanecer fijo.
- Al cambiar de foto, la anterior sale hacia la izquierda y la nueva entra desde la derecha.
- El movimiento ocurre exclusivamente dentro del marco; nada debe extenderse por el resto del paño.
- No debe usarse disolvencia ni variación de opacidad en vMix.

## Perfiles y autenticación

El sitio público permite visitantes anónimos. El panel `/admin` usa Sign in with ChatGPT y valida el correo en el servidor.

- Propietarios: correos definidos en la variable de entorno `ADMIN_EMAILS`, separados por comas.
- Operadores: correos guardados en D1, tabla `event_operators`.
- En desarrollo local existe un acceso de propietario automático para facilitar las pruebas.

No guardes correos de propietarios ni credenciales en el repositorio. Configura `ADMIN_EMAILS` en el entorno de publicación.

## Arquitectura

- React 19 y TypeScript.
- Enrutamiento compatible con Next.js App Router mediante Vinext.
- Vite para desarrollo y construcción.
- Cloudflare Worker como runtime.
- Cloudflare D1 para envíos, configuración y operadores.
- Cloudflare R2 para fotos y fondos cargados.
- Drizzle para describir el esquema y generar migraciones.
- Sites para la publicación.

Versiones exactas disponibles en `package.json` y `package-lock.json`.

## Bindings y configuración de Sites

El archivo `.openai/hosting.json` contiene:

- `project_id`: identifica el sitio existente. Reutilízalo; no crees otro sitio salvo que se solicite expresamente una clonación independiente.
- `d1: "DB"`: binding de la base de datos.
- `r2: "MEDIA"`: binding del almacenamiento de imágenes.

Los datos reales de producción y las fotos enviadas no están dentro del ZIP. Permanecen en D1 y R2 asociados al proyecto publicado.

## Modelo de datos

### `submissions`

- `id`: UUID del envío.
- `name`, `email`, `message`: datos de la persona.
- `object_key`: ruta del archivo en R2.
- `original_name`, `mime_type`, `width`, `height`: metadatos de imagen.
- `status`: `pending`, `approved` o `rejected`.
- `created_at`, `reviewed_at`, `reviewed_by`: auditoría.

### `display_settings`

- Una sola fila con `id = 1`.
- `duration_seconds`: duración de cada foto.
- `fade_seconds`: nombre histórico del campo; actualmente también controla el tiempo del desplazamiento lateral en vMix.
- `backgrounds_json`: hasta tres colores o rutas de imágenes.

### `event_operators`

- `email`: clave primaria.
- `role`: actualmente solo `operator`.
- `created_by`, `created_at`: auditoría.

Las migraciones están en `drizzle/`. El archivo `db/mural.ts` también asegura el esquema en tiempo de ejecución para instalaciones existentes.

## Rutas y endpoints

| Ruta | Método | Uso |
|---|---|---|
| `/api/submissions` | `GET` | Lista hasta 500 fotos aprobadas para los loops. |
| `/api/submissions` | `POST` | Recibe una nueva participación y guarda la imagen en R2. |
| `/api/media?id=…` | `GET` | Entrega la imagen; las no aprobadas exigen acceso administrativo. |
| `/api/settings` | `GET` | Entrega la configuración del loop. |
| `/api/settings` | `PATCH` | Modifica el loop; solo propietario. |
| `/api/backgrounds` | `GET` | Entrega un fondo cargado. |
| `/api/backgrounds` | `POST` | Carga un fondo; solo propietario. |
| `/api/admin/submissions` | `GET` | Lista todos los envíos y sus contadores. |
| `/api/admin/submissions` | `PATCH` | Cambia el estado de una foto. |
| `/api/admin/submissions` | `DELETE` | Elimina foto y registro; solo propietario. |
| `/api/admin/operators` | `GET` | Lista operadores; solo propietario. |
| `/api/admin/operators` | `POST` | Agrega o reactiva un operador; solo propietario. |
| `/api/admin/operators` | `DELETE` | Revoca un operador; solo propietario. |

## Archivos principales

- `app/page.tsx`: entrada pública.
- `app/upload-experience.tsx`: experiencia de carga de fotografías.
- `app/admin/page.tsx`: acceso y página administrativa.
- `app/admin/admin-dashboard.tsx`: moderación, ajustes y operadores.
- `app/vmix/display-loop.tsx`: lógica de la salida vMix.
- `app/globals.css`: branding, layouts, marcos y animaciones.
- `app/admin-auth.ts`: autorización de propietarios y operadores.
- `app/chatgpt-auth.ts`: integración de inicio de sesión.
- `app/api/`: endpoints públicos y administrativos.
- `db/schema.ts`: esquema Drizzle.
- `db/mural.ts`: acceso a D1/R2 y creación defensiva del esquema.
- `drizzle/`: migraciones.
- `worker/index.ts`: entrada del Worker.
- `vite.config.ts`: Vinext, Sites y bindings locales.
- `public/`: tipografías, logos, fotografías temáticas y tarjeta social.
- `reference-assets/zapping-brand/`: fuentes originales del branding incluidas como material de apoyo en este ZIP.

## Puesta en marcha local

Requisito: Node.js 22.13 o posterior.

```bash
npm install
npm run dev
```

Abrir:

- `http://localhost:3000/`
- `http://localhost:3000/admin`
- `http://localhost:3000/vmix`

En desarrollo, D1 y R2 se simulan localmente y sus datos quedan en archivos temporales ignorados por Git.

## Comprobaciones antes de entregar cambios

```bash
npm test
npm run lint
```

`npm test` construye el proyecto y ejecuta las pruebas incluidas. Si se modifica `db/schema.ts`, generar y revisar una nueva migración:

```bash
npm run db:generate
```

No publiques si la construcción falla. Para cambios visuales en vMix, verifica especialmente que el fondo de la página siga transparente y que la animación quede recortada dentro de `.vmix-frame`.

## Publicación

El sitio ya existe y está configurado como público. Para publicar cambios con Sites:

1. Conserva el `project_id` actual.
2. Construye y valida el proyecto.
3. Guarda una nueva versión usando el código validado.
4. Como el sitio es público, solicita autorización explícita al propietario antes de desplegar esa versión.
5. Confirma que el despliegue termine correctamente.
6. Abre la URL publicada exacta, especialmente `/vmix` si se modificó la salida de televisión.

No escribas credenciales temporales en archivos, remotos de Git, logs ni mensajes.

## Criterios para futuros cambios

- Preservar las modificaciones existentes del usuario.
- No exponer correos ni fotos pendientes en rutas públicas.
- No permitir acciones de propietario a operadores.
- Mantener el panel entendible para personas no técnicas.
- Conservar la tipografía y los logos oficiales de Zapping.
- Mantener la temática chilena sin sobrecargar la salida vMix.
- Considerar la salida vMix como una gráfica al aire: transparente, estable y predecible.
- Probar fotos horizontales y verticales cuando se cambie el renderizado.
- No cambiar el significado del campo `fade_seconds` sin una migración compatible; aunque su nombre sea histórico, sigue almacenando la duración de la transición.

## Contenido del ZIP

El ZIP contiene el código fuente, archivos de configuración, lockfile, migraciones, pruebas, imágenes finales, logos, tipografías y material original de branding.

Se excluyen deliberadamente:

- `node_modules/`, porque se reconstruye con `npm install`.
- `dist/`, `.next/`, `.vinext/` y `.wrangler/`, porque son resultados o estados locales regenerables.
- Historial y credenciales de Git.
- Backups de trabajo y archivos temporales.
- Variables de entorno y secretos.
- Registros de D1 y objetos de R2 del sitio publicado.

Si el objetivo es crear una copia independiente con sus propias fotos, exporta o migra D1 y R2 por separado y reemplaza el `project_id` mediante el flujo oficial de creación de un nuevo sitio.
