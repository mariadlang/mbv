# Arquitectura

My Best Version es una SPA local-first servida por vinext. Las pantallas se agrupan por feature y sólo conocen un controlador de aplicación (`usePlanner`). El hook delega operaciones a `plannerService`; el servicio aplica reglas, genera identificadores y conversa con la interfaz `PlannerRepository`. El adaptador actual implementa esa interfaz con Dexie e IndexedDB.

```text
features/components
        ↓
    usePlanner
        ↓
  plannerService
        ↓
PlannerRepository
        ↓
Dexie / IndexedDB
```

La instantánea `PlannerSnapshot` es el contrato de lectura de la interfaz. Las escrituras son operaciones explícitas del servicio y siempre devuelven una instantánea actualizada. React Router gestiona rutas bajo `/app/*`; el catch-all de vinext permite recargar URLs profundas.

## Módulos

- `app/`: entrada, metadatos, router y estilos globales.
- `src/features/`: dashboard, hoy, planificación, hábitos, metas, progreso, journal, ajustes y onboarding.
- `src/domain/`: entidades, reglas puras y datos demo explícitos.
- `src/services/`: casos de uso y orquestación.
- `src/repositories/`: contrato y adaptador de persistencia.
- `src/lib/`: fechas y esquemas de validación.
- `tests/` y `e2e/`: pruebas de reglas, backup y recorrido crítico.
