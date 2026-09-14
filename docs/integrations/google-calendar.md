# Integración bidireccional con Google Calendar

Estado: implementación consolidada en `14ec6226dfb433db6de0956cae223d7b6ca1a482` y publicada inicialmente como versión 30 de Sites el 14 de septiembre de 2026. El hotfix `83860806234c4aebea274803192a908d12294b4f` añade compatibilidad con calendarios delegados `writerWithoutPrivateAccess`; la versión 31 incorpora ese estado. La API de Google Calendar y la migración `202609110001_google_calendar_integration.sql` están activas en producción. El cliente OAuth dedicado, la Redirect URI exacta y las variables privadas/operativas quedaron aplicados finalmente en la revisión 4 de Sites y la versión 31 se redeplegó mediante `appgdep_6aa8662a06d08191a8b3b9de6cedde6d`. Una cuenta real completó OAuth, selección del calendario principal, primera sincronización e importación visible. Ninguna credencial real se incluye en el repositorio. Para un lanzamiento abierto todavía faltan la verificación pública de Google OAuth y un scheduler de mantenimiento compatible con Sites.

## 1. Arquitectura utilizada

La integración amplía el planner existente, no crea un calendario paralelo. Las tareas y prioridades conservan su modelo actual; sólo los elementos creados explícitamente como evento/cita pueden sincronizarse.

```text
Semana / Mi día / Mi espacio / Ajustes
                ↓
       CalendarIntegrationProvider
                ↓
 calendarIntegrationService + repositorio HTTP
                ↓
 API Next autenticada ── Google Calendar API
                ↓                  ↑
 caché/identidad server-only ─ webhook + sync incremental
                ↓
 eventos del planner en IndexedDB
```

El planner sigue siendo local-first. Los eventos locales viven en IndexedDB; Supabase conserva únicamente la conexión OAuth cifrada, la selección de calendarios, la identidad de sincronización y una copia operativa de eventos Google. `CalendarIntegrationRepository` permite añadir otro proveedor en el futuro sin cambiar las pantallas.

## 2. Archivos creados

- API: `app/api/integrations/google-calendar/{connect,callback,complete,status,configure,sync,events,disconnect,webhook,maintenance}/route.ts`.
- Dominio y cliente: `src/domain/calendar.ts`, `src/repositories/interfaces/CalendarIntegrationRepository.ts`, `src/repositories/http/HttpGoogleCalendarRepository.ts`, `src/services/calendarIntegrationService.ts` y `src/hooks/useCalendarIntegration.tsx`.
- Servidor: `src/server/calendar/{access,config,crypto,googleApi,http,oauthCompletion,sync}.ts`.
- UI: `src/features/settings/GoogleCalendarIntegrationCard.tsx`, `src/features/calendar/CalendarEventSyncFeedback.tsx` y `src/styles/features/calendar-integration.css`.
- Datos y pruebas: `supabase/migrations/202609110001_google_calendar_integration.sql` y las pruebas `tests/calendar-*.test.ts`/`tests/google-calendar-api.test.ts`.

## 3. Archivos modificados

- Composición y estilos: `app/PlannerApp.tsx`, `app/globals.css`, `src/styles/features/weekly-plan.css`.
- Planner: `src/domain/planner.ts`, `src/lib/schemas.ts`, `src/hooks/usePlanner.ts`, `src/services/plannerService.ts` y `src/repositories/testing/E2EAuthRepository.ts`.
- Producto: `src/features/settings/SettingsPage.tsx`, `src/features/planning/WeeklyPlanView.tsx`, `src/features/today/TodayPage.tsx` y `src/features/lifehub/LifeHubPage.tsx`.
- Idiomas, privacidad y operación: catálogos ES/EN, páginas legales, `src/lib/legalConfig.ts`, `.env.example`, `vercel.json`, `README.md`, documentación de proyecto y `e2e/app.spec.ts`.

## 4. Cambios en database/schema

La migración crea cinco tablas server-only:

- `calendar_integrations`: cuenta Google, estado, generaciones de conexión/selección y tokens AES-GCM.
- `connected_calendars`: calendarios disponibles/visibles, predeterminado, permisos, sync token, canal webhook y lease de sincronización.
- `calendar_events`: vínculo local/remoto, fechas/horas/zona, recurrencia, ETag, origen, outbox, conflicto y tombstone.
- `google_calendar_oauth_states`: state/PKCE, payload pendiente y lease de finalización OAuth.
- `google_calendar_token_revocations`: cola cifrada y reintentable para grants que deben revocarse.

RLS bloquea acceso directo desde `public`, `anon` y `authenticated`. Sólo `service_role` ejecuta los RPC de activación, selección, staging, sync, webhook, desconexión, cleanup y revocación. Los RPC usan locks, generaciones y compare-and-swap para no confirmar trabajo de una conexión o selección obsoleta.

La migración quedó aplicada en el Supabase de producción el 14 de septiembre de 2026. Los demás entornos deben aplicarla mediante su runner de migraciones antes de habilitar la integración.

## 5. Variables de entorno necesarias

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_BASE_URL=https://dominio-del-entorno.example
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY=
CRON_SECRET=
```

`GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY` y `CRON_SECRET` deben ser secretos aleatorios exclusivos de al menos 32 bytes. No deben usar el prefijo `NEXT_PUBLIC_`, aparecer en logs ni reutilizarse entre entornos. La anon/publishable key pública no sustituye `SUPABASE_SERVICE_ROLE_KEY`.

## 6. Configuración necesaria en Google Cloud

1. Crear o seleccionar el proyecto de Google Cloud del entorno.
2. Habilitar Google Calendar API.
3. Configurar la pantalla de consentimiento OAuth, datos de contacto, dominios y usuarios de prueba/publicación según corresponda.
4. Crear un cliente OAuth 2.0 de tipo aplicación web y copiar ID/secreto al gestor de variables del runtime.
5. Registrar la URI de redirección exacta indicada abajo.
6. Autorizar únicamente `openid`, `email`, `calendar.calendarlist.readonly` y `calendar.events`.
7. Garantizar un `APP_BASE_URL` HTTPS público para que Google pueda entregar notificaciones al webhook.

La conexión de Calendar es opcional e independiente del login con Google.

## 7. OAuth redirect URLs

Para cada entorno debe registrarse exactamente:

```text
{APP_BASE_URL}/api/integrations/google-calendar/callback
```

Ejemplo de producción:

```text
https://my-best-version-habitos.maria-delosangelesgt.chatgpt.site/api/integrations/google-calendar/callback
```

No se admiten variantes con otro dominio, puerto, protocolo o slash final. El callback valida `state`, PKCE, scopes, entitlement y cuenta; guarda el grant pendiente cifrado. La activación final exige además la sesión Bearer de la misma cuenta MBV mediante `/complete`.

## 8. Endpoints creados

- `POST /api/integrations/google-calendar/connect`: inicia OAuth con state rotado y PKCE.
- `GET /api/integrations/google-calendar/callback`: intercambia el código y prepara una finalización segura.
- `POST /api/integrations/google-calendar/complete`: activa idempotentemente la conexión para la misma persona autenticada.
- `GET /api/integrations/google-calendar/status`: devuelve configuración, calendarios y snapshot visible.
- `POST /api/integrations/google-calendar/configure`: guarda calendarios visibles y predeterminado mediante una transacción.
- `POST /api/integrations/google-calendar/sync`: drena outbox y ejecuta sync incremental bajo lease.
- `POST|PATCH|DELETE /api/integrations/google-calendar/events`: crea, edita o cancela eventos vinculados.
- `PUT /api/integrations/google-calendar/events`: resuelve exclusivamente conflictos reales Google/MBV.
- `POST /api/integrations/google-calendar/disconnect`: elimina primero la conexión local y encola la revocación remota.
- `POST /api/integrations/google-calendar/webhook`: valida canal/recurso/token/número y encola sync durable.
- `GET /api/integrations/google-calendar/maintenance`: cron autenticado que limpia OAuth vencido y reintenta revocaciones.

## 9. Flujo Google → MBV

Google notifica al webhook sin enviar el contenido del evento. El endpoint valida los encabezados contra hashes server-only, deduplica números de mensaje y solicita una sincronización durable. El worker obtiene el lease, usa el `syncToken`, normaliza todo el día, zona horaria, recurrencias y cancelaciones, y aplica cada lote con el RPC protegido por generación. Si Google responde `410`, se hace un rebase completo dentro de una ventana acotada y la cancelación de elementos ausentes se confirma atómicamente con el nuevo token.

Los eventos aparecen como contexto temporal en Semana, Mi día y Mi espacio, con un indicador discreto de Google Calendar. No se convierten en tareas ni prioridades.

## 10. Flujo MBV → Google

Un evento se guarda primero en el planner local. Si la sincronización está activa, el outbox lo marca como `create`, `update` o `delete`. El servidor valida sesión, acceso/trial, calendario visible/escribible y generaciones; crea un ID Google determinista, añade marcadores privados de propiedad y usa ETag para ediciones/eliminaciones. La respuesta de Google completa el vínculo y limpia el outbox mediante el mismo `operation_id`.

Sin red o ante un fallo temporal, el evento permanece utilizable localmente y se reintenta al recuperar conexión, enfocar la app o pulsar “Sincronizar ahora”.

## 11. Estrategia de sincronización

- Push de Google mediante channels/webhooks, complementado por sync incremental y acción manual.
- Un lease por calendario serializa solicitudes manuales y webhooks; requests nuevos permanecen en cola.
- `connection_generation` y `selection_generation` invalidan resultados de conexiones/configuraciones antiguas.
- Tokens de acceso se renuevan server-side; dos fallos de autenticación pasan a `reconnect_required`.
- Eventos all-day usan fin exclusivo en Google y fin inclusivo en MBV.
- Instantes RFC3339 se muestran en la zona IANA del evento, incluidos cambios DST y eventos nocturnos/multidía.
- Los calendarios delegados con rol `writerWithoutPrivateAccess` completan OAuth y se consideran escribibles, aunque Google oculte los detalles de eventos privados.
- Instancias expandidas de recurrencia conservan identidad Google sin duplicar un único ID local.
- El cron diario reintenta grants pendientes de revocación con backoff; las interacciones normales también drenan la cola oportunísticamente.

## 12. Estrategia para evitar duplicados

- Índice único por integración/calendario/`externalEventId`.
- Índice parcial único por persona/`localEventId`.
- ID Google determinista para eventos MBV y marcadores privados `mbvOrigin`, `mbvLocalEventId` y `mbvUser`.
- Una colisión `409` sólo se adopta si coinciden exactamente los tres marcadores; metadata parcial o de otra persona se rechaza.
- Staging atómico impide apropiarse de una fila preexistente con distinta identidad.
- `operation_id` hace compare-and-swap entre la llamada externa y la confirmación local.
- Las instancias recurrentes no copian el vínculo local de la serie.

## 13. Estrategia para conflictos

PATCH y DELETE usan siempre el ETag almacenado y exigen que coincida con el ETag conocido por el cliente. Si Google cambió después del último sync mientras MBV tiene una operación pendiente, el registro pasa a `conflict` y guarda ambas versiones. La UI ofrece “Conservar Google” o “Conservar My Best Version”; ninguna gana automáticamente.

La resolución sólo se permite sobre una fila que continúe atómicamente en el mismo conflicto visto por el cliente. Cada conflicto recibe un UUID nuevo; el claim compara ese UUID bajo lock, tiene lease recuperable, se libera ante cualquier fallo y usa el ETag remoto actual para la decisión explícita. Así se evita tanto que una respuesta antigua resuelva un conflicto nuevo como que el endpoint de resolución salte la protección de una edición normal.

Antes de cualquier `PATCH` o `DELETE` remoto en favor de My Best Version se validan las tres marcas privadas de ownership. Si un ID determinista colisiona con un evento ajeno mientras se elimina un alta pendiente, se cancela únicamente el vínculo local: el recurso Google nunca se modifica.

## 14. Cómo probarlo manualmente

1. Aplicar la migración en un entorno de prueba y configurar todas las variables, incluida una URL HTTPS pública.
2. Registrar la Redirect URI exacta en Google Cloud y abrir Ajustes → Integraciones.
3. Conectar una cuenta de prueba, rechazar/aceptar permisos y comprobar que el login normal no cambia.
4. Elegir al menos un calendario visible y uno escribible predeterminado; cambiar la selección y verificar que no desaparezcan cambios pendientes.
5. Crear desde Mi espacio un evento horario, uno all-day y uno nocturno/multidía; comprobar Google, Semana y Mi día.
6. Editar y eliminar desde MBV; comprobar Google y que no haya duplicados.
7. Crear, editar y cancelar desde Google; esperar webhook o pulsar sincronización y comprobar las tres vistas.
8. Probar dos calendarios, otra zona IANA y una serie recurrente.
9. Modificar el mismo evento en ambos lados antes de sincronizar y resolver cada opción.
10. Desactivar red, crear/editar/eliminar y reconectar; verificar los estados pendiente/sincronizado.
11. Revocar acceso desde Google y comprobar `reconnect_required`; después reconectar.
12. Desconectar desde MBV y confirmar que los eventos locales permanecen y los tokens/caché desaparecen del servidor.
13. Validar desktop y mobile, consola sin errores y respuestas controladas para `401`, `403`, `409`, `410`, `429` y `5xx`.

Las pruebas automatizadas cubren dominio, cifrado/configuración, acceso trial, normalización, ETags, propiedad/deduplicación, errores del cliente y el recorrido local Mi espacio → Semana → Mi día. Una certificación Google real exige credenciales de prueba, migración aplicada y webhook público; no puede sustituirse por mocks.

## 15. Qué queda pendiente para una segunda fase

- Programar una tarea como bloque horario, sólo por decisión explícita.
- Añadir Outlook/Apple mediante otro adaptador, sin cambiar el dominio actual.
- Observabilidad operativa de latencia, volumen, rate limits, leases y cola de revocación.
- Renovación proactiva de canales antes de expirar y un worker dedicado si el volumen supera el cron/requests actuales.
- Suite de integración contra un proyecto Google/Supabase aislado y pruebas de concurrencia a nivel PostgreSQL.
- Políticas de retención/exportación específicas para la caché de Calendar revisadas jurídica y operativamente.
- IA o auto-planificación, únicamente como alcance posterior y con consentimiento separado.

## 16. Estado operativo comprobado el 14 de septiembre de 2026

- Google Calendar API quedó habilitada y se verificó con estado `Habilitada` en el proyecto Google Cloud que ya contiene el cliente `My Best Version · Supabase`.
- El preflight remoto confirmó `202609110001` ausente y las cinco tablas objetivo inexistentes, sin aplicación parcial. `supabase db push --linked --dry-run` enumeró únicamente esa migración; el push terminó correctamente y `migration list --linked` dejó local/remoto alineados en `202609110001`. Supabase muestra `google_calendar_integration` como última migración y `db lint --linked --level error` no reportó incidencias.
- Se creó un cliente OAuth web dedicado para Calendar. La descarga inicial reveló una Redirect URI con un `5` final accidental; se corrigió en Google Cloud y una nueva descarga confirmó la URI exacta del dominio Sites antes de usar las credenciales.
- Sites conserva las dos variables públicas Supabase y añade `APP_BASE_URL`, la clave server-side del proyecto correcto, ID/secreto del cliente OAuth, una clave de cifrado y `CRON_SECRET`. Las cuatro variables sensibles están marcadas como secret. La prueba autenticada detectó que Supabase CLI devolvía una representación ocultada de la clave privada; esa representación produjo `500` en las revisiones diagnósticas. La clave real se copió desde el Dashboard, se verificó por huella sin exponerla y el runtime quedó corregido en la revisión 4.
- La versión guardada 31 se redeplegó sin rebuild ni cambio de fuente mediante `appgdep_6aa8662a06d08191a8b3b9de6cedde6d`; terminó en `succeeded`, conservó acceso público y aplicó la revisión 4.
- El recorrido real `status → connect → callback → complete → configure → sync` respondió correctamente. Se autorizó una cuenta Google real, se eligió únicamente su calendario principal editable, la primera sincronización terminó y los eventos importados aparecen como `Sincronizado` en Mi espacio. No se creó, editó ni eliminó un evento remoto de prueba.
- La suite dirigida de Calendar aprobó 8 archivos y 45 pruebas; TypeScript y ESLint ya estaban aprobados. `git diff --check` terminó sin errores.
- No se registraron errores del Worker tras el despliegue corregido ni durante el recorrido autenticado.
- Google muestra actualmente “app no verificada”. Para que cualquier persona conecte sin esa advertencia y sin el límite de usuarios no verificados, deben completarse la verificación de marca y la verificación de scopes sensibles de OAuth. En estado `Testing` sólo pueden autorizar los usuarios de prueba; en estado publicado pero no verificado existe un límite acumulado de 100 usuarios. Referencias oficiales: [estado de aplicaciones OAuth](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview) y [verificación de scopes sensibles](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification).
- El cron de `vercel.json` no acredita ejecución en Sites. OAuth, sincronización manual y webhooks pueden funcionar sin ese cron, pero el mantenimiento periódico requiere un scheduler HTTP autenticado o el runtime Vercel configurado.
