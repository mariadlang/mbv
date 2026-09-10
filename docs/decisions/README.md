# Registro de decisiones de arquitectura

Estados permitidos: **propuesto**, **aceptado**, **reemplazado**, **histórico** y **rechazado**. El encabezado de cada ADR es la fuente de verdad; este índice facilita la navegación.

| ADR | Estado vigente | Alcance |
| --- | --- | --- |
| [0001](0001-local-first.md) | Aceptado | Cuenta remota y contenido detallado local-first. El requisito original de acceso sin cuenta fue reemplazado. |
| [0002](0002-layered-boundaries.md) | Aceptado | Límites UI → hooks → services → repositories. |
| [0003](0003-goal-progress.md) | Aceptado | Cálculo configurable de progreso de metas. |
| [0004](0004-habit-consistency.md) | Aceptado | Constancia sin castigo y días no programados excluidos. |
| [0005](0005-versioned-backups.md) | Aceptado | Respaldos versionados y validados. |
| [0006](0006-client-routing.md) | Aceptado | Navegación cliente y deep links bajo `/app`. |
| [0007](0007-design-system.md) | Reemplazado | ADR 0008 formaliza tipografía, tokens y capas; la dirección cromática se conserva como antecedente histórico. |
| [0008](0008-current-typography-system.md) | Aceptado | Nunito Sans como tipografía digital vigente. |

No se elimina un ADR reemplazado: conserva el contexto histórico y enlaza la decisión sucesora.
