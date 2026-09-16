# Roadmap P2 — Retención y crecimiento amable

**Estado:** P2-A publicado detrás de flags apagados; P2-B/P2-C documentados o parciales. **Fecha de corte:** 2026-09-16. **Owner:** Producto e Ingeniería.

P2 convierte valor ya recibido en retorno, reconocimiento y descubrimiento orgánico. No añade una red social, rankings, publicidad ni automatizaciones comerciales sin consentimiento.

## Guardrails de entrada

- P0 y P1 se conservan como baseline funcional y visual.
- El planner sigue local-first; ningún contenido personal se sincroniza por introducir P2.
- Las funciones de crecimiento se publican detrás de flags, apagados por defecto.
- Compartir nunca toma texto libre automáticamente del planner; permite sólo un titular opcional escrito y revisado explícitamente por la usuaria. Referral, lifecycle y analytics nunca incluyen journal, bienestar, salud, finanzas ni texto libre.
- El almacenamiento local se aísla por cuenta antes de habilitar superficies que compongan o exporten progreso.

## Estado de implementación

- **P2-A implementado:** Weekly Recap, regreso amable, share cards, referrals, taxonomía/métricas P2, reglas lifecycle y aislamiento IndexedDB por cuenta. Las cinco superficies consumen su flag; `premium_contextual_prompts` sólo varía el copy del gate de planificación a 5 años y nunca decide acceso. Los cinco flags permanecen en `false` por defecto.
- **P2-B parcial/documentado:** motion, diseño social, sistema de contenido y reglas lifecycle tienen contratos y documentación; no se han conectado proveedor, email/push ni preferencias granulares de canal.
- **P2-C parcial/documentado:** portal de marca, guías de fotografía/assets, campañas, partnerships, reporting y experimentación tienen fuentes de verdad reutilizables. No se fabricaron assets finales, licencias, campañas, presupuestos ni acuerdos externos.
- **Infraestructura aplicada:** `supabase/migrations/202609160001_p2_growth_analytics.sql` quedó aplicada al proyecto enlazado, con ledger alineado, dry-run posterior sin pendientes y lint remoto sin errores. Analytics/referrals P2 continúan apagados hasta smoke autenticado y revisión legal.
- **Validación y publicación cerradas:** lint, tipos, unitarias, builds Next/Vinext, E2E global y matriz visual P2 aprobaron. El commit funcional `7628074708e379dd5c79b9b76f3102022e25a5a6` pasó CI, llegó a `origin/main` y Vercel Production; el smoke público aprobó. No se activó ningún flag.
- **Calendar:** Google Calendar continúa apagado según `MBV-H-032`; la pausa quedó publicada y verificada con `404 CALENDAR_DISABLED`, sin modificar el funcionamiento del calendario local.

## Etapas

| Etapa | Alcance | Estado al corte | Condición de salida |
| --- | --- | --- | --- |
| 1 · Instrumentación | Taxonomía v2, sanitización, flags y métricas agregadas | Implementada; migración remota aplicada y lint aprobada | Smoke autenticado antes del rollout |
| 2 · Retención | Weekly Recap, regreso amable y reglas lifecycle | Recap/return implementados; envío lifecycle externo no iniciado | Datos reales, sin culpa, omisible, sin envío externo |
| 3 · Crecimiento orgánico | Share cards y referral básico | Implementada detrás de flags; recompensa comercial pendiente | Opt-in, preview, código opaco, atribución sin identidad |
| 4 · Brand Experience | Motion, social, content y guía fotográfica | Sistema documentado; producción de assets finales pendiente | Patrones reproducibles, reduced motion y gobernanza de assets |
| 5 · Escala | Brand Portal, campañas, partnerships y reporting | Portal/reporting preparados; campañas y partnerships sólo documentados | Fuente de verdad navegable y métricas agregadas sin contenido personal |

## Flags

| Flag | Propósito | Default |
| --- | --- | --- |
| `weekly_recap` | Recap integrado en la revisión semanal | `false` |
| `return_experience` | Reentrada amable tras inactividad | `false` |
| `share_cards` | Previsualización y export de progreso | `false` |
| `referrals` | Recomendación post-valor | `false` |
| `premium_contextual_prompts` | Copy contextual del gate real de planificación a 5 años, sin cambiar acceso | `false` |

Activar un flag exige QA de la superficie y evento de exposición si existe un experimento. Las variables públicas de entorno requieren build/deploy para cambiar, por lo que no son un kill switch remoto instantáneo. Los flags no sustituyen migraciones, permisos ni manejo de errores.

Los flags se habilitan en E2E únicamente para probar las superficies. Ese entorno no constituye rollout y no modifica sus defaults de producción.

## Dependencias externas que no se inventan

- Recompensa referral, días Premium o descuentos: decisión comercial pendiente.
- Propiedad server-side del código referral y orden temporal visita → signup: hardening previo a incentivos o rollout amplio.
- Email/push: proveedor, consentimiento persistido y proceso de baja pendientes.
- Fotografía final y logo vectorial: assets y derechos pendientes.
- Premium: precio, periodicidad, impuestos y conciliación de pagos pendientes.

## Métricas de beta

Medir siempre sobre la cohorte observable y reportar el denominador: activación v2, retorno D7/D30, revisión semanal, recap completado, share rate, referral visit/signup/activation y trial → Premium. No usar impresiones o clics aislados como métrica norte.

## Criterio de avance

Una etapa puede avanzar únicamente si lint, tipos, unit, build y pruebas de flujo relevantes pasan; privacidad y accesibilidad no tienen excepción. La activación pública de flags y cualquier deploy siguen siendo decisiones separadas de completar el código.

El candidato no se considera listo para activación pública hasta completar el smoke autenticado, documentar owner/rollback del rollout y resolver las decisiones legales/comerciales que correspondan. La migración ya está aplicada; ninguna aprobación legal o comercial se presume en este roadmap.
