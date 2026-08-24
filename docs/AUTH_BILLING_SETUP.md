# Autenticación, trial, Premium y superadmin

## Responsabilidades

- IndexedDB conserva el planner y su contenido personal en el dispositivo.
- Supabase Auth gestiona cuentas, verificación de correo y recuperación de contraseña.
- `public.profiles` conserva sólo identidad mínima, rol y estado de acceso.
- La función `ensure_user_access()` inicia el trial en el primer acceso autenticado con correo verificado y calcula su estado con `now()` del servidor.
- Mercado Pago abre un checkout externo. Regresar desde el checkout no activa Premium.

## Configuración de Supabase

1. Crea o selecciona un proyecto de Supabase.
2. Ejecuta `supabase/migrations/202608230001_accounts_access.sql` en el editor SQL o mediante Supabase CLI.
3. En Authentication, activa Email/Password y exige confirmación de correo.
4. Agrega las URLs de la app y de previews a Redirect URLs. Las rutas usadas son `/verify-email` y `/login?reset=1`.
5. Copia la URL pública y la anon key en las variables descritas por `.env.example`.
6. Nunca expongas la service-role key en el navegador, GitHub o Vercel.

La migración reconoce `maria.delosangelesgtg@gmail.com` sólo dentro de la función segura de creación de perfiles. El frontend nunca usa el correo para autorizar el panel; `/admin` y las operaciones RPC comprueban el rol almacenado por el servidor.

## Trial y capacidades

- Duración: 15 días desde el primer acceso verificado.
- Base durante trial: planner, hábitos, bienestar, finanzas, fitness, proyectos, retos y planeación hasta tres meses.
- Premium: añade Feed Hub y planeación a cinco años.
- Estados `expired` y `blocked` no reciben acceso al planner.
- Las reglas puras están en `src/domain/access.ts`; la fuente autoritativa del tiempo es `server_now` devuelta por Supabase.

## Activación Premium

El panel superadmin llama a `admin_set_premium()`. La función vuelve a verificar el rol, modifica la cuenta objetivo y crea una fila en `access_audit_log`.

No hay webhook falso. Para automatizar Mercado Pago en una siguiente fase, implementa un endpoint servidor que valide la firma de Mercado Pago y adapte `BillingRepository`; no aceptes parámetros del navegador como prueba de pago.

## Variables de despliegue

Configura en cada entorno:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_MERCADO_PAGO_URL` (opcional si se usa el enlace predeterminado)

Después de configurar variables, vuelve a desplegar y valida registro → correo verificado → primer acceso → trial → upgrade.
