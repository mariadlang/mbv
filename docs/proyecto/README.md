# Documentación de continuidad de My Best Version

Esta carpeta es la puerta de entrada oficial para comprender cómo evolucionó el proyecto y retomar el trabajo sin reconstruir el contexto desde cero.

## Qué consultar

- [`HISTORIAL.md`](HISTORIAL.md): evolución cronológica verificable, desde el primer registro Git accesible hasta el release productivo vigente.
- [`ESTADO_ACTUAL.md`](ESTADO_ACTUAL.md): memoria breve del producto, arquitectura, módulos, conexiones, pruebas, riesgos y siguiente paso.
- [`../../AGENTS.md`](../../AGENTS.md): reglas obligatorias de producto, arquitectura, calidad y actualización documental.

Para una nueva tarea se debe leer primero `AGENTS.md`, este archivo y `ESTADO_ACTUAL.md`; después, consultar las entradas recientes o relacionadas de `HISTORIAL.md`. El código y `git status` prevalecen cuando una nota antigua ya no describe el comportamiento vigente.

## Punto de referencia de esta revisión

- Última revisión documental: **2026-09-30, America/Bogota (UTC-05:00)**.
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
