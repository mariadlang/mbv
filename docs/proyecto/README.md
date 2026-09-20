# Documentación de continuidad de My Best Version

Esta carpeta es la puerta de entrada oficial para comprender cómo evolucionó el proyecto y retomar el trabajo sin reconstruir el contexto desde cero.

## Qué consultar

- [`HISTORIAL.md`](HISTORIAL.md): evolución cronológica verificable, desde el primer registro Git accesible hasta los cambios locales actuales.
- [`ESTADO_ACTUAL.md`](ESTADO_ACTUAL.md): memoria breve del producto, arquitectura, módulos, conexiones, pruebas, riesgos y siguiente paso.
- [`../../AGENTS.md`](../../AGENTS.md): reglas obligatorias de producto, arquitectura, calidad y actualización documental.

Para una nueva tarea se debe leer primero `AGENTS.md`, este archivo y `ESTADO_ACTUAL.md`; después, consultar las entradas recientes o relacionadas de `HISTORIAL.md`. El código y `git status` prevalecen cuando una nota antigua ya no describe el comportamiento vigente.

## Punto de referencia de esta revisión

- Última revisión documental: **2026-09-19, America/Bogota (UTC-05:00)**.
- Repositorio: `mariadlang/mbv`.
- Rama examinada: `feat/commercial-access-v2`, basada en el release publicado de `origin/main`.
- SHA funcional vigente: `7fba6e996217ddb8320bb2853d6caca05757f244`; documentación de ese release consolidada hasta `cd6b6ff59a754da5b3ea61d6c2b07adfa3996037`.
- Sincronización observada antes de iniciar la integración Resend: `HEAD` y `origin/main` alineados en `cd6b6ff`; CI y Vercel Production del release comercial aprobados.
- Historial: repositorio completo/no superficial, con dos raíces históricas y sin etiquetas Git.
- Alcance temporal accesible: desde `18fe17fdff9c39336bb54b0b716509f6ce568ded` del 2026-08-10 hasta la preparación Resend en curso documentada en `MBV-H-038`.

P0 y P1 permanecen como baseline histórico. El SHA funcional vigente `7fba6e996217ddb8320bb2853d6caca05757f244` conserva la pausa de Calendar y los flags P2 apagados, y publica el acceso comercial v2 descrito en `MBV-H-037`. `MBV-H-038` registra una única integración Resend **EN CURSO**: proveedor, dominio, secretos, transporte y prueba `Delivered` están validados; quedan el commit, push y deployment final.

## Fuentes utilizadas

- Historial, grafo, referencias y diferencias de Git.
- Estado preparado, no preparado y archivos nuevos del working tree.
- Código actual de `app/`, `src/`, `tests/`, `e2e/`, `supabase/` y configuración del proyecto.
- README, documentos de arquitectura, ADR, notas de producto, documentos legales, soporte y autenticación existentes.
- Pruebas ejecutadas y evidencia reunida durante las sesiones del 2026-09-04 al 2026-09-16.

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
