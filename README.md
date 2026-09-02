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

## Publicar

```bash
npm run build
```

La carpeta `dist` se publica en cualquier hosting estático (Vercel, Netlify, Cloudflare Pages). Debe servirse por HTTPS: la cámara y la instalación como app lo exigen. Configura el hosting para que toda ruta devuelva `index.html`.

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
