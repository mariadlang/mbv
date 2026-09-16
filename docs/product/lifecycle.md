# Lifecycle y recuperación

**Estado:** especificación y reglas locales listas. No existe envío externo de email, push ni marketing en P2.

## Modelo operativo

Las reglas tipadas viven en `src/domain/lifecycle.ts`. Cada mensaje define trigger, canal futuro, preferencia, CTA, cooldown y máximo por ventana. La evaluación usa únicamente identificadores técnicos de trigger y timestamps; no acepta contenido del planner.

Preferencias preparadas:

- producto: mensajes transaccionales y de uso esencial;
- recordatorios: decisiones voluntarias de planificación;
- resumen semanal: recap o revisión;
- novedades: actualizaciones editoriales;
- marketing: campañas, siempre además con consentimiento.

Producto está activo por defecto; las cuatro categorías opcionales están desactivadas por defecto.

## Matriz

| Momento | Trigger | Mensaje base | CTA | Máximo |
| --- | --- | --- | --- | --- |
| Bienvenida | cuenta creada | Tu espacio ya está listo. Empecemos por una sola cosa. | Elegir mi primera acción | 1 por cuenta |
| Primer día | primera acción disponible | Hoy puede empezar con una acción que sí tenga sentido para ti. | Ir a Mi día | 1 / 30 días |
| Primera semana | primera semana transcurrida | Ya hay una primera semana para mirar con calma. | Revisar mi semana | 1 / 30 días |
| Fin de trial | ventana próxima a terminar | Tu prueba está por terminar. Puedes revisar qué incluye cada opción antes de decidir. | Ver mis opciones | 2 / 14 días, 72 h |
| Premium | pago confirmado | Tu pago fue confirmado y Premium ya está activo en tu espacio. | Ver mi suscripción | trigger exacto deduplicado |
| Regreso | retorno elegible | Qué bueno tenerte por aquí. Veamos qué sigue teniendo sentido. | Retomar con calma | 1 / 7 días |
| Revisión semanal | semana lista | Tu semana está lista para una revisión breve, cuando quieras. | Revisar mi semana | 1 / 7 días |
| Revisión mensual | mes listo | Ya puedes mirar el mes y elegir qué merece espacio ahora. | Revisar el mes | 1 / 28 días |
| Logro | hito completado | Esto sí avanzó. Puedes reconocerlo sin convertirlo en una exigencia. | Ver mi progreso | 2 / 7 días, 24 h |
| Pago | confirmado, pendiente o fallido | Explica el estado, sin urgencia falsa. | Ver suscripción/pago | 1–2 por trigger |
| Cancelación/renovación | estado confirmado por servidor | Confirma qué cambió y hasta cuándo aplica. | Ver mi suscripción | trigger exacto deduplicado; 4 cancelaciones/año y 12 renovaciones/año |
| Soporte | respuesta disponible | Hay una respuesta disponible para tu solicitud. | Ver respuesta | 3 / 7 días, 8 h |
| Contraseña | solicitud explícita | Usa el enlace únicamente si tú lo solicitaste. | Restablecer contraseña | 3 / día, 1 h |

## Reglas de privacidad y consentimiento

- Marketing requiere preferencia activa y consentimiento válido; una sola condición no basta.
- Estado emocional, baja energía, salud, comida, peso, finanzas, diario y texto libre jamás son triggers comerciales.
- La deduplicación utiliza una `triggerKey` técnica, no contenido personal.
- Contraseña, soporte y pagos son transaccionales, no se reutilizan para marketing.
- Antes de incorporar un proveedor, se debe definir retención, supresión, exportación y baja.

## Frequency cap

Orden de evaluación: preferencia → consentimiento de marketing → trigger duplicado → cooldown → máximo dentro de ventana. Un rechazo no genera otro mensaje. Los tests cubren default opt-in/opt-out, duplicación y ventana móvil.

## Trabajo aplazado

Persistir preferencias en servidor, diseñar la UI del centro de preferencias, verificar direcciones, gestionar rebotes, implementar unsubscribe firmado y conectar un proveedor. Ninguno debe activarse por completar esta especificación.
