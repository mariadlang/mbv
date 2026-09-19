# Matriz Gratis, Premium y recompensa por constancia

## Oferta vigente

| Capacidad | Gratis | Premium mensual | Premium anual | Nota |
| --- | :---: | :---: | :---: | --- |
| Visión | Sí | Sí | Sí | Crear y actualizar cuenta como día válido |
| Objetivos y metas | Sí | Sí | Sí | Se reutiliza el modelo existente |
| Hábitos y registro cotidiano | Sí | Sí | Sí | Registrar cuenta como día válido |
| Mi día / Daily Plan | Sí | Sí | Sí | Crear, actualizar o completar una acción cuenta |
| Dashboard básico | Sí | Sí | Sí | No incluye el análisis avanzado |
| Fitness y alimentación | No | Sí | Sí | Gate `fitness_and_nutrition`; conserva consentimiento sensible |
| Finanzas | No | Sí | Sí | Gate `finance`; sin conexión bancaria |
| Análisis avanzado del progreso | No | Sí | Sí | Evidencia de los últimos 30 días; vacío honesto sin datos |
| Recomendaciones para ti | No | Sí | Sí | Reglas deterministas basadas en datos disponibles; no se anuncia IA |

Precios: Gratis USD 0; Premium mensual USD 2.99; Premium anual USD 29.99. Las dos modalidades Premium incluyen exactamente las mismas funciones.

La planificación mensual, semanal y a largo plazo preexistente no se elimina. La planificación a cinco años conserva temporalmente su gate histórico Premium, pero no se usa como argumento de venta de la oferta nueva. La ubicación comercial definitiva de esos horizontes requiere una decisión separada.

## Recompensa por constancia

La recompensa no es un tercer plan ni comienza al registrarse:

`Gratis → 30 fechas consecutivas → alerta interna → revisión → activación manual → 30 días Premium`

Un día válido exige una acción autenticada guardada correctamente en una función Gratis. Abrir una pestaña, visitar la landing o ejecutar un proceso automático no cuenta. Se registra como máximo una fecha local por día con hora del servidor y la zona persistida/fijada para la campaña. Una ausencia reinicia la secuencia siguiente sin borrar datos ni el mejor progreso.

Al llegar a 30:

- la elegibilidad permanece mientras espera revisión;
- sólo un superadmin puede activar con confirmación explícita;
- el período comienza al activar y dura 30 días completos;
- existe una sola concesión por cuenta para `consistency-30-v1`;
- si ya hay Premium pagado o una compra/suscripción abierta, se registra/bloquea el conflicto sin tocar cobro ni consumir el beneficio;
- `conflict_paid_premium` se revalida al conciliar, ejecutar mantenimiento, recalcular acceso o intentar activar: vuelve a `eligible` sólo si ya no hay checkout/suscripción abierta, período pagado, concesión previa ni Premium legacy;
- finalizar la recompensa conserva datos y devuelve a Gratis salvo período pagado vigente.

## Estados efectivos

| Estado | Acceso y comunicación |
| --- | --- |
| `free` | Funciones Gratis; progreso de constancia visible cuando exista |
| `eligible` / `pending_activation` | Gratis; beneficio pendiente de revisión y activación |
| `trial_active` | Premium promocional hasta la fecha del servidor; sin cobro |
| `trial_expired` | Gratis; datos conservados; opción de contratar Premium |
| `paid_monthly` | Premium dentro del período mensual confirmado |
| `paid_annual` | Premium dentro del período anual confirmado |
| `payment_pending` | No concede Premium por sí solo |
| `payment_failed` | Conserva un período ya pagado hasta su fin; de otro modo Gratis |
| `cancellation_scheduled` | Premium hasta el final del período pagado; puede originarse en la cancelación autoservicio reconciliada con el proveedor |
| `subscription_ended` | Gratis salvo recompensa vigente |
| `legacy_premium` | Acceso histórico conservado; requiere conciliación administrativa futura |
| `blocked` | Bloqueo administrativo existente |
| `superadmin` | Bypass administrativo auditado; no es una oferta comercial |

Los estados `trial`, `active` y `expired` permanecen únicamente para compatibilidad con accesos anteriores. Un trial legacy vigente conserva sus fechas y limitaciones; la oferta pública nueva no lo promociona.

## Autoridad y límites

- `src/domain/access.ts` define la matriz y el acceso efectivo del cliente.
- Supabase es autoridad sobre elegibilidad, concesiones y facturación.
- Las rutas Premium locales están protegidas por el gate central; las APIs comerciales autentican y autorizan en servidor.
- La cancelación autoservicio verifica propiedad, usa idempotencia, vuelve a consultar Mercado Pago y conserva el paid-through canónico.
- Los checkout `ready` stale no se liberan por reloj solamente: se consulta el proveedor, se reutilizan si siguen abiertos y sólo se cierran con estado terminal e identidad coincidente.
- Las operaciones comerciales críticas por cuenta usan un advisory lock común para evitar carreras entre participación, recompensa y pago.
- La exportación completa de datos locales permanece disponible como derecho de portabilidad y recuperación. No concede ejecución de cálculos Premium.
- Como el planner detallado es local-first, el servidor recibe una señal autenticada sólo después de una mutación local satisfactoria, pero no puede demostrar por sí mismo el contenido de esa mutación. La cola local queda ligada al `userId` y no cruza eventos al cambiar de cuenta, pero este límite antiabuso debe resolverse con evidencia/sincronización server-side antes de usar la promoción con valor económico significativo.

## Estado operativo de esta implementación

La matriz describe el contrato implementado, publicado y migrado en Production desde el commit funcional `7fba6e9`. La oferta Gratis y sus gates están activos. La certificación externa de cobros y correo continúa bloqueada: faltan un plan de hosting apto para operación comercial, credenciales sandbox, soporte USD confirmado de Mercado Pago, una compra/cancelación controlada y un envío transaccional real autorizado. Hasta completar esos gates, la configuración de checkout y transporte de email permanece apagada.
