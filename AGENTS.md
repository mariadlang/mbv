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

## Documentación y continuidad del proyecto

- Comenzar cada mensaje de colaboración con la línea exacta `CANARY: MARY`.
- Al comenzar una tarea, leer estas instrucciones, `docs/proyecto/README.md`, `docs/proyecto/ESTADO_ACTUAL.md` y las entradas recientes o relevantes de `docs/proyecto/HISTORIAL.md`.
- Verificar siempre la documentación contra la rama, el código y `git status`; registrar cambios verificables posteriores sin duplicarlos ni atribuirse trabajo ajeno.
- Consultar el código antes de tratar documentación antigua como verdad vigente.
- Durante tareas largas, mantener una sola entrada en curso y registrar decisiones, cambios de alcance, bloqueos, intentos descartados y avances significativos.
- Antes de terminar una tarea con cambios, revisar el diff, completar su entrada en `HISTORIAL.md` y actualizar `ESTADO_ACTUAL.md` si cambió el funcionamiento, las decisiones, los pendientes o el punto de continuidad.
- Registrar fecha real, impacto de producto, archivos, pruebas ejecutadas y no ejecutadas, riesgos y estado de commit, push y deploy. No presentar propuestas ni pruebas parciales como trabajo terminado.
- No borrar historia anterior, crear historiales paralelos ni generar entradas recursivas por actualizar la propia documentación. Una consulta sin cambios o decisiones nuevas no requiere entrada.
- Entregar la documentación junto con el cambio e indicar en la respuesta final qué documentos se actualizaron.
