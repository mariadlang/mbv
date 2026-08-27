# Soporte, analítica de producto y plataforma privada

## Arquitectura

- Interfaz de usuaria: `SupportPage` usa `useSupport`, `supportService` y `HttpSupportRepository`.
- Autenticación: el navegador obtiene la sesión con el repositorio de Auth existente. El token sólo viaja en `Authorization` hacia endpoints propios y nunca se persiste en eventos.
- Servidor: `/api/feedback`, `/api/events`, `/api/marketing-preference` y `/api/platform` vuelven a validar la sesión con Supabase.
- Administración: `/platform` no forma parte de la navegación normal. La ruta no recibe datos hasta que el endpoint valida `superadmin`; las consultas y mutaciones también están protegidas por RLS y funciones SQL.
- Planner personal: permanece local-first. Ningún componente nuevo accede a Dexie o IndexedDB.

## Migración y reversión

Aplicar, en orden:

1. `supabase/migrations/202608270001_legal_privacy.sql`
2. `supabase/migrations/202608270002_product_support_platform.sql`

La segunda migración crea tickets, notas internas, eventos minimizados, preferencias de marketing, auditoría, categorías, FAQ y parámetros. También crea el bucket privado `feedback-attachments` y limita los archivos a 2 MB. La reversión manual está en `supabase/rollbacks/202608270002_product_support_platform.sql`; exportar los datos antes de usarla.

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

- Registradas: filas de `profiles`.
- Nuevas semana/mes: `created_at` dentro de la ventana correspondiente.
- Activas 1/7/30 días: `last_active_at` actualizado por eventos permitidos.
- Onboarding: usuarias con `onboarding_completed_at` / total.
- Activación: onboarding completo + al menos una meta creada + una tarea/acción completada durante los primeros siete días.
- Retención 7/30: usuarias cuya última actividad alcanzó la ventana desde el registro / usuarias elegibles.
- Adopción: usuarias únicas con eventos de una funcionalidad / total de usuarias.
- Frecuencia: conteo de eventos agregados. No se simulan datos cuando no existen registros.

La definición editable está en `platform_settings.activation_definition` y su constante inicial en `src/domain/productAnalytics.ts`.

## Taxonomía

`sign_up_completed`, `onboarding_started`, `onboarding_completed`, `goal_created`, `annual_plan_updated`, `monthly_plan_updated`, `week_planned`, `task_created`, `task_completed`, `today_view_opened`, `journal_entry_created`, `progress_review_created`, `routine_created`, `workout_completed`, `meal_logged`, `settings_updated`, `suggestion_submitted`, `bug_report_submitted`, `support_request_submitted` y `app_session_started`.

La base de datos acepta sólo esa lista y deduplica por usuaria + `dedupe_key`.

## Datos que nunca se registran

Contraseñas, tokens, contenido de diario o reflexiones, texto de metas, notas privadas, comidas, registros de salud, datos bancarios, contenido de formularios personales ni email/nombre en metadatos de eventos. Los eventos admiten únicamente `source`, `route`, `view`, `section`, `period`, `result` y `version`, con valores breves.

## Marketing futuro — Fase 2 sin activar

`marketing_preferences` separa comunicaciones comerciales de emails operativos. Un adaptador futuro sólo podrá exportar usuarias con consentimiento vigente para audiencias promocionales. No hay proveedor, campañas, automatizaciones, suscripciones, upsells ni promociones activas.

Antes de Fase 2 se necesita aprobación expresa para: proveedor, encargado de tratamiento, finalidad y textos de consentimiento, frecuencia, bajas, dominio remitente, seguridad de webhooks, retención y plan comercial.

## Entorno y operación

Se reutilizan `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No se introduce `service_role` en el navegador ni en archivos versionados. La versión técnica mostrada en reportes proviene de `package.json`/despliegue y no incluye secretos.

## Validación esperada

Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` y `pnpm test:e2e`. El E2E cubre formularios, acceso denegado a `/platform` para una usuaria normal y acceso administrativo simulado exclusivamente con `NEXT_PUBLIC_E2E_ACCESS=1` en el servidor de pruebas.
