# Documentación de continuidad de My Best Version

Esta carpeta es la puerta de entrada oficial para comprender cómo evolucionó el proyecto y retomar el trabajo sin reconstruir el contexto desde cero.

Hito actual: **MBV-H-048, Inicio «dónde estoy»**. Implementación y comprobación normal local disponibles en3102; regresión completa/publicación autorizada en curso. Consultar la sección superior de ESTADO_ACTUAL y la única entrada H048 para resultados definitivos, commit y deploy. No confundir las capturas con fixtures E2E de3100 con acceso normal.

## Qué consultar

- [`HISTORIAL.md`](HISTORIAL.md): evolución cronológica verificable, desde el primer registro Git accesible hasta el release productivo vigente.
- [`ESTADO_ACTUAL.md`](ESTADO_ACTUAL.md): memoria breve del producto, arquitectura, módulos, conexiones, pruebas, riesgos y siguiente paso.
- [`../../AGENTS.md`](../../AGENTS.md): reglas obligatorias de producto, arquitectura, calidad y actualización documental.

Para una nueva tarea se debe leer primero `AGENTS.md`, este archivo y `ESTADO_ACTUAL.md`; después, consultar las entradas recientes o relacionadas de `HISTORIAL.md`. El código y `git status` prevalecen cuando una nota antigua ya no describe el comportamiento vigente.

## Punto de referencia de esta revisión

- **Vigente local,16 de octubre — MBV-H-047:** Mi año simplificado a selector y doce meses reutilizados, acceso mensual directo, sin borrar datos ni cambiar marca. Normal3102 build `fT9f8D04bOPvA4a8Xc0Dw`, E2E=0; diez comprobaciones normales aprobadas. Pruebas dirigidas:23 unitarias y27 E2E aprobados/2 omisiones preexistentes; tipos/lint/auditorías/builds aprobados. No suite completa repetida. [Estado vigente](ESTADO_ACTUAL.md) y [detalle del cambio](HISTORIAL.md). Sin commit/push/deploy. Los builds/resultados de fechas anteriores debajo son antecedentes; el trabajo amplio de marca MBV-H-046 permanece separado.

- **13 de octubre — proveedor Google local corregido:** proyecto de pruebas `mbv-local-pruebas-20261013` y cliente web dedicado confirmados; Supabase local habilitado, autorización responde302 hacia Google en lugar de400. Credencial privada fuera del repositorio; permisos sólo identidad/correo/perfil, audiencia Testing.16 comprobaciones técnicas aprobadas; build normal y E2E=0 conservados. Con consentimiento explícito, el acceso real regresa a la pantalla legal de la app y conserva la sesión tras recargar. Primer intento caducado (bad_oauth_state); nuevo intento correcto. Términos/edad/tratamiento sin aceptar automáticamente; dashboard/onboarding pendientes de la usuaria. Sin producción/publicación. Detalle en estado e historial MBV-H-045.

- **Vigente,10 de octubre — backend y acceso normal disponibles:** Docker/Supabase locales operativos,12 migraciones; puertos exclusivamente127.0.0.1. Build normal nuevo `9d1gY_2fz7pTMogwyb4qD` en `http://127.0.0.1:3102/login`, E2E=0/revisión semanal=1.17 comprobaciones normales aprobadas con dos cuentas desechables, aislamiento, cuatro correcciones y respaldo de34 colecciones. Se conserva la incidencia inicial de acceso no reproducida, sin atribuirle una causa. App/recursos intactos; suite previa145/0/25 y577 unitarias sigue siendo evidencia separada. [Informe vigente](../qa/candidate-regression-2026-10-06.md). ZIP acotado en Downloads/MBV_Candidata_Normal_2026-10-10.zip; credenciales fuera del ZIP. Sin publicación. Los bloqueos de instalación de los puntos siguientes son antecedentes resueltos.

- **Vigente10 de octubre:** reinicio realizado y WSL3.0.1 instalado/verificado. Docker requiere ejecutar su instalador desde Explorador: la instalación iniciada dentro de Codex quedó virtualizada y WSL no encuentra sus recursos en la ruta normal. No motor operativo ni validación normal aún. Evidencia y siguiente acción concreta en [informe](../qa/candidate-regression-2026-10-06.md) y [estado](ESTADO_ACTUAL.md); no rediseño ni datos modificados.

- **Continuidad18:18 Bogotá,9 de octubre:** UAC resuelto; WSL y VirtualMachinePlatform habilitados correctamente, salida0. Windows requiere reinicio manual, no ejecutado automáticamente. Guardar trabajo y reiniciar antes de continuar Docker/Supabase; no repetir habilitación. Backend y validación normal pendientes. Detalles en [estado actual](ESTADO_ACTUAL.md) e [informe](../qa/candidate-regression-2026-10-06.md).

- **Preparación autorizada posterior,9 de octubre:** Docker Desktop por usuario y Supabase CLI fijado ya instalados; proyecto local inicializado sin arrancar ni crear cuentas. Falta resolver el aviso UAC anterior y habilitar WSL sin reinicio automático. La app no cambió; no hay validación normal todavía. Ver [estado real de instalación y continuidad](../qa/candidate-regression-2026-10-06.md). Esto sustituye la autorización pendiente mencionada en el antecedente siguiente.

- **Vigente,9 de octubre:** regresión de la candidata conservada cerrada sin rediseño:145 E2E aprobados,0 fallidos,25 omisiones preexistentes,0 reintentos automáticos;577 unitarias aprobadas. Se corrigieron las cuatro causas de fixtures/expectativas y esperas de persistencia; respaldo verificado con identidad/datos desechables. [Informe y única autorización pendiente para Supabase local](../qa/candidate-regression-2026-10-06.md), [resultados por caso](../qa/candidate-regression-results-2026-10-09.json). Entorno normal sin backend, E2E=0; no validación real de cuentas ni sincronización cloud. No commit/push/deploy. Las referencias del5 de octubre y anteriores debajo son antecedentes, no el resultado final vigente.

- Validación candidata2026-10-05: compilación normal independiente en3102 sin E2E (login real bloqueado por falta de backend/cuentas de prueba);577 unitarias aprobadas, suite E2E completa131 aprobados/10 fallidos/25 omitidos/0 reintentos. Código y recursos conservados. Detalle vigente al inicio de [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md) y paquete [MBV_Candidata_Validacion_2026-10-05.zip](../../deliverables/MBV_Candidata_Validacion_2026-10-05.zip). No es aprobación integral ni autorización para publicar. El resto de referencias de este bloque son antecedentes.

- Cierre de usabilidad2026-10-05: cuatro correcciones del video, sin rediseño/recursos nuevos ni publicación. Estado, evidencia desktop/móvil y resultados en el primer bloque de [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md); misma entrada MBV-H-045. App3100 es build E2E `XCmiUZYBMSg0Wbvf6vHo0`, no entorno normal.

- Última pasada visual 2026-10-04, posterior al paquete: [capturas y QA](../qa/visual-refinement-2026-10-04.md), [recursos y prompts](../qa/visual-refinement-assets-2026-10-04.md). Estructura/sidebar/Playfair+Inter aprobados; sólo refinamiento desktop, sin cambios funcionales. Fotos/papelería siguen pendientes; no hay autorización de publicación. La galería/ZIP anteriores no se sobrescriben.

- Entrega visual local 2026-10-04: [galería portátil](../../deliverables/MBV_Revision_Visual_Final/index.html), [ZIP](../../deliverables/MBV_Revision_Visual_Final.zip) y [registro de entrega](../qa/visual-review-delivery-2026-10-04.md). Mantiene el mismo MBV-H-045, sin rediseño ni cambios de app. El inventario A01–A15 reformula la petición genérica de recursos del cierre. Aprobación de diseño y publicación todavía no concedidas.

- Revisión local 2026-10-03: `MBV-H-045`, rediseño privado R1–R7 sobre `2fc9ce9`, sin publicar. Consultar primero el bloque local de `ESTADO_ACTUAL.md` y el [informe de cierre](../qa/editorial-closure-2026-10-03.md); el [informe anterior](../qa/editorial-r1-r7-2026-10-02.md) se conserva como antecedente. No reutilizar las instrucciones de despliegue de los antecedentes: la publicación requiere nueva autorización.

- Cierre 2026-10-01 de `MBV-H-044`: waitlist activa en producción, commit funcional `613df97`, CI `36912308358` aprobado y deployment `dpl_DfXu2d4Aua5BJB8MdQ78P6yLKTHB` Ready. Guardado real 202 confirmado y dato de prueba retirado; 20 cupos disponibles. Consultar el estado vigente y la continuación de la misma entrada del historial; no repetir migraciones ni regenerar secretos. Las referencias del 30 de septiembre debajo son antecedentes del rollout, no configuración actual.

- Última revisión documental: **2026-10-09, America/Bogota (UTC-05:00)**. El cierre de regresión local MBV-H-045 encabeza el estado actual; los SHA y despliegues de los siguientes puntos son antecedentes de publicación.
- Repositorio: `mariadlang/mbv`.
- Rama examinada: `fix/ux-audit-2026-09-24`, basada en el release publicado de `origin/main`.
- SHA funcional: `c24bb9fc06423b292eeb3399a7b31b4d327bc5c1`; fix de cierre publicado: `370a8a81579e570c5b64023ca2c92e2c16aa3cde`.
- Sincronización observada al publicar `MBV-H-042`/`MBV-H-043`: rama de trabajo y `origin/main` alineadas en `370a8a8`; GitHub Actions `36772651377` y Vercel Production `6769422318` aprobaron el mismo SHA.
- Base Git observada al iniciar `MBV-H-044`: `8b8350607482cfa5f7a907dd3ca39f556e5045ec` en la rama de trabajo y `origin/main`. El rediseño funcional de waitlist quedó en `0fa8578c9e14404dab6f6353b7a09c7cf9062d75`, enviado a la rama de trabajo y `origin/main` y publicado en Vercel Production. La migración remota y los flags no se activaron.
- Historial: repositorio completo/no superficial, con dos raíces históricas y sin etiquetas Git.
- Alcance temporal accesible: desde `18fe17fdff9c39336bb54b0b716509f6ce568ded` del 2026-08-10 hasta la invitación aislada `MBV-H-042` y la presentación pública `MBV-H-043`.

P0 y P1 permanecen como baseline histórico. El release publicado conserva la pausa de Calendar y los flags P2 apagados, mantiene el acceso comercial v2 y Resend de otros flujos, y contiene `MBV-H-042`/`MBV-H-043`. Sobre esa base, `MBV-H-044` publica el código de la invitación como waitlist de 20 solicitudes con consentimiento independiente para novedades, capacidad server-side y tres estados de interfaz. La campaña continúa fail-closed: la migración no está aplicada, los flags siguen apagados, el endpoint público responde `unavailable` y el alta nueva no envía correo, no crea cuenta, no inicia prueba, no activa Premium ni asigna un cupo.

## Fuentes utilizadas

- Historial, grafo, referencias y diferencias de Git.
- Estado preparado, no preparado y archivos nuevos del working tree.
- Código actual de `app/`, `src/`, `tests/`, `e2e/`, `supabase/` y configuración del proyecto.
- README, documentos de arquitectura, ADR, notas de producto, documentos legales, soporte y autenticación existentes.
- Pruebas ejecutadas y evidencia reunida durante las sesiones del 2026-09-04 al 2026-09-30.

No se encontraron `AGENTS.override.md`, pull requests, issues ni etiquetas disponibles localmente. No se consultaron archivos `.env`, credenciales, tokens ni datos personales. Los documentos fuente externos mencionados por `docs/product/source-notes.md` no están versionados y, por tanto, no se revisaron directamente.

## Limitaciones de la reconstrucción

- El historial incluye dos raíces y varias líneas paralelas de trabajo/publicación que después se fusionaron. Se documentan como tales y no como funcionalidades independientes.
- Los mensajes de commit casi nunca explican el motivo. Cuando no existe ADR, documento o evidencia de producto, el historial indica **“Motivo no documentado”**.
- Que un commit añada o modifique pruebas demuestra cobertura versionada, no que esas pruebas se ejecutaran en aquel momento. Sólo se atribuyen resultados cuando quedaron documentados o se ejecutaron durante esta revisión.
- La existencia de configuración de despliegue no demuestra por sí sola qué SHA está publicado; para P0 y P1 se registraron explícitamente SHA, versión de Sites, despliegue y smoke verificables.
- La presencia de migraciones Supabase no confirma por sí sola que todas estén aplicadas en producción.

## Cómo actualizar estos documentos

1. Verificar rama, `HEAD`, referencias y `git status`.
2. Revisar el diff efectivo y relacionarlo con la entrada en curso; no crear una entrada por mensaje o intento.
3. Actualizar `HISTORIAL.md` con fecha, impacto, evidencia, validaciones y estado real de entrega.
4. Actualizar `ESTADO_ACTUAL.md` cuando cambien comportamiento, arquitectura, decisiones, pendientes, pruebas o punto de continuidad.
5. Ajustar en este archivo la fecha, SHA y alcance sólo con datos reales.
6. Entregar la documentación junto con los cambios del producto, sin commit, push o deploy salvo autorización expresa.
