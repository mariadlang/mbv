# Cierre funcional y UX — 2026-09-25

Esta entrega cierra los ocho hallazgos priorizados de la auditoría funcional y UX sin rediseñar el producto ni modificar integraciones externas. El contenido del planner continúa local-first y todos los cambios de persistencia son compatibles y no destructivos.

Estado de publicación: el commit funcional `ad0fa5d08c959f883dafd6d56123ee96920f5bf6` está en `origin/main`; CI, Vercel Production y el smoke final en escritorio/móvil aprobaron. Los identificadores y resultados completos están en [`validacion.md`](validacion.md).

## Estado de los hallazgos

| ID | Estado | Resultado |
| --- | --- | --- |
| F-001 | Resuelto | Una fecha importante con título exige un día real, muestra un error accesible y recibe el foco. Los registros antiguos incompletos siguen visibles como `Fecha pendiente`, pueden corregirse y ya no bloquean el detalle mensual. |
| F-002 | Resuelto | El formulario bloquea envíos concurrentes y el servicio hace idempotente cada acción mediante la identidad estable `(planId, actionKey)`. Títulos iguales siguen siendo tareas distintas y no se depuran duplicados históricos ambiguos. |
| F-003 | Resuelto | Las fechas sin hora permanecen como fechas locales y los timestamps se convierten con zona horaria antes de mostrarse. Se cubrieron la noche de Bogotá y el cambio de año. |
| F-004 | Resuelto | Los hábitos medibles distinguen ausencia, avance parcial y meta completada. Hábitos, Mi día y Semana muestran `4/10`, abren el editor compartido y conservan el avance tras navegar o recargar; eliminar exige una acción explícita con confirmación. |
| UX-001 | Resuelto | Los hábitos nuevos empiezan a medirse desde su fecha de creación y los días anteriores se muestran como `Sin seguimiento`. Los datos legacy sin fecha válida se conservan sin inventar una fecha ni bloquear el hábito. |
| UX-002 | Resuelto | `Planificar esta meta` conserva la meta de origen. Si el mes ya tiene otra relación, la persona debe vincular la meta, conservar el vínculo o elegir otro mes; cancelar no persiste cambios y la confirmación se deriva del plan realmente guardado. |
| UX-003 | Resuelto | Un proyecto con todas sus tareas hechas queda `Listo para cerrar`, no cerrado automáticamente. La persona puede confirmar el cierre, añadir una acción nueva o reabrir un proyecto completado. |
| UX-004 | Resuelto | La rueda distingue valores confirmados, pendientes y no evaluados. Reflexionar no confirma puntuaciones; sólo las puntuaciones confirmadas participan en radar, promedios e insights. Los valores legacy ambiguos se conservan como pendientes. |

## Decisiones de compatibilidad

- Los esquemas persistidos siguen aceptando fechas importantes históricas ausentes; la validación estricta se aplica al escribir datos nuevos.
- `planActionKey` se añade como identidad estable opcional. `taskId` se conserva como puente legacy sólo dentro del mismo plan.
- `trackingStartDate` es opcional. Una fecha inválida se trata como historial legacy sin inicio conocido, no como una barrera permanente.
- Un avance medible de cero se conserva como registro explícito; eliminar un registro es una operación separada.
- `scoresConfirmedAt` separa una valoración personal confirmada de valores iniciales o históricos ambiguos. No hay migración destructiva ni reinterpretación automática.
- Completar todas las tareas no cambia el estado del proyecto; el cierre sigue siendo una decisión explícita y reversible.

## Superficies afectadas

- Planificación mensual y continuidad Meta → Mes → Semana → Mi día → Progreso.
- Hábitos, Mi día, Plan semanal y cálculos de constancia/progreso.
- Proyectos y tareas.
- Visión, rueda de vida e insights Premium deterministas.
- Dominio, esquemas Zod, servicio del planner, i18n ES/EN, estilos y pruebas.

La evidencia de ejecución se registra en [`validacion.md`](validacion.md). La continuidad canónica del proyecto permanece en [`../../proyecto/ESTADO_ACTUAL.md`](../../proyecto/ESTADO_ACTUAL.md) y [`../../proyecto/HISTORIAL.md`](../../proyecto/HISTORIAL.md).
