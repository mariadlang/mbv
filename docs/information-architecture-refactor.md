# Arquitectura de información vigente

**Estado:** vigente desde P1. La reorganización no cambia esquemas, repositories, permisos ni fuentes de verdad.

## Cinco destinos conceptuales

| Destino | Ruta base | Contenido relacionado |
| --- | --- | --- |
| Inicio | `/app/dashboard` | Lectura agregada y próximos pasos. |
| Mi día | `/app/today` | Ejecución y registros del día. |
| Planificar | `/app/planning` | Visión, metas, horizonte, mes y semana. |
| Mi espacio | `/app/life-hub` | Sistemas personales: hábitos, tareas, diario, bienestar, finanzas, bandeja y herramientas. |
| Progreso | `/app/progress` | Evidencias y lectura de avance. |

Los mismos cinco destinos aparecen en desktop, tablet y móvil. En escritorio, Bienestar y Finanzas se muestran como shortcuts secundarios asociados a Mi espacio; no son categorías principales equivalentes.

## Inventario de rutas

| Ruta | Propósito vigente |
| --- | --- |
| `/app/dashboard` | Inicio. |
| `/app/today` | Mi día. |
| `/app/vision`, `/app/goals` | Vistas de Planificar. |
| `/app/planning`, `/app/planning/weekly` | Planificación y plan semanal. |
| `/app/life-hub` | Resumen de Mi espacio; los tabs internos conservan contenido previo. |
| `/app/tasks`, `/app/habits`, `/app/journal`, `/app/learn`, `/app/more` | Módulos de Mi espacio. |
| `/app/health` | Bienestar y Fitness; acceso secundario de Mi espacio. |
| `/app/finance` | Finanzas; acceso secundario de Mi espacio. |
| `/app/progress` | Progreso. |
| `/app/help`, `/app/support`, `/app/settings` | Utilidades globales. |
| `/app/legal`, `/app/privacy-center` | Privacidad y cuenta. |
| `/platform` | Plataforma privada, sólo superadmin. |

## Compatibilidad

- `/app/challenges` redirige al tab de retos de Mi espacio.
- `/app/mood` redirige a Hábitos.
- `/app/life-hub/fitness` redirige a `/app/health`.
- `/app/feed` redirige a `/app/health`; no implica que Feed Hub se comercialice.
- `/app/profile`, `/app/pqr` y `/admin` conservan sus redirects.
- Query params, hash, refresh y deep links deben mantenerse.

## Reglas

- Una ruta sólo activa una categoría principal.
- Mi espacio permite llegar en una interacción a Hábitos, Proyectos y tareas, Diario y notas, Bienestar, Finanzas, Bandeja y Más herramientas.
- “Hoy” puede usarse como fecha o adverbio; el nombre del destino es “Mi día”.
- La interfaz española usa “Revisión semanal” y “Vida soñada”; no mezcla “Weekly Reset” o “Dream Life”.
- El flujo de datos continúa `feature → usePlanner → plannerService → PlannerRepository`.

El documento anterior que situaba Fitness en `/app/life-hub/fitness`, llamaba “Plan” al destino o usaba “Weekly Reset” se considera reemplazado por esta versión.
