# Estado actual de My Best Version

Última revisión: **2026-09-07, America/Bogota (UTC-05:00)**.

## Punto de continuidad

- Repositorio real: `C:/Users/maria/Documents/Codex/2026-08-10/a-web-app-para-my-best`.
- Rama: `main`, con upstream `origin/main`.
- SHA anterior a esta entrega: `b58d8f5c0424ee272e46fabe80f08bb36af29a6f` (`feat: complete action-first planning and habits experience`).
- `main` y `origin/main`: alineados al preparar la entrega del 2026-09-07.
- Historial: completo/no superficial, 61 commits alcanzables, dos raíces históricas y sin tags.
- Entrega: los cambios de `MBV-H-020` y `MBV-H-021` se consolidan en `main`, se envían a `origin/main` y se publican en el Site existente el 2026-09-07.

Este documento describe el estado consolidado mediante `MBV-H-020` y `MBV-H-021` de [`HISTORIAL.md`](HISTORIAL.md), publicado sobre el Site existente de My Best Version.

## Qué es el producto

My Best Version es una aplicación de productividad y desarrollo personal que conecta una dirección de vida con metas, resultados mensuales, semanas, acciones diarias, hábitos y reflexión. Su lenguaje de producto es sereno y no punitivo: los días no programados no reducen la constancia y los estados vacíos deben permitir avanzar sin culpa.

El acceso usa cuenta remota, pero el contenido detallado del planner continúa local-first en el navegador. Esta distinción es esencial:

- **Supabase/remoto:** identidad, verificación de email, acceso/trial/Premium, rol, preferencias, consentimientos, solicitudes de privacidad, soporte, eventos minimizados y plataforma privada.
- **IndexedDB/local:** perfil de uso del planner, áreas, metas, hitos, hábitos, tareas, proyectos, planes, journal, finanzas, rutinas, eventos, vision board, fitness, nutrición, medidas, retos y compras pendientes.

No existe sincronización del contenido del planner entre dispositivos.

## Experiencia implementada

### Entrada, cuenta y onboarding

- Landing y páginas públicas de cuenta, trial, upgrade, recuperación y verificación.
- Registro/login con Supabase, además de Google y enlace mágico cuando el proveedor está configurado.
- Consentimientos obligatorios separados y marketing opcional.
- Trial de 15 días, estados de acceso y capacidades Premium calculados mediante reglas de dominio y funciones Supabase.
- Onboarding en cuatro pasos que parte de `Mi día`, `Una meta`, `Mi semana` o `Un hábito`, pide un resultado y una primera acción, y aterriza en Mi día.
- Una cuenta ya establecida recupera un perfil local mínimo si falta y evita repetir el onboarding. Borrar explícitamente los datos locales permite volver al estado inicial.
- Importación de respaldo disponible desde el onboarding.

### Navegación vigente

- Cinco destinos principales: **Inicio, Mi día, Planificar, Mi espacio y Progreso**.
- Desktop muestra además **Bienestar** y **Finanzas** en el lateral.
- Mobile conserva exactamente los cinco destinos principales en la barra inferior; el menú y Más herramientas exponen utilidades adicionales.
- Rutas antiguas se conservan como redirects: `/app/challenges`, `/app/mood`, `/app/life-hub/fitness`, `/app/feed`, `/app/profile`, `/app/pqr` y `/admin`.

### Inicio y Mi día

- Inicio agrega prioridades, metas, hábitos, planificación, bienestar y próximos pasos.
- Mi día muestra la siguiente acción, Top 3, agenda por fecha, tareas, entrenamientos, comidas, eventos, hábitos, ánimo/energía, intención y cierre diario.
- La captura rápida reutiliza el mismo drawer desde distintas procedencias.
- El cierre diario local actualiza una única entrada `Cierre del día` por fecha.
- La cabecera de Hoy muestra nuevamente `Buenos días, {nombre} 👋`, restaurado por solicitud expresa.
- Mood/energía usa `TodayMoodCard` en Hoy y Hábitos y conserva un único registro diario.

### Planificación, metas, proyectos y tareas

- Visión y áreas de vida conectan con metas.
- Las metas soportan progreso manual, numérico, por tareas o hitos ponderados.
- Planificación dispone de vistas año, mes, semana, día y revisión; siempre muestra los doce meses del año elegido.
- Los planes incluyen horizontes de cinco años/Premium, tres años, mensual y semanal.
- Un mes puede conservar intención, prioridades, áreas, acciones, eventos, reflexión y procedencia de una meta.
- La ruta semanal usa una lista vertical de lunes a domingo con prioridades derivadas de las mismas tareas, creación rápida por día, hábitos recurrentes, edición y cambio de fecha, y un panel de pendientes sin fecha que permite asignar sin duplicar entidades.
- Brain Dump conserva su conversión idempotente a tarea dentro del panel de pendientes y la revisión semanal se abre en modal sin ocupar espacio permanente.
- Tareas pueden enlazar meta, proyecto y plan; Top 3 se expresa mediante `focusPriority`.
- Proyectos aparecen antes de tareas y admiten checklist.
- El flujo Meta → resultado mensual → semana → Mi día → Progreso tiene cobertura E2E.

### Hábitos, progreso y journal

- Hábitos booleanos, de cantidad o duración; recurrencia diaria, días laborables, personalizada o sólo una fecha.
- Progreso parcial medible y edición del hábito.
- Constancia y mejor racha cuentan únicamente días programados.
- Progreso reúne evidencia de metas, hitos, tareas y hábitos.
- Journal admite entrada libre, gratitud y revisiones; el contenido permanece local.
- La entrada rápida del Journal exige contenido en el working tree actual.

### Mi espacio y herramientas

- Bandeja/Brain Dump con listas, edición, fecha flexible/mes/día y conversión idempotente a tarea.
- Rutinas editables, Retos embebidos, Tablero de visión y Calendario/eventos.
- Más herramientas enlaza Bienestar, Finanzas, Rutinas, Retos, Tablero visual, Calendario, Ayuda, Aprende y Ajustes.
- `LearnPage`, Centro de ayuda y modal global de desbloqueo ofrecen orientación no punitiva.

### Bienestar y Finanzas

- Bienestar (`/app/health`) incluye autorización de datos sensibles, entrenamiento, comidas/macros y medidas/fotos locales.
- Entrenamiento admite fuerza con ejercicios o cardio/deporte sin ejercicios individuales obligatorios.
- Comidas pueden crearse, copiarse y eliminarse; el working tree actual añade confirmación y feedback al borrar.
- Finanzas incluye cuentas, categorías, presupuesto mensual, movimientos, fondos, deudas, recurrentes, revisión y compras pendientes.
- No hay conexión bancaria ni asesoría médica/nutricional automatizada.

### Legal, soporte y plataforma

- Centro legal público para privacidad, tratamiento, cookies, pagos, retracto, IA, proveedor, seguridad y PQR.
- Centro de privacidad autenticado con consentimientos y solicitudes.
- Soporte acepta sugerencias, bugs y mensajes de cuenta mediante rutas API autenticadas.
- Eventos propios usan una taxonomía cerrada y excluyen textos de metas, journal, comidas, salud y finanzas.
- `/platform` exige superadmin y ofrece métricas, usuarios, tickets, FAQ, categorías y parámetros respaldados por Supabase.
- Mercado Pago es un enlace externo; volver del checkout no activa Premium.

## Mapa de conexiones

```text
Supabase Auth → useAccount → gate legal/acceso → aplicación protegida

Feature UI → usePlanner → plannerService → PlannerRepository → Dexie/IndexedDB
   Meta ─┬→ resultado mensual → semana → tarea fechada → Mi día
         └→ hitos/tareas/progreso manual → evidencia en Progreso
   Hábito → habitLogs ────────────────→ Hoy/Hábitos/Progreso
   Mood ──────────────────────────────→ Hoy/Hábitos
   Workout + Nutrition + Events ─────→ Bienestar/Hoy
   Brain Dump ─→ conversión a tarea ─→ Semana/Mi día
   Cierre diario ─────────────────────→ Journal

Token de cuenta → rutas API → Supabase
   ├→ soporte/FAQ
   ├→ preferencias de marketing
   ├→ eventos minimizados
   └→ plataforma superadmin
```

## Ubicaciones clave

- `app/PlannerApp.tsx`: gates, composición global y rutas.
- `src/components/layout/AppShell.tsx`: navegación desktop/mobile y utilidades.
- `src/features/`: pantallas por módulo.
- `src/features/tasks/QuickCaptureDrawer.tsx`: captura transversal.
- `src/features/planning/WeeklyPlanView.tsx`: composición y operaciones del plan semanal.
- `src/hooks/usePlanner.ts`: controlador de UI para el planner local.
- `src/services/plannerService.ts`: casos de uso y mutaciones.
- `src/repositories/interfaces/PlannerRepository.ts`: contrato local sustituible.
- `src/repositories/local/IndexedDbPlannerRepository.ts`: Dexie, tablas y transacciones.
- `src/domain/planner.ts`: entidades y `PlannerSnapshot` esquema 3.
- `src/domain/`: reglas puras de progreso, fechas, acceso, finanzas, fitness y orientación.
- `src/hooks/useAccount.tsx` y `src/repositories/supabase/`: cuenta y datos remotos mínimos.
- `app/api/`: soporte, eventos, marketing y plataforma.
- `supabase/migrations/`: esquema remoto y políticas RLS.
- `tests/` y `e2e/app.spec.ts`: pruebas unitarias y recorridos completos.
- `app/globals.css`: tokens y sistema visual global.

## Tecnologías e integraciones verificadas

- Next.js 16.2.6, React 19.2.6 y TypeScript 5.9.3.
- React Router 7 para navegación cliente.
- Dexie 4/IndexedDB para planner local.
- React Hook Form y Zod para formularios, archivos y backups.
- Zustand para preferencias de interfaz.
- Recharts y Lucide.
- Supabase JS para Auth y datos remotos mínimos.
- Mercado Pago mediante enlace externo configurable.
- Vitest, Testing Library y Playwright.
- Vercel como runtime principal configurado; Vinext/Cloudflare Sites como destino adicional explícito.
- GitHub Actions para lint, typecheck, unit y build; E2E en pull requests.

## Ejecución y comprobaciones

Requisitos declarados: Node.js 22.13 o superior y pnpm 11.16.

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

- `pnpm dev`, `pnpm build` y Playwright usan Next.js.
- `pnpm dev:vinext` y `pnpm build:vinext` corresponden al destino adicional.
- E2E usa `NEXT_PUBLIC_MBV_E2E_ACCESS=1` y repositorio Auth simulado; no prueba una cuenta real de producción.

## Decisiones vigentes

- Conservar el flujo obligatorio feature → `usePlanner` → `plannerService` → `PlannerRepository`.
- Mantener el contenido sensible del planner local hasta una decisión explícita de sincronización.
- No presentar datos demo como reales; su carga debe ser voluntaria.
- No penalizar días no programados en la constancia.
- Mantener cinco destinos principales en mobile y navegación desktop accesible.
- Usar español claro, foco visible, nombres accesibles y estados vacíos útiles.
- Validar imports y formularios con Zod; no registrar contenido sensible en consola o eventos.
- No considerar una tarea con cambios completa sin actualizar `HISTORIAL.md` y, si aplica, este archivo.

## Validación conocida

En las sesiones del 2026-09-04 al 2026-09-07, sobre el SHA base más las correcciones locales:

- ESLint: aprobado.
- TypeScript: aprobado.
- Unitarias: 69 aprobadas.
- Build de producción: aprobado.
- Suite E2E completa anterior: 56/56 aprobada antes de restaurar el emoji del saludo.
- Después de restaurarlo: ESLint/TypeScript aprobados y matriz responsive E2E 2/2 en proyectos desktop/mobile.
- Tras implementar Plan semanal opción B: lint, TypeScript, 69 unitarias y build aprobados.
- Los recorridos específicos del plan semanal aprobaron en desktop y mobile, incluida su matriz en 390×844, 430×932, 768×1024, 1440×900 y 1488×992.
- La suite E2E global ejecutó 57/60 en paralelo; dos casos externos aprobaron al reintentarse de forma aislada. La matriz global desktop restante fue interrumpida por `ERR_NETWORK_IO_SUSPENDED` del entorno, mientras su equivalente mobile y la matriz específica semanal aprobaron.
- Viewports cubiertos por la matriz: 375×812, 390×844, 430×932, 768×1024, 1366×768 y 1440×900.

Estas comprobaciones no demuestran la configuración real de Supabase, migraciones, Google, Mercado Pago, correo ni variables legales en producción.

## Problemas y limitaciones confirmados

1. El planner no sincroniza entre dispositivos; borrar datos del sitio puede eliminar el contenido local si no existe respaldo.
2. Mercado Pago no tiene webhook de activación automática; Premium se habilita mediante operación administrativa segura.
3. No se verificó que todas las migraciones Supabase ni los datos legales del responsable estén configurados en producción.
4. La auditoría legal enumera tareas administrativas y revisión jurídica pendientes; el cálculo SQL inicial de días hábiles no integra festivos colombianos.
5. `AdminPage.tsx`, `FeedHubPage.tsx` y `MoodPage.tsx` no tienen ruta activa actual; `LifeHubPage.tsx` conserva estado/render legado de Fitness que sus pestañas ya no seleccionan. Es deuda técnica, no autorización para refactorizar.
6. La matriz E2E global desktop no pudo cerrarse en esta sesión debido a una suspensión de red del runner; no produjo una aserción de producto y debe reintentarse cuando el entorno sea estable.

No quedó un defecto funcional bloqueante reproducible dentro de los flujos auditados localmente.

## Entrega vigente y siguiente paso

La entrega del 2026-09-07 incluye carga global, estilos, E2E, Dashboard, Bienestar, Diario, Hoy y la vista semanal de Planificación. La documentación incluida afecta `AGENTS.md`, README, documentos de arquitectura, la actualización del ADR local-first, el enlace de compatibilidad y esta carpeta.

La revisión documental final confirmó cobertura de los 61 commits, enlaces locales válidos, referencias Git válidas, ausencia de valores con forma de credencial, `git diff --check` limpio y ningún cambio staged.

Siguiente paso documentado: validar el Site publicado con datos reales de la cuenta y reintentar la matriz E2E global desktop cuando la conectividad del runner sea estable.
