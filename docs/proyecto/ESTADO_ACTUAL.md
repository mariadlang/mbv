# Estado actual de My Best Version

## 2026-11-13 — mejoras pendientes publicadas y comprobadas (inicio 12/11)

Publicado el código funcional **0a5c69b** en **https://mybestversion.life**, Vercel **Gb4DZ32gKEPXoq7Uf93cq8JtuXdc/Ready**, mismo Supabase productivo; beta/E2E desactivados. H08/H03/H01/H02, TasksPage, acceso y Metas/móvil conservados. Completa local665/665 y CI665/665, lint/tipos/build aprobados; E2E local vigente10/10, E2E remoto omitido por regla de push. Comprobación normal con sesión existente: acceso, hora18:30, completado/recarga y doble pulsación de Aprende conservan dos registros sintéticos únicos; Inicio/Mi guía coinciden y Metas abre. Sin cambios de cuentas, permisos, correo, DNS, pagos ni planes; LIM01 y3119 intactos. [Ficha, intentos fallidos conservados, evidencia y límites](../qa/production-release-2026-11-12.md). Pendientes previos: H06 restante, datos legales, recorte logo/lema y revisión del major Node. Autorización de despliegue habitual registrada; no solicitarla otra vez salvo cambio de alcance.


## 2026-11-10 — alojamiento y correo identificados; cambios remotos pendientes

Lectura de paneles con sesión existente: cuenta Vercel `mariadelosangelesgtg-4145`, Owner, equipo Hobby. `vercel-upload-mbv` existe y su ID coincide con `.vercel/project.json`;404 del conector no demuestra proyecto inexistente ni ID erróneo, causa del conector sin confirmar. Propuesta proyecto separado `mbv-beta`, alias no reservado. Resend `mbv-transactional-email` Free disponible, `mybestversion.life` Verified; remitente histórico `hola@mybestversion.life`. Reutilización para Auth de pruebas pendiente de aprobación, credencial separada; no compra ni DNS nuevo propuestos.

Supabase mbv-h06-pruebas: SMTP propio apagado, Site URL localhost3000 y lista de retornos vacía, sin Auth Hooks; esquema/función beta ausentes por consulta de catálogo. La aplicación remota debe añadir retornos exactos de beta **y3119/3124**, conservar confirmación y no asumir SMTP ya listo. Hook afectará nuevas altas de todo ese backend de pruebas, aunque no elimina cuentas existentes. [Ficha, costes, comprobación de pestaña abierta, limitaciones y reversión](../qa/beta-alojamiento-correo-2026-11-10.md). Las decisiones de plan y reutilización de remitente quedan para María; acceso de lectura resuelto. Ventana de participantes sin fecha hasta aceptación remota. Builds1kL/3124 y uPbk/3119 conservadas, ambos login200; sólo documentación modificada, sin suites repetidas ni cambios remotos/commit/push/deploy.

## 2026-11-10 — beta remota preparada localmente, pendiente de autorización remota

María elige computador/Gratis/siete días y autoriza dos correos iniciales (máximo cinco). Se conservan candidata aceptada **uPbk5IrG5ROPbt6S-esqx/3119**, datos y LIM01. Preparación beta separada **1kL0iUp-tRr6POz69UPuT/3124**, mbv-h06-pruebas, E2E0, **pausada**: lista validada en servidor, ventana y revalidación, bloqueo de cobros/promociones, recuperación de contraseña, plantillas/configuración y SQL de filtro de altas sin aplicar. Staging sin credenciales ni vínculo a producción.

**665/665 unitarias en107archivos**,34dirigidas,10preflight y10E2E principales/regresión aprobados; lint/tipos/build/i18n/tokens pasan (1warning lint previo). Prueba normal de navegador: login H06A200, beta403 sin acceso al planificador y logout204; no hubo cambios de tareas/contraseñas/permisos. Build E2E K0_DcyfwIGewpvPyR4Znp aparte, servidor detenido. Intentos fallidos de tipos/auditor i18n y primera espera de UI conservados por separado; no sustituyen la evidencia final ni se ocultan.

Propuesta **proyecto Vercel separado mbv-beta**, URL provisional no reservada; falta acceso al proyecto correcto (conector devuelve404), fecha/hora y remitente/SMTP. SQL, configuración remota, alta/correo/recuperación reales y parada remota requieren revisión/aprobación final; no se declara beta publicada ni H06 cerrado. [Informe técnico, costes, archivos y comprobaciones pendientes](../qa/beta-remota-preparacion-2026-11-10.md). Sin commit/push/deploy, invitaciones, cobros ni cambios remotos de permisos/correo.

## 2026-11-09 — entrada a Metas y controles móviles verificados

La navegación Plan existente vuelve a mostrarse en Mi año/mapa: H06 A Gratis/user puede abrir Metas por UI en1448×1086 y390×844. Footer móvil reserva64px con token existente: Ver mi camino y FAB tienen0solape y ambos abren correctamente. Misma cuenta/permisos/origen3119; nueva build normal **uPbk5IrG5ROPbt6S-esqx**, mbv-h06-pruebas/E2E0.284 archivos runtime coincidentes con repo; sólo PlanningPage.tsx y editorial-and-modules.css cambian respecto a la candidata anterior. Respaldos sintéticos completos idénticos tras recarga explícita, IDs/relaciones/cantidades conservados, sin tocar perfil personal/LIM01.

Final: **637/637 unitarias en104archivos;10/10E2E (8 principales +2 nuevas),0omisiones/reintentos**; lint/tipos/build/auditorías aprobados,1warning lint previo. Primer intento unitario conservado:99archivos/594pruebas aprobadas y5archivos bloqueados por SQLfixtures omitidos de la copia aislada (ENOENT),0aserciones fallidas; segunda completa justificada al incorporar esos SQL sin ejecutarlos ni cambiar pruebas. Capturas reales y límites (móvil emulado), archivos y lanzador en [informe](../qa/goals-navigation-mobile-2026-11-09.md). Sólo esas dos correcciones, sin permisos/pagos/producción/commit/push/deploy ni cierre integralH06.

## 2026-11-09 — recorrido normal de meta a acción, escritorio y móvil

Meta→mes→semana→Mi día pasa con H06 cuenta A Gratis/user, misma candidata O9XyPqYQPKwxBFWubeJRJ/3119. Cada tamaño1meta/1plan mensual/1contexto semanal/2tareas; completar1 produce50%, datos/IDs/relaciones idénticos tras recarga y logout/login. Entrada inicial a Metas no encontrada en accesos revisados: se usó ruta directa; solape parcial del botón flotante móvil registrado aunque Ver mi camino funciona. [Informe y límites](../qa/goal-normal-desktop-mobile-2026-11-09.md). Móvil390 emulado, no teléfono. Sin cambios de app/permisos ni commit/push/deploy.

## 2026-11-09 — respaldo/restauración normal comprobados

Misma candidata O9XyPqYQPKwxBFWubeJRJ/3119, H06 cuenta A en Gratis/user. Exportación sintética e importación única por UI en BrowserContext nuevo y vacío, con login normal. Después de recarga: igualdad profunda de34campos/32colecciones y perfil, IDs/cantidades intactos, relaciones tarea→plan→área conservadas, sin duplicados. Origen conservado y LIM01 intacto. [Evidencia y límites](../qa/backup-normal-2026-11-09.md). No cambios de código/permisos/producción, suites ni commit/push/deploy.

## 2026-11-07 — comprobación normal de los dos guardados Premium

Entrenamiento y Meta física pasan en la misma candidata O9XyPqYQPKwxBFWubeJRJ/3119, autenticación normal y E2E desactivado. Concesión legacy_premium autorizada sólo para H06 cuenta A, rol user: original registrado, retirada completada y estado Gratis confirmado en backend y ambas rutas. Guardados conservados con identidad y sin duplicados tras recarga y retirada. Datos personales/LIM01 intactos; tres resultados previos conservados. [Evidencia y límites](../qa/save-pending-premium-ui-2026-11-07.md). Sólo documentación; no suite, cambios de app, commit/push/deploy.

Última revisión: **2026-10-27, America/Bogota (UTC-05:00)**.

## MBV-H-060 — SavePendingFields: aislamiento de pruebas corregido; límite histórico abierto

María comunica aceptación práctica local de acceso en O9XyPqYQPKwxBFWubeJRJ/3119, mbv-h06-pruebas/E2E0: tres ingresos sin observar el aviso y acción LIM01 del24/10 conservada. Esta aceptación sustituye el pendiente práctico de H059; no cierra H06 ni producción y no atribuye una causa a todos los avisos históricos.

Experimento determinista: escritura retenida hasta timeout5000ms sobrevive al cleanup y escribe en el campo del caso siguiente, reproduciendo exactamente `MMii  iinntteenncciióónn  aacceeppttaaddaa`. Corrección exclusivamente de tests: cancelar y drenar las interacciones del caso antes de continuar. Después, el timeout deliberado sigue fallando y el siguiente caso pasa. No se demuestra qué causó los timeouts originales ni se afirma reconstruida toda la secuencia histórica.

13/13 dirigidas; única completa nueva **637/637**,104archivos,0omisiones/reintentos;8/8E2Eprincipales separados. Tipos/auditorías aprobados; lint0errores/1aviso previo. Se conservan ambos633/636 históricos y todos los intentos nuevos, incluidos negativos controlados y dos aserciones nuevas null/undefined corregidas contra el contrato. Aplicación y candidata normales intactas, build existente reutilizada. [Ficha de diagnóstico y comprobación de uso](../qa/save-pending-fields-2026-10-27.md): URL/build, cinco formularios y registros desechables propuestos; demora/fallo sólo probados con control automatizado y límites de persistencia diferenciados. Causa original de timeouts queda abierta si reaparece; trazas opt-in disponibles. Sin commit/push/deploy. Antecedentes siguientes conservados.

## MBV-H-059 — entrega independiente preparada, misma candidata normal

La revisión actual confirma que3119 sirve **O9XyPqYQPKwxBFWubeJRJ**, no la build antigua.284archivos runtime repo/normal/E2E idénticos, SHAconjunto2c0925418c26b8ddb63acab2ad14848fd45207a9e0e0e8cef2c8703dc52760e0. Chunkservido idénticoalcompilado con E2Efalse y URLde mbv-h06-pruebas; proyecto ACTIVE_HEALTHY confirmado. Chromium anónimo desechable, sininterceptores, rechaza acceso a/app/today?e2e-auth=signed-in y presenta/login. No login ni escritura en perfil/IndexedDB existente, mismo proceso/origen; no código ni build nuevos.

[Ficha vigente](../qa/h06-lim01-comprobacion-de-uso.md) reorganizada con una sola versión y [manifiesto verificable](../qa/h06-access-handoff-2026-10-27.json). Instrucciones antiguas archivadas aparte para evitar confundir build/cuenta. LIM-01 completado con observaciones y correo asistido por María; cuenta existente LIM01-C, datos privados fuera del repo. Primera acción24/10 ID3de45ee6-ffd1-49bc-9fdc-a6cf5863f3a4 debe comprobarse en agenda24/10 y respaldo del perfil original: Mi día filtra la fechaactual. No recrear/importar ni mover la tarea. Queda la comprobación independiente autenticada, no otro signup. Pruebas H058 reutilizadas, incluida limitación de completas633/636, sin afirmar auditoría integral/producción. **Sin commit,push,deploy.**

## MBV-H-058 — H06: aviso de acceso corregido localmente

LIM-01 completado con observaciones el24/10 por segundo Codex, confirmación asistida por María y misma primera acción/respaldos conservados. La cuenta LIM01-C ya existe: no repetir signup. El bloque H057 siguiente es histórico. [Ficha de uso vigente](../qa/h06-lim01-comprobacion-de-uso.md).

Causa de aviso reproducida sin interceptores: acceso pendiente con loadingfalse tras login;200 posterior recuperaba solo. useAccount ahora mantiene carga y acepta sólo resultados vigentes, descartando respuestas tardías tras logout/reintento. Carga/error actuales conservados, permisos intactos. Normal3119 **O9XyPqYQPKwxBFWubeJRJ**, Supabase de pruebas mbv-h06-pruebas/E2E0; misma build disponible27/10. Auth remoto no sincroniza planner local.

Escritorio1448/móvil390: login/logout/relogin, demora y503 controlados, reintento y recarga comprobados;1tarea/ID conservado por contexto y respaldo completo idéntico. Seis regresiones acceso y8 E2E principales aprobados; tipos/builds/auditorías aprobados, lint focal sin errores y1aviso de generación. Primera completa633/636 con3timeouts en SavePendingFields; aislada intacta12/12. Segunda completa1worker633/636 (2timeouts y1aserción de texto duplicado), suspensión del host documentada durante su ejecución; causa de aserción no confirmada. Sólo los3fallidos pasan tras reanudar,9casos no seleccionados; no tercera completa ni suma de resultados. **No hay completa unitaria verde de esta revisión; incidencia SavePendingFields permanece abierta, separada del acceso corregido.** [Detalle H058](../qa/h06-access-transition-2026-10-26.md).

Pendiente revisión posterior de esta build por segundo Codex; H06integral sigue abierto. «Revisa tu correo» y logo/lema independientes. H01visual y correcciones aceptadas conservadas. H05histórico167/0/25/0 inalterado. **Sin commit, push ni deploy.** Antecedentes debajo.

## MBV-H-057 — H06/LIM-01: alta móvil normal bloqueada

**Preparación para segundo Codex24/10:** [ficha H06 LIM-01 — comprobación de uso](../qa/h06-lim01-comprobacion-de-uso.md). María proporciona dirección controlada autorizada, guardada sólo en reserva privada externa LIM01-C; consulta Auth0coincidencias, todavía sin registrar ni enviar correo. Confirmación manual propuesta con María, sin acceso Gmail, pendiente coordinar al ejecutar. Origen3119 y build9glUEzbvT9douzeZdFXp2 disponibles; /signup,/verify-email,/login200,E2E0,confirmación activa,353fuentes idénticas. Verificación negativa deliberada sin cuenta devuelve303 a3119/verify-email conotp_expired: acredita destino en rechazo, no entrega/confirmación válida. PanelSupabase redirigealogin; no acceso a SiteURL/plantilla/SMTP completo. Lanzador externo para reiniciar misma build si se detiene, sintaxis/--check aprobados sin reiniciar actual. Sin app/configuración remota modificada; LIM-01 sigue sin ejecutar completo. El bloqueo de dirección desconocida de los párrafos anteriores queda sustituido por reserva autorizada, no por correo ya validado. Sin commit/push/deploy.

Único intento24/10 13:38 Bogotá en390×844, origen3119/build `9glUEzbvT9douzeZdFXp2`, E2E_ACCESS0 y backend remoto aislado mbv-h06-pruebas. Alta por UI con tres consentimientos obligatorios, marketingno, persona ficticia nueva. Auth rechaza dirección reservada example.com con400/email_address_invalid; lectura remota0cuentas antes y después. No onboarding/acción/recarga/logout-login/reapertura comprobados ni IDs creados. Falta un buzón de pruebas controlado y autorizado para recibir confirmación; mailer_autoconfirm=false, no se cambia. El error observado es dirección inválida, no falloSMTP demostrado. No alta administrativa ni inyección/interceptores. Informe y capturas reales en [LIM-01](../qa/h06-lim01-mobile-signup-2026-10-24.md).

Fallo de arnés posterior al400: locatoralert ambiguo por anunciador Next; intento original conservado, sin repetición para verde. Captura muestra «No pudimos completar el acceso. Revisa los datos e inténtalo de nuevo.», distinto del aviso histórico «No pudimos comprobar tu acceso.». Este último no observado, pero transición autenticada no alcanzada: causa sigue pendiente. Sin capturas inventadas del final/regreso.353archivos app/src/public idénticos; no aplicación/configuración/permisos modificados ni suites repetidas. H056 aislamiento aceptado, H01visual y H05/O01/O04 históricos conservados. LIM-01/H06 y logo/lema independiente abiertos. Sin commit/push/deploy ni validación productiva.

## MBV-H-056 — H06: primer bloque de aislamiento normal comprobado

**Aclaración24/10, sólo documental:** ZIP original, resultados y flows.cjs acreditan un contexto por tamaño, mismo origen3119, A→B→A→B sin limpiar/reemplazar almacenamiento, login/logout UI normal y sin interceptores/identidad inyectada. No se repite el recorrido. Precisión del aviso observado sólo en ensayo anterior de escritorio/login inicialA: «No pudimos comprobar tu acceso.» / «Vuelve a intentarlo en un momento.»; se pulsó «Solo necesarias», el posterior intento de pulsar «Intentar de nuevo» no llegó a ejecutarse porque desapareció el botón y apareció Inicio. Sin recarga/nuevo login, pero no desaparición demostrada sin interacción ni causalidad de cookies. Body de ese instante sin registros personalizados visibles; no snapshot interno ni traza continua. No guardado intentado/bloqueado acreditado; sí espera fallida del arnés. La corrida final pasa estados estables, no demuestra ausencia de todo aviso intermedio. Incidencia sigue abierta sin causa confirmada. Detalle, fuentes y límites en aclaración24/10 del informe H06. H05/O01/O04 históricos y H01 visual aceptado conservados. Sin aplicación, backend, datos, pruebas nuevas, commit/push/deploy.

**Cierre23/10,17:48 Bogotá:** alternativa sin Docker autorizada y operativa. Supabase alojado gratuito `mbv-h06-pruebas` (`tvdnxefyduycvrakjspv`), doce migraciones existentes sin modificar, dos cuentas reales sintéticas Gratis. Build normal nuevo `9glUEzbvT9douzeZdFXp2` en http://127.0.0.1:3119, NEXT_PUBLIC_MBV_E2E_ACCESS=0, sin mocks/identidades inyectadas. A→B→A→B completo en1448×1086 y390×844, mismo perfil/origen por secuencia sin limpiar almacenamiento: cuatro resultados aprobados. Por cuenta/tamaño:0tareas+2nuevas=2creadas=2regreso=2recarga; IDs/contenido/relación mensual intactos y cero registros personalizados de la otra cuenta en UI, respaldo exportado por app y base ownerId. Planner local, no sincronización cloud. [Informe verificable, IDs e intentos](../qa/h06-account-isolation-2026-10-23.md).

Sin cambios de aplicación. Comparación386 archivos app/src/public/tests idénticos a H05 permite conservar aquella evidencia sin repetir suites; build normal y recorridos nuevos separados. Ensayos fallidos del arnés conservados, incluida B con1tarea de onboarding+2capturas antes de la corrida final; no borrado ni falsificación de datos. Aviso transitorio de acceso observado durante exploración se resolvió sin reintento; causa todavía no confirmada, observación abierta independiente del aislamiento aprobado. Advisors del esquema remoto mantienen avisos de permisos SECURITY DEFINER/search_path; no seguridad integral ni validación productiva. H06 restante pendiente: otros permisos/Premium, integraciones y demás cobertura normal no ejecutada. O01/O04 siguen omitidas en H05 histórico, con nueva evidencia normal separada. Credenciales privadas fuera del repo/entregables. Sin commit, push ni deploy. Los párrafos de preparación siguientes conservan la historia, no describen el estado actual.

**Actualización de autorización23/10:** María autoriza preparar un proyecto Supabase alojado exclusivo de pruebas, únicamente con capacidad gratuita disponible, sin contratar ni modificar producción. Sustituye el requisito de backend local para este recorrido; la app y el planner seguirán locales. Se abrió el panel de Supabase, pero no hay sesión activa; el acceso habitual con GitHub solicita autenticación de María. Existe conexión Supabase disponible para instalar/conectar, todavía no confirmada. No se han consultado cuotas ni creado proyectos/cuentas remotos. Pendiente acceso para comprobar capacidad gratuita antes de cualquier creación. No Docker.

H01 queda aceptado visualmente por María tras revisar H01-desktop-es.png y H01-mobile-es.png; se retira ese pendiente actual. Se mantiene aparte la observación de posible recorte del logo/lema en escritorio, sin causa confirmada y sin implementar cambios. Las referencias a revisión pendiente en entradas anteriores son históricas.

Revisados SupabaseAuthRepository, AccountProvider, usePlanner y la selección de IndexedDB por ownerId: autenticación real y base `my-best-version-planner-v4:<ownerId>`; cierre del servicio anterior y protección de resultados asíncronos por generación. Esto es inspección estática, no evidencia de aislamiento ejecutado. Se consultó COBERTURA.csv original: A-R06a cubrió A→B→A en una versión anterior, no la secuencia actual en ambos tamaños. H05 conserva 167 aprobadas,0 fallidas,25 omitidas,0 reintentos; O01/O04 permanecen omitidas en aquella corrida.

El23/10 el arranque local falló con DockerDesktop/Wsl/ExecError: no encuentra docker-wsl-cli.iso.sha256 desde WSL. WSL2 existe; no se atribuye el bloqueo a un defecto de la aplicación. María pide usar otra alternativa y no Docker: no volver a arrancarlo ni reparar/reinstalar sin nueva dirección. No se ejecutaron login, creación de registros ni A→B→A→B; cantidades/IDs nuevos no disponibles. Pendiente elegir un entorno alternativo aislado que conserve autenticación normal, sin usar producción ni adaptador E2E. H06 y auditoría integral siguen abiertos. Sin cambios de aplicación/datos, commit, push ni deploy.

## MBV-H-055 — H05: suite E2E integral conciliada (local)

Única completa22/10/2026 17:17–17:58 Bogotá: **192 casos:167 aprobados,0 fallidos,25 omitidos,0 reintentos/flaky**,41.27min. Se conservan los176 casos de auditoría y se ejecutan16 regresiones adicionales H08/H09/H03/TasksPage/H01, sin retirar casos. Los15 fallos originales pasan; las expectativas ya conciliadas en entregas anteriores no se atribuyen como cambios nuevos. Único cambio de test H05: verificar href exacto de los seis destinos desktop y cinco móviles, manteniendo acciones y aserciones. No cambios de aplicación, datos, marca, fixtures del repositorio ni tiempos. **630/630 unitarias,102 archivos**, una sola completa; build/lint/tipos/i18n/tokens aprobados, advertencias preexistentes conservadas.

Correspondencia individual F01–F15/O01–O25 y motivos en [`../qa/h05-e2e-reconciliation-2026-10-22.json`](../qa/h05-e2e-reconciliation-2026-10-22.json).19 omisiones tienen contraparte aprobada en esta corrida;4 son tareas opt-in de regeneración de capturas no activadas; **2 fixme de cambio entre cuentas siguen pendientes**, porque el adaptador E2E modela un único usuario. La causa histórica de la carga fallida de imagen inglesa F13 sigue sin confirmarse aunque el test intacto pase ahora. No se ha reproducido otro defecto funcional en esta corrida.

Base5c06081+trabajo local conservado, build `6tP9sXWfkK9VTYnRP72BV`, origen aislado3118, E2E_ACCESS1 y seis flags preexistentes1; Desktop Chrome/Pixel7,1worker/retries0. Datos/permisos sintéticos, IndexedDB desechable y mocks existentes; **no acceso normal ni producción**. H02 público normal8/8 anterior permanece separado, no sumado a esta suite. H01 visual pendiente. Evidencia completa en C:/Users/maria/Documents/Codex/MBV-H05-2026-10-22/results; H055 conserva entorno, intentos históricos, hashes y límites. **Sin commit, push ni deploy. H06 y la auditoría integral no se declaran cerrados.** Los apartados siguientes son antecedentes conservados.

## MBV-H-054 — H02: un solo contenido principal público (local)

Confirmado antes en /legal, /legal-notices y /pqr:2 main anidados en DOM y árbol AX, en1448×1086/390×844. Corrección mínima en LegalPages.tsx: los dos contenedores internos main pasan a article; PublicFrame sigue siendo el único main. Sin textos, CSS, formularios, rutas, marca ni almacenamiento modificados. Regresiones nuevas LegalPages.test.tsx (14) y e2e/public-main-landmarks.normal.ts con playwright.public.config.ts, separado de la configuración E2E habitual. Ejecutar `pnpm exec playwright test --config=playwright.public.config.ts` contra una compilación normal ya iniciada (MBV_PUBLIC_BASE_URL opcional, por defecto3116).

Normal local http://127.0.0.1:3116/legal, build `pA82K4d52_RDTQprBdlqY`, base5c06081+trabajo local conservado, **E2E_ACCESS0**, sin credenciales/backend/mocks/cuentas ficticias. Ocho casos normales aprobados: las tres rutas en ambos tamaños (1main/0anidación, foco Tab/Enter/volver, sin overflow), más16 páginas compartidas por tamaño. No existe skip link en este contenedor. Textos/encabezados/enlaces/controles/geometría idénticos; seis capturas completas idénticas, sin cambio visible. PQR no enviado; formulario autenticado sólo inspeccionado en unitario sintético. AX vía CDP y ariaSnapshot, sin lector físico. No valida autenticación ni producción.

**630/630 unitarias,102 archivos**, una sola completa;21 dirigidas,8 E2E principales separados en3117/E2E1. Lint/tipos/build normal+E2E/i18n/tokens aprobados. Histórico conservado: seis negativos previos esperados; primera posterior5/8 por selector de teclado dirigido a Términos oculto en móvil, corregido sólo en el test para usar Gratis visible; final8/8,0 retries/omisiones. H054 detalla builds/arnés, evidencias y límites. H08/H03/TasksPage/H01/H09 intactos; sin CI remoto, commit, push ni deploy.

**H01, aclaración sin nueva implementación ni recorrido:** en ambos resultados existentes **1 anterior +2 nuevas =3 posteriores =3 tras recarga**; tarea previa íntegra, no tres nuevas ni pérdida. Recuperadas H01-desktop-es.png y H01-mobile-es.png de C:/Users/maria/Documents/Codex/MBV-H01-2026-10-20/. Revisión visual de María pendiente; evidencia H01 sigue siendo E2E, no normal. Los estados siguientes son antecedentes preservados.

## MBV-H-053 — H01: hora guardada visible en Mi día (local)

Omisión reproducida antes del cambio en escritorio1448 y móvil390: registro/agenda18:30, detalle de Mi día sólo origen mensual. Único cambio funcional en TodayPage: anteponer la hora local HH:mm al detalle existente; sin convertir fecha/zona, inferir duración, añadir campos ni modificar orden, datos, prioridad, estado o diseño. Conserva00:00 y deja intacto el texto de tareas sin hora. Meta/proyecto/origen/prioridad y acciones conservados, ES/EN sin nueva traducción. Planificador sigue en IndexedDB local, no sincronización cloud.

**616/616 unitarias,101 archivos**, única completa;12 dirigidas; H01 UI2/2 y principales8/8,0 fallos/retries/omisiones finales. Lint/tipos/build/i18n/tokens aprobados. El arnés unitario inicial y una captura sobre el nodo saliente Semana→Día fallaron y se corrigieron en los tests; negativos previos y todos los intentos separados en H053. Sin quitar cobertura ni ampliar timeouts. H08/H03/TasksPage y H09 preservados.

UI crea paso18:30 sin duración, compara agenda, edita19:00, vuelve y recarga: mismo ID y origen, una ocurrencia; total1→3→3→3 al incluir tarea previa y medianoche. EscritorioID0774d7ae-56fd-478b-9088-eabc312623f6; móvilID1917aef8-64c4-494a-9dab-89356ed87b13. Capturas ES/EN sin retoque, sin overflow390 y con barras fijas. ARIA snapshot incluye hora/origen; no NVDA/VoiceOver físico.

Base5c06081 más cambios locales conservados; build `6dRV5wLotXb7P-tieUvqn`, http://127.0.0.1:3114/app/today, **E2E_ACCESS1**, contexto mensual sintético, tareas por UI, almacenamiento real desechable. No comprobación normal/productiva/CI ni suite E2E global. Evidencia en `C:/Users/maria/Documents/Codex/MBV-H01-2026-10-20/results/H01-results.json`, informe y cuatro PNG finales en carpeta superior. **Sin commit, push ni deploy. No H02.** Los estados siguientes son antecedentes preservados.

## MBV-H-052 — TasksPage: sincronización del reintento corregida (local)

Carrera confirmada: tras el fallo, el error y el botón de reintento ya estaban visibles, pero el registro actualizado por efecto pasivo aún tenía `saving=true`; finish rechazaba el reintento antes de invocar onSave. Reproducción determinista de ambos casos antes/después y ensayo con servicio/cola reales. Cambio mínimo: useLayoutEffect publica el registro confirmado antes de otra interacción. Sin modificar persistencia, datos, IDs, mensajes o diseño. Los logs antiguos se conservan; sin traza no puede certificarse el orden exacto de cada fallo histórico ni inferirse pérdida de datos.

**614/614 unitarias,100 archivos**, única completa de cierre; TasksPage7/7 (cinco originales y dos nuevos). Dirigidas20/20. **14 E2E aprobados**, sin fallos/retries/omisiones: cuatro TasksPage, dos borrador mensual, ocho principales. Proyecto0→0→1→1 y checklist0→1→2→2, con mismos IDs al reintentar/volver/recargar, tareas previas y colecciones ajenas intactas; títulos manuales iguales permitidos. Lint/tipos/build/i18n/tokens aprobados. Intentos negativos y errores de preparación conservados por separado en H052; no se repitió la completa buscando verde.

Base5c06081 + H08/H03 locales conservados; aprobación visual H08/H03 comunicada por María. Build E2E `3nNuvy5K5k3JR4vBpnRjh`, `http://127.0.0.1:3113`, E2E_ACCESS1, datos sintéticos e IndexedDB real con fallo pre-commit controlado. No validación normal/productiva/CI ni suite E2E global. Evidencia `C:/Users/maria/Documents/Codex/MBV-TasksPage-2026-10-20/results/TasksPage-results.json` y `INFORME.txt`; capturas originales en e2e-focused-artifacts. Planner sigue local, sin migración/sincronización. Sin commit/push/deploy ni H01. Las entradas siguientes conservan el estado histórico anterior a esta corrección.

## MBV-H-051 — H03: preparación semanal compartida (local)

**Incidencia abierta — TasksPage (revisión de evidencia20/10/2026):** causa todavía no confirmada. La primera completa H03611/612 repite exactamente el caso observado en H08: `saves every checklist draft once and preserves the remaining draft on partial failure`, fallo en `await view.findByText("Otra pantalla")`, línea120: `Error: Unable to find an element with the text: Otra pantalla.` La aislada4/5 falla en otro caso: `keeps a project after failed save-and-continue and navigates only after retry`, misma espera/error, línea82. Ambos pertenecen a `legacy tasks and projects draft protection`. La completa final612/612 (TasksPage5/5) permanece separada de esos intentos y no acredita resolución de la intermitencia. No se repitieron pruebas ni se cambió implementación en esta revisión de evidencia; H08/H09 intactos, no H01, sin commit/push/deploy.

Base `5c06081` + H08 local conservado, sin commit/push/deploy. Inicio conserva cinco filas y consume la misma selección/estados/total que Mi guía. Sólo aplicables confirmados cuentan listos; excluidos semanales no cuentan aunque tengan contenido; desactivados en personalización tienen etiqueta distinta y enlace a Mi guía. Reincluir es explícito, sin confirmar. Personalizados mantienen ID/etiqueta/contribución y se anuncian en una sola línea en Inicio. Cero aplicables es neutral sin contador0/0 ni porcentaje. Mi guía muestra el contador también en escritorio; se corrigió una regla previa que lo ocultaba.

22 E2E finales aprobados, sin fallos/omisiones/reintentos automáticos: H03 dos recorridos (1448 y390 con360), preparación dos, Inicio dos, H08 seis, H09 dos y principal ocho. Semana2026-10-19 con navegación/recarga: ambas vistas3/5,3/4,3/5 al reincluir,4/4,neutral,1/2 personalizado,0/2 semana siguiente,1/2 al volver,neutral sin selección. Datos sintéticos y acceso E2E1 en copia aislada3112, build `VHyGmbHW7KapGGZD8tWBY`, sin .env/credenciales de producción. Identidad del plan semanal, histórico, perfiles y colecciones de ejecución verificados; sólo cambian preferencias/estados solicitados y timestamp de escritura. Sin migración ni sincronización.

Lint/tipos/build/i18n/tokens aprobados. **Completa final100 archivos/612 unitarias aprobadas,0 fallidas/omitidas, salida0**,20 de octubre06:51 Bogotá. Primera completa611/612, fallo TasksPage esperando Otra pantalla en guardado de varios borradores; aislada4/5 con fallo distinto de proyecto tras error. La final los aprueba intactos, sin reintentos automáticos ni modificación de tiempos. No atribución causal ni cambios en TasksPage/guardia/tests. Nueve archivos H03 coinciden por hash con copia probada; cinco archivos H08 idénticos a su cierre previo. Intentos y evidencia en H051 y `C:/Users/maria/Documents/Codex/MBV-H03-2026-10-20/results/H03-results.json`; capturas seleccionadas1448/390/360 en `evidence/`. No suite E2E global, build release nuevo ni acceso normal/producción/CI H03; sin commit/push/deploy. Siguiente paso: revisión local de H03 por María, no abrir otro hallazgo. H050 debajo conserva el cierre anterior de H08.

## MBV-H-050 — H08: sugerencias de Aprende (validado local, sin publicar)

Base `5c06081`, sin commit/push/deploy. Aprende bloquea cada operación inmediatamente y por sugerencia/fecha/visita: Añadiendo… → Añadido a Mi día sólo tras guardar; fallo vuelve a permitir reintentar y usa el único aviso de usePlanner. Confirmación de tarea no prioritaria, estados ES/EN y enlace a Mi día conservados. No deduplicación global por título ni reparación de duplicados históricos. H09 permanece intacto; sus dos E2E se repitieron y pasan.

Acabado H08 revisado: Playfair real400 a20px/18px, Inter UI, padding24px/20px, carga visible única y éxito con check/opacidad1; reglas sólo de Aprende. Capturas antes/después inspeccionadas en1448/390/360, claro/oscuro, ES/EN y teclado. No se cambió la guardia funcional ni la arquitectura de datos.

Cierre técnico19 de octubre17:56 Bogotá: **una ejecución completa final limpia,99 archivos/604 unitarias aprobadas,0 fallidas/omitidas, salida0**, sin reintentos ni aumento de tiempos. Seis H08 UI (cuatro funcionales y dos de matriz visual), ocho E2E principales y dos H09 aprobados; lint/tipos/i18n/tokens y builds separados aprobados. E2E aislado3111 build `9TCXwuxxrJa5YNiZfaTOV`, release sin acceso E2E `ZTbFp0oRHiP8ILcqISEbz`; no comprobación normal/productiva ni CI H08. Evidencia en `C:/Users/maria/Documents/Codex/MBV-H08-polish-2026-10-19/results/H08-final-results.json`, diagnóstico y capturas finales en la misma carpeta raíz.

Los intentos previos603/604 y599+dos workers fallidos se conservan en H050. Se retira la atribución no demostrada «ajeno a H08»: TasksPage falló esperando Otra pantalla; doce reproducciones instrumentadas no repiten el fallo y el test original pasa intacto en la completa final, pero la causa histórica exacta sigue no confirmada. Eventos Kernel-Power506/507 acreditan suspensión del host16:01–17:05 durante la segunda corrida; consistente con los timeouts de arranque, sin timestamp individual de cada worker. Sin omisiones/aserciones debilitadas. Planner sigue local, sin sincronización. Siguiente paso: revisión local de H08 por María; no H03 ni publicación. Versiones publicadas debajo no incluyen H08.

## MBV-H-049 — H09: conservación de identidad de áreas

**Publicado y verificado:** commit funcional `3ffca4a`, CI39128284879 aprobado (E2E remoto omitido por condición sólo PR), Vercel `dpl_9Fuihbqzr8c943LBZPUp23VdYYkV` READY en mybestversion.life. Inicio/Ajustes normales cargan tras recarga, ocho áreas y cero errores de consola, sin editar registros personales. Capturas sintéticas desktop/390 y comparación exacta de IDs en H049. El párrafo siguiente conserva el estado previo a publicación. Documentación posterior no cambia aplicación/tests. Siguiente paso: revisión de María; no reparación automática de duplicados previos.

Carga ordinaria y reanudación conservan íntegra cualquier colección existente; sólo una colección vacía recibe las ocho áreas iniciales. Renombrar no recrea el nombre original ni cambia IDs/orden/relaciones. Sin migración, fusión, cambio de diseño o servicios.598 unitarias, ocho E2E principales y dos H09 desktop/390 aprobados; lint/tipos/auditorías/builds separados aprobados. Backups v1/v2/v3 y aislamiento por tests verificados; no prueba entre cuentas normales productivas ni suite E2E completa repetida. Publicación exclusiva H09 autorizada, pendiente de verificar al preparar este commit. Detalle e intentos en H049. Planner sigue local por cuenta/origen; autenticación no implica sincronización. H048 debajo es el antecedente publicado.

## MBV-H-048 — Inicio: dónde estoy (publicado y verificado)

Inicio sigue `inicio-propuesta-a.png`: cinco filas de preparación con contador X de5; intención/prioridades del mes actual; franja lunes–domingo y prioridades semanales; un proyecto activo con progreso real/siguiente acción; próximos dos compromisos. Selectores sobre datos canónicos, sin ejemplos fijos. Mi año es el único acceso anual del sidebar y abre doce meses. Mi día conserva la ejecución y la tarjeta de retorno. Planner local por cuenta/origen: autenticación no añade respaldo ni sincronización.

Producción: `https://mybestversion.life/app/dashboard`. Commit funcional `cadaa27f28a2c91cc7cf262ce50f77cb210474e1`; ajuste exclusivo de test `7ac40bb7ec8860d0775c524068bb216ce09c6b9c`, enviado a `fix/ux-audit-2026-09-24` y main. CI38977381503 SUCCESS (lint/tipos/592 unitarias/build); Vercel `dpl_7AXdBXpgb3vWX9saed1WxZGivoFg` READY. Cierre posterior sólo documental. Inicio y accesos principales verificados en sesión productiva existente,1448/390 sin overflow/errores de navegador/imágenes rotas; no escrituras productivas. Logs internos Vercel no accesibles403: no se declara observabilidad completa. E2E productivo desactivado, integraciones/permisos sin cambios.

Normal local disponible en `http://127.0.0.1:3102/app/dashboard`, build `9vPmCVPwNa6NCW2om9tJ_`, E2E=0/backend local existente. Once comprobaciones normales aprobadas sin siembra/interceptores/escrituras; capturas1448/390. E2E separado3100 con fixtures: suite completa140 aprobados/11 expectativas antiguas fallidas/25 omisiones existentes; repeticiones corregidas10/10 y4/4 con2 duplicados omitidos. Consolidado176 casos:151 aprobados,0 fallos pendientes,25 omitidos,0 flaky; no una sola corrida verde. CI inicial591/592 falló en aserción prematura de foco, espera corregida manteniendo exigencia, CI posterior592/592. Auditorías/builds locales aprobados; evidencia `C:/Users/maria/Documents/Codex/MBV-inicio-2026-10-16/results`. Detalle/intentos/límites enH048. Siguiente paso: revisión del Inicio publicado. Los estados anteriores siguientes son antecedentes.

## MBV-H-047 — Mi año simplificado (vigente local)

Mi año muestra título con año seleccionado, selector y doce meses reutilizados de Mis 12 meses. Mes guardado → detalle mensual; vacío → editor del mes/año exactos, conservando permisos. El año persiste en URL/recarga. Sin pestañas anuales, áreas, enlaces intermedios ni horizontes/Planificación en esta pantalla; sus datos anteriores no se borran ni migran. Mapa independiente, mensual/semanal/diario, marca y navegación conservados.

Normal local nuevo: `http://127.0.0.1:3102/app/planning?view=annual`, build `fT9f8D04bOPvA4a8Xc0Dw`, E2E=0 y Supabase local existente. Diez comprobaciones normales con cuenta de pruebas autorizada, sin siembra/interceptores/escrituras del planner; capturas1448/390/430. Requiere mantener Docker/backend y servidor encendidos. Copia E2E separada en3100: 27 aprobados/2 omisiones preexistentes/0 fallidos en tres corridas dirigidas; 23 unitarias aprobadas, tipos/lint/auditorías y ambos builds correctos. No se repitió la suite completa para este cambio ni OAuth Google. Evidencia y detalle de intentos en MBV-H-047 del historial y `C:/Users/maria/Documents/Codex/MBV-year-months-2026-10-16/results`.

Archivos principales: `PlanningMonthGrid.tsx`, `EditorialYear.tsx`, `EditorialMonthMap.tsx`, `PlanningPage.tsx`, `preparation.css`, pruebas relacionadas. Sin commit/push/deploy/producción. Siguiente paso: revisión de la usuaria de Mi año. El cierre amplio de marca siguiente se conserva como antecedente pendiente, no se declara terminado por esta tarea.

## MBV-H-046 — identidad del kit (en curso)

Libreta definitiva, Playfair títulos/Inter UI, kit prioritario sobre identidad provisional R1–R7. Implementación local y validación aislada en curso; no modificar flujo/datos. Norma vigente: `docs/brand/approved-kit-system.md`. E2E separado de acceso normal3102; sin producción, commit/push/deploy. Evidencia antes/después fuera del repo en `C:/Users/maria/Documents/Codex/MBV-brand-unification-2026-10-13`.

## Trabajo local posterior al release — MBV-H-045

**13 de octubre — recuperación de conectividad local, posterior al acceso Google:** 3102 respondía HTTP200, pero 54321 devolvía `Empty reply from server` desde Windows aunque Auth respondía dentro de Kong y los contenedores figuraban sanos. Se reinició únicamente `supabase_kong_MBV-local-backend-2026-10-09`; después Auth respondió200 desde Windows. Se conserva el mismo build `9d1gY_2fz7pTMogwyb4qD`, E2E=0, puertos loopback, configuración Google, contenedores y volúmenes.17 comprobaciones técnicas nuevas aprobadas: salud externa, proveedores, redirección302 hacia Google/callback local, identidad/sesión/salida de las dos cuentas de prueba, servicios, bindings y rutas normales. En la pestaña existente se abrió `/app/planning` y se confirmó el mapa tras recargar con sesión conservada; no se repitió el consentimiento interactivo Google. Causa acotada al enlace de publicación de puerto entre Docker y Windows; el disparador exacto no está demostrado. Scripts/resultados/evidencia externos: `MBV-local-backend-2026-10-09/verify-access-recovery-20261013.cjs`, `access-recovery-20261013-results.json`, `access-recovered-planning-20261013.jpg`. Sin cambios de aplicación/diseño/datos/credenciales, sin borrado de caché ni reconstrucción. Suite frontend/lint/tipos/build no repetidos por tratarse de recuperación de infraestructura; no se presenta como regresión completa. Docker y servidor local deben permanecer encendidos. Sin commit/push/deploy/producción.

**13 de octubre — proveedor Google local corregido; acceso Google y persistencia verificados:** proyecto `MBV Local Pruebas` / `mbv-local-pruebas-20261013` confirmado, sin duplicarlo. Cliente web dedicado `MBV Local — Supabase 3102`, origen `http://127.0.0.1:3102`, callback `http://127.0.0.1:54321/auth/v1/callback`; audiencia Testing y sólo openid/correo/perfil básico, sin Gmail/Drive/Calendar. Usuaria autorizó contacto, política Google y creación/configuración de credenciales. Descarga JSON falló; secreto recuperado del panel del cliente y guardado sólo fuera del repositorio con ACL usuario/SYSTEM, sin imprimirlo. Se recreó únicamente Auth conservando DB, JWT, red y contenedor anterior detenido recuperable; configuración TOML y helper local usan referencias privadas. `external.google=true`, autorización302 a Google,9 servicios sanos y puertos exclusivamente loopback.16 comprobaciones técnicas aprobadas (incluyen identidad/login/salida de ambas cuentas por correo, no reevaluación integral de permisos Premium); `run-local.cjs status` salida0. Informe sin secretos: `C:/Users/maria/Documents/Codex/MBV-local-backend-2026-10-09/google-local-verification.json`. Usuaria autoriza consentimiento básico: primer callback devuelve bad_oauth_state por enlace caducado; nuevo intento desde login completa Google → backend local → pantalla legal «Antes de continuar», conservada después de recargar. Las cuatro casillas siguen sin marcar; no se aceptaron términos, tratamiento, declaración de edad ni novedades en nombre de la usuaria. Autenticación Google y persistencia verificadas; onboarding/dashboard no recorridos. Evidencia externa google-return-local-2026-10-13.jpg. Build `9d1gY_2fz7pTMogwyb4qD`, E2E=0, app y recursos intactos; no repetida suite frontend al ser cambio exclusivo de infraestructura. Planner sigue local, sin sincronización cloud. Sin facturación, commit/push/deploy ni producción.

**Vigente,10 de octubre — validación normal realizada:** Docker Engine29.8.2/Linux y Supabase local operativos,12 migraciones aplicadas; nueve servicios sanos. Se corrigió publicación de puertos antes de crear cuentas: Docker y Windows confirman127.0.0.1 en54321–54324/3102. Build normal independiente `9d1gY_2fz7pTMogwyb4qD`, E2E=0 y revisión semanal=1, disponible en `http://127.0.0.1:3102/login`. Dos cuentas Auth locales desechables Gratis/legacy_premium, roluser, permiso Premium backend sin cobro ni suscripción pagada.17 comprobaciones normales aprobadas: onboarding/login/salida/reentrada, permisos, aislamiento entre cuentas, cuatro correcciones, mapa y respaldo/restauración de34 colecciones; sin fixtures/interceptores/reloj artificial. Primer contexto mostró error de comprobación de acceso no reproducido; causa sin establecer, no ocultar. Recorrido completo posterior sin errores HTTP/JS, tráfico sólo a3102/54321. App/recursos no cambiaron; regresión completa previa145 aprobadas/0 fallidas/25 omisiones existentes y577 unitarias separada de esta validación. Planner sigue local por cuenta/origen, no sincronización cloud. Informe/JSON/capturas y pasos en [cierre vigente](../qa/candidate-regression-2026-10-06.md). ZIP `C:/Users/maria/Downloads/MBV_Candidata_Normal_2026-10-10.zip`, sin secretos/BD/respaldos. Credenciales locales privadas fuera del paquete. No bloqueos de instalación; siguiente hito revisión manual de la usuaria, no publicación. Sin commit/push/deploy/producción. Los bloqueos de instalación que siguen son antecedentes resueltos.

**Vigente10 de octubre:** reinicio completado e hipervisor activo. WSL3.0.1.0 instalado desde MSI Microsoft firmado, UAC/salida0/sin reinicio automático; kernel verificado. Docker falla porque su instalación por usuario quedó virtualizada bajo `AppData/Local/Packages/OpenAI.Codex_2p2nqsd0c76g0/LocalCache/Local/Programs/DockerDesktop`, mientras WSL busca recursos en la ruta normal. Falta de archivo demostrada desde WSL; no es falta de cuentas Supabase. La usuaria debe ejecutar el instalador firmado conservado en `C:/Users/maria/Documents/Codex/MBV-local-backend-2026-10-09/Docker-Desktop-Installer.exe` desde Explorador, por usuario/WSL2, sin reset/desinstalación. Usuario confirma uso personal gratuito. Motor Docker/backend/cuentas normales todavía no operativos; no se inventa validación. Informe actualizado; app/datos conservados, sin producción/commit/push/deploy. Los párrafos del9 son antecedentes.

**Punto de continuidad18:18 Bogotá,9 de octubre:** WSL y VirtualMachinePlatform habilitados con UAC; helper completado con salida0. Ambos devuelven `RestartNeeded: True`. Reinicio automático suprimido; falta que la usuaria guarde su trabajo y reinicie Windows manualmente. Después verificar hipervisor/WSL moderno y continuar Docker/Supabase aislados; no repetir habilitación ya completada. Backend/cuentas y validación normal aún pendientes. El bloqueo UAC descrito debajo es antecedente resuelto. Aplicación y datos intactos; sin producción, commit, push ni deploy.

**Cierre vigente de regresión,6–9 de octubre:** se corrigieron fixtures/expectativas de las cuatro causas documentadas sin modificar la candidata funcional ni sus recursos. Hábitos y recap ahora prueban lunes/miércoles; Hoy no confunde intención y prioridad; el punto horario sin duración permanece en su hora y Semana comprueba siete días; los tests esperan el guardado antes de recargar/navegar. Respaldo exportado/restaurado compara colecciones, IDs y completado tras recarga. Sólo cambian dos archivos E2E y documentación respecto al manifiesto previo de428 archivos; huella final `d3339baf4fe370813e978dd8f3641034fb26f1d9a7a35828fc579d9b18cd24cd`.

**Resultado final:** suite E2E completa170 casos: **145 aprobados,0 fallidos,25 omitidos existentes,0 reintentos automáticos/0 flaky/0 errores externos**,27,6min con1 worker. Omisiones:19 duplicados/matrices específicas,4 capturas opt-in y2fixme de dos cuentas reales. La lista no cambió.94 archivos/577 unitarias aprobadas,0 fallidas/omitidas. Dirigida25/0/1; repetición visual3/0/1. Tipos/lint/auditorías/22 contrastes y compilación normal separada aprobados. Intentos anteriores fallidos (incluidos timeouts e intermitencia unitaria), resultados por escenario y configuración en [informe de cierre](../qa/candidate-regression-2026-10-06.md) y [JSON de resultados](../qa/candidate-regression-results-2026-10-09.json). No se atribuyen los éxitos E2E a servicios normales.

**Preparación autorizada,9 de octubre:** instalados Docker Desktop4.94.0 por usuario (firma válida, salida0; todavía sin arrancar/aceptar licencia) y Supabase CLI2.120.0 fijado en `C:/Users/maria/Documents/Codex/MBV-local-backend-2026-10-09`. Proyecto inicializado localmente,12 migraciones copiadas pero no ejecutadas; no cuentas/datos/servicios creados. WSL/VirtualMachinePlatform siguen deshabilitados: UAC pendiente. Hay que cancelar el aviso UAC antiguo antes de relanzar el helper con política de ejecución sólo de proceso y `-NoRestart`; detalle en el informe. Sin reinicio automático ni política permanente modificada. App conservada/E2E=0; no se observaron listeners3100/3102 al terminar, dirección prevista `http://127.0.0.1:3102/login`, no servidor actualmente confirmado. Autenticación real y permisos Gratis/Premium pendientes. Planner sigue en IndexedDB local por cuenta/origen, sin respaldo ni sincronización cloud automáticos. Sin producción/costes/commit/push/deploy ni aprobación visual.

### Antecedente: validación del5 de octubre

**Validación de candidata, 5 de octubre — resultado separado:** se conservó la implementación de las cuatro correcciones sin cambios de app/tests/recursos. Base `2fc9ce9`, huella de 428 archivos `ca94ff850188c4cb5fb828eba4b82c6a24150f1cebc0a377f9d0099d9f2cce4f`. Nuevas compilaciones aisladas: normal `weOGjhYjPX5biSjOK0DA-` en `http://127.0.0.1:3102/login` (E2E=0, flags normales sin overrides) y pruebas `QlwwS3RmX_olWARgTM3h8` en3100. La normal no tiene Supabase de pruebas configurado: redirige a login y rechaza parámetros/sessionStorage/tokens E2E; no se validó login real ni cuentas Gratis/Premium. No se sembraron datos ni interceptaron servicios en esa comprobación normal.

**Regresión completa de esta candidata:** 94 archivos/577 unitarias aprobadas; Playwright completo166 casos en26,38min: **131 aprobados, 10 fallidos, 25 omitidos, 0 reintentos/0 flaky**. Los6 casos `monthly-steps` aprobaron, incluidas las cuatro correcciones y recarga; esto no convierte en verde la suite. Fallos: Hábitos asume días anteriores al alta en una semana que empieza hoy lunes (2), recap espera «1 días» (2), recorrido meta→Hoy espera el rótulo mensual antiguo (2), matriz editorial espera la tarea con hora fuera de la rejilla (4). Se conservaron todas las aserciones. Omisiones existentes:19 duplicados de matrices,4 capturas opt-in,2fixme de aislamiento entre cuentas (brecha real). Builds habituales, lint, tipos, i18n, tokens y22 contrastes aprobados. Intentos de compilación y detalle por escenario en el informe.

**Bloqueo normal:** faltan backend no productivo y dos cuentas de prueba. La usuaria autorizó revisar/crear entorno; inventario de sólo lectura confirmó una organización Supabase Free con dos proyectos activos, sin staging MBV identificado. No hay Docker/Supabase CLI y WSL no está instalado. Falta elegir instalación local o acordar entorno externo/coste; no se contrataron recursos, crearon cuentas ni modificaron proyectos existentes. El planner sigue siendo IndexedDB local por cuenta/origen, sin sincronización entre dispositivos. No commit/push/deploy ni cambios de producción. Siguiente paso: resolver estos bloqueos de validación y revisión de la usuaria; no aprobación visual ni permiso de publicar.

Entrega: [`MBV_Candidata_Validacion_2026-10-05.zip`](../../deliverables/MBV_Candidata_Validacion_2026-10-05.zip), 3.108.803 bytes, informe TXT/HTML, resultados por caso,15 capturas existentes de las correcciones y1 captura nueva del bloqueo normal. Extraído fuera del repositorio:20 archivos,16 imágenes decodificadas/hashes correctos, sin tráfico externo/errores JS/overflow390px. Sin credenciales, cookies, bases de datos, trazas ni archivos de fuentes. Evidencia técnica completa fuera del repo: `C:/Users/maria/Documents/Codex/MBV-validation-2026-10-05/results`.

### Antecedente conservado: implementación y QA parcial de las correcciones

**Hito vigente — cierre de cuatro correcciones de usabilidad, 5 de octubre:** tareas con hora sin duración aparecen como puntos a su hora real; Semana muestra el panorama canónico de siete días; Hoy identifica la prioridad mensual concreta de origen; la revisión se compacta al omitir/terminar y guardar paso muestra un recibo persistido con cómo continuar. Guardar/completar un paso no marca preparación como lista ni completa la prioridad mensual. Se conservan IDs, datos, funciones, estructura general y recursos. Sin commit/push/deploy ni paquete general nuevo.

Antecedente visual del 4 de octubre: la usuaria aprobó estructura/composición, sidebar/navegación, Playfair+Inter, iniciales y botánicos. Se refinó sólo Inicio, Mi guía y12meses, sin cambiar marca global. Capturas/inventario en [`../qa/visual-refinement-2026-10-04.md`](../qa/visual-refinement-2026-10-04.md). Las sustituciones fotográficas y papelería aún requieren aprobación; no se declara caligrafía exacta. Foto de revisión preparada, aún sin aplicar. Este ajuste no añade ni sustituye recursos.

App local durante la sesión: `http://127.0.0.1:3100/app/dashboard`, build E2E `XCmiUZYBMSg0Wbvf6vHo0`, sólo loopback. Auth/Premium y flags E2E/P2 activos para pruebas; no es el entorno normal. Contexto limpio sin siembra/interceptores muestra onboarding,HTTP200 y cero errores JS. Capturas del recorrido usan sesiones desechables con planes sintéticos/reloj fijo; fixtures editoriales interceptan lecturas de privacidad/consentimiento. Tareas se guardan por servicio/repositorio/Dexie real local, no en datos personales ni backend de producción.

Validación actual: build/tipos/lint/auditorías aprobados; **94 archivos/577 unitarias aprobadas** en corrida final. **18 escenarios E2E afectados verificados**: corrida integrada17 aprobados/1 fallo de espera de guardado/2 duplicados omitidos; caso corregido en test y repetido2/2 con éxito. El nuevo recorrido pasó6/6. Fallos iniciales/selectores y timeout unitario constan en HISTORIAL, no se ocultan. No se repitió toda la suite E2E. Siguiente paso: revisión de estos estados por la usuaria; publicación sigue sin autorización.

Evidencia específica actual (capturas reales, no retocadas):

| Estado | Escritorio | Móvil |
| --- | --- | --- |
| Hora sin duración | [10:00](../qa/screenshots/usability-2026-10-05-hora-sin-duracion-desktop.png) | [10:00](../qa/screenshots/usability-2026-10-05-hora-sin-duracion-mobile.png) |
| Panorama semanal | [Completo](../qa/screenshots/usability-2026-10-05-semana-completa-desktop.png) | [Detalle](../qa/screenshots/usability-2026-10-05-semana-detalle-mobile.png) |
| Prioridad de origen | [Hoy](../qa/screenshots/usability-2026-10-05-origen-en-hoy-desktop.png) | [Hoy](../qa/screenshots/usability-2026-10-05-origen-en-hoy-mobile.png) |
| Revisión compacta | [Omitida](../qa/screenshots/usability-2026-10-05-revision-omitida-desktop.png) | [Omitida](../qa/screenshots/usability-2026-10-05-revision-omitida-mobile.png) |
| Recibo y continuación | [Paso guardado](../qa/screenshots/usability-2026-10-05-paso-guardado-desktop.png) | [Paso guardado](../qa/screenshots/usability-2026-10-05-paso-guardado-mobile.png) |
| Persistencia | [Completado y recarga](../qa/screenshots/usability-2026-10-05-completado-recarga-desktop.png) | [Completado y recarga](../qa/screenshots/usability-2026-10-05-completado-recarga-mobile.png) |

La entrega portátil anterior [`MBV_Revision_Visual_Final.zip`](../../deliverables/MBV_Revision_Visual_Final.zip), galería3101 y capturas `closure-*` permanecen como antecedente intacto; **no incluyen la pasada posterior**. Su inventario A01–A15 reformuló la petición genérica de originales, sin implicar assets independientes. El inventario actual de sustituciones es [`../qa/visual-refinement-assets-2026-10-04.md`](../qa/visual-refinement-assets-2026-10-04.md). Marca global preservada: Leaf privado desktop, wordmark móvil y libreta en otras superficies. No hay aprobación automática de sustituciones ni autorización de publicación.

El cierre funcional local R1–R7 está verificado en la rama `fix/ux-audit-2026-09-24`, sobre `2fc9ce9`, sin commit/push/deploy. Inicio, Mi guía, mapa anual, categorías del año, pestañas de mes, preparación semanal, salud mensual/semanal y agenda diaria comparten datos canónicos. Ya están implementados el selector compartido Mes→Semana, agenda proporcional con solapamientos, biblioteca de detalle real, principales Semana/Hoy/Visión y protección de borradores del recorrido. Preparación no equivale a cumplimiento. No se modificaron landing, autenticación, pagos ni servicios remotos.

Tipos, lint, auditorías, 22 contrastes, build y **549 unitarias** aprobados. Suite E2E completa final: **135 aprobados/1 fallido/22 omitidos** en 25.2 min; el único fallo era una espera de persistencia del test, corregida sin cambios de app y repetida con éxito **2/2 + 10/10**. Los 136 escenarios ejecutables quedan verificados; no se afirma una corrida completa verde en un solo intento. Las 22 omisiones históricas están documentadas, incluidos dos fixme de cambio entre cuentas. Todas las subpantallas móviles solicitadas tienen evidencia; las comparaciones R5/R6/R7 incluyen viewport nativo, overlay y diff. **La identidad visual exacta sigue pendiente de originales o aprobación de las sustituciones** (fotos, papelería, marca y fuentes). Rutas, recursos, límites y resultados actuales: [`../qa/editorial-closure-2026-10-03.md`](../qa/editorial-closure-2026-10-03.md); [`../qa/editorial-r1-r7-2026-10-02.md`](../qa/editorial-r1-r7-2026-10-02.md) conserva el antecedente. No confundir este trabajo local con la producción descrita debajo.

> **Release comercial v2 vigente:** producción ofrece Gratis permanente, Premium USD 2.99/mes o USD 29.99/año y una recompensa manual de 30 días Premium después de 30 fechas consecutivas. Incluye migración, acceso central, landing, administración, checkout/webhook server-side, cancelación autoservicio con paid-through, recuperación segura de checkout stale, serialización por cuenta, revalidación de conflictos, cola de participación ligada a usuario y outbox con supresión previa al envío. La migración está aplicada y el transporte Resend está publicado en `7af51a3`. Mercado Pago permanece apagado. Resend tiene recurso, dominio verificado y secretos limitados a Production; la única prueba real figura `Delivered`. Consulta [`../product/commercial-access-v2.md`](../product/commercial-access-v2.md), [`../product/trial-premium-matrix.md`](../product/trial-premium-matrix.md) y [`../AUTH_BILLING_SETUP.md`](../AUTH_BILLING_SETUP.md).

## Punto de continuidad

- **Cierre publicado — 2026-10-01:** `613df97` enviado a `origin/main` y rama de trabajo. Vercel `dpl_DfXu2d4Aua5BJB8MdQ78P6yLKTHB` quedó Ready y asignado a `https://mybestversion.life/`; CI `36912308358` aprobó. Las migraciones `202609280001` y `202609300001` están aplicadas y los flags Production activos. GET público devuelve `open`; envío desde navegador habitual devolvió 202 y mostró confirmación. BotID bloqueó el navegador automatizado con 403. El único registro sintético fue retirado y el contador volvió a 0/20, sin tocar registros reales. Confirmación móvil 390×844 y 360×640 sin overflow; formulario desktop 1440×900 inspeccionado. No se envió correo ni se creó cuenta, acceso o trial.

- Repositorio remoto: `mariadlang/mbv`; la entrega productiva se promueve desde un worktree verificado y `origin/main` es la referencia publicada.
- Rama de producción: `main`.
- Base de la entrega P1: `8e6ede1995cef4656ef8b23cac3f04a98d4ebdf2` (`docs: record P0 production release`).
- `main` y `origin/main`: alineados en `8e6ede1` antes de comenzar P1.
- Historial en la base P1: completo/no superficial, 65 commits alcanzables, dos raíces históricas y sin tags.
- Entrega P0: `MBV-H-022` quedó consolidada en `5c5f5a0bfd342a4b731fa927f992d7233959006d`, enviada a `origin/main` y publicada como versión 27 de Sites.
- Entrega P1: `MBV-H-023`, consolidada en `8f240f5b1516d212da65630e36ea3d5a15fd40e9`, enviada a `origin/main` y publicada como versión 29 de Sites; tipografía, tokens, CSS, primitives, navegación, Mi espacio, i18n, lenguaje, gamificación amable, documentación y QA quedaron validados.
- Integración Google Calendar: `MBV-H-025` a `MBV-H-031` documentan su implementación, hardening y validación histórica. Por decisión expresa del 16 de septiembre, `MBV-H-032` pausa la integración, retira sus superficies activas y programa el cierre del proyecto Google Cloud `mbv-calendar-production`. El calendario local permanece disponible; no se purgaron datos históricos de Supabase ni secretos de Vercel. Consulta [`../integrations/google-calendar.md`](../integrations/google-calendar.md).
- Release P2/Calendar: `MBV-H-032` y `MBV-H-033` quedaron consolidados en el commit funcional `7628074708e379dd5c79b9b76f3102022e25a5a6`, enviado a `origin/main` y publicado en Vercel Production. P2-A implementa Weekly Recap, regreso amable, tarjetas de progreso, referrals, analítica/lifecycle, aislamiento local por cuenta y copy Premium contextual, con los cinco flags apagados. La validación aprobó lint, TypeScript, 44 archivos/243 pruebas unitarias, builds Next/Vinext, 82 E2E en la suite completa previa, el E2E Premium final desktop/mobile y la matriz visual P2. La migración P2 está aplicada y certificada en Supabase; el smoke público del release aprobó y Calendar externo quedó efectivamente desactivado.
- Landing y matriz comercial: `MBV-H-035`/`MBV-H-036` conservan el historial de la portada editorial inicial. `MBV-H-037` registra su sustitución por la oferta Gratis/Premium actual, la migración comercial, CI, Vercel Production y smoke público aprobados. `MBV-H-041` publica el rediseño de la recompensa por constancia. `MBV-H-043` ya publica capturas auténticas con datos demo y explica, mediante un selector manual accesible, Mi día, Planificación, Bienestar y Progreso; conserva oferta, CTA, autenticación, popup, planes y FAQ.
- Invitación de lanzamiento: sobre `MBV-H-042`, `MBV-H-044` publica el código de un modal fiel al mockup con formulario waitlist, confirmación y cupos agotados/newsletter; autoapertura diferida una sola vez, reapertura manual, cierre accesible, ES/EN y matriz 1440×900, 390×844 y 360×640. El backend normaliza/deduplica el correo, serializa la capacidad de 20 solicitudes y prepara el guardado en Supabase del tipo de registro, preferencia, fechas separadas de waitlist/suscripción/consentimiento, origen `landing_launch` y marcas de tiempo. Waitlist y novedades son finalidades separadas: el alta no envía correo, no crea cuenta, no inicia prueba, no activa Premium ni confirma un cupo. El commit funcional `0fa8578c9e14404dab6f6353b7a09c7cf9062d75` está en la rama de trabajo y `origin/main`; Vercel Production `dpl_AFR65npA2zMsry9uP77yGDT8UdD3` quedó `Ready`. La campaña continúa fail-closed: los flags permanecen apagados, el endpoint público responde `unavailable` y la migración Supabase no se aplicó.
- Cierre funcional y UX: `MBV-H-040` corrige cuatro fallos de planificación, duplicación, fechas y hábitos, y completa continuidad Meta → Mes, cierre de proyectos, seguimiento amable y valoraciones confirmadas. El commit funcional `ad0fa5d08c959f883dafd6d56123ee96920f5bf6` está en `origin/main`; GitHub Actions `36465516462` y el deployment Production `6717547820` aprobaron el mismo SHA. La evidencia detallada vive en [`../auditorias/2026-09-25-cierre-funcionamiento-ux/`](../auditorias/2026-09-25-cierre-funcionamiento-ux/).

Este documento describe el release vigente mediante `MBV-H-020` a `MBV-H-044` en [`HISTORIAL.md`](HISTORIAL.md). Los cambios conservan P0/P1 y no incorporan Outlook, Apple Calendar, recomendaciones con IA ni auto-planificación; la IA sólo se comunica como capacidad futura no disponible.

## Qué es el producto

My Best Version es una aplicación de productividad y desarrollo personal que conecta una dirección de vida con metas, resultados mensuales, semanas, acciones diarias, hábitos y reflexión. Su lenguaje de producto es sereno y no punitivo: los días no programados no reducen la constancia y los estados vacíos deben permitir avanzar sin culpa.

El acceso usa cuenta remota, pero el contenido detallado del planner continúa local-first en el navegador. Esta distinción es esencial:

- **Supabase/remoto:** identidad, verificación de email, acceso/trial/Premium, rol, preferencias, consentimientos, solicitudes de privacidad, soporte, eventos minimizados y plataforma privada.
- **IndexedDB/local:** perfil de uso del planner, áreas, metas, hitos, hábitos, tareas, proyectos, planes, journal, finanzas, rutinas, eventos, vision board, fitness, nutrición, medidas, retos y compras pendientes.

No existe sincronización del contenido del planner entre dispositivos.

## Experiencia implementada

### Entrada, cuenta y onboarding

- Landing editorial y páginas públicas de cuenta, trial, upgrade, recuperación y verificación. La landing usa los anchors `#inicio`, `#como-funciona`, `#que-incluye`, `#beneficios`, `#planes` y `#faq`.
- Registro/login con Supabase, además de Google y enlace mágico cuando el proveedor está configurado.
- Consentimientos obligatorios separados y marketing opcional.
- Alta con acceso Gratis permanente, estados comerciales y capacidades Premium calculados mediante reglas de dominio y funciones Supabase.
- Landing, registro y onboarding conducen desde la cuenta Gratis a una primera acción real; crear la cuenta no requiere tarjeta.
- Los trials de 15 días sólo se conservan como compatibilidad para cuentas históricas. Sus fechas y su horizonte editable de tres meses no se aplican a nuevas altas Gratis.
- La landing muestra capturas reales inspeccionadas en QA de Dashboard (`p0-dashboard-1440x900.png`), Mi día (`p0-today-390x844.png`) y Hábitos (`p0-habits-1440x900.png`).
- El release vigente comunica Premium a USD 2.99/mes o USD 29.99/año. Análisis avanzado y recomendaciones deterministas basadas en datos disponibles forman parte de Premium; no se presentan como IA.
- Onboarding en cuatro pasos que parte de `Mi día`, `Una meta`, `Mi semana` o `Un hábito`, pide un resultado y una primera acción, y aterriza en Mi día.
- Una cuenta ya establecida recupera un perfil local mínimo si falta y evita repetir el onboarding. Borrar explícitamente los datos locales permite volver al estado inicial.
- Importación de respaldo disponible desde el onboarding.

### Marca, acceso y activación P0

- La jerarquía verbal se centraliza en `src/lib/brand.ts`: promesa, idea rectora, posicionamiento, mensaje estratégico, slogan y explicación operativa.
- Metadata y Open Graph usan `mybestversion.life`, la promesa principal y “Una vida más tuya.”; la pieza social ya no incluye un monograma alternativo ni “Planea · Acciona · Logra”.
- `src/lib/cta.ts` define los CTA principales de adquisición, cuenta, onboarding, acceso, paywall, checkout y recuperación.
- `src/domain/access.ts` es la fuente reutilizable de acceso Gratis, compatibilidad de trial, capacidades y feature gates. El horizonte de tres meses se valida sólo para un trial legacy; un plan mensual existente fuera de ese horizonte se conserva en solo lectura con sus actividades históricas, tareas y eventos enlazados, sin duplicar equivalentes.
- `src/domain/access.ts` expone `fitness_and_nutrition` y `five_year_planning` como capacidades Premium reales. `/app/health` aplica el gate con `account.access` y conserva el bypass de superadmin.
- Activación v2 requiere onboarding, acción conectada, progreso consciente y segunda sesión dentro de siete días; no exige crear una meta.
- Onboarding y activación se calculan sobre la cohorte observable de cuentas con eventos v2, no sobre todas las cuentas; esa cohorte no equivale a un registro persistido de consentimiento.
- La analítica propia se encola sólo con consentimiento, minimiza metadatos y reserva los hitos derivados al servidor. Retirar el consentimiento en otra pestaña detiene la captura y limpia la cola e intenciones de autenticación pendientes.
- La sesión analítica se comparte entre pestañas y sólo se renueva después de 30 minutos de inactividad cuando vuelve a existir actividad real; el inicio se deduplica por identificador de sesión.
- El logo temporal continúa siendo `public/brand-icon.svg`; la auditoría confirmó que contiene un PNG y que falta el master vectorial aprobado.

### Navegación vigente

- Cinco destinos principales: **Inicio, Mi día, Planificar, Mi espacio y Progreso**.
- Desktop mantiene **Bienestar** y **Finanzas** visibles en un grupo secundario “En Mi espacio”; no cuentan como destinos principales.
- Mobile conserva exactamente los cinco destinos principales en la barra inferior; el menú y Más herramientas exponen utilidades adicionales.
- Rutas antiguas se conservan como redirects: `/app/challenges`, `/app/mood`, `/app/life-hub/fitness`, `/app/profile`, `/app/pqr` y `/admin`.

### Inicio y Mi día

- Inicio agrega prioridades, metas, hábitos, planificación, bienestar y próximos pasos.
- Mi día muestra la siguiente acción, Top 3, agenda por fecha, tareas, entrenamientos, comidas, eventos, hábitos, ánimo/energía, intención y cierre diario.
- La captura rápida reutiliza el mismo drawer desde distintas procedencias.
- El cierre diario local actualiza una única entrada `Cierre del día` por fecha.
- La cabecera de Hoy muestra nuevamente `Buenos días, {nombre} 👋`, restaurado por solicitud expresa.
- Mood/energía usa `TodayMoodCard` en Hoy y Hábitos y conserva un único registro diario.

### Planificación, metas, proyectos y tareas

- Visión y áreas de vida conectan con metas.
- La rueda de vida muestra `Sin evaluar` hasta que la persona confirma puntuaciones. Reflexionar no las confirma y sólo valoraciones confirmadas alimentan radar, promedios e insights; valores legacy ambiguos permanecen pendientes sin reinterpretarse.
- Las metas soportan progreso manual, numérico, por tareas o hitos ponderados.
- Planificación dispone de vistas año, mes, semana, día y revisión; siempre muestra los doce meses del año elegido.
- Los planes incluyen horizontes de cinco años/Premium, tres años, mensual y semanal.
- Un mes puede conservar intención, prioridades, áreas, acciones, eventos, reflexión y procedencia de una meta.
- Una fecha importante nueva con título exige un día real. Los registros históricos incompletos permanecen visibles, editables y marcados como `Fecha pendiente`, sin bloquear el mes.
- Las acciones mensuales usan una clave estable por plan para que un doble envío o reintento sea idempotente sin deduplicar tareas legítimas con el mismo título.
- `Planificar esta meta` conserva la procedencia y exige una decisión explícita si el mes ya está vinculado; cancelar no modifica el plan y la confirmación refleja el vínculo realmente guardado.
- Un trial legacy aplica el mismo horizonte local de tres meses a creación, asignación y reprogramación desde mes, semana, día y captura rápida; `usePlanner` vuelve a validar la regla antes de persistir. Las cuentas Gratis nuevas no heredan ese límite temporal.
- La ruta semanal usa una lista vertical de lunes a domingo con prioridades derivadas de las mismas tareas, creación rápida por día, hábitos recurrentes, edición y cambio de fecha, y un panel de pendientes sin fecha que permite asignar sin duplicar entidades.
- Brain Dump conserva su conversión idempotente a tarea dentro del panel de pendientes y la revisión semanal se abre en modal sin ocupar espacio permanente.
- Tareas pueden enlazar meta, proyecto y plan; Top 3 se expresa mediante `focusPriority`.
- Proyectos aparecen antes de tareas y admiten checklist. Completar todas sus tareas produce `Listo para cerrar`: cerrar, añadir otra acción o reabrir siguen siendo decisiones explícitas y reversibles.
- El flujo Meta → resultado mensual → semana → Mi día → Progreso tiene cobertura E2E.

### Hábitos, progreso y journal

- Hábitos booleanos, de cantidad o duración; recurrencia diaria, días laborables, personalizada o sólo una fecha.
- Progreso parcial medible y edición del hábito. Hábitos, Mi día y Semana muestran la misma cantidad parcial y abren el editor compartido; eliminar un registro es una acción separada y confirmada.
- Los hábitos nuevos empiezan su seguimiento en la fecha de creación. Constancia y **Mayor continuidad** cuentan únicamente días programados desde ese inicio; “Sin seguimiento” y “No programado” son estados separados y nunca se convierten en 0 %.
- Progreso reúne evidencia de metas, hitos, tareas y hábitos.
- Los logros convierten instantes a fecha local antes de presentarlos; una fecha sin hora conserva su día original.
- Journal admite entrada libre, gratitud y revisiones; el contenido permanece local.
- La entrada rápida del Journal exige contenido.

### Mi espacio y herramientas

- La ruta base de Mi espacio abre un **Resumen** con accesos y contexto; Bandeja/Brain Dump conserva listas, edición, fecha flexible/mes/día y conversión idempotente a tarea.
- Rutinas editables, Retos embebidos, Tablero de visión y Calendario/eventos.
- El alias histórico `tab=calendar` se normaliza al destino canónico `tab=events`.
- Más herramientas enlaza Bienestar, Finanzas, Rutinas, Retos, Tablero visual, Calendario, Ayuda, Aprende y Ajustes.
- `LearnPage`, Centro de ayuda y modal global de desbloqueo ofrecen orientación no punitiva.

### Bienestar y Finanzas

- Fitness y alimentación (`/app/health`) es Premium mediante `fitness_and_nutrition` e incluye autorización de datos sensibles, entrenamiento, comidas/macros y medidas/fotos locales.
- Entrenamiento admite fuerza con ejercicios o cardio/deporte sin ejercicios individuales obligatorios.
- Comidas pueden crearse, copiarse y eliminarse; el borrado incluye confirmación y feedback.
- Finanzas incluye cuentas, categorías, presupuesto mensual, movimientos, fondos, deudas, recurrentes, revisión y compras pendientes.
- No hay conexión bancaria ni asesoría médica/nutricional automatizada.

### Google Calendar

- La integración está pausada por defecto con `NEXT_PUBLIC_GOOGLE_CALENDAR_ENABLED=0`. Ajustes no ofrece OAuth, las vistas no muestran calendarios/eventos remotos y el provider no consulta, sincroniza ni reintenta en segundo plano.
- Los endpoints interactivos responden `404 CALENDAR_DISABLED`; webhook y mantenimiento responden `204` y el cron fue retirado de Vercel.
- El proyecto Google Cloud `MBV Calendar Production` (`mbv-calendar-production`) quedó programado para cierre. Google conserva una ventana de recuperación de 30 días antes de la eliminación definitiva.
- El calendario local continúa funcionando en Mi espacio, Semana y Mi día. Tareas, prioridades y eventos locales siguen separados. Editar un evento histórico vinculado durante la pausa lo convierte en copia local; borrarlo sólo afecta la copia local.
- La implementación y migración histórica permanecen versionadas. No se purgaron credenciales/caché históricas de Supabase ni secretos de Vercel porque no se autorizó esa eliminación adicional; la app pausada no los usa y la supresión se canaliza por PQR/Centro de Privacidad.
- Reactivar Calendar requiere una decisión nueva, proyecto OAuth válido, credenciales rotadas, revisión legal y repetición del QA completo; no basta con cambiar el flag.
- Guía histórica y contrato de pausa: [`../integrations/google-calendar.md`](../integrations/google-calendar.md).

### P2 — Retención y crecimiento amable

- Los cinco flags P2 —`weekly_recap`, `return_experience`, `share_cards`, `referrals` y `premium_contextual_prompts`— permanecen en `false` por defecto. Completar código o QA no los activa en producción.
- `premium_contextual_prompts` sólo cambia la descripción del gate existente de planificación a 5 años. `canAccessFeature()` conserva toda la autoridad de acceso; el copy, CTA y comportamiento anteriores se mantienen cuando el flag está apagado. El gate de Fitness y alimentación es independiente de esta variante de copy.
- Weekly Recap usa evidencia real de tareas, prioridades, hábitos, metas, hitos y reprogramaciones hasta el día actual. Registra decisiones textuales de conservar, mover o soltar, no muta pendientes directamente y puede preparar la semana siguiente. Las acciones directas viven en Regreso amable.
- La experiencia de regreso aparece tras inactividad y propone una acción real: retomar un pendiente o prioridad, elegir un mínimo viable, mover una acción a hoy, soltarla o descartar la sugerencia.
- Las tarjetas compartibles se generan por opt-in con métricas agregadas permitidas, preview y formatos exactos para Story, Feed y cuadrado. No toman texto libre del planner; sólo admiten un titular opcional escrito/revisado explícitamente y excluido de analytics. Exportan PNG y usan Web Share cuando está disponible.
- Referral usa un código opaco estable por cuenta y atribución first-touch local de hasta 29 días. La atribución sólo se transmite con consentimiento analítico; no existe todavía una recompensa comercial aprobada ni se presupone validación jurídica final.
- La taxonomía P2 cierra nombres y metadatos aceptados, conserva cohortes observables y añade métricas agregadas de D1/D7/D30, WAU, recap, sharing, referrals y conversión. Las reglas lifecycle son deduplicables y separan mensajes transaccionales, pero no activan email/push ni un proveedor externo.
- IndexedDB queda aislado por cuenta autenticada mediante un namespace propio. La reclamación del almacenamiento legacy es conservadora, conserva la base original y evita mezclar datos al cambiar de cuenta.
- `supabase/migrations/202609160001_p2_growth_analytics.sql` se aplicó al proyecto enlazado `yvrvetuzuinoinukrivo`. El ledger quedó alineado hasta `202609160001`, el dry-run posterior confirmó que la base está al día y el lint remoto terminó sin errores. Analytics/referrals P2 siguen apagados hasta smoke autenticado y revisión legal.
- P2-B/P2-C cuentan con sistema y documentación de motion, diseño social, contenido, fotografía/assets, portal de marca, campañas, partnerships y experimentación. La ejecución externa, los assets finales con derechos, el master vectorial, canales lifecycle, recompensas y campañas reales siguen fuera de esta entrega.
- Fuentes de alcance: [`../product/p2-roadmap.md`](../product/p2-roadmap.md), [`../product/weekly-recap.md`](../product/weekly-recap.md), [`../product/shareable-progress.md`](../product/shareable-progress.md), [`../product/referrals.md`](../product/referrals.md), [`../product/lifecycle.md`](../product/lifecycle.md) y [`../analytics/event-taxonomy.md`](../analytics/event-taxonomy.md).

### Legal, soporte y plataforma

- Centro legal público para privacidad, tratamiento, cookies, pagos, retracto, IA, proveedor, seguridad y PQR.
- Centro de privacidad autenticado con consentimientos y solicitudes.
- Soporte acepta sugerencias, bugs y mensajes de cuenta mediante rutas API autenticadas.
- Eventos propios usan una taxonomía cerrada y excluyen textos de metas, journal, comidas, salud y finanzas.
- La taxonomía v2 separa eventos aceptados del navegador de `second_session_started`, `activation_completed` y `payment_confirmed`, reservados al servidor.
- `/platform` exige superadmin y ofrece métricas, usuarios, tickets, FAQ, categorías y parámetros respaldados por Supabase.
- El release comercial v2 integra Mercado Pago mediante rutas server-side por intervalo, intents idempotentes, consulta canónica, webhook firmado y cancelación autoservicio reconciliada; volver del checkout no activa Premium y el frontend no modifica el acceso. La configuración productiva permanece apagada hasta completar plan comercial, credenciales y certificación sandbox; el enlace externo único de releases anteriores es sólo referencia histórica.

## Mapa de conexiones

```text
Supabase Auth → useAccount → gate legal/acceso → aplicación protegida

Feature UI → usePlanner → plannerService → PlannerRepository → Dexie/IndexedDB
   Meta ─┬→ resultado mensual → semana → tarea fechada → Mi día
         └→ hitos/tareas/progreso manual → evidencia en Progreso
   Hábito → habitLogs ────────────────→ Hoy/Hábitos/Progreso
   Mood ──────────────────────────────→ Hoy/Hábitos
   Workout + Nutrition + Events ─────→ Bienestar/Hoy
   Brain Dump ─→ conversión a tarea ─→ Semana/Mi día
   Cierre diario ─────────────────────→ Journal

Token de cuenta → rutas API → Supabase
   ├→ soporte/FAQ
   ├→ preferencias de marketing
   ├→ eventos minimizados y consentidos → hitos de activación v2
   ├→ datos históricos Calendar server-only (integración pausada, sin tráfico)
   └→ plataforma superadmin
```

## Ubicaciones clave

- `app/PlannerApp.tsx`: gates, composición global y rutas.
- `src/components/layout/AppShell.tsx`: navegación desktop/mobile y utilidades.
- `src/features/`: pantallas por módulo.
- `src/features/tasks/QuickCaptureDrawer.tsx`: captura transversal.
- `src/features/planning/WeeklyPlanView.tsx`: composición y operaciones del plan semanal.
- `src/hooks/usePlanner.ts`: controlador de UI para el planner local.
- `src/services/plannerService.ts`: casos de uso y mutaciones.
- `src/repositories/interfaces/PlannerRepository.ts`: contrato local sustituible.
- `src/repositories/local/IndexedDbPlannerRepository.ts`: Dexie, tablas y transacciones.
- `src/domain/planner.ts`: entidades y `PlannerSnapshot` esquema 3.
- `src/domain/`: reglas puras de progreso, fechas, acceso, finanzas, fitness y orientación.
- `src/lib/brand.ts` y `src/lib/cta.ts`: jerarquía verbal y CTA del funnel.
- `src/domain/access.ts`: trial, matriz de capacidades y feature gates.
- `src/domain/monthPlanning.ts`: doce meses, serialización de áreas y composición sin duplicados de actividades, tareas y eventos mensuales.
- `src/domain/productAnalytics.ts`: taxonomía y evaluación pura de activación v2.
- `src/hooks/useAccount.tsx` y `src/repositories/supabase/`: cuenta y datos remotos mínimos.
- `app/api/`: soporte, eventos, marketing y plataforma.
- `supabase/migrations/`: esquema remoto y políticas RLS.
- `tests/` y `e2e/app.spec.ts`: pruebas unitarias y recorridos completos.
- `app/globals.css`: punto de entrada ordenado de las capas CSS.
- `src/styles/tokens.css` y `tokens-dark.css`: tokens de marca, semánticos, de componente y overrides oscuros.
- `src/styles/`: foundations, layout, primitives, marketing, utilidades y estilos por feature.
- `src/components/ui/Primitives.tsx` y `Modal.tsx`: contratos reutilizables de interfaz y accesibilidad.
- `src/i18n/messages/`, `keys.ts` y `formatters.ts`: catálogos estables, tipado y formato localizado.
- `scripts/check-contrast.mjs`, `audit-design-tokens.mjs` y `audit-i18n.mjs`: contraste y límites verificables de deuda.
- `docs/architecture/`, `docs/brand/`, `docs/design-system/`, `docs/decisions/` y `docs/qa/`: fuentes vigentes y evidencia de release.

## Tecnologías e integraciones verificadas

- Next.js 16.2.6, React 19.2.6 y TypeScript 5.9.3.
- React Router 7 para navegación cliente.
- Dexie 4/IndexedDB para planner local.
- React Hook Form y Zod para formularios, archivos y backups.
- Zustand para preferencias de interfaz.
- Recharts y Lucide.
- Supabase JS para Auth y datos remotos mínimos.
- Código histórico de Google Calendar mediante OAuth 2.0/PKCE, actualmente desactivado por feature flag.
- Contratos de Mercado Pago server-side con checkout por intervalo, intentos idempotentes, webhook firmado, conciliación y cancelación autoservicio; la configuración productiva permanece apagada hasta su certificación.
- Vitest, Testing Library y Playwright.
- Vercel como runtime principal configurado; Vinext/Cloudflare Sites como destino adicional explícito.
- GitHub Actions para lint, typecheck, unit y build; E2E en pull requests.

## Ejecución y comprobaciones

Requisitos declarados: Node.js 22.13 o superior y pnpm 11.16.

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:contrast
pnpm audit:i18n
pnpm audit:design-tokens
pnpm build
pnpm build:vinext
pnpm test:e2e
```

- `pnpm dev`, `pnpm build` y Playwright usan Next.js.
- `pnpm dev:vinext` y `pnpm build:vinext` corresponden al destino adicional.
- E2E usa `NEXT_PUBLIC_MBV_E2E_ACCESS=1` y repositorio Auth simulado; no prueba una cuenta real de producción.

## Decisiones vigentes

- Conservar el flujo obligatorio feature → `usePlanner` → `plannerService` → `PlannerRepository`.
- Mantener el contenido sensible del planner local hasta una decisión explícita de sincronización.
- No presentar datos demo como reales; su carga debe ser voluntaria.
- No penalizar días no programados en la constancia.
- No inventar una fecha de inicio para hábitos legacy ni reinterpretar puntuaciones históricas ambiguas como valoraciones personales confirmadas.
- No cerrar un proyecto automáticamente por completar sus tareas ni sobrescribir el vínculo de una meta con un mes sin una decisión explícita.
- Mantener exactamente cinco destinos principales en desktop/mobile; Bienestar y Finanzas son accesos secundarios visibles de Mi espacio.
- Mantener Nunito Sans en el tracker. La excepción editorial de la landing usa Playfair Display para titulares/acento e Inter para navegación, cuerpo y controles, siempre acotadas a `.landing-page`.
- Introducir color, espacio, radio, sombra o control reutilizable mediante tokens y primitives antes de crear una variante aislada.
- Mantener español como idioma canónico y EN visible como Beta mientras exista el bridge legacy.
- No traducir contenido escrito o nombrado por la persona; usar límites explícitos también en portales.
- Usar español claro, foco visible, nombres accesibles y estados vacíos útiles.
- Validar imports y formularios con Zod; no registrar contenido sensible en consola o eventos.
- Usar la jerarquía de `src/lib/brand.ts`, la taxonomía de `src/lib/cta.ts` y la matriz de `src/domain/access.ts` antes de introducir copy equivalente.
- Para el release comercial v2, comunicar Gratis permanente y un único Premium con las mismas capacidades por USD 2.99/mes o USD 29.99/año. Fitness/alimentación, Finanzas, análisis avanzado determinista y recomendaciones basadas en datos disponibles son Premium; no se anuncian como IA. Renovación y cancelación sólo se comunican conforme al contrato server-side implementado y todavía no certificado en sandbox.
- Mantener la analítica opcional apagada hasta consentimiento y no usarla como una medición completa de visitantes anónimos.
- Mantener tareas/prioridades separadas de eventos y preservar el calendario local aunque la integración externa esté pausada.
- No reactivar Google Calendar ni purgar datos históricos server-side sin una decisión y autorización específicas.
- No considerar una tarea con cambios completa sin actualizar `HISTORIAL.md` y, si aplica, este archivo.

## Validación conocida

En las sesiones del 2026-09-04 al 2026-09-07, sobre el SHA base más las correcciones locales:

- ESLint: aprobado.
- TypeScript: aprobado.
- Unitarias: 69 aprobadas.
- Build de producción: aprobado.
- Suite E2E completa anterior: 56/56 aprobada antes de restaurar el emoji del saludo.
- Después de restaurarlo: ESLint/TypeScript aprobados y matriz responsive E2E 2/2 en proyectos desktop/mobile.
- Tras implementar Plan semanal opción B: lint, TypeScript, 69 unitarias, build de producción y build de Sites/Vinext aprobados.
- Los recorridos específicos del plan semanal aprobaron en desktop y mobile, incluida su matriz en 390×844, 430×932, 768×1024, 1440×900 y 1488×992.
- La suite E2E global ejecutó 57/60 en paralelo; dos casos externos aprobaron al reintentarse de forma aislada. La matriz global desktop restante fue interrumpida por `ERR_NETWORK_IO_SUSPENDED` del entorno, mientras su equivalente mobile y la matriz específica semanal aprobaron.
- Viewports cubiertos por la matriz: 375×812, 390×844, 430×932, 768×1024, 1366×768 y 1440×900.

Estas comprobaciones no demuestran la configuración real de Supabase, migraciones, Google, Mercado Pago, correo ni variables legales en producción.

Para el candidato P0 del 2026-09-08 se registraron durante la implementación:

- ESLint: aprobado.
- TypeScript: aprobado.
- Unitarias: 20 archivos y 96 pruebas aprobadas.
- Contraste: 12 pares principales aprobados mediante `pnpm test:contrast`.
- Build de producción Next.js: aprobado.
- Matriz Playwright P0 final: 66 casos aprobados, 8 omisiones intencionales y 0 fallos. Las omisiones evitan duplicar cobertura entre proyectos o reservan utilidades que sólo corren con una variable explícita.
- Screenshots: ocho referencias P0 generadas en `docs/qa/screenshots/`.
- Smoke de producción: aprobado sobre la versión 27 para landing/trial, dashboard, Mi día, Semana, Hábitos y Upgrade; sin errores de consola ni overflow horizontal. Open Graph respondió en 1200×630.

Para el candidato P1 del 2026-09-10:

- Auditoría de tokens: 291/291 coincidencias directas revisadas dentro del baseline, distribuidas entre fuentes de tokens, excepciones técnicas y deuda heredada.
- Auditoría i18n: 1.230 claves estables ES/EN y 803/803 entradas legacy permitidas.
- ESLint y TypeScript: aprobados.
- Unitarias: 25 archivos y 140 pruebas aprobadas.
- Contraste: 22/22 pares claro/oscuro aprobados.
- Matriz pública: 10 rutas × 9 viewports aprobada.
- Matriz de producto: 16 rutas × 9 viewports × claro/oscuro aprobada tras corregir un overflow de 3 px en Ajustes a 320×568.
- Recorridos funcionales de onboarding, cuenta existente, planificación, Hábitos, Meta → mes → semana → Mi día → Progreso e inglés Beta aprobados en las ejecuciones registradas.
- Builds Next y Vinext aprobados; smoke de producción aprobado sobre portada, Trial, Dashboard, Mi día, Plan semanal y Hábitos, sin errores de consola observados.
- Verificación post-release: `db lint` identificó y luego confirmó resuelto el conflicto PL/pgSQL P0 de `record_user_event`; la migración forward `202609100001_fix_product_analytics_v2_ambiguity.sql` quedó aplicada, la base remota quedó al día y `/api/events` respondió `200` en siete envíos consecutivos.

Para la implementación histórica Google Calendar `MBV-H-025`, iniciada el 2026-09-11 y cerrada técnicamente el 2026-09-14:

- ESLint y TypeScript: aprobados.
- Unitarias: 33 archivos y 184 pruebas aprobadas.
- Auditoría i18n: 1.302 claves estables ES/EN y 803/803 entradas legacy; las cuatro advertencias corresponden a claves de uso dinámico conservadas.
- Auditoría de tokens: 291/291 coincidencias dentro del baseline; contraste: 22/22 pares aprobados.
- Builds de producción Next.js y Sites/Vinext: aprobados con las rutas API de Calendar incluidas.
- La ejecución E2E global cerró 66 casos aprobados y 9 omisiones intencionales; el único caso no concluido perdió la sesión de navegador durante una suspensión de 10,5 horas. Su matriz de 16 rutas × viewports requeridos × claro/oscuro se repitió en una sesión continua y aprobó. El recorrido de evento local entre Mi espacio, Plan semanal y Mi día volvió a aprobar en desktop y mobile, incluida la preservación de la zona IANA al editar.
- Cuatro revisiones independientes no encontraron bloqueadores P0/P1 estáticos tras cerrar ownership, ETag atómico, reintentos idempotentes, protección ABA por UUID de conflicto, desconexión/reconexión, OAuth, mantenimiento y SQL. La migración y el OAuth/primer sync con una cuenta real quedaron certificados históricamente; no se ejecutó una mutación remota controlada ni una prueba concurrente PostgreSQL real.
- Para `MBV-H-032`, TypeScript, ESLint, 33 archivos/185 pruebas unitarias, i18n, tokens, contraste y builds Next/Vinext aprobaron. El E2E dirigido pasó 4/4 casos en desktop y mobile, tanto para la ausencia de Calendar externo/sus llamadas API como para el CRUD local entre Mi espacio, Semana y Mi día.

Para el release P2 publicado `MBV-H-033`:

- Las pruebas dirigidas de Weekly Recap, regreso amable, share cards, referrals, analítica/lifecycle y aislamiento de cuenta están incorporadas; los recorridos P2 dirigidos ya aprobaron en desktop y mobile durante la implementación.
- La matriz visual P2 cubre 375×812, 390×844, 430×932, 768×1024, 1366×768 y 1440×900, en claro/oscuro y ES/EN Beta, con evidencia en `docs/qa/screenshots/`.
- Lint, tipos, 44 archivos/243 pruebas unitarias, builds Next/Vinext y Playwright (82 aprobadas, 12 saltadas por diseño, 0 fallos en la suite completa previa) quedaron aprobados. Después del cableado Premium, su recorrido dirigido volvió a aprobar 2/2 en desktop/mobile. Esto no implica activación pública.
- La migración P2 se aplicó y pasó postchecks remotos. El smoke público de producción aprobó; no hubo smoke autenticado de producto ni activación de flags.

Para el cierre funcional y UX `MBV-H-040`:

- ESLint, TypeScript, 68 archivos/399 pruebas unitarias, i18n (1.598 claves estables ES/EN y 803/803 legacy), tokens (298/298), contraste (22/22) y build Next de 21 rutas aprobaron.
- Playwright cubrió escritorio 1440×900 y móvil 390×844, formularios, persistencia, datos legacy, foco/nombres accesibles, navegación entre módulos, zona `America/Bogota`, ES/EN y las matrices visuales públicas/de producto.
- Una suspensión de 10,3 horas dejó cinco resultados inconclusos o desactualizados; todos se repitieron después en una sesión continua. La evidencia compuesta final es 96/96 casos ejecutables aprobados y 16 omisiones intencionales.
- `build:vinext` aprobó sus cinco fases y las 21 rutas después de inyectar sólo durante el proceso las dos variables `NEXT_PUBLIC_*` ya expuestas por el bundle productivo. No se creó `.env`, no se conservaron valores en el entorno y el working tree permaneció limpio.
- El smoke de `mybestversion.life` aprobó landing, privacidad y Trial, además de Planificación, Semana, Hábitos, Metas, Proyectos, Visión, Progreso y Mi día en 1440×900 y 390×844. No se observaron errores de consola, estados de carga atascados ni desbordamiento horizontal. No se ejecutaron controles que escriben en el planner; cargar rutas autenticadas puede registrar actividad de retorno o telemetría consentida.
- El detalle de decisiones y validación está en [`../auditorias/2026-09-25-cierre-funcionamiento-ux/`](../auditorias/2026-09-25-cierre-funcionamiento-ux/).

Para la presentación publicada del producto real `MBV-H-043`:

- Dieciséis capturas auténticas ES/EN se generaron mediante un contexto E2E local aislado, con identidad y datos ficticios creados a través de la interfaz, zona `America/Bogota`, cinco flags P2 públicos apagados y resolución 2×. No se consultó ni escribió producción, no aparecen correos, cuentas reales ni controles administrativos; Progreso verifica 3 tareas completadas y 6 registros de hábitos antes de capturar.
- El hero usa una vista prioritaria de Mi día; el módulo inferior ofrece cuatro momentos manuales con un único panel activo, navegación por clic y flechas horizontales/Home/End, foco visible, relaciones ARIA y capturas responsive separadas. Los `<source>` móviles declaran su propia proporción y `srcset` optimizado para evitar CLS y pérdida de nitidez.
- ESLint, TypeScript, 72 archivos/430 pruebas unitarias, auditoría i18n (1.638 claves estables ES/EN y 803/803 legacy), tokens (298/298), contraste (22/22), dos E2E dirigidos en 390×844, 768×1024 y 1440×900, cuatro regresiones de landing, cuatro casos E2E del popup en desktop/mobile y los builds Next/Vinext aprobaron. Para Vinext se reutilizó la configuración pública ya expuesta por el bundle productivo únicamente dentro del proceso; no se creó ni modificó ningún `.env`.
- Las capturas finales de hero y selector quedaron en `docs/qa/screenshots/landing-product-{hero,showcase}-{390,1440}.png`; las capturas publicables y su procedencia están registradas en `docs/brand/assets-manifest.md`.
- Los commits `c24bb9fc06423b292eeb3399a7b31b4d327bc5c1` y `370a8a81579e570c5b64023ca2c92e2c16aa3cde` se enviaron a la rama de trabajo y a `origin/main` sin force push. GitHub Actions `36772651377` aprobó lint, tipos, 430 pruebas unitarias y build; Vercel Production `6769422318` publicó el mismo SHA. El smoke de `mybestversion.life` aprobó landing, privacidad, Trial y Login con HTTP 200, selector responsive desktop/mobile sin overflow ni errores de consola, y `public-state` respondió `200 {"status":"unavailable"}`. La invitación `MBV-H-042` está desplegada pero permanece apagada, sin migración, secretos nuevos, captura de correo ni envíos reales.

La evidencia final de P1 se mantiene en [`../qa/p1-release-report.md`](../qa/p1-release-report.md); el informe P0 permanece como referencia histórica.

## Problemas y limitaciones confirmados

1. El planner no sincroniza entre dispositivos; borrar datos del sitio puede eliminar el contenido local si no existe respaldo.
2. El release comercial v2 ya publica checkout server-side mensual/anual, webhook, conciliación, recuperación stale y cancelación autoservicio, pero su configuración de Mercado Pago permanece apagada: faltan credenciales sandbox, confirmación USD y una compra/cancelación real autorizada. La UI ya no enlaza directamente al checkout legacy.
3. Las migraciones analítica v2, su hotfix y `202609190001_commercial_access_v2.sql` fueron aplicadas; el dry-run remoto quedó al día y los postchecks confirmaron los contratos comerciales. Los datos legales del responsable y la verificación operativa de las integraciones externas continúan pendientes.
4. La auditoría legal enumera tareas administrativas y revisión jurídica pendientes; el cálculo SQL inicial de días hábiles no integra festivos colombianos.
5. `AdminPage.tsx` y `MoodPage.tsx` no tienen ruta activa actual; `LifeHubPage.tsx` conserva estado/render legado de Fitness que sus pestañas ya no seleccionan. Es deuda técnica, no autorización para refactorizar.
6. `public/brand-icon.svg` no es un vector real; falta el archivo vectorial maestro aprobado.
7. La landing comercial v2 está publicada: Gratis permanente, Premium mensual USD 2.99/anual USD 29.99 y recompensa de 30 días tras constancia y activación administrativa. Análisis avanzado y recomendaciones deterministas pasan a Premium; no se presenta IA.
8. La analítica de adquisición sólo puede enviarse tras consentimiento y autenticación; no mide visitantes anónimos que no convierten.
9. `mybestversion.life` apunta al deployment Production de Vercel y no está adjunto al Site; la URL de Sites se conserva como runtime alternativo del despliegue anterior.
10. El bridge i18n conserva 803 entradas legacy; está congelado por auditoría y debe reducirse de forma progresiva sin traducir contenido personal.
11. Permanecen 291 coincidencias de color directo revisadas en 15 archivos; el baseline impide crecimiento y no autoriza una sustitución masiva sin QA visual.
12. Google Calendar está pausado. El proyecto `mbv-calendar-production` quedó programado para cierre, mientras las tablas históricas y secretos permanecen sin uso y sin purga destructiva. La política explica cómo solicitar su supresión.
13. La migración P2 `202609160001_p2_growth_analytics.sql` ya está aplicada y el esquema remoto pasó lint. Antes de habilitar analytics o referrals P2 falta un smoke autenticado controlado y, para referral, revisión legal.
14. Las reglas lifecycle están modeladas, pero faltan proveedor, preferencias granulares, consentimiento persistido y operación de baja antes de enviar email o push.
15. Referrals no ofrece todavía recompensa, descuento ni días Premium; esas condiciones y cualquier ajuste de política/reconsentimiento necesitan decisión comercial y revisión legal expresa.
16. Las guías P2 de fotografía, assets, campañas y partnerships no sustituyen producción final, licencias, permisos de imagen, presupuesto ni acuerdos externos.
17. La atribución referral valida formato opaco y first-touch local, pero aún no registra propiedad server-side del código ni exige en SQL el orden visita → signup dentro de una ventana propia. Mantener el flag apagado y endurecer este contrato antes de incentivos o rollout amplio.
18. Vercel continúa en Hobby. El recurso gratuito de Resend y el dominio `mybestversion.life` están verificados, con secretos limitados a Production. El transporte live quedó publicado de forma fail-closed, el backlog se auditó vacío y la prueba controlada fue entregada. Antes de habilitar cobros debe usarse un plan apto para operación comercial y certificar Mercado Pago sandbox.
19. Las dos migraciones de waitlist están aplicadas y su smoke PostgreSQL transaccional aprobó con rollback. No se certificó carga concurrente multiconexión ni staging independiente.
20. El consentimiento de novedades se almacena en `launch_access_registrations`, separado de `marketing_preferences`, con versión, fecha y baja server-side. No se envían newsletters: antes de una futura campaña de correo se requiere verificar propiedad del correo y conectar un mecanismo público de baja. La captación actual no acredita propiedad ni reserva acceso.
21. El endpoint usa BotID y un límite HMAC por IP de 3 solicitudes/hora; redes compartidas pueden alcanzar ese límite. La capacidad se serializa y los correos se deduplican en PostgreSQL. Ninguna defensa elimina todo abuso distribuido.
22. Los recibos HMAC permiten repetir el mismo intento incluso después del cierre del último cupo; expiran a los siete días. La sesión conserva únicamente el intento técnico pendiente, nunca la capacidad ni la confirmación como fuente de verdad.
23. Se retiró la cuota por email. La retención de registros es de doce meses desde el cierre; mantenimiento purga después de procesar los flujos comerciales existentes.

No quedó un defecto funcional bloqueante reproducible dentro de los flujos auditados localmente.

## Entrega vigente y siguiente paso

**Vigente desde 2026-10-01:** waitlist activa y verificada en `613df97`, con 444 pruebas, lint, compilación y CI aprobados. La captación de solicitudes queda terminada. Los párrafos que siguen son antecedentes del rollout fail-closed del 30 de septiembre, no bloqueos vigentes. Los envíos futuros de lanzamiento/newsletter, la asignación de acceso y la operación de pagos no forman parte de esta captación y siguen separados.

La entrega publicada vigente consolida el cambio funcional `c24bb9fc06423b292eeb3399a7b31b4d327bc5c1` y su fix de cierre `370a8a81579e570c5b64023ca2c92e2c16aa3cde`; al verificar el release, `origin/main` y Vercel Production apuntaban al segundo SHA. Conserva Calendar externo pausado y P2 detrás de flags apagados, mantiene el núcleo comercial v2 y Resend fail-closed, conserva `MBV-H-040`/`MBV-H-041` y publica `MBV-H-042`/`MBV-H-043`. GitHub Actions `36772651377` aprobó lint, tipos, 430 pruebas unitarias y build; los E2E dirigidos del popup, la landing y la matriz responsive aprobaron localmente. Vercel Production `6769422318` completó el fix y el alias `mybestversion.life` superó el smoke público de sólo lectura en desktop/mobile, sin overflow ni errores de consola.

`MBV-H-044` parte de `8b8350607482cfa5f7a907dd3ca39f556e5045ec`; su commit funcional `0fa8578c9e14404dab6f6353b7a09c7cf9062d75` se publicó en la rama de trabajo, `origin/main` y Vercel Production. El smoke público aprobó `/`, `/privacy`, `/trial` y `/login` con HTTP 200, sin errores de consola; `GET /api/launch-access/public-state` devolvió `200 {"status":"unavailable"}` como se esperaba. No se aplicó la migración Supabase ni se activaron variables, por lo que no se capturan correos. La migración comercial está aplicada y la oferta Gratis es coherente entre UI y base. Calendar continúa pausado. La campaña debe seguir fail-closed hasta aprobar conservación/bajas, defensa anti-abuso e idempotencia y aplicar de forma controlada la migración y configuración documentadas. Para pagos, se deben conservar compras apagadas hasta migrar Vercel a un plan comercial y certificar Mercado Pago sandbox/webhook mensual y anual; para correo, observar el primer ciclo regular del outbox sin repetir la prueba ya entregada.
