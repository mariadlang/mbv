# Auditoría de implementación P0

Fecha de revisión: **2026-09-08 (America/Bogota, UTC-05:00)**.

## Alcance y fuente de verdad

Esta auditoría compara el commit base `53221567be90c3dd2b9e9d47e1dce4be19891cd8` con el working tree preparado para los ajustes P0 de prelanzamiento. El código actual y `git status` prevalecen sobre documentos anteriores.

La revisión cubre marca, CTA, trial/Premium, Open Graph, activos de logo, accesibilidad visual, microcopy, analítica de activación y preparación de QA. No cambia la arquitectura local-first ni introduce decisiones comerciales no aprobadas.

## Estado inicial y contradicciones confirmadas

| Área | Estado inicial confirmado | Riesgo |
| --- | --- | --- |
| Mensajería de marca | `BRAND_PROMISE` contenía la explicación operativa; landing, sidebar y Open Graph utilizaban mensajes alternativos | La promesa, el slogan y la explicación parecían intercambiables |
| CTA | Se usaban “Crear mi espacio”, “Comenzar prueba gratis”, “Comenzar mi prueba”, “Crear cuenta” y “Ver Premium” para etapas relacionadas | El resultado de cada acción no era consistente en el funnel |
| Trial y Premium | La página de trial hablaba de “Base completa”; el gate de cinco años mencionaba “tres años”, aunque el límite real es de tres meses | Podía inducir a error sobre el acceso incluido |
| Open Graph | La pieza dinámica incluía un monograma `MBV` alternativo y “PLANEA · ACCIONA · LOGRA” | Introducía una identidad no aprobada y un slogan retirado |
| Logo | `public/brand-icon.svg` se presentaba como SVG, pero contiene una imagen PNG embebida | No existe un master vectorial editable y aprobado |
| Accesibilidad | Faltaban foregrounds semánticos específicos; algunos controles críticos tenían focus o tamaño táctil insuficiente | Contraste y operabilidad inconsistentes, especialmente en estados y modo oscuro |
| Microcopy | Revisión semanal, hábitos, paywalls y revisión mensual incluían copy prescriptivo, ambiguo o poco preciso | El tono podía sentirse culpabilizante o amenazante |
| Activación | La definición anterior exigía onboarding, una meta y una acción completada | Excluía rutas válidas de onboarding que empiezan por Mi día, semana o hábito |
| Analítica | La cola no estaba gobernada por el consentimiento y la taxonomía no distinguía hitos cliente/servidor | Riesgo de medición duplicada o no alineada con privacidad |
| QA | No existía un informe único que reuniera rutas, viewports, accesibilidad, consola y screenshots P0 | No era posible declarar el cierre P0 sólo con compilación |

## Decisiones implementadas en el working tree

### Marca y superficies públicas

- `src/lib/brand.ts` centraliza nombre, promesa, idea rectora, posicionamiento, mensaje estratégico, slogan y explicación operativa.
- Landing, trial, signup, onboarding, metadata y Open Graph reutilizan esa jerarquía.
- `Planea · Acciona · Logra.` se eliminó de la pieza Open Graph.
- `Planea · Haz · Vive · Avanza.` se eliminó de la cabecera lateral de Mi día.
- La pieza Open Graph sigue siendo dinámica, mide 1200 × 630 y no introduce un logo alternativo.

### CTA, trial y Premium

- `src/lib/cta.ts` define los nombres principales del funnel.
- `src/domain/access.ts` reúne duración, horizonte, capacidades incluidas, copy de acceso y feature gates.
- La prueba conserva 15 días, no requiere tarjeta, no cobra automáticamente y comienza con el primer acceso tras verificar el correo.
- El horizonte del trial se aplica a tres meses calendario: mes de inicio y dos meses posteriores.
- El mismo horizonte se valida en periodos mensuales y fechas diarias o semanales, tanto en las vistas de planificación como en captura rápida y en el controlador del planner.
- Los planes existentes fuera de ese horizonte se muestran en solo lectura; se conservan sus actividades históricas y las tareas o eventos enlazados sin presentar copias equivalentes. La información local no se elimina.
- La planificación a cinco años continúa como Premium.
- Feed Hub sigue identificado técnicamente como Premium, pero no se comunica como beneficio disponible porque no es accesible desde la navegación vigente.

### Microcopy y accesibilidad

- La revisión semanal invita a revisar sin imponer una duración fija.
- Hábitos usa “Aún no registrado” cuando describe la ausencia de registro.
- La revisión mensual pregunta “¿Qué quieres ajustar?”.
- El estado expirado explica que la información local permanece en el dispositivo.
- Se añadieron tokens de texto para success, warning, danger, marca sobre fondo suave y texto secundario.
- Se reforzaron focus visible, targets táctiles, modo oscuro y descripciones textuales de gráficos.
- `scripts/check-contrast.mjs` cubre seis pares principales en modo claro y oscuro.

### Activación y privacidad analítica

- Activación v2 exige, dentro de siete días: onboarding, acción conectada, progreso consciente y segunda sesión.
- Completar una acción, registrar un hábito o reprogramar conscientemente pueden satisfacer el hito de progreso.
- Crear una meta no es obligatorio.
- La base de onboarding y activación en Plataforma es la cohorte observable con eventos de taxonomía v2, no el total de cuentas. Como la analítica es opcional, esa cohorte no se interpreta como un registro persistido de consentimiento.
- La cola local se crea únicamente con consentimiento analítico. Las preferencias se sincronizan entre pestañas y, al retirar el consentimiento, se detienen nuevas capturas y se eliminan la cola y las intenciones de autenticación pendientes.
- La sesión se comparte entre pestañas y sólo se renueva después de 30 minutos de inactividad cuando vuelve a existir actividad real. El inicio se deduplica por identificador de sesión.
- Los metadatos están limitados a una allowlist y no incluyen contenido personal o sensible.
- `second_session_started` y `activation_completed` se derivan en servidor; `payment_confirmed` queda reservado para una integración confiable futura.

## Archivos afectados por el P0

### Marca, funnel y acceso

- `src/lib/brand.ts`
- `src/lib/cta.ts`
- `src/domain/access.ts`
- `src/domain/access.test.ts`
- `src/features/account/AccountPages.tsx`
- `src/features/onboarding/Onboarding.tsx`
- `src/components/access/PremiumFeatureGate.tsx`
- `src/repositories/interfaces/AuthRepository.ts`
- `src/repositories/supabase/SupabaseAuthRepository.ts`
- `src/repositories/testing/E2EAuthRepository.ts`
- `app/PlannerApp.tsx`
- `app/layout.tsx`
- `app/opengraph-image.tsx`

### Producto, microcopy y accesibilidad

- `app/globals.css`
- `src/components/layout/AppShell.tsx`
- `src/features/habits/HabitsPage.tsx`
- `src/features/mood/MoodPage.tsx`
- `src/domain/monthPlanning.ts`
- `src/domain/monthPlanning.test.ts`
- `src/features/planning/PlanningPage.tsx`
- `src/features/planning/WeeklyPlanView.tsx`
- `src/features/progress/ProgressPage.tsx`
- `src/features/tasks/QuickCaptureDrawer.tsx`
- `src/features/today/TodayPage.tsx`
- `src/features/vision/VisionPage.tsx`
- `src/i18n/translations.ts`
- `scripts/check-contrast.mjs`
- `package.json`

### Analítica y plataforma

- `src/domain/productAnalytics.ts`
- `src/domain/productAnalytics.test.ts`
- `src/domain/platform.ts`
- `src/services/analyticsService.ts`
- `src/hooks/useAccount.tsx`
- `src/hooks/usePlanner.ts`
- `src/features/legal/CookieConsent.tsx`
- `src/features/platform/PlatformPage.tsx`
- `src/lib/supportSchemas.ts`
- `src/repositories/http/HttpSupportRepository.ts`
- `src/repositories/interfaces/SupportRepository.ts`
- `src/repositories/interfaces/LegalPrivacyRepository.ts`
- `src/services/supportService.ts`
- `src/services/legalPrivacyService.ts`
- `src/repositories/supabase/SupabaseLegalPrivacyRepository.ts`
- `app/api/events/route.ts`
- `app/api/platform/route.ts`
- `tests/analytics-queue.test.ts`
- `tests/cookie-consent-sync.test.ts`
- `tests/support-analytics.test.ts`
- `e2e/app.spec.ts`
- `supabase/migrations/202609080001_product_analytics_v2.sql`

## Decisiones e implementaciones pendientes

1. **PENDIENTE DE DEFINICIÓN — Se necesita el archivo vectorial maestro aprobado.** No se debe trazar ni rediseñar el logo actual.
2. Precio, periodicidad, impuestos, renovación, descuentos y demás condiciones comerciales Premium no están definidos en el repositorio.
3. Mercado Pago no tiene webhook, validación de firma ni conciliación automática. Volver del checkout no activa Premium.
4. `202609080001_product_analytics_v2.sql` fue aplicada en el proyecto remoto enlazado y un segundo dry-run confirmó `Remote database is up to date`; cualquier entorno remoto adicional debe verificarse por separado.
5. Feed Hub no debe anunciarse como disponible hasta tener una ruta accesible y una decisión de producto explícita.
6. Las ocho capturas P0 ya existen y fueron inspeccionadas. La suite integral final aprobó 66 casos, omitió 8 intencionalmente y tuvo 0 fallos. Commit, push, despliegue y smoke continúan pendientes hasta contar con evidencia real en `docs/qa/p0-release-report.md`.
7. La analítica de adquisición propia no representa a visitantes anónimos que no autentican: el endpoint de eventos requiere sesión. La cohorte v2 tampoco equivale a consentimiento vigente.

## Fuera de alcance

- Rediseño visual completo.
- Sincronización remota del planner local.
- Nuevo proveedor de analítica o marketing.
- Creación de un logo, precio o plan comercial.
- Activación Premium basada en parámetros de retorno del navegador.
