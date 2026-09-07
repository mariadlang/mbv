# My Best Version Planner

Aplicación web local-first para convertir visión personal en metas, hábitos, acciones semanales y reflexión diaria. Acompaña sin culpa: los días no programados no reducen la constancia.

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

## Desarrollo

Requiere Node.js 22.13 o superior y pnpm 11.16.

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
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

## Respaldos y migraciones

Ajustes permite exportar e importar JSON versionado. La importación valida el archivo completo antes de reemplazar datos y migra respaldos de las versiones 1 y 2 al esquema 3. Un respaldo inválido no modifica el planner existente.

## Deployment

Vercel publica desde GitHub y ejecuta `pnpm install --frozen-lockfile` seguido de `pnpm run build:vercel`. Vinext se conserva solo para la publicación adicional en Cloudflare Sites.

## CI

GitHub Actions valida pull requests hacia `main` y pushes a `main` con lint, typecheck, pruebas unitarias y build. Los pull requests también ejecutan Playwright en Chromium.

Consulta [la arquitectura](docs/architecture/architecture.md), [la persistencia](docs/architecture/persistence.md) y [las decisiones técnicas](docs/decisions/0001-local-first.md).
