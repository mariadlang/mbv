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

- Respetar los tokens semánticos definidos en `src/styles/`; los aliases históricos de `src/styles/tokens.css` son sólo compatibilidad y no deben usarse en código nuevo.
- Nunito Sans es la única tipografía vigente para títulos, cuerpo, controles y marca digital; no reincorporar Cormorant Garamond ni DM Sans.
- Conservar navegación de escritorio y navegación inferior móvil.
- Todos los controles necesitan nombre accesible, foco visible y estados vacíos útiles.
- Lucide React es el sistema iconográfico principal. El saludo `👋` de Mi día es una excepción aprobada, no un sistema alternativo.

## Lenguaje e internacionalización

- Español es canónico; el selector EN permanece visible, operativo y marcado como Beta hasta que exista una decisión comercial explícita distinta.
- Todo copy nuevo usa claves estables de `src/i18n/messages`; no añadir frases a `src/i18n/translations.ts`.
- Fechas, números, moneda y plurales usan `src/i18n/formatters.ts`.
- Nunca traducir contenido de usuaria ni texto legal sin revisión. Marcar límites legacy con `data-no-translate`, `translate="no"` o `data-i18n-explicit` según corresponda.
- Ejecutar `pnpm audit:i18n` y `pnpm audit:design-tokens` junto con las validaciones del cambio.

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
