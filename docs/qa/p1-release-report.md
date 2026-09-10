# Informe de release P1

Fecha de apertura: **2026-09-09 (America/Bogota, UTC-05:00)**. Última actualización: **2026-09-10**.

## Estado del informe

P1 consolida el sistema de experiencia existente sobre el SHA base `8e6ede1995cef4656ef8b23cac3f04a98d4ebdf2`. No rediseña el producto, no cambia la persistencia local-first, no modifica la matriz Trial/Premium y no incorpora capacidades P2.

- SHA base: `8e6ede1995cef4656ef8b23cac3f04a98d4ebdf2`.
- SHA funcional P1: `8f240f5b1516d212da65630e36ea3d5a15fd40e9`.
- Rama: `main`, alineada con `origin/main` al publicar el cambio funcional.
- Sites: versión 29, despliegue `appgdep_6aa2f93962bc81919311825a6c2bc6b4`, estado `succeeded`.
- URL publicada: `https://my-best-version-habitos.maria-delosangelesgt.chatgpt.site`.
- Estado: **release técnico P1 publicado y verificado**.

## Estado de requisitos P1

| Requisito | Estado | Evidencia |
| --- | --- | --- |
| P1.1 Tipografía | Implementado | Nunito Sans es la única familia cargada; ADR 0008 y guía de tipografía vigentes |
| P1.2 CSS y tokens | Implementado | Entrada ordenada en `app/globals.css`, capas en `src/styles`, tokens en tres niveles y tema oscuro |
| P1.3 Primitives | Implementado | Button, IconButton, Card, Badge, Tabs, SegmentedControl, FormField, feedback y estados accesibles |
| P1.4 Navegación y Mi espacio | Implementado | Cinco destinos principales; Bienestar/Finanzas visibles como accesos secundarios; Resumen y deep links normalizados |
| P1.5 i18n estable | Implementado con transición explícita | 1.230 claves ES/EN, formatters, EN Beta y bridge legacy limitado a una deuda registrada |
| P1.6 Diccionario | Implementado | `docs/brand/product-language-dictionary.md` |
| P1.7 Gamificación amable | Implementado | “Mayor continuidad”, días no programados separados y retos pausables |
| P1.8 Dirección visual/assets | Implementado documentalmente | Inventario, reglas de uso y faltantes externos sin inventar assets |
| P1.9 Documentación técnica | Implementado | Arquitectura actual, ADR, índices y contratos del design system |
| P1.10 QA exhaustivo | Implementado y validado | Auditorías, unitarias, tipos, matrices, builds y smoke de producción aprobados |

## Arquitectura visual y de interfaz

- `app/globals.css` funciona como manifiesto de 22 imports ordenados.
- `src/styles/tokens.css` define marca, semántica y componente; `tokens-dark.css` contiene overrides oscuros.
- `foundations.css`, `layout.css`, `primitives.css`, `primitives-enhancements.css`, `marketing.css`, `utilities.css` y `features/**` separan responsabilidades sin reordenar la cascada efectiva.
- El baseline congela **291 coincidencias directas revisadas en 15 archivos**, incluyendo fuentes de tokens, excepciones técnicas y deuda heredada; la auditoría impide aumentarlas.
- El plan semanal quedó migrado a tokens semánticos, incluido modo oscuro, sin literales directos de color.

## i18n y contenido personal

- Catálogos tipados: **1.230 claves estables** con paridad ES/EN.
- Bridge transitorio: **803 entradas legacy de 803 permitidas**; no se admite deuda nueva.
- Español es canónico y EN permanece visible como **Beta**.
- Fechas, números, moneda y plurales usan formatters compartidos.
- Las superficies migradas se excluyen del `MutationObserver` legacy.
- Títulos, metas, proyectos, tareas, áreas, notas y datos operativos creados por la persona usan límites `data-no-translate`/`translate="no"` en las superficies revisadas, incluidos portales.

## Matriz visual y funcional

Viewports obligatorios:

| Grupo | Viewports |
| --- | --- |
| Matriz P1 general | 320×568, 375×812, 390×844, 430×932, 768×1024, 1024×768, 1366×768, 1440×900 y 1920×1080 |
| Plan semanal específico | 390×844, 430×932, 768×1024, 1440×900 y 1488×992 |

Rutas públicas verificadas por la matriz automatizada:

`/`, `/trial`, `/signup`, `/login`, `/verify-email`, `/forgot-password`, `/upgrade`, `/privacy`, `/terms` y `/legal`.

Rutas de producto verificadas en claro y oscuro:

`/app/dashboard`, `/app/today`, `/app/vision`, `/app/goals`, `/app/planning`, `/app/planning/weekly`, `/app/life-hub`, `/app/tasks`, `/app/habits`, `/app/progress`, `/app/journal`, `/app/finance`, `/app/health`, `/app/settings`, `/app/help` y `/app/support`.

| Matriz | Superficies | Estado final |
| --- | ---: | --- |
| Públicas | 10 rutas × 9 viewports = 90 | Aprobada |
| Producto | 16 rutas × 9 viewports × 2 modos = 288 | Aprobada |
| Plan semanal | 1 ruta × 5 viewports | Aprobada en desktop y mobile |
| Idioma | recorridos ES/EN | Aprobados en desktop y mobile; EN permanece Beta |

Las matrices automatizadas verifican render, encabezado, consola y overflow en cada combinación. La inspección visual manual representativa confirmó la portada, Trial, Dashboard, Mi día, Plan semanal y Hábitos; no se generó una nueva colección de screenshots P1.

## Accesibilidad y consola

- Focus visible, targets críticos de al menos 44 px, reducción de movimiento y reflow al 200 %.
- Modal y drawer controlan foco, Escape, scroll del fondo y retorno al disparador.
- Tabs y controles segmentados exponen roles/estados; IconButton exige nombre accesible.
- Hábitos y retos no dependen sólo del color.
- La instrumentación E2E recopila `console.error` y `pageerror`; no se observaron errores de producto en los recorridos aprobados.

## Pruebas ejecutadas

| Comando | Resultado |
| --- | --- |
| `pnpm audit:design-tokens` | Aprobado: 291/291 coincidencias dentro del baseline |
| `pnpm audit:i18n` | Aprobado: 1.230 claves ES/EN y 803/803 entradas legacy |
| `pnpm lint` | Aprobado |
| `pnpm typecheck` | Aprobado |
| `pnpm test` | Aprobado: 25 archivos, 140 pruebas |
| `pnpm test:contrast` | Aprobado: 22/22 pares claro/oscuro |
| `pnpm build` | Aprobado; el primer intento no tuvo red para Google Fonts y la repetición autorizada compiló correctamente |
| `pnpm build:vinext` | Aprobado |
| `pnpm test:e2e` | Aprobado de forma acumulada: 63 casos de la suite completa más 2 casos corregidos y repetidos, 9 omisiones intencionales y 0 fallos pendientes |
| `git diff --check` | Aprobado |
| Smoke de producción | Aprobado sobre Sites versión 29 para portada, Trial, Dashboard, Mi día, Plan semanal y Hábitos; sin errores de consola observados ni overflow horizontal en la comprobación dimensional |
| `supabase db lint --linked --level error` | Detectó el conflicto P0 `second_session_at` antes del hotfix y quedó aprobado sin incidencias después de aplicarlo |
| `supabase db push --dry-run --include-all` | Aprobado después del hotfix: base remota al día y cero migraciones pendientes |
| Telemetría de producción | Aprobada después del hotfix: 7 respuestas consecutivas `200` de `/api/events` y cero errores nuevos en la ventana posterior |

## Incidencias de validación

1. El primer build Next no pudo descargar Nunito por restricción de red; al repetir con acceso autorizado terminó correctamente. No fue un error de código.
2. Una ejecución E2E anterior quedó invalidada por suspensión prolongada del equipo y `ERR_NETWORK_IO_SUSPENDED`; se descartó como evidencia.
3. La suite completa detectó dos controles “Claro”; el selector se acotó al grupo de modo de color.
4. La matriz de 320×568 detectó 3 px de overflow en Áreas de vida; se corrigió la capacidad de contracción del input, sin cambiar el layout en otros tamaños.
5. La protección del contenido personal cambió el mecanismo del nombre accesible de dos controles de tarea. La prueba se ajustó a `getByRole` y a la fila gestionada; desktop y mobile aprobaron al repetir los dos casos.
6. `next typegen` regenera `next-env.d.ts`; después del último build/typecheck se restauraron la referencia de Vinext y la ruta estable.
7. El smoke posterior al despliegue reveló respuestas `500` en `/api/events`. `supabase db lint --linked --level error` confirmó SQLSTATE `42702`: la función P0 `record_user_event` compartía el nombre `second_session_at` entre una variable PL/pgSQL y una columna del CTE. La migración forward `202609100001_fix_product_analytics_v2_ambiguity.sql` renombró la variable y calificó todas las columnas del CTE; no cambió datos de producto ni UI. Tras aplicarla, el lint remoto quedó limpio, el dry-run confirmó la base al día y producción respondió `200` en siete envíos consecutivos.

## Inventario de archivos

### Creados

- `docs/architecture/current-state.md`
- `docs/brand/README.md`
- `docs/brand/assets-manifest.md`
- `docs/brand/p1-implementation-audit.md`
- `docs/brand/product-language-dictionary.md`
- `docs/brand/typography.md`
- `docs/brand/visual-direction.md`
- `docs/decisions/0008-current-typography-system.md`
- `docs/decisions/README.md`
- `docs/design-system/primitives.md`
- `docs/design-system/token-exceptions.md`
- `docs/qa/p1-release-report.md`
- `public/brand/README.md`
- `scripts/audit-design-tokens.mjs`
- `scripts/audit-i18n.mjs`
- `scripts/design-token-baseline.json`
- `src/components/layout/AppShell.test.ts`
- `src/components/ui/Primitives.test.tsx`
- `src/features/habits/HabitsPage.test.ts`
- `src/i18n/I18nProvider.test.ts`
- `src/i18n/formatters.ts`
- `src/i18n/keys.ts`
- `src/i18n/messages/en.ts`
- `src/i18n/messages/es.ts`
- `src/i18n/messages/features/home-today.ts`
- `src/i18n/messages/features/navigation-space-progress.test.tsx`
- `src/i18n/messages/features/navigation-space-progress.ts`
- `src/i18n/messages/features/planning.ts`
- `src/i18n/messages/index.ts`
- `supabase/migrations/202609100001_fix_product_analytics_v2_ambiguity.sql`
- `src/styles/foundations.css`, `layout.css`, `marketing.css`, `primitives.css`, `primitives-enhancements.css`, `tokens.css`, `tokens-dark.css` y `utilities.css`
- `src/styles/features/connected-flows.css`, `contextual-planning.css`, `daily-execution.css`, `editorial-and-modules.css`, `fitness.css`, `habits.css`, `legacy-platform.css`, `month-planning.css`, `planning.css`, `product-core.css`, `product-v2.css`, `quick-capture.css` y `weekly-plan.css`

### Modificados

- Configuración y entrada: `AGENTS.md`, `README.md`, `app/globals.css`, `app/layout.tsx`, `next-env.d.ts`, `package.json` y `vitest.config.ts`.
- Documentación existente: `docs/AUTH_BILLING_SETUP.md`, ADR 0001/0007, `docs/information-architecture-refactor.md`, `docs/product/source-notes.md` y `docs/proyecto/README.md`, `HISTORIAL.md` y `ESTADO_ACTUAL.md`.
- Auditoría/pruebas: `scripts/check-contrast.mjs`, `e2e/app.spec.ts`, pruebas de cascada, progreso, dominio y consentimiento.
- UI transversal: PremiumFeatureGate, AppShell, SectionNavigation, LanguageSwitcher, Modal y Primitives.
- Producto: cuenta, retos, dashboard, finanzas, fitness, metas, hábitos, ayuda, journal, legal, Mi espacio, ánimo, onboarding, planificación, plataforma, progreso, ajustes, soporte, tareas, captura rápida, Mi día y visión.
- i18n/servicios: `src/i18n/I18nProvider.tsx`, `src/i18n/translations.ts` y sus pruebas; `src/services/platformService.ts`.

### Eliminados

Ningún archivo de aplicación ni documentación. El artefacto temporal no versionado `debug.log` se retiró.

## Riesgos residuales y deuda P2

1. El bridge i18n legacy sigue siendo deuda cuantificada; EN no debe anunciarse fuera de Beta.
2. La deuda heredada incluida dentro de las 291 coincidencias directas debe reducirse sólo mediante migraciones visualmente verificadas; las fuentes de tokens y excepciones técnicas permanecen documentadas por separado.
3. IndexedDB continúa sin sincronización entre dispositivos; exportar respaldo sigue siendo necesario.
4. Premium comercial autoservicio no está listo: faltan webhook, firma y conciliación de Mercado Pago, condiciones comerciales y revisión jurídica.
5. Faltan el master vectorial aprobado y adjuntar `mybestversion.life` al despliegue.
6. Feed Hub y cualquier iniciativa de growth permanecen fuera de P1.

## Criterio de salida

P1 queda **listo para merge técnico**: auditorías, matrices, builds, smoke de producción y telemetría autenticada aprobaron; el SHA funcional se envió a `main`/`origin/main` y se publicó como versión 29. El hotfix SQL posterior corrige una incidencia residual P0 sin alterar el bundle desplegado. Esto no equivale a declarar listo el lanzamiento comercial Premium ni autoriza iniciar P2.
