# Auditoría de implementación P2

**Fecha de revisión:** 2026-09-16 (America/Bogota, UTC-05:00).

**Estado:** candidato técnico P2 detrás de flags; migración remota aplicada, sin publicación ni activación de superficies P2.

## Estado previo y alcance auditado

P2 se construyó sobre `main` en `36abeec35a839a8425ab6960f73953034e1e4cbd` (`docs: record Calendar production smoke`), con `origin/main` en el mismo commit al iniciar el cierre. La auditoría preserva el baseline P0/P1: arquitectura local-first, jerarquía de CTA, matriz Trial/Premium, design system, cinco destinos principales, español canónico e inglés Beta.

El working tree contiene además trabajo independiente de Google Calendar. Ese trabajo no se atribuye a P2 ni forma parte de sus criterios de aceptación en este documento.

## Resumen ejecutivo

- **P2-A, producto:** implementado: Weekly Recap, regreso amable, progreso compartible, referral básico, analytics y aislamiento local por cuenta. `premium_contextual_prompts` controla una variante de copy dentro del gate real de planificación a 5 años, sin decidir el acceso ni crear interrupciones globales.
- **P2-B, sistema:** implementado como reglas, contratos y documentación: lifecycle, motion, social design system, content system y dirección de assets.
- **P2-C, escala:** preparado documental y técnicamente, pero no operativo de extremo a extremo: Brand Portal, campañas, partnerships, dashboard de métricas y experimentación.
- **No activado:** los cinco flags P2 continúan en `false` por defecto.
- **Infraestructura aplicada sin rollout:** `202609160001_p2_growth_analytics.sql` se aplicó al proyecto Supabase enlazado después de revisión, dry-run y lint; no se hizo commit, push, deploy ni activación de flags.

## Decisiones de implementación

1. El valor personal precede a sharing, referral o monetización.
2. Compartir es opt-in: abrir, revisar/editar y exportar o iniciar Web Share.
3. Ningún payload de growth o analytics admite journal, ánimo, energía, salud, alimentación, finanzas, identidad o contenido de metas/hábitos/tareas. Sharing nunca toma texto libre automáticamente del planner; el único texto libre permitido es un titular opcional escrito y revisado explícitamente por la usuaria, que no se envía a analytics.
4. Referral utiliza un código opaco `ref_` con 32–64 caracteres hexadecimales minúsculos; no codifica UUID, email, plan ni identidad.
5. El retorno ofrece mover, elegir un mínimo o soltar. Soltar cancela sin borrar.
6. La consistencia de hábitos usa sólo ocurrencias programadas; un registro archivado o no programado no infla el resultado.
7. Premium sólo aparece ante una limitación real; no introduce popup global ni interrumpe la navegación.
8. Analytics usa allowlists por evento tanto en cliente como en SQL; un nombre de propiedad válido no habilita texto arbitrario.
9. La persistencia IndexedDB queda aislada por cuenta antes de componer o exportar progreso. La base legacy original no se elimina.
10. Lifecycle no envía mensajes externos: sólo define reglas locales, preferencias, cooldowns, frequency caps y deduplicación.

## Cobertura por bloque P2

| Bloque | Estado | Resultado verificable |
| --- | --- | --- |
| P2.1 Shareable Progress | Implementado detrás de flag | Tres templates, Story 1080×1920, Feed 1080×1350, Cuadrado 1080×1080, preview, selección de métricas, titular opcional, PNG y Web Share/fallback |
| P2.2 Weekly Recap y retorno | Implementado detrás de flags | Evidencia real hasta hoy, decisiones textuales en recap, preparación de la semana siguiente y acciones directas conservar/mover/soltar en regreso amable |
| P2.3 Referral | Implementado detrás de flag | Enlace opaco estable por cuenta local, copy/copy fallback/Web Share y atribución first-touch de hasta 29 días condicionada por consentimiento analítico |
| P2.4 Loops PLG | Implementado como contrato | Activación, planificación, hábitos, reflexión, Premium, sharing, referral y retorno con momento de valor, métrica y guardrail |
| P2.5 Lifecycle | Parcial, preparado | Reglas tipadas y tests locales; faltan proveedor, persistencia de preferencias, UI, verificación, rebotes y unsubscribe firmado |
| P2.6 Motion | Implementado como sistema | Duraciones, patrones, `prefers-reduced-motion`, foco y límites de performance documentados y cubiertos por guardrails existentes |
| P2.7 Social Design System | Implementado documentalmente | Formatos, safe zones, recetas, seis templates base, do/don't y handoff a Canva/Figma |
| P2.8 Content System | Implementado documentalmente | Pilares, estructuras, esquema de base de contenido, ejemplo ficticio, cadencia, medición y checklist |
| P2.9 Fotografía y assets | Preparado, producción diferida | Guía, shot list, derechos, manifest y estructura; no se inventaron fotografías ni masters sin licencia |
| P2.10 Brand Portal | Implementado documentalmente | Índice navegable MBV Brand System 1.1 y fuentes canónicas de identidad, producto, growth y medición |
| P2.11 Campañas y partnerships | Preparado, ejecución diferida | Brief, compatibilidad, co-branding, privacidad, aprobaciones y checklist; no hay campaña ni partnership activo |
| P2.12 Analytics y experimentación | Implementado localmente | Taxonomía cerrada, funnels, D1/D7/D30 elegible, WAU, recap, sharing, referral, monetización nullable y framework de experimentos |

## Producto implementado

### Weekly Recap

- Reutiliza la revisión semanal existente; no crea una segunda entidad.
- Limita datos a la semana visible y únicamente hasta el día actual.
- Expone hechos de tareas, prioridades, hábitos programados, metas, hitos y reprogramaciones cuando existe relación real.
- Permite cerrar u omitir; `Preparar mi semana` avanza a la semana siguiente.

### Regreso amable

- Detecta ausencia por cuenta y sesión sin usar emoción, energía o contenido personal.
- Ofrece retomar una acción pendiente, moverla a hoy, trabajar en modo mínimo o dejarla atrás.
- Dejar atrás persiste estado `cancelled`; el registro permanece disponible.

### Progreso compartible

- El modelo exportable está sanitizado antes de llegar al Canvas.
- El estudio se carga de forma diferida al abrirlo.
- Usa el símbolo oficial vigente y tokens visuales existentes; no captura el DOM.
- Analytics registra acción, template, formato, superficie y canal, nunca titular, cifras o contenido de la tarjeta.

### Referral

- El prompt aparece sólo después de valor observable.
- El código se genera criptográficamente y el enlace sólo lleva `ref`.
- La atribución first-touch se conserva localmente un máximo de 29 días.
- Sin consentimiento analítico no se transmite atribución. Signup y activación atribuidos son hitos de servidor, no eventos arbitrarios del cliente.
- No existe recompensa, descuento o días Premium prometidos.

### Premium contextual

- El gate permanece dentro de la capacidad limitada y conduce a `/upgrade`.
- No aparece en Mi día o Dashboard sin un límite real.
- `premium_contextual_prompts` se consume únicamente para elegir la descripción del gate de planificación a 5 años. Apagado conserva el copy anterior; encendido usa el mensaje contextual P2. En ambos casos `canAccessFeature()` sigue siendo la única regla de acceso, el CTA continúa en `/upgrade` y Feed Hub no cambia.
- No existe asignación A/B activa.

## Persistencia y aislamiento por cuenta

El planner usa `my-best-version-planner-v4:<ownerId>`. La adopción de una base legacy es explícita y protegida; la base original no se borra. La cola de escrituras se vacía antes de cerrar y los cambios de cuenta usan guards de generación para evitar que una escritura tardía contamine otra cuenta.

La cobertura automatizada principal de aislamiento es unitaria. La prueba E2E de dos cuentas sigue marcada como deuda porque el repositorio de autenticación E2E sólo modela una identidad.

## Analytics, métricas y privacidad

- La lista de eventos cliente/servidor y la metadata permitida están cerradas en TypeScript y duplicadas en SQL.
- D1/D7/D30 usan cohortes observables elegibles y ventanas exactas; no clasifican como abandono a una cuenta que autorizó analytics tarde.
- Recap y sharing usan WAU observable como denominador.
- Paywall → checkout, trial → pago, checkout → pago y renovación devuelven `null`/`Sin instrumentar` cuando no existe el evento server-side o el denominador.
- Referral signup/activation se deriva en servidor; el cliente sólo puede registrar una visita con código válido y consentimiento.
- `experiment_exposure_recorded` está preparado, pero no hay experimentos activos ni servicio de asignación persistente.

La migración `supabase/migrations/202609160001_p2_growth_analytics.sql` se aplicó de forma controlada al proyecto enlazado `yvrvetuzuinoinukrivo`. El ledger local/remoto quedó alineado hasta `202609160001`, el dry-run posterior devolvió `Remote database is up to date` y `db lint --linked --level error` terminó sin resultados. Los flags permanecen apagados: antes de activar analytics/referrals P2 todavía se requiere un smoke autenticado con una cuenta de prueba controlada y la revisión legal correspondiente.

## Flags y rollout

| Flag | Default | Condición antes de habilitar |
| --- | --- | --- |
| `weekly_recap` | `false` | QA final y observabilidad confirmada |
| `return_experience` | `false` | QA final y frecuencia validada |
| `share_cards` | `false` | QA final de exportación y privacidad |
| `referrals` | `false` | revisión legal y smoke autenticado de atribución |
| `premium_contextual_prompts` | `false` | QA aprobado; owner y plan de rollout |

Cada flag conserva control por variable de entorno. Como son variables públicas de build, apagarlas exige un nuevo build/deploy; no constituyen un kill switch remoto instantáneo. Completar código no autoriza activarlo.

## Estado P0/P1 y clasificación de hallazgos

| Alcance | Estado observado | Clasificación |
| --- | --- | --- |
| P0 | Baseline accesible y responsive conservado; matriz histórica completa en verde | Sin regresión detectada |
| P1 | Flujos de activación, Trial/Premium, planificación y rutas públicas conservados | Sin regresión detectada |
| Smoke remoto P2 no ejecutado | La migración está aplicada, pero no se activaron flags ni se generó telemetría sintética en producción | **BLOQUEADOR DE ACTIVACIÓN**, no de merge detrás de flags |
| Revisión legal de referral/política | Requiere decisión de responsable legal/fundadora | **BLOQUEADOR DE ACTIVACIÓN** |
| Lifecycle externo, assets, campañas y experimentos activos | Dependencias/owners externos aún no disponibles | **DEUDA P2-B/P2-C** |
| E2E de dos cuentas reales | Cubierto unitariamente; repositorio E2E sólo modela una identidad | **DEUDA DE QA** |
| Google Calendar apagado | Cambio independiente presente en el mismo working tree | **NO RELACIONADO CON P2** |

## Archivos principales P2

### Creados

- Dominio: `src/domain/featureFlags.ts`, `lifecycle.ts`, `shareCards.ts`, `weeklyRecap.ts` y sus pruebas.
- Producto: `src/features/dashboard/ReturnExperienceCard.tsx`, `src/features/sharing/**`.
- Servicios/persistencia: `src/services/referralAttributionService.ts`, `returnExperienceService.ts`, `localPlannerClaimService.ts`, `src/repositories/local/LegacyPlannerClaimRepository.ts` y pruebas relacionadas.
- i18n/estilos: `src/i18n/messages/features/sharing.ts`, `src/styles/features/sharing.css`.
- Datos: `supabase/migrations/202609160001_p2_growth_analytics.sql`, `tests/product-growth-analytics-sql.test.ts`.
- Producto/analytics/marca: `docs/product/p2-roadmap.md`, `product-growth-loops.md`, `weekly-recap.md`, `referrals.md`, `shareable-progress.md`, `lifecycle.md`, `docs/analytics/**`, `docs/design-system/motion.md`, `docs/marketing/**` y extensiones de `docs/brand/**`.

### Modificados

- Integración de producto: `app/PlannerApp.tsx`, `src/features/planning/WeeklyPlanView.tsx`, `src/features/progress/ProgressPage.tsx`, `src/features/dashboard/DashboardPage.tsx` y `src/hooks/usePlanner.ts`.
- Cuenta/plataforma: `src/hooks/useAccount.tsx`, `src/domain/platform.ts`, `src/features/platform/PlatformPage.tsx`, `app/api/platform/route.ts`.
- Analytics/legal: `src/domain/productAnalytics.ts`, `app/api/events/route.ts`, servicios de analytics/soporte, `src/features/legal/**` y `src/lib/legalConfig.ts`.
- Persistencia: `src/repositories/local/IndexedDbPlannerRepository.ts`, interfaces, servicio del planner, cola de escrituras y repositorio E2E.
- Configuración/QA: `.env.example`, `playwright.config.ts`, `e2e/app.spec.ts`, catálogos ES/EN y estilos semánticos existentes.

El inventario anterior es P2, no el listado completo del working tree compartido.

## Riesgos residuales y decisiones externas

1. **Smoke remoto:** la migración P2 está aplicada y el esquema remoto pasó lint, pero `/api/events` y las métricas P2 aún requieren un smoke autenticado/superadmin controlado antes de activar flags.
2. **Atribución referral:** el servidor valida el formato opaco, pero todavía no mantiene un registro de propiedad del código ni exige en SQL que la visita anteceda al signup dentro de una ventana propia. Con recompensas apagadas el riesgo es de calidad de atribución; debe endurecerse antes de activar incentivos o un rollout amplio.
3. **Legal:** privacidad/cookies describen referral opaco, pero falta decidir con responsable legal/fundadora si el cambio exige nueva versión de política y reconsentimiento.
4. **Lifecycle:** no hay proveedor, centro de preferencias, baja firmada ni política operativa de rebotes/supresión.
5. **Assets:** faltan logo vectorial maestro, fotografía con derechos y templates editables aprobados. La documentación no sustituye esos entregables.
6. **Campañas/partnerships:** existen contratos de trabajo, no campañas, acuerdos o claims aprobados.
7. **Experimentación:** los flags son controles de rollout en build, no asignación A/B ni kill switch remoto instantáneo; no se deben reportar resultados experimentales.
8. **Premium:** persisten las decisiones comerciales y la instrumentación server-side de pago/renovación ya registradas como deuda P1.
9. **i18n:** EN continúa Beta, aunque la matriz P2 completa de seis viewports en claro/oscuro quedó aprobada tanto en ES como en EN.
10. **Local-first:** continúa sin sincronización entre dispositivos; aislamiento por cuenta reduce contaminación local, no pérdida por borrado del navegador.

## Estado de cierre

El alcance P2-A está implementado detrás de flags y sus flujos dirigidos tienen evidencia favorable. P2-B queda listo como sistema de reglas y documentación, no como operación multicanal. P2-C establece gobierno, contratos y medición, pero todavía depende de smoke autenticado, assets, owners, proveedor y decisiones comerciales/jurídicas.

La suite unitaria completa (44 archivos, 243 pruebas), el build Next, el build Vinext y la suite Playwright completa previa (82 aprobadas, 12 saltadas por diseño, 0 fallos) quedaron aprobados; después de cablear el flag Premium, su E2E dirigido volvió a aprobar en desktop y mobile. El código queda **listo para revisión/merge técnico con flags apagados**, pero no listo para activar P2 en producción hasta completar smoke autenticado, revisión legal y ownership de rollout. No hubo commit, push ni deploy en este cierre.
