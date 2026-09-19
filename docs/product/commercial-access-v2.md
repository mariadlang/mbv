# Implementación comercial v2 — registro de cambio

Fecha: 2026-09-19
Rama de trabajo: `feat/commercial-access-v2`
Base: `5019a3b`
Estado: local, sin migración remota, push, cobros, correos reales ni deploy.

## Qué cambió

1. La oferta pública pasa a Gratis permanente y un único Premium mensual/anual.
2. La landing, `/trial`, `/upgrade`, legal y “Mi plan” usan USD 2.99/mes y USD 29.99/año, sin prometer una prueba inmediata.
3. Fitness/alimentación, Finanzas, análisis avanzado y recomendaciones se resuelven con una matriz de acceso central.
4. El progreso Premium ofrece patrones deterministas sobre datos reales y estados vacíos honestos; no afirma usar IA.
5. Las acciones válidas del planner notifican al endpoint comercial sólo después de guardarse localmente. La cola de reintento conserva el `userId` propietario, sólo se drena con esa misma cuenta autenticada y descarta la cola legacy sin propietario para evitar cruces entre cuentas compartidas en un navegador.
6. Supabase registra una fecha por día, calcula rachas de 30 fechas, crea elegibilidad/alerta y permite una única activación administrativa de 30 días.
7. El panel admin muestra período verificable, estado y confirmación explícita; el rol se valida de nuevo en la RPC.
8. El checkout se crea en servidor por intervalo, con catálogo en centavos, intent idempotente, URL del proveedor validada y prevención conservadora de duplicados. Un intent `ready` stale se contrasta con el estado canónico de Mercado Pago: se reutiliza si sigue abierto, y sólo se cierra/libera si el proveedor confirma un estado terminal y coinciden identidad, referencia, precio, moneda e intervalo.
9. El webhook verifica firma, consulta al proveedor y reconcilia estados/períodos sin confiar en la URL de retorno. Las rutas críticas por cuenta comparten un advisory lock transaccional para serializar actividad, activación promocional, checkout, acceso y conciliación.
10. “Mi plan” permite solicitar la cancelación autoservicio con confirmación explícita. El servidor revalida propiedad y referencia, cancela en Mercado Pago, vuelve a leer el recurso canónico y conserva Premium hasta el fin del período pagado confirmado.
11. La elegibilidad `conflict_paid_premium` se revalida cuando termina la relación de pago; si no existe suscripción abierta, período pagado, concesión consumida ni acceso legacy, vuelve a `eligible` sin consumir la recompensa.
12. Se añadieron outbox, plantillas, deduplicación y reintentos de email. `renewal_pending` espera 15 minutos y se revalida inmediatamente antes del envío; un pago aprobado lo marca `superseded`. El transporte live permanece deliberadamente bloqueado hasta configurarlo.
13. Vercel Cron queda preparado para mantenimiento diario autenticado a las 05:07 UTC, compatible con el plan Hobby actual.

## Archivos principales

- Dominio: `src/domain/access.ts`, `commercialOffer.ts`, `participation.ts`, `premiumInsights.ts`.
- UI: landing, cuenta/upgrade, `PlannerApp`, gates, progreso, ajustes, shell y admin.
- Servicios/repositorios: auth, admin, participación y billing.
- API: `app/api/commerce/activity` y `app/api/billing/**`.
- Servidor: `src/server/billing/**` y `src/server/email/**`.
- Datos: `supabase/migrations/202609190001_commercial_access_v2.sql`.
- Configuración: `.env.example` y `vercel.json`.

## Decisiones de seguridad

- El navegador nunca envía importe, moneda, usuario objetivo ni derecho Premium como autoridad.
- Premium pagado exige un pago aprobado con referencia, importe, moneda y período válidos obtenidos del proveedor.
- Eventos duplicados u obsoletos no duplican permisos ni correos.
- Las mutaciones comerciales críticas por cuenta se serializan en PostgreSQL; una activación promocional no puede consumir la concesión mientras exista una compra o suscripción abierta.
- Un checkout stale no se libera sólo por tiempo: requiere consultar el proveedor y confirmar un estado terminal con la identidad esperada.
- El retorno de checkout sólo muestra estado neutral y consulta el servidor.
- La recompensa no genera cobro y no puede activarse con un enlace GET.
- La cancelación autoservicio es autenticada, idempotente y conserva el paid-through confirmado por el proveedor.
- Un error de email no revierte acceso ni pago; un aviso `renewal_pending` deja de ser enviable cuando un pago aprobado lo sustituye.
- La dirección administrativa se configura aparte del rol y no concede privilegios.
- La cancelación usa `PUT /preapproval/{id}` con `status: canceled` sólo después de validar en servidor que suscripción, checkout y cuenta coinciden; después vuelve a leer el recurso canónico y lo reconcilia.

## Límites y bloqueos conscientes

- No hay credenciales sandbox de Mercado Pago, firma de webhook ni confirmación de soporte USD; no se ejecutó la compra real de prueba autorizada.
- Por esa misma ausencia de sandbox, la cancelación está cubierta por contratos y simulaciones locales, pero no se ha certificado contra una suscripción real del proveedor.
- No hay proveedor transaccional/remitente verificado; no se envió el correo real autorizado.
- La migración no se aplicó fuera del repositorio.
- La modalidad `subscription_auto` exige opt-in explícito por variable; no se eligió silenciosamente.
- Planner local-first limita la verificación server-side de que la señal de participación corresponde a contenido real.
- Un checkout stale se recupera automáticamente sólo cuando Mercado Pago responde y confirma su estado canónico. Si el proveedor no está disponible o el estado continúa abierto/no concluyente, se reutiliza o se bloquea conservadoramente; no se inventa un cierre local.
- No se han ejecutado cobros sandbox/reales ni una cancelación contra una cuenta real de Mercado Pago.
- No se ha enviado ningún email transaccional real al destinatario autorizado.
- No se hicieron commit, push ni deploy de esta rama.

## Evidencia local de cierre

- `pnpm test`: 61 archivos y 357 pruebas aprobadas.
- `pnpm lint`, `pnpm typecheck` y `pnpm build`: aprobados; el build Next.js generó las rutas comerciales y de facturación esperadas.
- Auditorías de i18n, tokens de diseño y contraste: aprobadas.
- E2E comercial focal: 8/8 en desktop y mobile para “Mi plan”, cancelación, activación administrativa, recompensa promocional y gates legacy.
- Matriz P2 de reflow: aprobada en 375×812, 390×844, 430×932, 768×1024, 1366×768 y 1440×900, en español/inglés y modos claro/oscuro.
- Panel comercial móvil: validado a 390×844 sin overflow horizontal y con activación explícita operable.
- Landing: inspeccionada en navegador a 1440×900 y 390×844, sin errores de página; precios, comparación, FAQ y recorrido de 30 días visibles.
- La migración compiló y sus carreras/recuperación se comprobaron en PostgreSQL embebido; esto no sustituye aplicarla y validarla en un proyecto Supabase de prueba.
- `pnpm build:vinext` queda `BLOCKED` localmente porque no están configuradas `NEXT_PUBLIC_SUPABASE_URL` ni `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; no se usaron valores ficticios para presentarlo como validado.

## Secuencia de validación previa a release

1. Aplicar migración y configurar secrets sólo en sandbox/preview.
2. Ejecutar mensual y anual, incluidos abandono, doble clic, rechazo, pendiente y cancelación.
3. Confirmar eventos `subscription_preapproval`, `subscription_authorized_payment` y `payment` con firma válida.
4. Validar que acceso y “Mi plan” cambian únicamente tras reconciliación.
5. Conectar el proveedor de email y procesar una sola prueba end-to-end al destinatario autorizado.
6. Ejecutar QA desktop/mobile autenticado, revisar logs y realizar backup.
7. Obtener aprobación antes de push, migración de producción o despliegue.
