# My Best Version Planner

Aplicación web local-first para convertir visión personal en metas, hábitos, acciones semanales y reflexión diaria. Acompaña con “progreso amable”: los días no programados no reducen la constancia.

La documentación vigente para continuar el proyecto comienza en [`docs/proyecto/README.md`](docs/proyecto/README.md). Allí se separan el historial verificable, el estado actual y las limitaciones conocidas.

## Stack actual

- Next.js 16, React 19 y TypeScript
- React Router para la navegación interna
- Dexie e IndexedDB para persistencia local
- React Hook Form y Zod para formularios, archivos y respaldos
- Zustand para estado de interfaz
- Vitest para pruebas unitarias y Playwright para E2E
- Vinext y Cloudflare Sites como destino de publicación adicional, mediante scripts explícitos
- Supabase Auth para identidad, acceso, preferencias, soporte y metadatos mínimos de producto
- Google Calendar API para sincronización opcional y bidireccional de eventos/citas
- Catálogos ES/EN tipados con un bridge temporal para superficies legacy

## Sistema de experiencia

- El tracker autenticado mantiene Nunito Sans. La nueva landing editorial delimita una excepción propia: Playfair Display en titulares y recursos editoriales, e Inter en navegación, cuerpo y controles.
- `app/globals.css` conserva sólo el orden de entrada; tokens, foundations, layout, primitives y features viven por capas en `src/styles/`.
- Los componentes reutilizables de `src/components/ui/Primitives.tsx` comparten contratos de variantes, estados, foco y accesibilidad.
- La navegación principal contiene exactamente cinco destinos en desktop y mobile: **Inicio, Mi día, Planificar, Mi espacio y Progreso**.
- **Bienestar** y **Finanzas** siguen visibles como accesos secundarios asociados a Mi espacio, no como destinos principales adicionales.
- `pnpm audit:i18n` y `pnpm audit:design-tokens` impiden nueva deuda fuera de los límites revisados.

## Landing editorial

La nueva portada vive en `src/features/landing/` y organiza la navegación por los anchors `#inicio`, `#como-funciona`, `#que-incluye`, `#beneficios`, `#planes` y `#faq`. Usa capturas reales ya inspeccionadas por QA: `p0-dashboard-1440x900.png`, `p0-today-390x844.png` y `p0-habits-1440x900.png`, todas bajo `docs/qa/screenshots/`.

La landing y su matriz comercial quedaron publicadas en el commit funcional `7abddae651f34ff4e086a5b6a278c7032c73466d`. GitHub Actions aprobó lint, tipos, unitarias y build; Vercel la sirve en Production desde `mybestversion.life`.

## Desarrollo

Requiere Node.js 22.13 o superior y pnpm 11.16.

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

`pnpm dev`, `pnpm build` y Playwright usan Next.js, el mismo runtime principal de Vercel. Para el destino alternativo de Cloudflare Sites existen `pnpm dev:vinext` y `pnpm build:vinext`.

## Arquitectura

```text
UI
↓
usePlanner (hook/controlador)
↓
plannerService
↓
PlannerRepository
↓
Dexie / IndexedDB
```

Las pantallas no acceden directamente al almacenamiento. El repositorio local puede sustituirse por otro adaptador sin reescribir la interfaz.

## Persistencia y privacidad

El acceso actual requiere una cuenta administrada por Supabase. El contenido detallado del planner —metas, hábitos, tareas, journal, finanzas, fitness e imágenes— continúa en IndexedDB dentro del navegador y dispositivo actuales y no se sincroniza entre dispositivos. Supabase conserva identidad, estado de acceso, preferencias, consentimientos, solicitudes, soporte y eventos de producto minimizados; no recibe el contenido personal del planner mediante estos flujos.

Las imágenes locales se limitan por tipo y tamaño para evitar respaldos excesivos. Consulta el inventario y las precauciones en [`docs/proyecto/ESTADO_ACTUAL.md`](docs/proyecto/ESTADO_ACTUAL.md).

## Google Calendar

La integración opcional diferencia eventos/citas de tareas y prioridades. Extiende Mi espacio, Semana y Mi día; usa OAuth independiente del login, selección de calendarios, tokens cifrados server-side, outbox local, ETags, sync incremental, webhooks y resolución explícita de conflictos. La guía completa de arquitectura, configuración, endpoints, pruebas y rollout está en [`docs/integrations/google-calendar.md`](docs/integrations/google-calendar.md).

El código por sí solo no habilita la conexión: cada entorno debe aplicar `supabase/migrations/202609110001_google_calendar_integration.sql`, configurar Google Cloud, secrets y Redirect URI, y disponer de un runtime HTTPS que ejecute API routes, webhooks y el cron autenticado.

## Cuenta, prueba y Premium

Supabase Auth gestiona registro, verificación de correo, recuperación y sesión. La prueba dura 15 días desde el primer acceso después de verificar el correo, no pide tarjeta, no genera cobro automático y limita la planificación editable a un horizonte de tres meses. Premium se presenta a **USD 2.99/mes** o **USD 30.99/año** y habilita hoy Fitness y alimentación (`fitness_and_nutrition`) y planificación a cinco años (`five_year_planning`). El análisis avanzado, las recomendaciones con IA y la planificación específica de un año se muestran como **Próximamente** y no están disponibles.

Mercado Pago se abre como checkout externo. Landing y Upgrade obtienen una única URL mediante `billingService`, que resuelve `publicConfig.mercadoPagoCheckoutUrl` desde `NEXT_PUBLIC_MERCADO_PAGO_URL` o su fallback público. No existe todavía webhook ni conciliación automática: el frontend no activa Premium y volver del proveedor tampoco cambia el acceso. Renovación, impuestos, cancelación y reembolsos siguen pendientes de definición y revisión jurídica.

El contenido detallado de Fitness, alimentación y del resto del planner permanece en IndexedDB en el dispositivo; anunciar una capacidad Premium no cambia esa arquitectura local-first.

## Idiomas

Español es canónico y el selector EN continúa habilitado, visible y marcado como **Beta**. Las superficies migradas usan claves estables en `src/i18n/messages` y formatters comunes; un bridge DOM limitado mantiene compatibilidad temporal con pantallas pendientes. El contenido personal y los documentos legales sin revisión no se traducen automáticamente. El lanzamiento completo o retiro de EN requiere confirmación comercial explícita.

## Respaldos y migraciones

Ajustes permite exportar e importar JSON versionado. La importación valida el archivo completo antes de reemplazar datos y migra respaldos de las versiones 1 y 2 al esquema 3. Un respaldo inválido no modifica el planner existente.

## Variables de entorno

Consulta `.env.example`. Las variables públicas cubren Supabase y, opcionalmente, la URL de Mercado Pago y datos legales; Google Calendar añade variables exclusivamente server-side y `CRON_SECRET`. Nunca uses `service_role` en el navegador ni versiones secretos. Cada entorno debe validar sus Redirect URLs y migraciones por separado.

## Deployment

Vercel es el runtime principal configurado desde GitHub y ejecuta `pnpm install --frozen-lockfile` seguido de `pnpm run build:vercel`. El último release funcional comprobado en `mybestversion.life` es `7abddae651f34ff4e086a5b6a278c7032c73466d`. Vinext/Cloudflare Sites permanece como destino explícito adicional del release anterior y no se actualizó en esta publicación.

## CI

GitHub Actions valida pull requests hacia `main` y pushes a `main` con lint, typecheck, pruebas unitarias y build. Los pull requests también ejecutan Playwright en Chromium.

## Limitaciones conocidas

- El planner detallado no se sincroniza entre dispositivos; requiere respaldo para trasladarlo.
- La facturación autoservicio no concilia pagos ni activa Premium automáticamente.
- Falta el vector maestro aprobado del logo.
- La migración i18n explícita es progresiva y no equivale aún a cobertura EN total.
- Google Calendar requiere migración, credenciales OAuth, cifrado, cron y webhook HTTPS configurados por entorno; sin ellos la tarjeta se muestra como no disponible y el planner local continúa funcionando.
- Aunque la landing ya muestra USD 2.99/mes y USD 30.99/año, la operación comercial todavía requiere condiciones de renovación, impuestos, cancelación y reembolsos, además de revisión legal.

Consulta [la integración Google Calendar](docs/integrations/google-calendar.md), [el estado de arquitectura](docs/architecture/current-state.md), [la persistencia](docs/architecture/persistence.md), [la tipografía vigente](docs/brand/typography.md), [el diccionario de producto](docs/brand/product-language-dictionary.md), [los primitives](docs/design-system/primitives.md), [el registro de ADR](docs/decisions/README.md), [la fuente de verdad de marca](docs/brand/README.md) y [el informe de release P1](docs/qa/p1-release-report.md).
