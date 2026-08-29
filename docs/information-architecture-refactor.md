# Refactor de arquitectura de información

## Alcance y restricciones

Este cambio reorganiza navegación, jerarquía y composición visual. No cambia esquemas, repositorios, APIs, permisos ni fuentes de verdad. Todos los componentes siguen el flujo `feature -> usePlanner -> plannerService -> PlannerRepository`.

## Auditoría de rutas y dependencias

| Ruta existente | Feature actual | Datos/acciones principales | Destino en la nueva arquitectura |
| --- | --- | --- | --- |
| `/app/dashboard` | `DashboardPage` | snapshot completo, reglas de metas, hábitos, finanzas y planificación | Inicio |
| `/app/today` | `TodayPage` | tareas, hábitos, journal, ánimo, entrenamiento y nutrición | Hoy |
| `/app/vision` | `VisionPage` | áreas de vida y visión | Plan > Visión |
| `/app/goals` | `GoalsPage` | metas, hitos y tareas vinculadas | Plan > Metas; resumen analítico en Progreso |
| `/app/planning` | `PlanningPage` | planes en cascada, calendario, tareas y revisiones | Plan > Año/Mes |
| `/app/planning/weekly` | `PlanningPage` (`week`) | prioridades, tareas, braindump y Weekly Reset | Plan > Semana |
| `/app/tasks` | `TasksPage` | tareas, proyectos y checklist | Plan > Tareas y proyectos; ejecución resumida en Hoy |
| `/app/habits` | `HabitsPage` | hábitos, registros, ánimo y bienestar | Progreso > Consistencia/Bienestar; estado diario en Hoy |
| `/app/progress` | `ProgressPage` | cálculos existentes de metas, hitos, tareas y hábitos | Progreso > Resumen |
| `/app/journal` | `JournalPage` | journal y reflexiones | Mi espacio > Diario |
| `/app/finance` | `FinancePage` | cuentas, presupuesto, transacciones, fondos y deudas | Mi espacio > Finanzas |
| `/app/life-hub` | `LifeHubPage` | braindump/listas, rutinas, retos, vision board y eventos | Mi espacio > Notas/Braindump/Recursos |
| `/app/life-hub/fitness` | `FitnessPage` | entrenamientos, comidas, macros y check-ins | Hoy (resumen) y Mi espacio (detalle personal) |
| `/app/learn` | `LearnPage` | recursos y aprendizajes | Mi espacio > Recursos |
| `/app/help`, `/app/support` | `HelpPage`, `SupportPage` | ayuda y soporte | Utilidad global Centro de ayuda |
| `/app/settings`, `/app/privacy-center`, `/app/legal` | ajustes y privacidad | perfil, respaldo, preferencias y derechos | Utilidad global Ajustes/Perfil |
| `/platform` (`/admin`) | `PlatformPage` | administración remota con permisos existentes | Utilidad Superadmin condicional |

## Relaciones reutilizadas

- Metas -> hitos/tareas: `calculateGoalProgress` y vínculos `goalId` existentes.
- Plan -> mes/semana/día: `CascadePlan`, `weeklyPlanningInsight` y vistas internas existentes de `PlanningPage`.
- Hábitos -> consistencia: días programados + `habitLogs`; los días no programados no cuentan.
- Hoy -> ejecución: fecha local desde `src/lib/dates.ts`, tareas y eventos fechados, hábitos programados, `workoutLogs`, `nutritionLogs`, `moodLogs` y journal.
- Finanzas -> resumen: `calculateFinanceSummary`, respetando moneda y modo privado existentes.
- Mi espacio -> captura personal: `journalEntries`, `brainDumpItems`, `routines`, `visionBoardItems`, `events` y recursos.

## Componentes reutilizables

- `AppShell`, `BrandMark`, `Card`, `ProgressBar`, `SectionHeading`, `Badge`, `Button`, `EmptyState`.
- Páginas feature existentes y sus formularios; no se duplican editores.
- `usePlanner` como única interfaz de lectura/escritura del planner.
- Reglas puras existentes en `src/domain` para progreso, finanzas, consistencia y sugerencias.

## Arquitectura objetivo

- **Inicio**: lectura agregada semanal/mensual, metas, consistencia, bienestar, eventos, áreas y atajos.
- **Hoy**: intención, Top 3, progreso diario, timeline, hábitos, nutrición, ánimo y cierre.
- **Plan**: subnavegación hacia Visión, Metas, Año, Mes, Semana, Calendario y tareas/proyectos.
- **Progreso**: subnavegación hacia Resumen, Metas, Consistencia, Bienestar y Estadísticas.
- **Mi espacio**: subnavegación hacia Diario, Notas, Braindump, Finanzas y Recursos; mantiene rutinas, retos, vision board, eventos y Fitness.
- **Utilidades**: Centro de ayuda, Ajustes, Superadmin condicional y Perfil.

## Rutas conservadas

Todas las rutas auditadas permanecen válidas. Los aliases previos (`/app/challenges`, `/app/mood`, `/app/feed`, `/admin`) mantienen sus redirects. La reorganización cambia únicamente sus puntos de acceso y contexto visual.
