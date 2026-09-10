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
- Catálogos ES/EN tipados con un bridge temporal para superficies legacy

## Sistema de experiencia P1

- Nunito Sans es la única familia tipográfica vigente para interfaz y marca digital.
- `app/globals.css` conserva sólo el orden de entrada; tokens, foundations, layout, primitives y features viven por capas en `src/styles/`.
- Los componentes reutilizables de `src/components/ui/Primitives.tsx` comparten contratos de variantes, estados, foco y accesibilidad.
- La navegación principal contiene exactamente cinco destinos en desktop y mobile: **Inicio, Mi día, Planificar, Mi espacio y Progreso**.
- **Bienestar** y **Finanzas** siguen visibles como accesos secundarios asociados a Mi espacio, no como destinos principales adicionales.
- `pnpm audit:i18n` y `pnpm audit:design-tokens` impiden nueva deuda fuera de los límites revisados.

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

## Cuenta, prueba y Premium

Supabase Auth gestiona registro, verificación de correo, recuperación y sesión. La prueba de 15 días comienza con el primer acceso después de verificar el correo, no pide tarjeta y limita la planificación editable a un horizonte de tres meses. Premium añade planificación a cinco años. `feed_hub` existe como gate técnico, pero no está accesible ni se comunica como disponible.

Mercado Pago se abre como checkout externo. No existe todavía webhook ni conciliación automática: volver del proveedor no activa Premium. Precio, moneda comercial, periodicidad, renovación y reembolsos no están definidos en el repositorio.

## Idiomas

Español es canónico y el selector EN continúa habilitado, visible y marcado como **Beta**. Las superficies migradas usan claves estables en `src/i18n/messages` y formatters comunes; un bridge DOM limitado mantiene compatibilidad temporal con pantallas pendientes. El contenido personal y los documentos legales sin revisión no se traducen automáticamente. El lanzamiento completo o retiro de EN requiere confirmación comercial explícita.

## Respaldos y migraciones

Ajustes permite exportar e importar JSON versionado. La importación valida el archivo completo antes de reemplazar datos y migra respaldos de las versiones 1 y 2 al esquema 3. Un respaldo inválido no modifica el planner existente.

## Variables de entorno

Consulta `.env.example`. Las variables públicas cubren Supabase y, opcionalmente, la URL de Mercado Pago y datos legales. Nunca uses `service_role` en el navegador ni versiones secretos. Cada entorno debe validar sus Redirect URLs y migraciones por separado.

## Deployment

Vercel es el runtime principal configurado desde GitHub y ejecuta `pnpm install --frozen-lockfile` seguido de `pnpm run build:vercel`. Vinext/Cloudflare Sites es un destino explícito adicional. El último despliegue comprobado es P1, SHA funcional `8f240f5b1516d212da65630e36ea3d5a15fd40e9`, Sites versión 29 y despliegue `appgdep_6aa2f93962bc81919311825a6c2bc6b4`, disponible en `https://my-best-version-habitos.maria-delosangelesgt.chatgpt.site`. Esta evidencia no demuestra por sí sola qué SHA está activo en Vercel. `mybestversion.life` todavía no está confirmado como dominio adjunto al Site.

## CI

GitHub Actions valida pull requests hacia `main` y pushes a `main` con lint, typecheck, pruebas unitarias y build. Los pull requests también ejecutan Playwright en Chromium.

## Limitaciones conocidas

- El planner detallado no se sincroniza entre dispositivos; requiere respaldo para trasladarlo.
- La facturación autoservicio no concilia pagos ni activa Premium automáticamente.
- Falta el vector maestro aprobado del logo.
- La migración i18n explícita es progresiva y no equivale aún a cobertura EN total.
- La operación comercial requiere decisiones de precio/condiciones, dominio y revisión legal.

Consulta [el estado de arquitectura](docs/architecture/current-state.md), [la persistencia](docs/architecture/persistence.md), [la tipografía vigente](docs/brand/typography.md), [el diccionario de producto](docs/brand/product-language-dictionary.md), [los primitives](docs/design-system/primitives.md), [el registro de ADR](docs/decisions/README.md), [la fuente de verdad de marca](docs/brand/README.md) y [el informe de release P1](docs/qa/p1-release-report.md).
