# Garita Sur

Control de acceso para condominios de playa del sur de Lima. Una sola aplicación web instalable (PWA) con tres roles:

- **Residente** (celular): invitaciones con QR por WhatsApp, personal recurrente, vehículos, estado de cuenta, aprobación de visitas no anunciadas.
- **Vigilante** (tablet de garita): escaneo de QR, búsqueda por placa, nombre o lote, registro de ingreso y salida con foto, quién está dentro, funciona sin internet y sincroniza al volver.
- **Administración** (web): reglas de morosidad, padrón e importación desde CSV, bitácora completa exportable.

## Correr en la máquina (modo demo, sin backend)

```bash
npm install
npm run dev
```

Abre http://localhost:5173. Sin variables de entorno la app arranca en **modo demo** con datos ficticios guardados en el navegador. Para probar en un celular o tablet de la misma red, usa la dirección que Vite muestra como `Network`.

## Conectar la base real (Supabase)

1. Crea un proyecto en https://supabase.com (región South America). Plan gratuito suficiente para el piloto.
2. En **SQL Editor** ejecuta, en orden, `supabase/migrations/0001_tablas.sql`, `0002_seguridad.sql`, `0003_servicios.sql` y luego `supabase/seed.sql`.
3. En **Authentication > Providers > Email** deja activado el ingreso por correo. Para que el correo traiga un código además del enlace, en **Email Templates > Magic Link** incluye `{{ .Token }}` en el cuerpo.
4. Copia `.env.example` a `.env` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (Project Settings > API).
5. Arranca la app, entra con tu correo y luego crea tu perfil en la tabla `perfiles` con el uuid que aparece en **Authentication > Users** (ver ejemplos al final de `seed.sql`). El primer perfil debe ser `admin`.
6. Opcional: activa la extensión `pg_cron` y programa `limpiar_fotos()` y `vencer_pases()` cada noche (instrucciones en `0003_servicios.sql`).

## Demo pública

La demo (sin backend, con datos de ejemplo que viven en cada navegador) está publicada en https://nelson2206.github.io/garita-sur/ desde la rama gh-pages.
Para republicarla después de un cambio:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\publicar-pages.ps1
```

## Publicar

```bash
npm run build
```

La carpeta `dist` se publica en cualquier hosting estático (Vercel, Netlify, Cloudflare Pages). Debe servirse por HTTPS: la cámara y la instalación como app lo exigen. Configura el hosting para que toda ruta devuelva `index.html`.

## Qué incluye la app

**Propietario (celular)**
- Invitaciones con QR y vigencia, y creación masiva para eventos: se pega la lista de invitados y cada uno recibe su propio código.
- Credenciales recurrentes en tres grupos: familia frecuente, personal del hogar, y obra o contratistas con fecha de vencimiento.
- Aprobación o rechazo de visitas no anunciadas, con aviso del navegador cuando la app está instalada.
- Estado de cuenta, vehículos del lote y actividad del lote.

**Garita (tablet)**
- Turno con relevo: quién está de guardia, desde cuándo y qué novedades deja al siguiente.
- Libro de ocurrencias con notas e incidentes, con hora y autor.
- Escaneo de QR, código manual y búsqueda por placa, nombre o lote.
- Semáforo de estado de cuenta al validar, y constancia de aviso de privacidad cuando se toma foto.
- Aviso por WhatsApp al propietario en las visitas no anunciadas.
- Registro sin internet con sincronización al reconectar.

**Administración (web)**
- Resumen del día, padrón con importación desde CSV y estado de cuenta por lote.
- Usuarios: invitaciones por correo con rol y lote; la persona entra y su perfil se crea solo.
- Privacidad: aviso al visitante, cartel de zona vigilada para imprimir y borrado de fotos vencidas.
- Bitácora completa con el vigilante que registró cada movimiento, exportable a CSV.

### Límite conocido de los avisos

El aviso al propietario usa las notificaciones del navegador y solo llega con la app abierta o instalada en el dispositivo. Por eso la garita tiene siempre el botón de WhatsApp, que llega igual. Las notificaciones que llegan con la app cerrada necesitan un servidor de envío y quedan para después del piloto.

## Estructura

- `src/lib/data/` capa de datos: `local.ts` (demo en el navegador) y `supabase.ts` (nube con tiempo real).
- `src/lib/offline.ts` cola de registros de la garita sin internet.
- `src/lib/acciones.ts` registro de ingresos y salidas.
- `src/pages/` pantallas por rol. `src/components/` piezas comunes y lector de QR.
- `supabase/` esquema, políticas de seguridad por fila, función pública del pase y bucket privado de fotos.

## Privacidad (Ley 29733)

- Las fotos se guardan en un bucket privado y se muestran con enlaces temporales; `limpiar_fotos()` borra la referencia según la retención configurada (máximo 60 días).
- El documento del visitante se registra solo con sus últimos 4 dígitos.
- Sin biometría. Antes del piloto: inscribir el banco de datos en el RNPD, colocar el cartel de aviso en cada acceso y firmar el encargo de tratamiento con el proveedor de nube.
