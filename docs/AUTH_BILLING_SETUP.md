# Autenticación, acceso comercial y facturación

Estado de esta guía: núcleo comercial publicado desde `7fba6e9` y migración `202609190001_commercial_access_v2.sql` aplicada en Supabase Production. La facturación permanece desactivada mientras falten plan comercial de hosting, credenciales y validación sandbox. Resend, el transporte live y su validación local ya están preparados; la cola se auditó vacía y el único correo controlado fue confirmado como `Delivered`. Queda pendiente publicar el commit final que activa el transporte regular.

## Responsabilidades y fuentes de verdad

- Supabase Auth autentica la cuenta; las operaciones comerciales exigen sesión y correo verificado.
- Supabase conserva identidad mínima, rol, actividad comercial por día, elegibilidad, concesiones, intents de checkout, suscripciones, pagos, eventos del proveedor, alertas y outbox de email.
- IndexedDB conserva el contenido detallado del planner. No se envía ese contenido a la capa comercial.
- `src/domain/access.ts` centraliza capacidades y estados efectivos.
- `public.ensure_user_access()` calcula el acceso usando hora del servidor, período pagado vigente y concesión promocional vigente.
- Mercado Pago es la pasarela detectada. El importe, moneda, intervalo, identidad del intent y URLs se crean en servidor.
- Un retorno a `/upgrade?billing=confirming` nunca activa Premium. La app consulta `/api/billing/status`; el acceso cambia sólo después de reconciliar datos canónicos del proveedor.
- La cola cliente de participación pertenece a un `userId`; sólo se reintenta al volver a autenticar esa misma cuenta. La cola legacy sin propietario se elimina en vez de atribuirla por inferencia.

## Oferta vigente

- Gratis: USD 0, sin vencimiento y sin tarjeta obligatoria.
- Premium mensual: USD 2.99, almacenado como `299` centavos.
- Premium anual: USD 29.99, almacenado como `2999` centavos.
- Mensual y anual habilitan las mismas capacidades.
- La recompensa por constancia concede una sola vez 30 días completos de Premium después de 30 fechas locales consecutivas y activación manual de un superadmin. No crea una suscripción ni un cobro.

La matriz detallada está en [`product/trial-premium-matrix.md`](product/trial-premium-matrix.md).

## Migración Supabase

La migración revisable es `supabase/migrations/202609190001_commercial_access_v2.sql`.

Es forward-only y:

- conserva Premium y trials legacy vigentes;
- convierte en Gratis las cuentas sin acceso previo vigente;
- no inventa actividad histórica;
- fija la zona horaria de la campaña al primer día registrado;
- deduplica un día por cuenta, campaña y fecha local;
- exige rol `superadmin` en servidor y confirmación `ACTIVAR_TRIAL_30_DIAS` para conceder la recompensa;
- usa un advisory lock transaccional común por cuenta, restricciones únicas y claves de deduplicación para serializar actividad, activación, acceso, checkout y conciliación;
- conserva el período pagado frente a eventos fallidos, retrasados o cancelación programada;
- impide consumir la recompensa mientras haya checkout/suscripción abierta y revalida `conflict_paid_premium` cuando termina el conflicto, sin concesión consumida ni acceso pagado/legacy vigente;
- sólo permite cerrar un checkout `ready` stale después de confirmar en el proveedor un estado terminal que corresponde exactamente al intent;
- separa un fallo de correo del acceso comprado.

Para aplicarla en un entorno nuevo o repetir una validación representativa:

1. Crear un backup verificable del proyecto remoto.
2. Ejecutar lint/dry-run de Supabase y revisar que sólo aparezca esta migración.
3. Aplicarla primero en un proyecto de prueba con cuentas y credenciales sandbox.
4. Validar las RPC, RLS y el flujo completo antes de promover el mismo artefacto.

No se incluye un `down` destructivo. Si la aplicación debe retroceder, primero restaura de forma forward-only los contratos anteriores de `handle_new_user()` y `ensure_user_access()` a partir de la migración previa; conserva las tablas y evidencia nuevas hasta definir una política de retención. No elimines datos comerciales para revertir una versión de frontend.

## Variables de entorno

Cliente/autenticación existentes:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` o el fallback `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Servidor:

- `APP_BASE_URL`: origen oficial HTTPS del entorno; sólo se admite HTTP para localhost.
- `SUPABASE_SERVICE_ROLE_KEY`: sólo servidor.
- `CRON_SECRET`: secreto de al menos 32 caracteres para mantenimiento.
- `ADMIN_NOTIFICATION_EMAIL`: opcional; crea destinatario de alertas, no un administrador.
- `MERCADO_PAGO_BILLING_MODE`: debe ser exactamente `subscription_auto` para habilitar nuevas compras.
- `MERCADO_PAGO_ACCESS_TOKEN`: credencial del mismo entorno que los eventos.
- `MERCADO_PAGO_WEBHOOK_SECRET`: firma Webhook, mínimo 32 caracteres.
- `RESEND_API_KEY`: credencial server-only creada por la integración de Resend; nunca debe exponerse con prefijo `NEXT_PUBLIC_`.
- `RESEND_EMAIL_DOMAIN`: dominio verificado que el servidor usa para construir o validar el remitente transaccional.
- `TRANSACTIONAL_EMAIL_ENABLED`: kill switch server-only; sólo el valor exacto `1` podrá habilitar el drenaje del outbox una vez que el transporte haya sido validado.

En Vercel, `RESEND_API_KEY` y `RESEND_EMAIL_DOMAIN` están registradas como secretos y limitadas a **Production** del proyecto. No deben copiarse a Preview o Development sin una decisión y una necesidad de prueba explícitas.

No existe `NEXT_PUBLIC_MERCADO_PAGO_URL`: el enlace público anterior fue retirado para evitar que dos intervalos compartan una URL sin identidad, importe o conciliación confiables.

## Checkout y webhook de Mercado Pago

`POST /api/billing/checkout`:

- autentica la cuenta;
- acepta sólo `monthly` o `annual`;
- resuelve precio y USD desde el catálogo del servidor;
- crea/reutiliza un intent idempotente;
- evita abrir otro checkout mientras exista una compra o suscripción no resuelta;
- si encuentra un intent `ready` stale, consulta la preapproval canónica: reutiliza el checkout mientras siga no terminal y sólo lo cierra mediante RPC service-role cuando el proveedor confirma un estado terminal y coinciden referencia, catálogo e identidad;
- crea `/preapproval` sólo si `MERCADO_PAGO_BILLING_MODE=subscription_auto` fue elegido expresamente;
- deriva `back_url` y `notification_url` desde `APP_BASE_URL`;
- valida que la URL de checkout pertenezca a Mercado Pago.

`POST /api/billing/mercado-pago/webhook` valida firma y ambiente, limita el body, deduplica el evento, consulta el recurso canónico en Mercado Pago y compara referencia, precio, moneda, estado y período. Ignora cambios obsoletos y nunca concede acceso por una URL de retorno, checkout abierto o pago pendiente.

`POST /api/billing/subscription/cancel`:

- exige sesión y la confirmación cerrada `CANCELAR_RENOVACION`;
- busca la suscripción con service role filtrando por `user_id` y vuelve a validar el checkout que originó el identificador del proveedor;
- usa un lease estable por suscripción para que reintentos o doble clic no generen operaciones concurrentes;
- consulta el `preapproval`, comprueba `external_reference` y sólo entonces envía a Mercado Pago `PUT /preapproval/{id}` con `status: canceled`;
- vuelve a leer el recurso canónico y lo pasa por la misma conciliación del webhook;
- mantiene Premium hasta `current_period_end` si existe un pago aprobado vigente, y sólo detiene renovaciones futuras;
- responde sin IDs internos del proveedor y “Mi plan” refresca el estado autenticado.

La cancelación es semánticamente idempotente: si ya está programada localmente o Mercado Pago ya informa estado final, no emite otro `PUT`. Un fallo entre el proveedor y la conciliación queda recuperable mediante el lease/evento fallido. La interfaz de “Suscripciones y pagos” expone la operación y sus estados. No se ha ejecutado contra sandbox porque no hay credenciales válidas en este worktree.

Para sandbox, configura la URL HTTPS del preview al crear la suscripción y habilita los tópicos de Suscripciones/Pagos que correspondan a las credenciales de prueba. No reutilices secretos entre test y producción.

## Mantenimiento programado

Vercel invoca una vez al día, a las 05:07 UTC (00:07 en Colombia), `GET /api/billing/maintenance`. Esta frecuencia es compatible con el plan Hobby actual. El endpoint exige `Authorization: Bearer $CRON_SECRET`, ejecuta mantenimiento idempotente, vence concesiones, finaliza cancelaciones al llegar su paid-through y deja auditado el estado de email. La aplicación también recalcula el acceso al abrir una sesión; el cron no sustituye la reconciliación del proveedor.

## Email transaccional

Las plantillas HTML responsive y texto plano cubren alerta administrativa de elegibilidad, activación/finalización de recompensa, bienvenida del primer pago, renovación, pago pendiente/manual, pago fallido y cancelación.

El outbox registra `generated`, `queued`, `accepted`, `delivered`, `failed` y `superseded`, con lease, reintentos y deduplicación. Los avisos `renewal_pending` tienen una espera inicial de 15 minutos; al reclamar una fila se vuelve a comprobar inmediatamente antes del efecto externo si sigue siendo pertinente. Un pago aprobado sustituye las filas pendientes/encoladas/fallidas asociadas y la revalidación marca `superseded` sin invocar el transporte.

La integración gratuita de Vercel Marketplace aprovisionó el recurso `mbv-transactional-email`. Resend muestra `mybestversion.life` como **Verified** y listo para enviar, y Vercel confirma las dos variables server-only en Production. El adaptador live usa la clave de idempotencia del outbox, remitente `hola@mybestversion.life`, respuesta/soporte `soporte@mybestversion.life`, renderer canónico y errores estables sin PII. La configuración es fail-closed: las credenciales por sí solas no drenan el outbox; además requiere `TRANSACTIONAL_EMAIL_ENABLED=1`. Antes de habilitarlo se auditó la cola productiva con resultado `0` pendientes. La prueba aislada usó el mismo renderer y transporte, no creó pagos ni filas de outbox, y Resend confirmó `Delivered` para el asunto acordado con prefijo `[PRUEBA]` y el aviso visible de ausencia de cargo. El acceso temporal de smoke se retiró del entorno y del código final. Nunca se presenta `accepted` como `delivered` sin evidencia del proveedor.

## Gates antes de habilitar cobros y correo en producción

- Migrar Vercel desde Hobby a un plan permitido para uso comercial.
- Decidir y autorizar expresamente la modalidad automática para nuevas compras.
- Confirmar que la cuenta Mercado Pago admite cobros en USD para Colombia y ambos intervalos.
- Configurar credenciales y firma sandbox; completar mensual, anual, pendiente, rechazo, cancelación y webhook duplicado/desordenado.
- Publicar el transporte live de Resend ya validado y comprobar que el cron regular queda fail-closed fuera de Production.
- Ejecutar una sola compra sandbox de Mercado Pago; el único email real autorizado ya fue entregado con asunto y aviso de prueba acordados, sin cargo ni mutación de pago.
- Repetir la migración y los contratos en un proyecto de prueba representativo antes de cualquier cambio comercial posterior.
- Realizar QA autenticado desktop/mobile y revisar logs antes de activar compras.

Hasta completar esos gates, los tests locales validan contratos y simulaciones, pero no certifican pagos ni entrega real de correo.

El 2026-09-19 se guardó un respaldo de los campos afectados de los perfiles, se aplicó la migración en Production y se verificaron tablas, RPC, estados y alta Gratis. El commit `7fba6e9` quedó en `origin/main` y Vercel Production `C8BgoZGgmU7K6j7TYztHNN7KcCh8` quedó `Ready`. Esto habilita la oferta Gratis y la campaña de constancia. Resend se certificó después mediante una única prueba entregada y sin cobro; Mercado Pago continúa apagado y el transporte regular sólo quedará operativo al publicar el commit final con la kill switch de Production.
