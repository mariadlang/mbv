# My Best Version — reglas del repositorio

## Producto

- Mantener una experiencia serena, personal y sin culpa.
- Usar español claro. Evitar lenguaje de castigo, rachas punitivas o gamificación agresiva.
- Los días no programados no reducen la constancia de un hábito.
- No presentar datos demo como datos reales; deben cargarse sólo por acción explícita.

## Arquitectura

- Flujo obligatorio: componente de feature → `usePlanner` → `plannerService` → `PlannerRepository`.
- Ningún componente accede directamente a Dexie, IndexedDB o APIs de almacenamiento.
- Las reglas de negocio puras viven en `src/domain`; las fechas locales en `src/lib/dates.ts`.
- Validar formularios y archivos importados con Zod.
- Mantener el repositorio local sustituible por un adaptador remoto futuro.

## Interfaz

- Respetar los tokens de `app/globals.css`: marfil, crema, carbón, rosa evolución, taupe, salvia y blush.
- Cormorant Garamond para títulos/editorial; DM Sans para interfaz.
- Conservar navegación de escritorio y navegación inferior móvil.
- Todos los controles necesitan nombre accesible, foco visible y estados vacíos útiles.

## Calidad

- Antes de entregar ejecutar lint, typecheck, pruebas unitarias, build y el flujo E2E principal.
- Añadir pruebas para cualquier regla de cálculo o migración de persistencia nueva.
- No registrar datos personales ni contenido del journal en consola.
