# Informe de release P0

Fecha de apertura: **2026-09-08 (America/Bogota, UTC-05:00)**. Cierre técnico: **2026-09-09**.

## Estado del informe

El candidato P0 cerró su validación de código, builds, accesibilidad, matriz visual/funcional, capturas y migración remota. El commit funcional fue enviado a `origin/main`, guardado como versión 27 de Sites, publicado y verificado en producción.

- SHA base: `53221567be90c3dd2b9e9d47e1dce4be19891cd8`.
- SHA funcional publicado: `5c5f5a0bfd342a4b731fa927f992d7233959006d`.
- URL publicada: `https://my-best-version-habitos.maria-delosangelesgt.chatgpt.site`.
- Sites: versión 27, despliegue `appgdep_6aa199690ba08191a458b52f4d5abcc4`, estado `succeeded`, revisión de entorno 1.
- Migración analítica: `202609080001_product_analytics_v2.sql` aplicada; un segundo `db push --linked --dry-run` devolvió `Remote database is up to date`.
- Decisión de lanzamiento: **APROBADO PARA RELEASE TÉCNICO P0. NO LISTO PARA UN LANZAMIENTO COMERCIAL PREMIUM AUTOSERVICIO** mientras no existan webhook/conciliación segura y términos comerciales aprobados.

## Pruebas de código

| Comprobación | Resultado conocido | Evidencia/alcance |
| --- | --- | --- |
| `pnpm lint` | Aprobado | ESLint sin errores sobre el candidato final |
| `pnpm typecheck` | Aprobado | TypeScript sin errores sobre el candidato final |
| `pnpm test` | 20 archivos y 96 pruebas aprobadas | Incluye acceso transversal, histórico mensual, activación v2, consentimiento/cola analítica y soporte |
| `pnpm test:contrast` | 12/12 pares aprobados | Seis pares en modo claro y seis en modo oscuro |
| `pnpm build` | Aprobado | Build de producción Next.js, incluida la pieza Open Graph |
| `pnpm build:vinext` | Aprobado | Artefacto de Sites/Vinext generado correctamente |
| Playwright | 66 aprobadas, 8 omitidas intencionalmente, 0 fallos | Suite completa; los skips evitan repetir cobertura por proyecto o activan utilidades sólo bajo una variable explícita |
| Migración Supabase | Aplicada y verificada | Segundo dry-run enlazado: `Remote database is up to date` |
| Smoke de producción | Aprobado | Landing/trial, dashboard, Mi día, Semana, Hábitos y Upgrade; sin overflow horizontal ni errores de consola; Open Graph 1200×630 |

Estos resultados deben actualizarse si una ejecución posterior cambia el working tree.

## Matriz de rutas públicas

| Ruta | 375×812 | 390×844 | 430×932 | 768×1024 | 1366×768 | 1440×900 |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado |
| `/trial` | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado |
| `/signup` | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado |
| `/login` | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado |
| `/verify-email` | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado |
| `/forgot-password` | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado |
| `/upgrade` | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado |
| `/privacy` | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado |
| `/terms` | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado |

Resultado agregado: **9 rutas × 6 viewports aprobadas**.

## Matriz de rutas de producto

| Ruta | 375×812 | 390×844 | 430×932 | 768×1024 | 1366×768 | 1440×900 |
| --- | --- | --- | --- | --- | --- | --- |
| `/app/dashboard` | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado |
| `/app/today` | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado |
| `/app/planning` | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado |
| `/app/planning/weekly` | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado |
| `/app/habits` | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado |
| `/app/progress` | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado |
| `/app/journal` | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado |
| `/app/finance` | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado |
| `/app/health` | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado |
| `/app/settings` | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado | Aprobado |

Resultado agregado: **10 rutas × 6 viewports aprobadas**.

## Validaciones funcionales obligatorias

- [x] Sin scroll horizontal involuntario.
- [x] Textos y CTA sin cortes.
- [x] Landing y trial describen la misma prueba.
- [x] Header y drawer móvil funcionan.
- [x] Signup explica cuenta, consentimientos y trial.
- [x] Las cuatro rutas del onboarding crean una primera acción conectada.
- [x] Paywall, meses y fechas bloqueadas usan la matriz correcta.
- [x] Modo oscuro legible en superficies críticas.
- [x] Focus visible y navegación por teclado en menús y modales.
- [x] Sin errores de consola o `pageerror` no explicados.
- [x] Sin datos demo presentados como propios.
- [x] Días no programados no reducen constancia.
- [x] Deep links y refresh funcionan.
- [x] Cerrar sesión no elimina la información local.
- [x] Zoom al 200% conserva contenido y operación.
- [x] `prefers-reduced-motion` continúa reduciendo animaciones.

## Accesibilidad implementada y verificada

- Foregrounds semánticos para texto secundario, marca, success, warning y danger.
- Focus visible global, en `summary`, controles de energía y plan semanal.
- Targets críticos de 44 × 44 px para puntero grueso.
- Trampa de foco, Escape y restauración del foco en drawer móvil y preferencias de cookies.
- Estados de hábitos diferenciados con texto, icono y `aria-pressed`; no dependen sólo del color.
- Gráficos principales con `role="img"`, nombre accesible y/o explicación textual.
- Script de contraste con umbral 4.5:1 para texto y 3:1 para focus.

## Consola

| Superficie | `console.error` | `pageerror` | Estado |
| --- | --- | --- | --- |
| Públicas | 0 | 0 | Aprobado en E2E local |
| Producto | 0 | 0 | Aprobado en E2E local |
| Onboarding | 0 | 0 | Aprobado en E2E local |
| Paywall/upgrade | 0 | 0 | Aprobado en E2E local |

## Screenshots P0

Las ocho referencias se generaron desde el candidato validado y fueron inspeccionadas visualmente:

| Superficie | Archivo previsto | Estado |
| --- | --- | --- |
| Landing | `docs/qa/screenshots/p0-landing-1440x900.png` | Capturada e inspeccionada |
| Trial | `docs/qa/screenshots/p0-trial-1440x900.png` | Capturada e inspeccionada |
| Signup | `docs/qa/screenshots/p0-signup-1440x900.png` | Capturada e inspeccionada |
| Onboarding | `docs/qa/screenshots/p0-onboarding-390x844.png` | Capturada e inspeccionada |
| Dashboard | `docs/qa/screenshots/p0-dashboard-1440x900.png` | Capturada e inspeccionada |
| Mi día | `docs/qa/screenshots/p0-today-390x844.png` | Capturada e inspeccionada |
| Hábitos | `docs/qa/screenshots/p0-habits-1440x900.png` | Capturada e inspeccionada |
| Upgrade/paywall | `docs/qa/screenshots/p0-upgrade-1440x900.png` | Capturada e inspeccionada |

## Incidencias resueltas en código

- Mensajes de marca y CTA contradictorios.
- Open Graph con monograma y slogan retirados.
- Diferencia verbal entre tres meses y tres años.
- Meses del trial editables fuera del horizonte.
- Copy de expiración que no explicaba explícitamente la conservación local.
- Activación dependiente de crear una meta.
- Cola analítica sin vínculo explícito al consentimiento.
- Retiro de consentimiento no sincronizado entre pestañas y sesiones renovadas sin exigir actividad real.
- Métricas de onboarding/activación calculadas sobre una base incompatible con la analítica opcional.
- Límite de trial aplicado sólo en la tarjeta mensual y no en todas las entradas con fecha.
- Actividades históricas del mes omitidas o duplicadas al combinarlas con tareas y eventos enlazados.
- Foregrounds semánticos y focus insuficientes en superficies auditadas.
- Uso impreciso de “Pendiente” en Hábitos.

## Pendientes y riesgos residuales

1. Adjuntar y verificar el dominio personalizado `mybestversion.life`; todavía no está asociado al Site.
2. Implementar webhook y conciliación segura de Mercado Pago antes de ofrecer activación Premium autoservicio.
3. Definir precio, moneda, periodicidad, impuestos, renovación, cancelación y reembolsos.
4. Recibir el master vectorial aprobado; mantener mientras tanto el activo temporal sin rediseñarlo.

## Criterio de salida

El release técnico P0 cumple el criterio funcional, verbal, visual y de QA; la migración requerida está aplicada y el mismo SHA fue verificado en producción. El producto **no está listo para un lanzamiento comercial Premium autoservicio** mientras sigan pendientes la conciliación segura de Mercado Pago y las condiciones comerciales. El master vectorial y el dominio personalizado continúan como dependencias externas explícitas.
