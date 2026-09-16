# Informe de release P2

**Fecha de apertura:** 2026-09-16 (America/Bogota, UTC-05:00).

**Estado:** release técnico publicado en producción con los cinco flags P2 apagados; no existe activación P2.

## Alcance y baseline

- Rama auditada: `main`.
- SHA base: `36abeec35a839a8425ab6960f73953034e1e4cbd`.
- `origin/main` apuntaba al mismo SHA al iniciar el cierre.
- Flags P2: apagados por defecto en runtime/configuración.
- Commit funcional publicado: `7628074708e379dd5c79b9b76f3102022e25a5a6` (`feat: pause Calendar and prepare P2 retention`), enviado a `origin/main` y desplegado por Vercel Production.
- Migración `202609160001_p2_growth_analytics.sql`: aplicada al proyecto enlazado `yvrvetuzuinoinukrivo`; ledger alineado, dry-run posterior sin pendientes y lint remoto sin errores.

Este informe cubre Weekly Recap, retorno, share cards, referral, analytics P2, aislamiento local por cuenta, la variante contextual Premium y los contratos documentales de lifecycle/brand/growth. El flag `premium_contextual_prompts` cambia únicamente el copy del gate real de planificación a 5 años; no controla acceso, no cambia Feed Hub y permanece apagado por defecto. La pausa independiente de Google Calendar comparte el commit de release, pero queda fuera de los criterios funcionales P2 de este informe.

## Resultado por superficie

| Superficie | Evidencia funcional | Estado provisional |
| --- | --- | --- |
| Weekly Recap | datos hasta hoy, hechos reales, campos de revisión y avance a semana siguiente | Aprobado en E2E dirigido desktop/mobile |
| Regreso amable | ausencia simulada, tarjeta global y acción cancelada sin borrar | Aprobado en E2E dirigido desktop/mobile |
| Share cards | privacidad, tres templates, tres formatos exactos y descarga PNG | Aprobado en E2E dirigido desktop/mobile |
| Referral | código opaco, copia/fallback, persistencia por cuenta y captura consentida de visita referral durante signup | Aprobado en E2E dirigido desktop/mobile; migración server-side aplicada, smoke autenticado pendiente |
| Premium contextual | gate sólo en limitación real, copy gobernado por flag y navegación sin interrupciones | Aprobado con flag real en E2E dirigido desktop/mobile; default de producción apagado |
| Inglés Beta P2 | retorno, recap, share y referral visibles con copy EN | Aprobado en flujo dirigido desktop/mobile |
| Analytics/SQL | allowlists cliente y tests estáticos del contrato SQL; métricas agregadas | Migración remota aplicada y esquema sin errores de lint; smoke autenticado pendiente |
| Aislamiento por cuenta | namespace, adopción legacy y cola de escrituras | Aprobado en pruebas dirigidas; E2E de dos identidades pendiente |

## Pruebas ejecutadas

| Comando / grupo | Resultado conocido al corte |
| --- | --- |
| `pnpm lint` | Aprobado |
| `pnpm exec tsc --noEmit` | Aprobado |
| `pnpm build` | Aprobado (Next) |
| `pnpm audit:i18n` | Aprobado: 1.404 claves ES/EN; avisos de uso dinámico no bloqueantes |
| `pnpm audit:design-tokens` | Aprobado: 291/291 coincidencias dentro del baseline |
| `pnpm test:contrast` | Aprobado: 22/22 pares claro/oscuro |
| Unitarias dirigidas P2 | Aprobadas en invocaciones de share cards, recap/return, analytics/lifecycle, persistencia y SQL |
| E2E recap + retorno | Aprobado: 4/4 desktop/mobile |
| E2E share + referral + Premium | Aprobado: 6/6 desktop/mobile |
| E2E idioma inglés actualizado | Aprobado: 2/2 desktop/mobile |
| E2E matriz P2 de reflow | Aprobado: 1/1, seis viewports × claro/oscuro × ES/EN Beta |
| `git diff --check` | Aprobado en el cierre; sólo avisos normales LF→CRLF |
| `pnpm test` completo | Aprobado: 44 archivos, 243 pruebas |
| `pnpm build:vinext` | Aprobado con configuración pública de prueba no persistida |
| `pnpm test:e2e` completo | Aprobado: 82 pruebas, 12 saltadas por diseño, 0 fallos (17,6 min) |
| CI del commit publicado | GitHub Actions `35160635628`: lint, typecheck, unit-tests y build aprobados; E2E omitido por diseño en push directo |
| Smoke público de producción | Aprobado: dominio y 21 rutas públicas `200`; política/robots/sitemap correctos; Calendar status `404 CALENDAR_DISABLED` y mantenimiento `204` |
| Supabase lint/dry-run/push | Aprobado: migración aplicada; ledger local/remoto hasta `202609160001`, dry-run posterior al día y lint remoto sin errores |

Los resultados dirigidos, la suite completa previa y la certificación del esquema remoto son evidencia válida, pero no sustituyen el smoke autenticado ni autorizan activar flags.

## Matriz visual P2

La prueba automatizada `[P2-QA] growth surfaces reflow in every required viewport and color mode` verifica Progreso + referral, modal de share, Weekly Recap, retorno y gate Premium. En cada combinación comprueba render, ausencia de overflow horizontal y ausencia de `console.error`/`pageerror`.

| Viewport | ES claro | ES oscuro | EN claro | EN oscuro |
| --- | --- | --- | --- | --- |
| 375×812 | Aprobado | Aprobado | Aprobado | Aprobado |
| 390×844 | Aprobado | Aprobado | Aprobado | Aprobado |
| 430×932 | Aprobado | Aprobado | Aprobado | Aprobado |
| 768×1024 | Aprobado | Aprobado | Aprobado | Aprobado |
| 1366×768 | Aprobado | Aprobado | Aprobado | Aprobado |
| 1440×900 | Aprobado | Aprobado | Aprobado | Aprobado |

**Lectura correcta:** español canónico e inglés Beta cubren el cruce completo de 6 viewports × 2 temas para las superficies P2 indicadas. El flujo EN adicional desktop/mobile continúa validando navegación y copy fuera de esa matriz.

## Screenshots de evidencia

| Archivo | Dimensión verificada | Superficie / estado |
| --- | ---: | --- |
| `docs/qa/screenshots/p2-share-390x844-light.png` | 390×844 | estudio de tarjeta, mobile claro |
| `docs/qa/screenshots/p2-return-430x932-light.png` | 430×932 | regreso amable, mobile claro |
| `docs/qa/screenshots/p2-premium-1366x768-dark.png` | 1366×768 | limitación Premium contextual, desktop oscuro |
| `docs/qa/screenshots/p2-recap-1440x900-dark.png` | 1440×900 | Weekly Recap, desktop oscuro |

Las capturas son del viewport, no un `fullPage` cosido, para evitar posiciones artificiales de elementos fijos. La matriz automatizada cubre los tamaños restantes aunque no genere una captura por combinación.

## Privacidad y seguridad verificadas

- Share cards no toman ni renderizan automáticamente el título privado de una tarea. El titular opcional es texto escrito explícitamente por la usuaria, visible en preview y excluido de analytics.
- Referral sólo expone `ref` y un código opaco válido; no incluye ID E2E ni email.
- El evento de visita atribuida se envía únicamente después de consentimiento analítico y no contiene el email de signup.
- Analytics rechaza metadata fuera del allowlist específico del evento.
- Los aliases históricos de share no duplican el numerador de las métricas nuevas.
- Ausencia, ánimo, energía, salud, finanzas y texto libre no son triggers de growth/lifecycle.

## Accesibilidad, motion y performance

- Los flujos nuevos usan diálogo/región/status con nombres accesibles y cierre explícito.
- El modal conserva el contrato compartido de foco, Escape, bloqueo de scroll y retorno al disparador.
- El canvas tiene resumen textual accesible; la imagen no es la única representación del resultado.
- Reflow sin overflow fue comprobado en 375, 390, 430, 768, 1366 y 1440 px.
- `prefers-reduced-motion` conserva el estado final e impide que la comprensión dependa de animación.
- El estudio de sharing se carga sólo al abrirlo y no añade captura del DOM o render continuo.

La herramienta `agent-browser` no estaba instalada en el entorno. La validación de navegador se ejecutó con la suite Playwright equivalente del repositorio, incluyendo consola, overflow, desktop, mobile, temas y screenshots.

## Incidencias y límites de evidencia

1. Una primera ejecución unitaria completa detectó expectations obsoletas para el patrón exacto de referral y la sección de personalización; las pruebas se actualizaron al contrato real y la repetición completa final aprobó.
2. Las primeras capturas `fullPage` podían coser un modal fijo en una posición artificial; se reemplazaron por capturas de viewport y se verificaron sus dimensiones.
3. La prueba E2E de aislamiento entre dos identidades está aplazada porque el repositorio E2E actual representa una sola cuenta; las pruebas unitarias cubren namespace, adopción legacy y carrera de escrituras.
4. EN sigue siendo Beta. El cruce visual completo se ejecutó en ES y EN para seis viewports y ambos temas; esto no cambia su estatus comercial.
5. La versión visible de la política fue actualizada, mientras `LEGAL_VERSION`/versión de cookies permanece en la versión anterior. Debe decidirse con revisión legal si el cambio material exige reconsentimiento antes del rollout.
6. Existe evidencia remota del ledger y lint de la migración SQL P2, además del smoke público del deployment. No existe todavía telemetría P2 ni smoke autenticado de flags porque las superficies permanecen apagadas.
7. Alternar Vinext con los tipos generados por Next deja `.next/types` incompatible para un `tsc` posterior; el cierre regeneró rutas con `next typegen`, repitió TypeScript en verde y restauró el import estable de Vinext en `next-env.d.ts`.
8. Referral valida un código opaco, pero el backend todavía no registra su propiedad ni fuerza en SQL el orden visita → signup dentro de una ventana propia. El flag permanece apagado y no existe recompensa; endurecer esta relación es requisito para incentivos o rollout amplio.

## Gates antes de merge y antes de rollout

### Merge técnico con flags apagados

- [x] Lint, tipos, build Next, i18n, tokens y contraste.
- [x] E2E dirigidos de las superficies P2.
- [x] Evidencia visual ES en seis viewports y ambos temas.
- [x] Suite unitaria completa final.
- [x] Build Vinext final.
- [x] Suite Playwright completa previa en verde y repetición dirigida final de Premium/matriz visual tras el último cableado.
- [x] Restaurar/verificar `next-env.d.ts` estable después de los builds.
- [x] Repetir `git diff --check` y revisar inventario final.

### Activación en producción

- [x] Revisar y aplicar la migración P2 en Supabase con lint/dry-run y postcheck.
- [ ] Ejecutar smoke autenticado de `/api/events` y métricas.
- [ ] Endurecer propiedad y orden temporal de referral antes de incentivos o rollout amplio.
- [ ] Resolver revisión legal de referral, política/cookies y reconsentimiento.
- [ ] Definir owner, cohortes y plan de rollback de cada flag.
- [ ] No activar lifecycle externo, recompensas referral, campaña, partnership o experimento sin sus dependencias explícitas.

## Criterio provisional de salida

P2-A presenta evidencia técnica local, de esquema remoto y de publicación sólida y quedó **publicado con flags apagados**. No está listo para activar: la revisión legal, el smoke autenticado y el plan de rollout son gates obligatorios. Lifecycle multicanal, assets finales, campañas, partnerships y experimentos activos permanecen fuera del release operativo; `premium_contextual_prompts` ya controla su variante de copy, pero no está activado.

El release funcional se consolidó en `7628074708e379dd5c79b9b76f3102022e25a5a6`, pasó CI, se envió a `origin/main` y Vercel lo publicó en Production. Esta publicación no activó ningún flag P2.
