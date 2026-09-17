# Estado actual de My Best Version

Última revisión: **2026-09-16, America/Bogota (UTC-05:00)**.

## Punto de continuidad

- Repositorio real: `C:/Users/maria/Documents/Codex/2026-08-10/a-web-app-para-my-best`.
- Rama: `main`, con upstream `origin/main`.
- Base de la entrega P1: `8e6ede1995cef4656ef8b23cac3f04a98d4ebdf2` (`docs: record P0 production release`).
- `main` y `origin/main`: alineados en `8e6ede1` antes de comenzar P1.
- Historial en la base P1: completo/no superficial, 65 commits alcanzables, dos raíces históricas y sin tags.
- Entrega P0: `MBV-H-022` quedó consolidada en `5c5f5a0bfd342a4b731fa927f992d7233959006d`, enviada a `origin/main` y publicada como versión 27 de Sites.
- Entrega P1: `MBV-H-023`, consolidada en `8f240f5b1516d212da65630e36ea3d5a15fd40e9`, enviada a `origin/main` y publicada como versión 29 de Sites; tipografía, tokens, CSS, primitives, navegación, Mi espacio, i18n, lenguaje, gamificación amable, documentación y QA quedaron validados.
- Integración Google Calendar: `MBV-H-025` a `MBV-H-031` documentan su implementación, hardening y validación histórica. Por decisión expresa del 16 de septiembre, `MBV-H-032` pausa la integración, retira sus superficies activas y programa el cierre del proyecto Google Cloud `mbv-calendar-production`. El calendario local permanece disponible; no se purgaron datos históricos de Supabase ni secretos de Vercel. Consulta [`../integrations/google-calendar.md`](../integrations/google-calendar.md).
- Release P2/Calendar: `MBV-H-032` y `MBV-H-033` quedaron consolidados en el commit funcional `7628074708e379dd5c79b9b76f3102022e25a5a6`, enviado a `origin/main` y publicado en Vercel Production. P2-A implementa Weekly Recap, regreso amable, tarjetas de progreso, referrals, analítica/lifecycle, aislamiento local por cuenta y copy Premium contextual, con los cinco flags apagados. La validación aprobó lint, TypeScript, 44 archivos/243 pruebas unitarias, builds Next/Vinext, 82 E2E en la suite completa previa, el E2E Premium final desktop/mobile y la matriz visual P2. La migración P2 está aplicada y certificada en Supabase; el smoke público del release aprobó y Calendar externo quedó efectivamente desactivado.
- Landing y matriz comercial: `MBV-H-035` registra la portada editorial Playfair Display + Inter, manteniendo Nunito Sans en el tracker; sus anchors, capturas QA reales, precios y disponibilidad Premium. `MBV-H-036` registra su publicación controlada en `7abddae651f34ff4e086a5b6a278c7032c73466d`, con migración analítica, CI, Vercel Production y smoke público aprobados.

Este documento describe el estado vigente mediante `MBV-H-020` a `MBV-H-036` en [`HISTORIAL.md`](HISTORIAL.md). Los cambios conservan P0/P1 y no incorporan Outlook, Apple Calendar, recomendaciones con IA ni auto-planificación; la IA sólo se comunica como capacidad futura no disponible.

## Qué es el producto

My Best Version es una aplicación de productividad y desarrollo personal que conecta una dirección de vida con metas, resultados mensuales, semanas, acciones diarias, hábitos y reflexión. Su lenguaje de producto es sereno y no punitivo: los días no programados no reducen la constancia y los estados vacíos deben permitir avanzar sin culpa.

El acceso usa cuenta remota, pero el contenido detallado del planner continúa local-first en el navegador. Esta distinción es esencial:

- **Supabase/remoto:** identidad, verificación de email, acceso/trial/Premium, rol, preferencias, consentimientos, solicitudes de privacidad, soporte, eventos minimizados y plataforma privada.
- **IndexedDB/local:** perfil de uso del planner, áreas, metas, hitos, hábitos, tareas, proyectos, planes, journal, finanzas, rutinas, eventos, vision board, fitness, nutrición, medidas, retos y compras pendientes.

No existe sincronización del contenido del planner entre dispositivos.

## Experiencia implementada

### Entrada, cuenta y onboarding

- Landing editorial y páginas públicas de cuenta, trial, upgrade, recuperación y verificación. La landing usa los anchors `#inicio`, `#como-funciona`, `#que-incluye`, `#beneficios`, `#planes` y `#faq`.
- Registro/login con Supabase, además de Google y enlace mágico cuando el proveedor está configurado.
- Consentimientos obligatorios separados y marketing opcional.
- Trial de 15 días, estados de acceso y capacidades Premium calculados mediante reglas de dominio y funciones Supabase.
- Landing y trial reutilizan el CTA “Comienza tu prueba gratis”; el formulario crea una cuenta y el onboarding crea una primera acción.
- La prueba no requiere tarjeta ni cobro automático, comienza en el primer acceso verificado y limita la edición mensual a un horizonte de tres meses.
- La landing muestra capturas reales inspeccionadas en QA de Dashboard (`p0-dashboard-1440x900.png`), Mi día (`p0-today-390x844.png`) y Hábitos (`p0-habits-1440x900.png`).
- La matriz comercial comunica Premium a USD 2.99/mes o USD 30.99/año. Fitness y alimentación y la planificación a cinco años están disponibles; análisis avanzado, recomendaciones con IA y planificación específica de un año están **Próximamente** y no disponibles.
- Onboarding en cuatro pasos que parte de `Mi día`, `Una meta`, `Mi semana` o `Un hábito`, pide un resultado y una primera acción, y aterriza en Mi día.
- Una cuenta ya establecida recupera un perfil local mínimo si falta y evita repetir el onboarding. Borrar explícitamente los datos locales permite volver al estado inicial.
- Importación de respaldo disponible desde el onboarding.

### Marca, acceso y activación P0

- La jerarquía verbal se centraliza en `src/lib/brand.ts`: promesa, idea rectora, posicionamiento, mensaje estratégico, slogan y explicación operativa.
- Metadata y Open Graph usan `mybestversion.life`, la promesa principal y “Una vida más tuya.”; la pieza social ya no incluye un monograma alternativo ni “Planea · Acciona · Logra”.
- `src/lib/cta.ts` define los CTA principales de adquisición, cuenta, onboarding, acceso, paywall, checkout y recuperación.
- `src/domain/access.ts` es la fuente reutilizable de trial, capacidades y feature gates. El horizonte se valida para periodos y fechas locales; un plan mensual existente fuera del horizonte se conserva en solo lectura con sus actividades históricas, tareas y eventos enlazados, sin duplicar equivalentes.
- `src/domain/access.ts` expone `fitness_and_nutrition` y `five_year_planning` como capacidades Premium reales. `/app/health` aplica el gate con `account.access` y conserva el bypass de superadmin.
- Activación v2 requiere onboarding, acción conectada, progreso consciente y segunda sesión dentro de siete días; no exige crear una meta.
- Onboarding y activación se calculan sobre la cohorte observable de cuentas con eventos v2, no sobre todas las cuentas; esa cohorte no equivale a un registro persistido de consentimiento.
- La analítica propia se encola sólo con consentimiento, minimiza metadatos y reserva los hitos derivados al servidor. Retirar el consentimiento en otra pestaña detiene la captura y limpia la cola e intenciones de autenticación pendientes.
- La sesión analítica se comparte entre pestañas y sólo se renueva después de 30 minutos de inactividad cuando vuelve a existir actividad real; el inicio se deduplica por identificador de sesión.
- El logo temporal continúa siendo `public/brand-icon.svg`; la auditoría confirmó que contiene un PNG y que falta el master vectorial aprobado.

### Navegación vigente

- Cinco destinos principales: **Inicio, Mi día, Planificar, Mi espacio y Progreso**.
- Desktop mantiene **Bienestar** y **Finanzas** visibles en un grupo secundario “En Mi espacio”; no cuentan como destinos principales.
- Mobile conserva exactamente los cinco destinos principales en la barra inferior; el menú y Más herramientas exponen utilidades adicionales.
- Rutas antiguas se conservan como redirects: `/app/challenges`, `/app/mood`, `/app/life-hub/fitness`, `/app/profile`, `/app/pqr` y `/admin`.

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
- La entrada rápida del Journal exige contenido.

### Mi espacio y herramientas

- La ruta base de Mi espacio abre un **Resumen** con accesos y contexto; Bandeja/Brain Dump conserva listas, edición, fecha flexible/mes/día y conversión idempotente a tarea.
- Rutinas editables, Retos embebidos, Tablero de visión y Calendario/eventos.
- El alias histórico `tab=calendar` se normaliza al destino canónico `tab=events`.
- Más herramientas enlaza Bienestar, Finanzas, Rutinas, Retos, Tablero visual, Calendario, Ayuda, Aprende y Ajustes.
- `LearnPage`, Centro de ayuda y modal global de desbloqueo ofrecen orientación no punitiva.

### Bienestar y Finanzas

- Fitness y alimentación (`/app/health`) es Premium mediante `fitness_and_nutrition` e incluye autorización de datos sensibles, entrenamiento, comidas/macros y medidas/fotos locales.
- Entrenamiento admite fuerza con ejercicios o cardio/deporte sin ejercicios individuales obligatorios.
- Comidas pueden crearse, copiarse y eliminarse; el borrado incluye confirmación y feedback.
- Finanzas incluye cuentas, categorías, presupuesto mensual, movimientos, fondos, deudas, recurrentes, revisión y compras pendientes.
- No hay conexión bancaria ni asesoría médica/nutricional automatizada.

### Google Calendar

- La integración está pausada por defecto con `NEXT_PUBLIC_GOOGLE_CALENDAR_ENABLED=0`. Ajustes no ofrece OAuth, las vistas no muestran calendarios/eventos remotos y el provider no consulta, sincroniza ni reintenta en segundo plano.
- Los endpoints interactivos responden `404 CALENDAR_DISABLED`; webhook y mantenimiento responden `204` y el cron fue retirado de Vercel.
- El proyecto Google Cloud `MBV Calendar Production` (`mbv-calendar-production`) quedó programado para cierre. Google conserva una ventana de recuperación de 30 días antes de la eliminación definitiva.
- El calendario local continúa funcionando en Mi espacio, Semana y Mi día. Tareas, prioridades y eventos locales siguen separados. Editar un evento histórico vinculado durante la pausa lo convierte en copia local; borrarlo sólo afecta la copia local.
- La implementación y migración histórica permanecen versionadas. No se purgaron credenciales/caché históricas de Supabase ni secretos de Vercel porque no se autorizó esa eliminación adicional; la app pausada no los usa y la supresión se canaliza por PQR/Centro de Privacidad.
- Reactivar Calendar requiere una decisión nueva, proyecto OAuth válido, credenciales rotadas, revisión legal y repetición del QA completo; no basta con cambiar el flag.
- Guía histórica y contrato de pausa: [`../integrations/google-calendar.md`](../integrations/google-calendar.md).

### P2 — Retención y crecimiento amable

- Los cinco flags P2 —`weekly_recap`, `return_experience`, `share_cards`, `referrals` y `premium_contextual_prompts`— permanecen en `false` por defecto. Completar código o QA no los activa en producción.
- `premium_contextual_prompts` sólo cambia la descripción del gate existente de planificación a 5 años. `canAccessFeature()` conserva toda la autoridad de acceso; el copy, CTA y comportamiento anteriores se mantienen cuando el flag está apagado. El gate de Fitness y alimentación es independiente de esta variante de copy.
- Weekly Recap usa evidencia real de tareas, prioridades, hábitos, metas, hitos y reprogramaciones hasta el día actual. Registra decisiones textuales de conservar, mover o soltar, no muta pendientes directamente y puede preparar la semana siguiente. Las acciones directas viven en Regreso amable.
- La experiencia de regreso aparece tras inactividad y propone una acción real: retomar un pendiente o prioridad, elegir un mínimo viable, mover una acción a hoy, soltarla o descartar la sugerencia.
- Las tarjetas compartibles se generan por opt-in con métricas agregadas permitidas, preview y formatos exactos para Story, Feed y cuadrado. No toman texto libre del planner; sólo admiten un titular opcional escrito/revisado explícitamente y excluido de analytics. Exportan PNG y usan Web Share cuando está disponible.
- Referral usa un código opaco estable por cuenta y atribución first-touch local de hasta 29 días. La atribución sólo se transmite con consentimiento analítico; no existe todavía una recompensa comercial aprobada ni se presupone validación jurídica final.
- La taxonomía P2 cierra nombres y metadatos aceptados, conserva cohortes observables y añade métricas agregadas de D1/D7/D30, WAU, recap, sharing, referrals y conversión. Las reglas lifecycle son deduplicables y separan mensajes transaccionales, pero no activan email/push ni un proveedor externo.
- IndexedDB queda aislado por cuenta autenticada mediante un namespace propio. La reclamación del almacenamiento legacy es conservadora, conserva la base original y evita mezclar datos al cambiar de cuenta.
- `supabase/migrations/202609160001_p2_growth_analytics.sql` se aplicó al proyecto enlazado `yvrvetuzuinoinukrivo`. El ledger quedó alineado hasta `202609160001`, el dry-run posterior confirmó que la base está al día y el lint remoto terminó sin errores. Analytics/referrals P2 siguen apagados hasta smoke autenticado y revisión legal.
- P2-B/P2-C cuentan con sistema y documentación de motion, diseño social, contenido, fotografía/assets, portal de marca, campañas, partnerships y experimentación. La ejecución externa, los assets finales con derechos, el master vectorial, canales lifecycle, recompensas y campañas reales siguen fuera de esta entrega.
- Fuentes de alcance: [`../product/p2-roadmap.md`](../product/p2-roadmap.md), [`../product/weekly-recap.md`](../product/weekly-recap.md), [`../product/shareable-progress.md`](../product/shareable-progress.md), [`../product/referrals.md`](../product/referrals.md), [`../product/lifecycle.md`](../product/lifecycle.md) y [`../analytics/event-taxonomy.md`](../analytics/event-taxonomy.md).

### Legal, soporte y plataforma

- Centro legal público para privacidad, tratamiento, cookies, pagos, retracto, IA, proveedor, seguridad y PQR.
- Centro de privacidad autenticado con consentimientos y solicitudes.
- Soporte acepta sugerencias, bugs y mensajes de cuenta mediante rutas API autenticadas.
- Eventos propios usan una taxonomía cerrada y excluyen textos de metas, journal, comidas, salud y finanzas.
- La taxonomía v2 separa eventos aceptados del navegador de `second_session_started`, `activation_completed` y `payment_confirmed`, reservados al servidor.
- `/platform` exige superadmin y ofrece métricas, usuarios, tickets, FAQ, categorías y parámetros respaldados por Supabase.
- Mercado Pago es un enlace externo centralizado por `billingService` y `publicConfig.mercadoPagoCheckoutUrl`. Landing y Upgrade comparten el mismo destino configurado para las modalidades mensual y anual; el selector cambia presentación/telemetría, no crea una preferencia de pago distinta. Volver del checkout no activa Premium y el frontend no modifica el acceso.

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
   ├→ datos históricos Calendar server-only (integración pausada, sin tráfico)
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
- Código histórico de Google Calendar mediante OAuth 2.0/PKCE, actualmente desactivado por feature flag.
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
- Mantener Nunito Sans en el tracker. La excepción editorial de la landing usa Playfair Display para titulares/acento e Inter para navegación, cuerpo y controles, siempre acotadas a `.landing-page`.
- Introducir color, espacio, radio, sombra o control reutilizable mediante tokens y primitives antes de crear una variante aislada.
- Mantener español como idioma canónico y EN visible como Beta mientras exista el bridge legacy.
- No traducir contenido escrito o nombrado por la persona; usar límites explícitos también en portales.
- Usar español claro, foco visible, nombres accesibles y estados vacíos útiles.
- Validar imports y formularios con Zod; no registrar contenido sensible en consola o eventos.
- Usar la jerarquía de `src/lib/brand.ts`, la taxonomía de `src/lib/cta.ts` y la matriz de `src/domain/access.ts` antes de introducir copy equivalente.
- Comunicar la matriz vigente sin mezclar estados: Fitness/alimentación y cinco años están disponibles con Premium; análisis avanzado, IA y un año permanecen **Próximamente**. Los precios son USD 2.99/mes y USD 30.99/año; no inventar impuestos, renovación, cancelación, reembolsos ni activación automática.
- Mantener la analítica opcional apagada hasta consentimiento y no usarla como una medición completa de visitantes anónimos.
- Mantener tareas/prioridades separadas de eventos y preservar el calendario local aunque la integración externa esté pausada.
- No reactivar Google Calendar ni purgar datos históricos server-side sin una decisión y autorización específicas.
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
- Builds Next y Vinext aprobados; smoke de producción aprobado sobre portada, Trial, Dashboard, Mi día, Plan semanal y Hábitos, sin errores de consola observados.
- Verificación post-release: `db lint` identificó y luego confirmó resuelto el conflicto PL/pgSQL P0 de `record_user_event`; la migración forward `202609100001_fix_product_analytics_v2_ambiguity.sql` quedó aplicada, la base remota quedó al día y `/api/events` respondió `200` en siete envíos consecutivos.

Para la implementación histórica Google Calendar `MBV-H-025`, iniciada el 2026-09-11 y cerrada técnicamente el 2026-09-14:

- ESLint y TypeScript: aprobados.
- Unitarias: 33 archivos y 184 pruebas aprobadas.
- Auditoría i18n: 1.302 claves estables ES/EN y 803/803 entradas legacy; las cuatro advertencias corresponden a claves de uso dinámico conservadas.
- Auditoría de tokens: 291/291 coincidencias dentro del baseline; contraste: 22/22 pares aprobados.
- Builds de producción Next.js y Sites/Vinext: aprobados con las rutas API de Calendar incluidas.
- La ejecución E2E global cerró 66 casos aprobados y 9 omisiones intencionales; el único caso no concluido perdió la sesión de navegador durante una suspensión de 10,5 horas. Su matriz de 16 rutas × viewports requeridos × claro/oscuro se repitió en una sesión continua y aprobó. El recorrido de evento local entre Mi espacio, Plan semanal y Mi día volvió a aprobar en desktop y mobile, incluida la preservación de la zona IANA al editar.
- Cuatro revisiones independientes no encontraron bloqueadores P0/P1 estáticos tras cerrar ownership, ETag atómico, reintentos idempotentes, protección ABA por UUID de conflicto, desconexión/reconexión, OAuth, mantenimiento y SQL. La migración y el OAuth/primer sync con una cuenta real quedaron certificados históricamente; no se ejecutó una mutación remota controlada ni una prueba concurrente PostgreSQL real.
- Para `MBV-H-032`, TypeScript, ESLint, 33 archivos/185 pruebas unitarias, i18n, tokens, contraste y builds Next/Vinext aprobaron. El E2E dirigido pasó 4/4 casos en desktop y mobile, tanto para la ausencia de Calendar externo/sus llamadas API como para el CRUD local entre Mi espacio, Semana y Mi día.

Para el release P2 publicado `MBV-H-033`:

- Las pruebas dirigidas de Weekly Recap, regreso amable, share cards, referrals, analítica/lifecycle y aislamiento de cuenta están incorporadas; los recorridos P2 dirigidos ya aprobaron en desktop y mobile durante la implementación.
- La matriz visual P2 cubre 375×812, 390×844, 430×932, 768×1024, 1366×768 y 1440×900, en claro/oscuro y ES/EN Beta, con evidencia en `docs/qa/screenshots/`.
- Lint, tipos, 44 archivos/243 pruebas unitarias, builds Next/Vinext y Playwright (82 aprobadas, 12 saltadas por diseño, 0 fallos en la suite completa previa) quedaron aprobados. Después del cableado Premium, su recorrido dirigido volvió a aprobar 2/2 en desktop/mobile. Esto no implica activación pública.
- La migración P2 se aplicó y pasó postchecks remotos. El smoke público de producción aprobó; no hubo smoke autenticado de producto ni activación de flags.

La evidencia final de P1 se mantiene en [`../qa/p1-release-report.md`](../qa/p1-release-report.md); el informe P0 permanece como referencia histórica.

## Problemas y limitaciones confirmados

1. El planner no sincroniza entre dispositivos; borrar datos del sitio puede eliminar el contenido local si no existe respaldo.
2. Mercado Pago no tiene webhook de activación automática; Premium se habilita mediante operación administrativa segura. Mensual y anual abren hoy la misma URL centralizada, sin una preferencia server-side que distinga el periodo elegido.
3. La migración analítica v2 y su hotfix forward de ambigüedad PL/pgSQL fueron aplicados; `db lint` quedó sin errores y un dry-run confirmó que la base remota está al día. Los datos legales del responsable y la verificación operativa de las demás integraciones externas continúan pendientes.
4. La auditoría legal enumera tareas administrativas y revisión jurídica pendientes; el cálculo SQL inicial de días hábiles no integra festivos colombianos.
5. `AdminPage.tsx` y `MoodPage.tsx` no tienen ruta activa actual; `LifeHubPage.tsx` conserva estado/render legado de Fitness que sus pestañas ya no seleccionan. Es deuda técnica, no autorización para refactorizar.
6. `public/brand-icon.svg` no es un vector real; falta el archivo vectorial maestro aprobado.
7. La landing editorial y la matriz comercial están publicadas en Vercel Production; análisis avanzado, recomendaciones con IA y planificación específica de un año continúan marcados como `coming_soon`, sin acceso activo.
8. La analítica de adquisición sólo puede enviarse tras consentimiento y autenticación; no mide visitantes anónimos que no convierten.
9. `mybestversion.life` apunta al deployment Production de Vercel y no está adjunto al Site; la URL de Sites se conserva como runtime alternativo del despliegue anterior.
10. El bridge i18n conserva 803 entradas legacy; está congelado por auditoría y debe reducirse de forma progresiva sin traducir contenido personal.
11. Permanecen 291 coincidencias de color directo revisadas en 15 archivos; el baseline impide crecimiento y no autoriza una sustitución masiva sin QA visual.
12. Google Calendar está pausado. El proyecto `mbv-calendar-production` quedó programado para cierre, mientras las tablas históricas y secretos permanecen sin uso y sin purga destructiva. La política explica cómo solicitar su supresión.
13. La migración P2 `202609160001_p2_growth_analytics.sql` ya está aplicada y el esquema remoto pasó lint. Antes de habilitar analytics o referrals P2 falta un smoke autenticado controlado y, para referral, revisión legal.
14. Las reglas lifecycle están modeladas, pero faltan proveedor, preferencias granulares, consentimiento persistido y operación de baja antes de enviar email o push.
15. Referrals no ofrece todavía recompensa, descuento ni días Premium; esas condiciones y cualquier ajuste de política/reconsentimiento necesitan decisión comercial y revisión legal expresa.
16. Las guías P2 de fotografía, assets, campañas y partnerships no sustituyen producción final, licencias, permisos de imagen, presupuesto ni acuerdos externos.
17. La atribución referral valida formato opaco y first-touch local, pero aún no registra propiedad server-side del código ni exige en SQL el orden visita → signup dentro de una ventana propia. Mantener el flag apagado y endurecer este contrato antes de incentivos o rollout amplio.

No quedó un defecto funcional bloqueante reproducible dentro de los flujos auditados localmente.

## Entrega vigente y siguiente paso

La entrega funcional vigente es `7abddae651f34ff4e086a5b6a278c7032c73466d` en `origin/main` y Vercel Production. Conserva `MBV-H-032`/`MBV-H-033` con Calendar externo pausado y P2 detrás de flags apagados, y publica `MBV-H-035` con la landing y acceso Premium alineado. GitHub Actions `35168586376` aprobó lint, tipos, 254 pruebas unitarias y build. Vercel publicó el deployment `5sUK7zBYxYyeQC5sRBkiVsw8R5u4` como `Ready`, `Production` y `Latest`, asociado al SHA exacto y al dominio `mybestversion.life`. El smoke público validó landing desktop/mobile, rutas públicas y checkout; Calendar status conserva `404 {"error":"CALENDAR_DISABLED"}` y mantenimiento `204`.

Siguiente paso operativo: mantener los cinco flags apagados y ejecutar un smoke autenticado controlado de `/api/events` y métricas antes de cualquier rollout P2. También deben definirse owner/rollback por flag y resolverse el hardening y la revisión legal de referral. Las demás dependencias externas del lanzamiento comercial —webhook/conciliación de Mercado Pago, condiciones de renovación/cancelación/reembolso, identidad legal, canales lifecycle y master vectorial— siguen separadas.
