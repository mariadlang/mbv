# Arquitectura de información vigente

**Estado:** actualizado el 2026-09-16. La reorganización no cambia esquemas, repositories, permisos ni fuentes de verdad.

## Cinco destinos conceptuales

| Destino | Ruta base | Contenido relacionado |
| --- | --- | --- |
| Inicio | `/app/dashboard` | Lectura agregada y próximos pasos. |
| Mi día | `/app/today` | Ejecución y registros del día. |
| Planificar | `/app/planning` | Visión, metas, horizonte, mes y semana. |
| Mi espacio | `/app/life-hub` | Sistemas personales: hábitos, tareas, diario, bienestar, finanzas, bandeja y herramientas. |
| Progreso | `/app/progress` | Evidencias y lectura de avance. |

Los mismos cinco destinos aparecen en desktop, tablet y móvil. En escritorio, **Bienestar** —la entrada a Fitness y alimentación— y Finanzas se muestran como shortcuts secundarios asociados a Mi espacio; no son categorías principales equivalentes. Bienestar respeta el gate Premium `fitness_and_nutrition`.

## Navegación de la landing

La portada editorial conserva `/` como ruta y usa navegación interna accesible por anchors: `#inicio`, `#como-funciona`, `#que-incluye`, `#beneficios`, `#planes` y `#faq`. La barra desktop y el menú móvil exponen los cinco anchors de navegación (`como-funciona`, `que-incluye`, `beneficios`, `planes`, `faq`); el logo vuelve a `inicio` y el footer enlaza cuatro (`como-funciona`, `que-incluye`, `planes`, `faq`). Trial, Login, páginas legales y el producto protegido continúan como rutas independientes.

## Inventario de rutas

| Ruta | Propósito vigente |
| --- | --- |
| `/app/dashboard` | Inicio. |
| `/app/today` | Mi día. |
| `/app/vision`, `/app/goals` | Vistas de Planificar. |
| `/app/planning`, `/app/planning/weekly` | Planificación y plan semanal. |
| `/app/life-hub` | Resumen de Mi espacio; los tabs internos conservan contenido previo. |
| `/app/tasks`, `/app/habits`, `/app/journal`, `/app/learn`, `/app/more` | Módulos de Mi espacio. |
| `/app/health` | Fitness y alimentación; acceso secundario Premium protegido por `fitness_and_nutrition`. |
| `/app/finance` | Finanzas; acceso secundario de Mi espacio. |
| `/app/progress` | Progreso. |
| `/app/help`, `/app/support`, `/app/settings` | Utilidades globales. |
| `/app/legal`, `/app/privacy-center` | Privacidad y cuenta. |
| `/platform` | Plataforma privada, sólo superadmin. |

## Compatibilidad

- `/app/challenges` redirige al tab de retos de Mi espacio.
- `/app/mood` redirige a Hábitos.
- `/app/life-hub/fitness` redirige a `/app/health`.
- `/app/profile`, `/app/pqr` y `/admin` conservan sus redirects.
- Query params, hash, refresh y deep links deben mantenerse.

## Reglas

- Una ruta sólo activa una categoría principal.
- Mi espacio permite llegar en una interacción a Hábitos, Proyectos y tareas, Diario y notas, Bienestar (Fitness y alimentación), Finanzas, Bandeja y Más herramientas; Bienestar aplica su gate Premium.
- “Hoy” puede usarse como fecha o adverbio; el nombre del destino es “Mi día”.
- La interfaz española usa “Revisión semanal” y “Vida soñada”; no mezcla “Weekly Reset” o “Dream Life”.
- El flujo de datos continúa `feature → usePlanner → plannerService → PlannerRepository`.

El documento anterior que situaba Fitness en `/app/life-hub/fitness`, llamaba “Plan” al destino o usaba “Weekly Reset” se considera reemplazado por esta versión.
