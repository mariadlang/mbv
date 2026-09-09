# Matriz de trial, Premium y acceso

## Hechos de producto vigentes

- La prueba dura **15 días**.
- No requiere tarjeta.
- No tiene cobro automático.
- Comienza con el primer acceso después de verificar el correo.
- Permite planificación en un horizonte de hasta **tres meses calendario**: el mes de inicio y los dos siguientes.
- La planificación a cinco años es Premium.
- El contenido detallado del planner permanece local en el dispositivo.
- El checkout se abre fuera de la aplicación mediante Mercado Pago.

## Capacidades

| Capacidad | Trial | Premium | Comportamiento y límite |
| --- | :---: | :---: | --- |
| Planificación mensual, semanal y diaria | Sí | Sí | El trial limita los meses editables |
| Horizonte de planificación de hasta tres meses | Sí | Sí | En Premium no aplica este límite |
| Visión y metas | Sí | Sí | No existe un límite Premium adicional documentado |
| Hábitos | Sí | Sí | Incluido |
| Diario y notas | Sí | Sí | Contenido local |
| Proyectos y tareas | Sí | Sí | Incluido |
| Progreso | Sí | Sí | Incluido |
| Bienestar | Sí | Sí | Datos sensibles opcionales y locales |
| Finanzas | Sí | Sí | Sin conexión bancaria |
| Planificación a cinco años | No | Sí | Feature gate `five_year_planning` |
| Feed Hub | No | Técnicamente sí | Feature `feed_hub`; no accesible desde la navegación actual y no comercializado como disponible |

La lista pública Premium se limita a “Todo lo incluido en la prueba” y “Planificación a 5 años”. Feed Hub no se añade hasta que exista acceso real y una decisión de producto aprobada.

## Estados de acceso

| Estado | Acceso | Comunicación esperada |
| --- | --- | --- |
| `trial` | Producto protegido disponible dentro de la prueba; cinco años y Feed Hub bloqueados | Mostrar días restantes y explicar el límite de tres meses |
| `active` | Capacidades Premium habilitadas | Identificar como Premium sin inventar modalidad comercial |
| `expired` | Producto protegido bloqueado | Explicar que la prueba terminó, que los datos locales no se borraron y ofrecer revisar Premium |
| `blocked` | Producto protegido bloqueado | Explicar que el acceso necesita revisión y dirigir a soporte; los datos locales permanecen |
| `superadmin` | Las comprobaciones de dominio lo consideran Premium | Uso administrativo, no una oferta comercial |

`subscription_status=pending` existe en el modelo remoto, pero el flujo actual de Mercado Pago no lo establece ni reconcilia automáticamente.

## Comportamiento de planificación mensual

- Un periodo debe usar el formato válido `YYYY-MM`.
- Para trial, `isTrialPlanningMonthAllowed` compara el periodo con el mes calendario local de `trialStartedAt`, igual que las claves de fecha del planner.
- `isTrialPlanningDateAllowed` y `getTrialPlanningDateBounds` aplican ese mismo calendario local a fechas diarias y semanales, incluida la captura rápida.
- Un mes vacío fuera del horizonte muestra un estado bloqueado y el CTA “Desbloquear Premium”.
- Un plan ya existente fuera del horizonte puede consultarse en modo solo lectura. La vista conserva las actividades guardadas históricamente y las tareas o eventos enlazados, y evita presentar copias equivalentes como registros distintos.
- El bloqueo evita crear, editar, asignar, reprogramar o guardar acciones, eventos y planes fuera del límite desde las vistas mensual, semanal y diaria o desde la captura rápida; no elimina tareas, eventos ni planes locales.

## Feature gates

- La fuente de verdad vive en `src/domain/access.ts`.
- `PremiumFeatureGate` reutiliza el copy de cada feature y registra `premium_gate_viewed` cuando existe consentimiento.
- `PlanningPage` aplica el gate de cinco años y las vistas mensual, semanal y diaria reutilizan el límite del trial. `QuickCaptureDrawer` y `usePlanner` vuelven a validar las fechas para que una entrada alternativa no omita la regla de dominio.
- Los estados `expired` y `blocked` se resuelven antes de montar el producto protegido en `app/PlannerApp.tsx`.

## Flujo actual de Mercado Pago

1. `billingService` solicita la URL a `MercadoPagoBillingRepository`.
2. La URL procede de `NEXT_PUBLIC_MERCADO_PAGO_URL` o del fallback público configurado en el repositorio.
3. “Continuar en Mercado Pago” abre el checkout en una pestaña externa.
4. La aplicación registra `checkout_started` si existe consentimiento analítico.
5. Volver a My Best Version no cambia `access_status` ni `subscription_status`.
6. No existe webhook ni endpoint de confirmación de pago.
7. Premium sólo puede habilitarse actualmente mediante una operación administrativa autorizada y auditada.

`payment_confirmed` está reservado como evento de servidor. No debe emitirse desde el cliente ni considerarse implementado hasta validar firma, importe, moneda, estado e idempotencia del proveedor.

## Decisiones comerciales y técnicas pendientes

- Precio y moneda de la oferta.
- Periodicidad o duración del plan.
- Impuestos, renovación, cancelación, reembolsos y descuentos.
- Gestión de pagos pendientes, rechazados o devueltos.
- Webhook de Mercado Pago y validación criptográfica de firma.
- Conciliación idempotente con el perfil y auditoría de acceso.
- Momento y condiciones para hacer Feed Hub accesible.

No debe inferirse ninguna de estas condiciones desde el código actual.
