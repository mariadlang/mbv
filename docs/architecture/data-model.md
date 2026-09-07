# Modelo de datos

La aplicación normaliza en IndexedDB las colecciones del contenido personal. Además de `profiles`, `lifeAreas`, `goals`, `milestones`, `habits`, `habitLogs`, `tasks`, `moodLogs` y `journalEntries`, el esquema 3 incluye proyectos, planes y revisiones, finanzas, listas, rutinas, eventos, vision board, fitness, nutrición, medidas, retos y compras pendientes. La lista autoritativa está en `PlannerSnapshot` dentro de `src/domain/planner.ts` y en las tablas de `IndexedDbPlannerRepository`.

- Un perfil conserva preferencias, intención diaria y estado de onboarding.
- Las áreas de vida agrupan metas y hábitos.
- Una meta puede medir progreso manual, numérico, por tareas o por hitos ponderados.
- Un hábito declara tipo, objetivo, unidad y días programados; cada registro usa la clave lógica hábito + fecha local.
- Las tareas pueden vincularse a una meta y tener estado `inbox`, `pending`, `completed` o `cancelled`.
- Mood y journal son registros fechados e independientes.

`PlannerSnapshot` reúne las colecciones para lectura. `BackupEnvelope` añade versión, fecha de exportación y payload para permitir migraciones futuras.

Fuera de `PlannerSnapshot`, las migraciones de `supabase/` modelan identidad mínima, acceso, preferencias, consentimientos, solicitudes de privacidad, soporte, eventos minimizados y configuración de plataforma. No constituyen una copia remota del planner local.
