# Informe de release P0

Fecha de apertura: **2026-09-08 (America/Bogota, UTC-05:00)**.

## Estado del informe

El candidato P0 local cerró su validación de código, builds, accesibilidad, matriz visual/funcional, capturas y migración remota. Commit, push, despliegue y smoke del artefacto publicado permanecen pendientes y no se atribuyen a la versión actualmente visible.

- SHA base: `53221567be90c3dd2b9e9d47e1dce4be19891cd8`.
- SHA candidato: **PENDIENTE — todavía no existe commit de esta entrega.**
- URL candidata: **PENDIENTE — todavía no se ha desplegado esta entrega.**
- Migración analítica: `202609080001_product_analytics_v2.sql` aplicada; un segundo `db push --linked --dry-run` devolvió `Remote database is up to date`.
- Decisión de lanzamiento: **LISTO PARA COMMIT Y DESPLIEGUE TÉCNICO, SUJETO AL SMOKE DE PRODUCCIÓN. NO LISTO PARA UN LANZAMIENTO COMERCIAL PREMIUM AUTOSERVICIO** mientras no existan webhook/conciliación segura y términos comerciales aprobados.

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
| Smoke de producción | **PENDIENTE DE DEPLOY** | No atribuir estos resultados a la versión actualmente publicada |

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

1. Crear el commit, enviarlo a `origin/main` y desplegar exactamente ese candidato.
2. Hacer smoke de producción y verificar metadata/Open Graph reales después del despliegue.
3. Adjuntar y verificar el dominio personalizado `mybestversion.life`; todavía no está asociado al Site.
4. Implementar webhook y conciliación segura de Mercado Pago antes de ofrecer activación Premium autoservicio.
5. Definir precio, moneda, periodicidad, impuestos, renovación, cancelación y reembolsos.
6. Recibir el master vectorial aprobado; mantener mientras tanto el activo temporal sin rediseñarlo.

## Criterio de salida

El candidato P0 cumple el criterio local funcional, verbal, visual y de QA y la migración requerida ya está aplicada. Puede avanzar a commit y despliegue técnico; sólo después del smoke se podrá afirmar que esa misma versión está operativa en producción. El producto **no está listo para un lanzamiento comercial Premium autoservicio** mientras sigan pendientes la conciliación segura de Mercado Pago y las condiciones comerciales. El master vectorial y el dominio personalizado continúan como dependencias externas explícitas.
