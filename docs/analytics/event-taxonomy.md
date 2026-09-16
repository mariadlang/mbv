# Taxonomía de eventos de producto

**Versión:** 2. **Estado:** lista cerrada. **Owner:** Producto + Data/Ingeniería.

El cliente sólo puede enviar nombres declarados en `clientProductEventNames`. Los hitos de servidor no son aceptados desde el cliente. `record_user_event` vuelve a validar nombre, feature, timestamp, rate limit, dedupe y metadata.

## Propiedades

No existe una bolsa global de propiedades permitidas. Cada evento declara sus propias claves y valores cerrados en `src/domain/productAnalytics.ts`, y SQL repite ese contrato como defensa en profundidad. `route` sólo acepta rutas conocidas sin query/hash; `period` sólo enums o fecha/semana ISO; `days_away` es entero 0–3650; `referral_id` es opaco y usa el patrón aprobado. Una palabra corta no pasa sólo por estar bajo `source`, `result`, `section` u otra clave conocida.

Prohibidas siempre: email, nombre, IDs de terceros, journal, metas/hábitos/tareas escritos, texto libre, ánimo, energía, salud, peso, comida, finanzas, montos, contenido de tarjeta, URL completa, query strings, errores con payload, tokens o secretos.

## Adquisición y cuenta

| Evento | Trigger / descripción | Propiedades permitidas | Funnel | Owner |
| --- | --- | --- | --- | --- |
| `landing_primary_cta_clicked` | CTA principal pulsado | source, route, version | acquisition | Growth |
| `signup_started` / `signup_completed` | inicio / confirmación de signup | source, route, version | account | Growth + Account |
| `email_verified` | confirmación del proveedor | source, version | account | Account |
| `trial_started` | trial confirmado | source, version | monetization | Monetization |
| `login_succeeded` | sesión autenticada | source, version | account | Account |
| `app_session_started` | nueva sesión deduplicada | source, version | retention | Product Analytics |
| `sign_up_completed` | alias legacy aún aceptado | source, version | account; retirar tras migración | Product Analytics |
| `second_session_started` | segunda sesión derivada por servidor | source, version | activation | Product Analytics |

## Activación y uso

| Evento | Trigger / descripción | Propiedades permitidas | Funnel | Owner |
| --- | --- | --- | --- | --- |
| `onboarding_started` / `onboarding_focus_selected` / `onboarding_completed` | etapas reales completadas | source, view, result, version según evento | activation | Activation |
| `first_outcome_created` | primer resultado guardado | source, view, version | activation | Activation |
| `first_action_created` / `first_action_completed` | primera acción conectada / completada | source, result, version según evento | activation | Activation |
| `first_habit_recorded` | primer registro consciente | source, version | activation | Activation |
| `action_rescheduled` | acción movida conscientemente | source, version | activation | Activation |
| `activation_completed` | todos los hitos v2 en 7 días | source, result, version | activation; servidor | Product Analytics |
| `goal_created`, `annual_plan_updated`, `monthly_plan_updated`, `week_planned` | guardado de cada flujo | period, version según evento | planning | Product |
| `task_created`, `task_completed`, `today_view_opened` | acción real | source o route según evento | execution | Product |
| `progress_review_created`, `routine_created`, `workout_completed`, `meal_logged` | guardado exitoso | period cuando corresponde | value | Product |
| `journal_entry_created` | entrada guardada | source, version | reflection | Product |

Este evento registra exclusivamente que existió un guardado; nunca contenido, longitud, tema o sentimiento.

## P2

| Evento | Trigger / descripción | Propiedades permitidas | Funnel | Owner |
| --- | --- | --- | --- | --- |
| `weekly_recap_viewed` | recap visible | source, period, surface, version | retention | Retention |
| `weekly_recap_completed` | revisión/recap guardado | source, period, result, surface, version | retention | Retention |
| `return_experience_viewed` | bienvenida de retorno visible | source, days_away, surface, version | return | Retention |
| `return_experience_action_clicked` | CTA elegido | source, result, days_away, surface, version | return | Retention |
| `share_card_opened` | studio realmente visible | surface, view, version | sharing | Growth |
| `share_card_generated` | PNG generado | surface, view, channel, version | sharing | Growth |
| `share_card_customized` | primera personalización de la sesión | surface, view, section, version | sharing | Growth |
| `share_exported` | descarga o fallback de descarga | channel, surface, view, version | sharing | Growth |
| `share_native_started` | Web Share invocado | channel, surface, view, version | sharing | Growth |
| `share_card_created` | alias de transición al crear una tarjeta | surface, view, version | sharing | Product Analytics |
| `share_card_shared` | alias de transición al compartir | channel, surface, view, version | sharing | Product Analytics |
| `referral_prompt_viewed` | prompt post-valor visible | surface, version | referral | Growth |
| `referral_link_created` | código opaco generado post-valor | referral_id, surface, version | referral | Growth |
| `referral_link_copied` | enlace copiado | channel, surface, version | referral | Growth |
| `referral_share_started` | Web Share o fallback iniciado | channel, surface, version | referral | Growth |
| `referral_visit_recorded` | código de entrada válido asociado a sesión | referral_id, source, route, version | referral | Growth |
| `referral_signup_completed` | signup con visita atribuida | referral_id, source, version | referral; servidor | Product Analytics |
| `referral_activation_completed` | activación v2 atribuida | referral_id, source, version | referral; servidor | Product Analytics |
| `experiment_exposure_recorded` | variante realmente renderizada | experiment_id, variant, flag, surface, version | experimentation | Product Analytics |

Los eventos granulares no contienen el texto, las métricas ni el contenido visual de una tarjeta. Los aliases `share_card_created` y `share_card_shared` se conservan temporalmente para no romper series, pero los funnels nuevos usan las etapas explícitas.

## Premium, pago y soporte

| Evento | Trigger / descripción | Propiedades permitidas | Funnel | Owner |
| --- | --- | --- | --- | --- |
| `premium_gate_viewed`, `upgrade_opened`, `checkout_started` | límite real / navegación / checkout | source, route, version según evento | monetization | Monetization |
| `payment_confirmed` | proveedor/servidor confirma pago | source, channel, version | monetization; servidor | Monetization |
| `subscription_renewal_due`, `subscription_renewed` | cohorte elegible / renovación confirmada | source, channel, version | monetization; servidor | Monetization |
| `settings_updated` | preferencia guardada | section | settings | Product |
| `suggestion_submitted`, `bug_report_submitted`, `support_request_submitted` | ticket aceptado | section | support | Support |

## Identidad, dedupe y retención

Cada evento lleva `session_id`, `dedupe_key`, `occurred_at`, `received_at` y versión de taxonomía. Dedupe no contiene contenido personal. La duración de conservación, exportación y borrado debe alinearse con la política de privacidad antes de ampliar proveedores o canales.

## Métricas y denominadores

Activación, retención, adopción y growth se calculan sobre cuentas observables con eventos v2. Deben etiquetarse así; no representan a todas las cuentas ni prueban consentimiento persistido.

- WAU: usuarias únicas observables con al menos un evento en los últimos 7 días.
- D1, D7 y D30: retorno en una ventana exacta de 24 horas a partir del aniversario correspondiente; cada métrica expone usuarias retenidas y cohorte elegible. Sólo entran al denominador cuentas observables desde D0 (primer evento v2 dentro de las primeras 24 horas), para no clasificar como abandono a quien autorizó analítica mucho después.
- Recap: usuarias con `weekly_recap_completed` en 7 días / WAU observable de la misma ventana. Sharing: usuarias con `share_exported` o `share_native_started` en 7 días / WAU; los aliases históricos no se suman para evitar doble conteo.
- Paywall → checkout: checkout posterior al primer `premium_gate_viewed` / usuarias que vieron el gate.
- Checkout → pago y trial → pago: sólo se muestran cuando existe instrumentación server-side de `payment_confirmed`; de lo contrario son `null`/“Sin instrumentar”.
- Renovación: `subscription_renewed` posterior a `subscription_renewal_due` / usuarias elegibles. Sin cohorte elegible se muestra `null`.
- Referral: registro o activación derivada en servidor / visitas referidas observables; sin visitas se muestra `null`. “Visitas referidas” sólo incluye cuentas autenticadas con consentimiento analítico y no representa clics o tráfico anónimo total.

Las tasas nunca se sustituyen por `0 %` cuando falta el denominador o la instrumentación, y las celdas pequeñas no deben utilizarse para decisiones individuales.
