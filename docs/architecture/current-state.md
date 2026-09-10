# Arquitectura vigente

**Corte verificado:** 2026-09-09. Este documento describe el código actual; los ADR explican por qué existen sus límites.

## Mapa de capas

```text
React / features
  ↓
hooks y controladores (`usePlanner`, `useAccount`, `useSupport`)
  ↓
services
  ↓
interfaces de repository
  ↓
Dexie / IndexedDB          Supabase y APIs propias          Mercado Pago externo
contenido del planner      cuenta y metadatos mínimos       inicio de checkout
```

Las pantallas no acceden directamente a IndexedDB, Supabase ni APIs externas. Las reglas calculables viven en `src/domain`; las fechas locales del planner en `src/lib/dates.ts`.

## Rutas y navegación

React Router gestiona la experiencia cliente. Los cinco destinos conceptuales son Inicio (`/app/dashboard`), Mi día (`/app/today`), Planificar (`/app/planning` y sus vistas), Mi espacio (`/app/life-hub` y módulos personales) y Progreso (`/app/progress`). Bienestar (`/app/health`) y Finanzas (`/app/finance`) son accesos secundarios de Mi espacio, visibles también en escritorio.

Se conservan deep links y redirects, entre ellos `/app/challenges`, `/app/mood`, `/app/life-hub/fitness`, `/app/feed`, `/app/profile`, `/app/pqr` y `/admin`. El inventario ampliado está en `docs/information-architecture-refactor.md`.

## Autenticación y acceso

Supabase Auth ofrece email/contraseña y, cuando están configurados, Google y enlace mágico. El correo debe verificarse antes de acceder al producto. `useAccount` obtiene identidad y estado de acceso; la protección de rutas ocurre antes de montar el planner. La prueba dura 15 días desde el primer acceso verificado. Los estados `expired` y `blocked` bloquean el producto protegido; `superadmin` habilita la plataforma privada tras comprobación remota.

## Datos locales y remotos

- **IndexedDB/Dexie:** perfil funcional local, visión, metas, tareas, hábitos, diario, bienestar, fitness, finanzas, imágenes y respaldos.
- **Supabase:** identidad, rol, trial/acceso, preferencias, consentimientos, solicitudes de privacidad, soporte y eventos de producto minimizados.
- **Sin sincronización:** el contenido detallado del planner no se sincroniza entre dispositivos ni se envía a Supabase por estos flujos.
- **Backups:** JSON versionado, validado por Zod antes del reemplazo transaccional.

## Soporte, plataforma y analytics

`/api/feedback`, `/api/events`, `/api/marketing-preference` y `/api/platform` vuelven a validar la sesión. `/platform` exige rol `superadmin` en servidor y RLS. La analítica propia es opcional, minimizada y no registra contenido personal, email, nombres, tokens ni texto libre. La referencia operativa completa está en `docs/PRODUCT_SUPPORT_PLATFORM.md`.

## Facturación

Mercado Pago se abre como checkout externo mediante una URL configurable. No existe webhook, validación de firma ni conciliación automática; volver del proveedor no activa Premium. La activación vigente es una operación administrativa protegida. Precio, moneda comercial, periodicidad y condiciones no están definidos en el repositorio.

## Internacionalización

Español es el idioma canónico y EN continúa visible y operativo como **Beta** mientras su alcance comercial no está decidido. `src/i18n/messages` aporta claves estables y catálogos tipados; `formatters.ts` centraliza fechas, números, moneda y plurales. `I18nProvider` mantiene temporalmente un bridge DOM heredado para superficies no migradas, limitado por `data-i18n-explicit`, `data-no-translate` y `translate="no"`. Nunca debe transformar contenido de usuaria. `scripts/audit-i18n.mjs` impide perder paridad o aumentar la deuda heredada.

La decisión comercial de lanzar EN como idioma completo o retirarlo de la oferta no está documentada. P1 aplica temporalmente el Caso B: mantiene la funcionalidad, la marca como Beta y no presenta la migración parcial como cobertura total.

### Cobertura explícita y bridge

Quedan fuera del MutationObserver mediante `data-i18n-explicit`:

- landing `/`;
- `/trial`, `/signup`, `/login`, `/verify-email`, `/forgot-password` y `/upgrade` en su contenido de producto;
- header y footer compartidos de `PublicFrame`;
- banner, preferencias y selector de cookies;
- onboarding completo;
- `LanguageSwitcher`.

Las páginas legales permanecen deliberadamente en español y usan `translate="no"` / `data-no-translate` hasta contar con traducción jurídicamente revisada. Settings, Help, Support, Journal, Fitness, Finance y las demás features no listadas siguen usando el bridge legacy para copy de interfaz. En esas rutas, el contenido dinámico auditado —páginas y revisiones de diario, FAQ remotas, nombres de objetivos físicos, comidas, entrenamientos, ejercicios, cuentas, fondos, deudas, compras, categorías, movimientos y compromisos— tiene límites `data-no-translate`; los valores de campos nunca pasan por el observer.

Esta cobertura es transitoria. Añadir `data-i18n-explicit` a una superficie sólo está permitido después de migrar todo su copy propio a claves estables.

## Design System

Nunito Sans es la fuente vigente. Los tokens se separan progresivamente por valores de marca, semántica y componentes. Lucide React es el sistema iconográfico principal; Recharts renderiza gráficas específicas. Las primitives compartidas viven en `src/components/ui` y sus contratos están en `docs/design-system`.

## Privacidad y límites actuales

- El contenido local puede perderse si se borra el almacenamiento del navegador sin respaldo.
- No hay sincronización multidispositivo.
- La eliminación remota de cuenta requiere el procedimiento documentado para adjuntos privados.
- La facturación autoservicio no está conciliada.
- `mybestversion.life` no está confirmado como dominio adjunto al Site publicado.
- El logo activo depende de un raster dentro de SVG; falta el master vectorial.
- La cobertura i18n explícita es progresiva y el bridge legacy sigue activo.
