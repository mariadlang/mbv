# Weekly Recap

## Propósito

La revisión semanal ayuda a reconocer qué ocurrió y elegir qué merece espacio después. Es una extensión del flujo de revisión semanal existente, no una pantalla paralela de rendimiento.

## Fuente de datos

Sólo puede usar el snapshot local de la cuenta activa y la semana visible:

- tareas elegidas, abiertas, completadas o reprogramadas;
- prioridades seleccionadas;
- hábitos programados y registros para esos días;
- hitos/metas movidos cuando el dominio los relacione de forma explícita;
- revisión guardada por la usuaria.

No infiere emociones, intención, productividad ni calidad de la semana. Una ausencia de registros se presenta como información abierta, nunca como fallo.

## Estructura

1. **Así se vio tu semana:** periodo y contexto.
2. **Esto sí avanzó:** hechos completados.
3. **Tu ritmo:** consistencia sólo sobre días programados y con denominador visible.
4. **Quedó abierto:** campos para registrar decisiones textuales de mover, conservar o soltar. El recap no muta pendientes directamente; esas acciones viven en Regreso amable.
5. **¿Qué merece espacio ahora?:** campos de la revisión existente.
6. **Preparar mi semana:** vuelve al plan semanal siguiente.

## Reglas de producto

- Omitir y cerrar siempre son posibles.
- Guardar utiliza la entidad de revisión existente.
- Compartir, si está habilitado, recibe únicamente un modelo sanitizado seleccionado por la usuaria.
- La revisión escrita es privada y nunca se envía a analytics.
- `weekly_recap_viewed` y `weekly_recap_completed` contienen sólo periodo/surface/result tokenizados.

## Aceptación

- Las cifras coinciden con el snapshot y la semana visible.
- Los hábitos no programados no reducen consistencia.
- No aparece una segunda revisión duplicada.
- El CTA abre la semana a preparar.
- Teclado, foco, cierre, móvil y reduced motion funcionan.
