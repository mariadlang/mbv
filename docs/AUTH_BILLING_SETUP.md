# Autenticación, trial, Premium y superadmin

## Responsabilidades

- IndexedDB conserva el planner y su contenido personal en el dispositivo.
- Supabase Auth gestiona cuentas, verificación de correo y recuperación de contraseña.
- `public.profiles` conserva sólo identidad mínima, rol y estado de acceso.
- La función `ensure_user_access()` inicia el trial en el primer acceso autenticado con correo verificado y calcula su estado con `now()` del servidor.
- Mercado Pago abre un checkout externo. Regresar desde el checkout no activa Premium y ningún estado del frontend se acepta como confirmación de pago.

## Configuración de Supabase

1. Crea o selecciona un proyecto de Supabase.
2. Ejecuta `supabase/migrations/202608230001_accounts_access.sql` en el editor SQL o mediante Supabase CLI.
3. En Authentication, activa Email/Password y exige confirmación de correo. El enlace mágico utiliza el mismo proveedor de correo.
4. Activa Google en Authentication → Providers y configura el Client ID y Client Secret de Google Cloud. Añade a Google la callback URL que muestra Supabase.
5. Agrega las URLs de la app y de previews a Redirect URLs. Las rutas usadas son `/verify-email`, `/login?reset=1` y `/app/dashboard`.
6. Copia la URL pública y la publishable/anon key en las variables descritas por `.env.example`.
7. Nunca expongas la secret/service-role key en el navegador, GitHub o Vercel.

La migración reconoce `maria.delosangelesgtg@gmail.com` sólo dentro de la función segura de creación de perfiles. El frontend nunca usa el correo para autorizar el panel; `/admin` y las operaciones RPC comprueban el rol almacenado por el servidor.

## Trial y capacidades

- Duración: 15 días desde el primer acceso verificado.
- Base durante trial: planner, objetivos, hábitos, tareas, progreso, journal, finanzas, proyectos, retos y planificación hasta tres meses.
- Premium disponible hoy: Fitness y alimentación mediante `fitness_and_nutrition`, además de planificación a cinco años mediante `five_year_planning`.
- El gate Premium de `/app/health` no sustituye el consentimiento sensible: `FitnessPage` exige `sensitive_wellness` antes de habilitar registros de entrenamiento, alimentación o medidas.
- No disponible todavía: análisis avanzado del progreso, recomendaciones con IA y planificación específica de un año. La landing las etiqueta como **Próximamente**; no existe un gate que las habilite.
- Para cuentas no-superadmin, los estados `expired` y `blocked` no reciben acceso al planner. El rol `superadmin` conserva su bypass explícito incluso en esos estados.
- Las reglas puras están en `src/domain/access.ts`; la fuente autoritativa del tiempo es `server_now` devuelta por Supabase.

## Activación Premium

El panel superadmin llama a `admin_set_premium()`. La función vuelve a verificar el rol, modifica la cuenta objetivo y crea una fila en `access_audit_log`.

La oferta visible es **USD 2.99 al mes** o **USD 30.99 al año**. Landing y Upgrade solicitan la misma URL a `billingService`; `MercadoPagoBillingRepository` la toma de `publicConfig.mercadoPagoCheckoutUrl`, centralizada en `NEXT_PUBLIC_MERCADO_PAGO_URL` con un fallback público único. El selector mensual/anual cambia copy y telemetría, pero no envía el periodo al proveedor ni genera una URL o preferencia distinta.

No hay webhook falso. Para automatizar Mercado Pago en una siguiente fase, implementa un endpoint servidor que valide la firma de Mercado Pago y adapte `BillingRepository`; no aceptes parámetros del navegador como prueba de pago. El frontend actual sólo abre el checkout y emite telemetría consentida: no activa Premium.

Fitness, alimentación y el resto del contenido detallado del planner continúan en IndexedDB local. El nivel de acceso no mueve esos registros a Supabase ni los sincroniza entre dispositivos.

## Variables de despliegue

Configura en cada entorno:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (preferida para proyectos nuevos)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (compatibilidad con proyectos antiguos)
- `NEXT_PUBLIC_MERCADO_PAGO_URL` (opcional si se usa el enlace predeterminado)

Después de configurar variables, vuelve a desplegar y valida registro → correo verificado → primer acceso → trial → upgrade.

## Límites comerciales pendientes

El repositorio sí comunica precio, moneda y periodos comerciales: USD 2.99/mes y USD 30.99/año. Todavía no define de forma jurídica impuestos, renovación, cancelación, reembolsos ni manejo de pagos pendientes, rechazados o devueltos. No presentes el flujo como activación autoservicio hasta implementar webhook, verificación de firma y conciliación idempotente con Mercado Pago. La documentación técnica no sustituye las condiciones de venta.
