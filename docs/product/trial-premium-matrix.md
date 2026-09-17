# Matriz de trial, Premium y acceso

## Hechos de producto vigentes

- La prueba dura **15 días**.
- No requiere tarjeta.
- No tiene cobro automático.
- Comienza con el primer acceso después de verificar el correo.
- Permite planificación en un horizonte de hasta **tres meses calendario**: el mes de inicio y los dos siguientes.
- Premium cuesta **USD 2.99 al mes** o **USD 30.99 al año**.
- Fitness y alimentación y la planificación a cinco años están disponibles con Premium.
- El análisis avanzado del progreso, las recomendaciones con IA y la planificación específica de un año están **Próximamente** y no están disponibles.
- El contenido detallado del planner permanece local en el dispositivo.
- El checkout se abre fuera de la aplicación mediante Mercado Pago.
- El checkout no activa Premium desde el frontend.

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
| Ánimo y bienestar cotidiano | Sí | Sí | Registros opcionales y locales fuera del módulo Premium de Fitness |
| Finanzas | Sí | Sí | Sin conexión bancaria |
| Planificación a cinco años | No | Sí | Feature gate `five_year_planning` |
| Fitness y alimentación | No | Sí | `/app/health`, protegido por `fitness_and_nutrition`; después del gate exige consentimiento `sensitive_wellness`; entrenamiento, comidas/macros y medidas/fotos permanecen locales |
| Análisis avanzado del progreso | No | No | `coming_soon`; la landing no lo presenta como activo |
| Recomendaciones con IA | No | No | `coming_soon`; no hay recomendaciones automatizadas disponibles |
| Planificación específica de un año | No | No | `coming_soon`; no confundir con vistas de calendario o planificación existentes |

La lista pública Premium disponible hoy se limita a “Todo lo incluido durante la prueba”, “Fitness y alimentación” y “Planificación de 5 años”. Las tres capacidades en preparación se distinguen visual y verbalmente como no disponibles.

## Estados de acceso

| Estado | Acceso | Comunicación esperada |
| --- | --- | --- |
| `trial` | Producto protegido disponible dentro de la prueba; Fitness/alimentación y cinco años bloqueados | Mostrar días restantes y explicar el límite de tres meses |
| `active` | `fitness_and_nutrition` y `five_year_planning` habilitadas | Identificar como Premium y separar lo disponible de lo próximo |
| `expired` | Producto protegido bloqueado para cuentas no-superadmin | Explicar que la prueba terminó, que los datos locales no se borraron y ofrecer revisar Premium |
| `blocked` | Producto protegido bloqueado para cuentas no-superadmin | Explicar que el acceso necesita revisión y dirigir a soporte; los datos locales permanecen |
| `superadmin` | Bypass Premium y del bloqueo `expired`/`blocked` | Uso administrativo, no una oferta comercial |

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
- `PlannerApp` aplica `PremiumFeatureGate` a `/app/health` con la feature `fitness_and_nutrition`; `superadmin` conserva el bypass definido por las reglas de dominio. Después del acceso Premium, `FitnessPage` exige el consentimiento sensible `sensitive_wellness` antes de mostrar o registrar datos.
- Las capacidades marcadas `coming_soon` no forman parte de `PremiumFeature`, no tienen ruta ni gate de acceso y no deben inferirse por tener una tarjeta en la landing.
- Para cuentas no-superadmin, los estados `expired` y `blocked` se resuelven antes de montar el producto protegido en `app/PlannerApp.tsx`; el bypass de `superadmin` se evalúa primero.

## Flujo actual de Mercado Pago

1. Landing y Upgrade solicitan la URL a la misma instancia de `billingService`.
2. `MercadoPagoBillingRepository` devuelve `publicConfig.mercadoPagoCheckoutUrl`, resuelta una sola vez desde `NEXT_PUBLIC_MERCADO_PAGO_URL` o desde el fallback público configurado.
3. “Activar Premium” en la landing y “Continuar con My Best Version” en Upgrade abren el checkout en una pestaña externa.
4. Con consentimiento analítico, la landing registra `premium_checkout_click`; Upgrade emite `premium_checkout_click` y `checkout_started`.
5. Volver a My Best Version no cambia `access_status` ni `subscription_status`.
6. No existe webhook ni endpoint de confirmación de pago.
7. Premium sólo puede habilitarse actualmente mediante una operación administrativa autorizada y auditada.

El selector mensual/anual de la landing sólo cambia precio visible y telemetría. Ambas opciones comparten el mismo `checkoutUrl`: no se envía el periodo al proveedor ni se genera una preferencia de pago diferenciada.

`payment_confirmed` está reservado como evento de servidor. No debe emitirse desde el cliente ni considerarse implementado hasta validar firma, importe, moneda, estado e idempotencia del proveedor.

## Decisiones comerciales y técnicas pendientes

- Impuestos, renovación, cancelación, reembolsos y descuentos.
- Gestión de pagos pendientes, rechazados o devueltos.
- Webhook de Mercado Pago y validación criptográfica de firma.
- Conciliación idempotente con el perfil y auditoría de acceso.
- Condiciones jurídicas y operativas de los periodos mensual y anual comunicados.

El precio, la moneda y los periodos sí están definidos por la matriz comercial vigente; no debe inferirse desde ellos ninguna de las condiciones pendientes anteriores.
