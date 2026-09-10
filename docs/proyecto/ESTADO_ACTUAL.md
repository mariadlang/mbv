# Estado actual de My Best Version

Última revisión: **2026-09-10, America/Bogota (UTC-05:00)**.

## Punto de continuidad

- Repositorio real: `C:/Users/maria/Documents/Codex/2026-08-10/a-web-app-para-my-best`.
- Rama: `main`, con upstream `origin/main`.
- Base de la entrega P1: `8e6ede1995cef4656ef8b23cac3f04a98d4ebdf2` (`docs: record P0 production release`).
- `main` y `origin/main`: alineados en `8e6ede1` antes de comenzar P1.
- Historial en la base P1: completo/no superficial, 65 commits alcanzables, dos raíces históricas y sin tags.
- Entrega P0: `MBV-H-022` quedó consolidada en `5c5f5a0bfd342a4b731fa927f992d7233959006d`, enviada a `origin/main` y publicada como versión 27 de Sites.
- Entrega P1: `MBV-H-023` consolida tipografía, tokens, CSS, primitives, navegación, Mi espacio, i18n, lenguaje, gamificación amable, documentación y QA; está validada localmente y su SHA final se registra al cerrar el despliegue.

Este documento describe el estado vigente mediante `MBV-H-020` a `MBV-H-023` en [`HISTORIAL.md`](HISTORIAL.md). P1 conserva el release P0 y no incorpora alcance P2.

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
- Landing y trial reutilizan el CTA “Comienza tu prueba gratis”; el formulario crea una cuenta y el onboarding crea una primera acción.
- La prueba no requiere tarjeta ni cobro automático, comienza en el primer acceso verificado y limita la edición mensual a un horizonte de tres meses.
- Onboarding en cuatro pasos que parte de `Mi día`, `Una meta`, `Mi semana` o `Un hábito`, pide un resultado y una primera acción, y aterriza en Mi día.
- Una cuenta ya establecida recupera un perfil local mínimo si falta y evita repetir el onboarding. Borrar explícitamente los datos locales permite volver al estado inicial.
- Importación de respaldo disponible desde el onboarding.

### Marca, acceso y activación P0

- La jerarquía verbal se centraliza en `src/lib/brand.ts`: promesa, idea rectora, posicionamiento, mensaje estratégico, slogan y explicación operativa.
- Metadata y Open Graph usan `mybestversion.life`, la promesa principal y “Una vida más tuya.”; la pieza social ya no incluye un monograma alternativo ni “Planea · Acciona · Logra”.
- `src/lib/cta.ts` define los CTA principales de adquisición, cuenta, onboarding, acceso, paywall, checkout y recuperación.
- `src/domain/access.ts` es la fuente reutilizable de trial, capacidades y feature gates. El horizonte se valida para periodos y fechas locales; un plan mensual existente fuera del horizonte se conserva en solo lectura con sus actividades históricas, tareas y eventos enlazados, sin duplicar equivalentes.
- Feed Hub continúa identificado técnicamente como Premium, pero no se comunica como disponible porque no tiene acceso desde la navegación vigente.
- Activación v2 requiere onboarding, acción conectada, progreso consciente y segunda sesión dentro de siete días; no exige crear una meta.
- Onboarding y activación se calculan sobre la cohorte observable de cuentas con eventos v2, no sobre todas las cuentas; esa cohorte no equivale a un registro persistido de consentimiento.
- La analítica propia se encola sólo con consentimiento, minimiza metadatos y reserva los hitos derivados al servidor. Retirar el consentimiento en otra pestaña detiene la captura y limpia la cola e intenciones de autenticación pendientes.
- La sesión analítica se comparte entre pestañas y sólo se renueva después de 30 minutos de inactividad cuando vuelve a existir actividad real; el inicio se deduplica por identificador de sesión.
- El logo temporal continúa siendo `public/brand-icon.svg`; la auditoría confirmó que contiene un PNG y que falta el master vectorial aprobado.

### Navegación vigente

- Cinco destinos principales: **Inicio, Mi día, Planificar, Mi espacio y Progreso**.
- Desktop mantiene **Bienestar** y **Finanzas** visibles en un grupo secundario “En Mi espacio”; no cuentan como destinos principales.
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
- El trial aplica el mismo horizonte local de tres meses a creación, asignación y reprogramación desde mes, semana, día y captura rápida; `usePlanner` vuelve a validar la regla antes de persistir.
- La ruta semanal usa una lista vertical de lunes a domingo con prioridades derivadas de las mismas tareas, creación rápida por día, hábitos recurrentes, edición y cambio de fecha, y un panel de pendientes sin fecha que permite asignar sin duplicar entidades.
- Brain Dump conserva su conversión idempotente a tarea dentro del panel de pendientes y la revisión semanal se abre en modal sin ocupar espacio permanente.
- Tareas pueden enlazar meta, proyecto y plan; Top 3 se expresa mediante `focusPriority`.
- Proyectos aparecen antes de tareas y admiten checklist.
- El flujo Meta → resultado mensual → semana → Mi día → Progreso tiene cobertura E2E.

### Hábitos, progreso y journal

- Hábitos booleanos, de cantidad o duración; recurrencia diaria, días laborables, personalizada o sólo una fecha.
- Progreso parcial medible y edición del hábito.
- Constancia y **Mayor continuidad** cuentan únicamente días programados; “No programado” se representa como estado separado y nunca como 0 %.
- Progreso reúne evidencia de metas, hitos, tareas y hábitos.
- Journal admite entrada libre, gratitud y revisiones; el contenido permanece local.
- La entrada rápida del Journal exige contenido en el working tree actual.

### Mi espacio y herramientas

- La ruta base de Mi espacio abre un **Resumen** con accesos y contexto; Bandeja/Brain Dump conserva listas, edición, fecha flexible/mes/día y conversión idempotente a tarea.
- Rutinas editables, Retos embebidos, Tablero de visión y Calendario/eventos.
- El alias histórico `tab=calendar` se normaliza al destino canónico `tab=events`.
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
- La taxonomía v2 separa eventos aceptados del navegador de `second_session_started`, `activation_completed` y `payment_confirmed`, reservados al servidor.
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
   ├→ eventos minimizados y consentidos → hitos de activación v2
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
- `src/lib/brand.ts` y `src/lib/cta.ts`: jerarquía verbal y CTA del funnel.
- `src/domain/access.ts`: trial, matriz de capacidades y feature gates.
- `src/domain/monthPlanning.ts`: doce meses, serialización de áreas y composición sin duplicados de actividades, tareas y eventos mensuales.
- `src/domain/productAnalytics.ts`: taxonomía y evaluación pura de activación v2.
- `src/hooks/useAccount.tsx` y `src/repositories/supabase/`: cuenta y datos remotos mínimos.
- `app/api/`: soporte, eventos, marketing y plataforma.
- `supabase/migrations/`: esquema remoto y políticas RLS.
- `tests/` y `e2e/app.spec.ts`: pruebas unitarias y recorridos completos.
- `app/globals.css`: punto de entrada ordenado de las capas CSS.
- `src/styles/tokens.css` y `tokens-dark.css`: tokens de marca, semánticos, de componente y overrides oscuros.
- `src/styles/`: foundations, layout, primitives, marketing, utilidades y estilos por feature.
- `src/components/ui/Primitives.tsx` y `Modal.tsx`: contratos reutilizables de interfaz y accesibilidad.
- `src/i18n/messages/`, `keys.ts` y `formatters.ts`: catálogos estables, tipado y formato localizado.
- `scripts/check-contrast.mjs`, `audit-design-tokens.mjs` y `audit-i18n.mjs`: contraste y límites verificables de deuda.
- `docs/architecture/`, `docs/brand/`, `docs/design-system/`, `docs/decisions/` y `docs/qa/`: fuentes vigentes y evidencia de release.

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
pnpm test:contrast
pnpm audit:i18n
pnpm audit:design-tokens
pnpm build
pnpm build:vinext
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
- Mantener exactamente cinco destinos principales en desktop/mobile; Bienestar y Finanzas son accesos secundarios visibles de Mi espacio.
- Usar Nunito Sans como única familia tipográfica activa.
- Introducir color, espacio, radio, sombra o control reutilizable mediante tokens y primitives antes de crear una variante aislada.
- Mantener español como idioma canónico y EN visible como Beta mientras exista el bridge legacy.
- No traducir contenido escrito o nombrado por la persona; usar límites explícitos también en portales.
- Usar español claro, foco visible, nombres accesibles y estados vacíos útiles.
- Validar imports y formularios con Zod; no registrar contenido sensible en consola o eventos.
- Usar la jerarquía de `src/lib/brand.ts`, la taxonomía de `src/lib/cta.ts` y la matriz de `src/domain/access.ts` antes de introducir copy equivalente.
- No anunciar Feed Hub como disponible, ni inventar precio, periodicidad o activación automática de Premium.
- Mantener la analítica opcional apagada hasta consentimiento y no usarla como una medición completa de visitantes anónimos.
- No considerar una tarea con cambios completa sin actualizar `HISTORIAL.md` y, si aplica, este archivo.

## Validación conocida

En las sesiones del 2026-09-04 al 2026-09-07, sobre el SHA base más las correcciones locales:

- ESLint: aprobado.
- TypeScript: aprobado.
- Unitarias: 69 aprobadas.
- Build de producción: aprobado.
- Suite E2E completa anterior: 56/56 aprobada antes de restaurar el emoji del saludo.
- Después de restaurarlo: ESLint/TypeScript aprobados y matriz responsive E2E 2/2 en proyectos desktop/mobile.
- Tras implementar Plan semanal opción B: lint, TypeScript, 69 unitarias, build de producción y build de Sites/Vinext aprobados.
- Los recorridos específicos del plan semanal aprobaron en desktop y mobile, incluida su matriz en 390×844, 430×932, 768×1024, 1440×900 y 1488×992.
- La suite E2E global ejecutó 57/60 en paralelo; dos casos externos aprobaron al reintentarse de forma aislada. La matriz global desktop restante fue interrumpida por `ERR_NETWORK_IO_SUSPENDED` del entorno, mientras su equivalente mobile y la matriz específica semanal aprobaron.
- Viewports cubiertos por la matriz: 375×812, 390×844, 430×932, 768×1024, 1366×768 y 1440×900.

Estas comprobaciones no demuestran la configuración real de Supabase, migraciones, Google, Mercado Pago, correo ni variables legales en producción.

Para el candidato P0 del 2026-09-08 se registraron durante la implementación:

- ESLint: aprobado.
- TypeScript: aprobado.
- Unitarias: 20 archivos y 96 pruebas aprobadas.
- Contraste: 12 pares principales aprobados mediante `pnpm test:contrast`.
- Build de producción Next.js: aprobado.
- Matriz Playwright P0 final: 66 casos aprobados, 8 omisiones intencionales y 0 fallos. Las omisiones evitan duplicar cobertura entre proyectos o reservan utilidades que sólo corren con una variable explícita.
- Screenshots: ocho referencias P0 generadas en `docs/qa/screenshots/`.
- Smoke de producción: aprobado sobre la versión 27 para landing/trial, dashboard, Mi día, Semana, Hábitos y Upgrade; sin errores de consola ni overflow horizontal. Open Graph respondió en 1200×630.

Para el candidato P1 del 2026-09-10:

- Auditoría de tokens: 291/291 coincidencias directas revisadas dentro del baseline, distribuidas entre fuentes de tokens, excepciones técnicas y deuda heredada.
- Auditoría i18n: 1.230 claves estables ES/EN y 803/803 entradas legacy permitidas.
- ESLint y TypeScript: aprobados.
- Unitarias: 25 archivos y 140 pruebas aprobadas.
- Contraste: 22/22 pares claro/oscuro aprobados.
- Matriz pública: 10 rutas × 9 viewports aprobada.
- Matriz de producto: 16 rutas × 9 viewports × claro/oscuro aprobada tras corregir un overflow de 3 px en Ajustes a 320×568.
- Recorridos funcionales de onboarding, cuenta existente, planificación, Hábitos, Meta → mes → semana → Mi día → Progreso e inglés Beta aprobados en las ejecuciones registradas.

La evidencia final de P1 se mantiene en [`../qa/p1-release-report.md`](../qa/p1-release-report.md); el informe P0 permanece como referencia histórica.

## Problemas y limitaciones confirmados

1. El planner no sincroniza entre dispositivos; borrar datos del sitio puede eliminar el contenido local si no existe respaldo.
2. Mercado Pago no tiene webhook de activación automática; Premium se habilita mediante operación administrativa segura.
3. La migración analítica v2 fue aplicada y un segundo dry-run confirmó que la base remota está al día; los datos legales del responsable y la verificación operativa de las demás integraciones externas continúan pendientes.
4. La auditoría legal enumera tareas administrativas y revisión jurídica pendientes; el cálculo SQL inicial de días hábiles no integra festivos colombianos.
5. `AdminPage.tsx`, `FeedHubPage.tsx` y `MoodPage.tsx` no tienen ruta activa actual; `LifeHubPage.tsx` conserva estado/render legado de Fitness que sus pestañas ya no seleccionan. Es deuda técnica, no autorización para refactorizar.
6. `public/brand-icon.svg` no es un vector real; falta el archivo vectorial maestro aprobado.
7. Feed Hub está modelado como Premium, pero no es accesible desde la navegación vigente.
8. La analítica de adquisición sólo puede enviarse tras consentimiento y autenticación; no mide visitantes anónimos que no convierten.
9. `mybestversion.life` no está adjunto al Site; la URL operativa confirmada sigue siendo la URL pública de Sites.
10. El bridge i18n conserva 803 entradas legacy; está congelado por auditoría y debe reducirse de forma progresiva sin traducir contenido personal.
11. Permanecen 291 coincidencias de color directo revisadas en 15 archivos; el baseline impide crecimiento y no autoriza una sustitución masiva sin QA visual.

No quedó un defecto funcional bloqueante reproducible dentro de los flujos auditados localmente.

## Entrega vigente y siguiente paso

La producción confirmada antes de P1 corresponde a la versión 28 de Sites, asociada al cierre documental P0 `8e6ede1995cef4656ef8b23cac3f04a98d4ebdf2`, en `https://my-best-version-habitos.maria-delosangelesgt.chatgpt.site`. El candidato P1 está validado localmente y se sustituirá aquí por su SHA y versión una vez aprobado el smoke de producción.

Siguiente paso después del cierre técnico P1: resolver las dependencias externas del lanzamiento comercial —webhook/conciliación de Mercado Pago, condiciones comerciales, dominio personalizado y master vectorial— sin mezclarlas con el alcance P1 ni iniciar P2 por anticipado.
