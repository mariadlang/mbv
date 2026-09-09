# Soporte, analítica de producto y plataforma privada

## Arquitectura

- Interfaz de usuaria: `SupportPage` usa `useSupport`, `supportService` y `HttpSupportRepository`.
- Autenticación: el navegador obtiene la sesión con el repositorio de Auth existente. El token sólo viaja en `Authorization` hacia endpoints propios y nunca se persiste en eventos.
- Servidor: `/api/feedback`, `/api/events`, `/api/marketing-preference` y `/api/platform` vuelven a validar la sesión con Supabase.
- Administración: `/platform` no forma parte de la navegación normal. La ruta no recibe datos hasta que el endpoint valida `superadmin`; las consultas y mutaciones también están protegidas por RLS y funciones SQL.
- Planner personal: permanece local-first. Ningún componente de soporte o analítica accede a Dexie o IndexedDB.
- Analítica propia: `ProductAnalyticsBridge` envía eventos minimizados a `/api/events`; no hay un proveedor externo de analítica activo.

## Migración y reversión

Aplicar, en orden:

1. `supabase/migrations/202608270001_legal_privacy.sql`
2. `supabase/migrations/202608270002_product_support_platform.sql`
3. `supabase/migrations/202609080001_product_analytics_v2.sql`

La segunda migración crea tickets, notas internas, eventos minimizados, preferencias de marketing, auditoría, categorías, FAQ y parámetros. También crea el bucket privado `feedback-attachments` y limita los archivos a 2 MB. La reversión manual está en `supabase/rollbacks/202608270002_product_support_platform.sql`; exportar los datos antes de usarla.

La tercera migración añade `taxonomy_version`, `received_at` y `activated_v2_at`; reemplaza la firma de `record_user_event`; valida eventos cliente y genera hitos derivados de servidor. Fue aplicada en el proyecto Supabase enlazado antes del despliegue del cliente/API v2; un segundo dry-run confirmó `Remote database is up to date`. No existe un rollback v2 específico versionado y cualquier entorno remoto adicional debe verificarse por separado.

Al ejecutar una eliminación definitiva de cuenta, el procedimiento operativo debe borrar primero los objetos con prefijo `<user_id>/` en `feedback-attachments` y `privacy-request-attachments`; después se elimina la usuaria de Auth. Las tablas vinculadas usan `on delete cascade`, por lo que tickets, eventos y preferencias desaparecen automáticamente. Nunca se debe conservar un adjunto huérfano.

## Asignar o revocar administración

Ejecutar únicamente desde Supabase SQL Editor con una cuenta propietaria del proyecto o mediante un proceso de backend con `service_role`. Nunca desde el frontend.

```sql
select id, email from auth.users where email = '<correo verificado>';
select public.set_platform_admin('<uuid verificado>'::uuid, true);
```

Para revocar:

```sql
select public.set_platform_admin('<uuid verificado>'::uuid, false);
```

La función está revocada para `anon` y `authenticated`. No existe asignación automática por email. Tras cambiar el rol, cerrar sesión y volver a entrar para renovar el estado de acceso.

## Métricas

- Registradas: cuentas de `auth.users`.
- Nuevas semana/mes: cuentas de `auth.users` cuyo `created_at` está dentro de la ventana correspondiente.
- Activas hoy/7/30 días: perfiles cuyo `last_active_at` fue actualizado por eventos permitidos dentro de la ventana.
- Cohorte analítica v2: cuentas con al menos un evento cuyo `taxonomy_version` es `2`. Como la analítica es opcional, esta base observable no representa todas las cuentas ni equivale a un registro persistido de consentimiento.
- Onboarding: cuentas de la cohorte analítica v2 con `onboarding_completed_at` / total de la cohorte analítica v2.
- Activación v2: cuentas de la cohorte analítica v2 que, dentro de los primeros siete días, completaron onboarding + una acción conectada + completar una acción, registrar un hábito o reprogramar conscientemente + una segunda sesión. No exige crear una meta.
- Retención 7/30: usuarias cuya última actividad alcanzó la ventana desde el registro / usuarias elegibles.
- Adopción: usuarias únicas con eventos de una funcionalidad y conteo de eventos, presentados junto con la base registrada. No debe interpretarse como uso de quienes no autorizaron analítica.
- Frecuencia: conteo de eventos agregados. No se simulan datos cuando no existen registros.

La definición almacenada en `platform_settings.activation_definition` es informativa: el cálculo efectivo está versionado en la migración SQL y reflejado por `src/domain/productAnalytics.ts` y sus pruebas; editar el valor informativo no cambia el backend. `activated_v2_at` conserva el primer instante en que se cumplieron los cuatro hitos; la migración también completa `activated_at` por compatibilidad con lecturas existentes.

La adquisición pública no es una analítica anónima completa. `/api/events` requiere autenticación: un evento de landing sólo llega al servidor si la persona consiente la analítica y posteriormente autentica en el mismo navegador antes de que expire o se elimine la cola. Las personas no convertidas no forman parte de esa métrica.

## Taxonomía v2

### Eventos aceptados desde el cliente

- Adquisición y cuenta: `landing_primary_cta_clicked`, `signup_started`, `signup_completed`, `email_verified`, `trial_started`, `login_succeeded`, `app_session_started`, `sign_up_completed`.
- Onboarding y activación: `onboarding_started`, `onboarding_focus_selected`, `first_outcome_created`, `first_action_created`, `first_action_completed`, `first_habit_recorded`, `action_rescheduled`, `onboarding_completed`.
- Premium: `premium_gate_viewed`, `upgrade_opened`, `checkout_started`.
- Uso de producto: `goal_created`, `annual_plan_updated`, `monthly_plan_updated`, `week_planned`, `task_created`, `task_completed`, `today_view_opened`, `journal_entry_created`, `progress_review_created`, `routine_created`, `workout_completed`, `meal_logged`, `settings_updated`.
- Soporte: `suggestion_submitted`, `bug_report_submitted`, `support_request_submitted`.

`sign_up_completed` se conserva como evento legado permitido; la instrumentación P0 usa `signup_completed`.

### Eventos reservados al servidor

- `second_session_started`
- `activation_completed`
- `payment_confirmed`

El navegador y `productEventSchema` no aceptan esos tres hitos. La función SQL genera los dos primeros. `payment_confirmed` está reservado para un backend de pagos confiable y **no se emite en la implementación actual**.

## Consentimiento, cola y sesiones

- La analítica opcional comienza apagada.
- `CookieConsentProvider` habilita o deshabilita la cola mediante la preferencia `analytics`.
- Las preferencias se sincronizan mediante el almacenamiento local. Retirar consentimiento en otra pestaña actualiza el contexto, detiene nuevas capturas y elimina los eventos e intenciones de autenticación que estuvieran en espera.
- La cola usa `localStorage`, conserva un máximo de 80 eventos y descarta entradas mayores a 30 días.
- El timestamp `occurredAt` se fija al producir el evento y se conserva al reintentar el envío.
- Los fallos de red no interrumpen el planner; el bridge reintenta al recuperar conexión.
- La sesión de producto se comparte entre pestañas. Después de más de 30 minutos de inactividad sólo se crea otra sesión cuando vuelve a existir actividad real —puntero, teclado, tacto, foco o visibilidad— y su inicio se emite una sola vez por identificador de sesión.
- Los hitos usan `dedupe_key`; el servidor aplica unicidad por usuaria + clave.

## Validaciones del servidor

`record_user_event`:

- exige una sesión autenticada y un perfil;
- acepta sólo la allowlist cliente;
- valida formato de `session_id` y `dedupe_key`;
- exige que la clave de deduplicación comience por el nombre del evento;
- rechaza timestamps con más de 30 días de antigüedad o más de cinco minutos en el futuro;
- limita a 240 eventos recibidos por usuaria y hora;
- ignora la funcionalidad enviada por el navegador y calcula `feature` de forma canónica;
- serializa flushes concurrentes por usuaria antes de generar hitos derivados;
- conserva únicamente metadatos permitidos.

## Datos que nunca se registran

Contraseñas, tokens, contenido de diario o reflexiones, texto de metas o tareas, nombres de hábitos, notas privadas, comidas, registros de salud, datos bancarios, contenido de formularios personales ni email/nombre en metadatos de eventos.

Los eventos admiten únicamente `source`, `route`, `view`, `section`, `period`, `result` y `version`, con valores escalares breves. Las rutas eliminan query y fragment; los valores con `@` se sustituyen por `redacted`.

## Mercado Pago y activación Premium

- `billingService` obtiene una URL externa mediante `MercadoPagoBillingRepository` y `NEXT_PUBLIC_MERCADO_PAGO_URL`.
- La aplicación abre el checkout; no genera una preferencia de pago en un backend propio.
- No existe endpoint webhook, validación de firma ni conciliación automática.
- Volver del navegador desde Mercado Pago no cambia `access_status` ni `subscription_status`.
- No existe tratamiento automático de pagos pendientes, rechazados o aprobados.
- Premium puede habilitarse mediante una operación administrativa protegida y auditada; esto no equivale a conciliación de pagos.
- No se conoce en el repositorio precio, periodicidad, impuestos, renovación o descuentos.

Antes de automatizar pagos se debe implementar un endpoint de servidor que valide la firma y el identificador de pago directamente con Mercado Pago, haga la transición idempotente de suscripción/acceso y emita `payment_confirmed` sólo después de una confirmación confiable.

## Marketing futuro — Fase 2 sin activar

`marketing_preferences` separa comunicaciones comerciales de emails operativos. Un adaptador futuro sólo podrá exportar usuarias con consentimiento vigente para audiencias promocionales. No hay proveedor, campañas, automatizaciones, suscripciones, upsells ni promociones activas.

Antes de Fase 2 se necesita aprobación expresa para: proveedor, encargado de tratamiento, finalidad y textos de consentimiento, frecuencia, bajas, dominio remitente, seguridad de webhooks, retención y plan comercial.

## Entorno y operación

Se reutilizan `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No se introduce `service_role` en el navegador ni en archivos versionados. La versión técnica mostrada en reportes proviene de `package.json`/despliegue y no incluye secretos.

## Validación esperada

Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:contrast`, `pnpm build` y `pnpm test:e2e`. El E2E usa `NEXT_PUBLIC_MBV_E2E_ACCESS=1` en el servidor de pruebas; no prueba una cuenta, migración o pago real de producción.

La evidencia P0 y sus pendientes se consolidan en `docs/qa/p0-release-report.md`.
