# Arquitectura

My Best Version es una aplicación React servida principalmente por Next.js y desplegable también mediante Vinext. El contenido detallado del planner es local-first. Las pantallas se agrupan por feature y sólo conocen un controlador de aplicación (`usePlanner`). El hook delega operaciones a `plannerService`; el servicio aplica reglas, genera identificadores y conversa con la interfaz `PlannerRepository`. El adaptador actual implementa esa interfaz con Dexie e IndexedDB.

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

La instantánea `PlannerSnapshot` es el contrato de lectura de la interfaz. Las escrituras son operaciones explícitas del servicio y siempre devuelven una instantánea actualizada. React Router gestiona rutas públicas y rutas bajo `/app/*`; el catch-all de Next/Vinext permite recargar URLs profundas.

La cuenta y las operaciones remotas usan capas separadas: `useAccount`/`authService` y repositorios Supabase para identidad y acceso; hooks y servicios específicos para privacidad, soporte y plataforma. Las rutas API vuelven a validar el token antes de acceder a Supabase. Estas capas no sustituyen `PlannerRepository` ni sincronizan el contenido personal del planner.

## Módulos

- `app/`: entrada, metadatos, router y estilos globales.
- `src/features/`: cuenta, onboarding, dashboard, hoy, planificación, hábitos, metas, progreso, journal, finanzas, bienestar, soporte, legal y plataforma.
- `src/domain/`: entidades, reglas puras y datos demo explícitos.
- `src/services/`: casos de uso y orquestación.
- `src/repositories/`: contratos y adaptadores locales, Supabase, HTTP, facturación y pruebas E2E.
- `src/lib/`: fechas y esquemas de validación.
- `app/api/`: endpoints autenticados para soporte, eventos, marketing y plataforma privada.
- `supabase/`: migraciones de cuenta, acceso, preferencias, legal, soporte y plataforma.
- `tests/` y `e2e/`: pruebas de reglas, backup y recorridos críticos en desktop y mobile.

Consulta el mapa vigente y el punto de continuidad en [`../proyecto/ESTADO_ACTUAL.md`](../proyecto/ESTADO_ACTUAL.md).
