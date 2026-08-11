# Modelo de datos

La aplicación normaliza en IndexedDB estas colecciones: `profiles`, `lifeAreas`, `goals`, `milestones`, `habits`, `habitLogs`, `tasks`, `moodLogs` y `journalEntries`.

- Un perfil conserva preferencias, intención diaria y estado de onboarding.
- Las áreas de vida agrupan metas y hábitos.
- Una meta puede medir progreso manual, numérico, por tareas o por hitos ponderados.
- Un hábito declara tipo, objetivo, unidad y días programados; cada registro usa la clave lógica hábito + fecha local.
- Las tareas pueden vincularse a una meta y tener estado `inbox`, `pending`, `completed` o `cancelled`.
- Mood y journal son registros fechados e independientes.

`PlannerSnapshot` reúne las colecciones para lectura. `BackupEnvelope` añade versión, fecha de exportación y payload para permitir migraciones futuras.
