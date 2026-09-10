# Documentación de continuidad de My Best Version

Esta carpeta es la puerta de entrada oficial para comprender cómo evolucionó el proyecto y retomar el trabajo sin reconstruir el contexto desde cero.

## Qué consultar

- [`HISTORIAL.md`](HISTORIAL.md): evolución cronológica verificable, desde el primer registro Git accesible hasta los cambios locales actuales.
- [`ESTADO_ACTUAL.md`](ESTADO_ACTUAL.md): memoria breve del producto, arquitectura, módulos, conexiones, pruebas, riesgos y siguiente paso.
- [`../../AGENTS.md`](../../AGENTS.md): reglas obligatorias de producto, arquitectura, calidad y actualización documental.

Para una nueva tarea se debe leer primero `AGENTS.md`, este archivo y `ESTADO_ACTUAL.md`; después, consultar las entradas recientes o relacionadas de `HISTORIAL.md`. El código y `git status` prevalecen cuando una nota antigua ya no describe el comportamiento vigente.

## Punto de referencia de esta revisión

- Última revisión documental: **2026-09-10, America/Bogota (UTC-05:00)**.
- Repositorio: `mariadlang/mbv`.
- Rama examinada: `main`.
- SHA base anterior al candidato P1: `8e6ede1995cef4656ef8b23cac3f04a98d4ebdf2`.
- Sincronización observada: `main` y `origin/main` coincidían en ese SHA antes de P1.
- Historial en la base P1: 65 commits alcanzables desde `main`, repositorio no superficial, dos raíces históricas y sin etiquetas Git.
- Alcance temporal accesible: desde `18fe17fdff9c39336bb54b0b716509f6ce568ded` del 2026-08-10 hasta el candidato técnico P1 `MBV-H-023`.

El SHA base identifica el release P0 documentado desde el que comenzó P1. El SHA funcional P1, su versión de Sites y el smoke de producción se incorporan a esta memoria después de completar publicación.

## Fuentes utilizadas

- Historial, grafo, referencias y diferencias de Git.
- Estado preparado, no preparado y archivos nuevos del working tree.
- Código actual de `app/`, `src/`, `tests/`, `e2e/`, `supabase/` y configuración del proyecto.
- README, documentos de arquitectura, ADR, notas de producto, documentos legales, soporte y autenticación existentes.
- Pruebas ejecutadas y evidencia reunida durante las sesiones del 2026-09-04 al 2026-09-10.

No se encontraron `AGENTS.override.md`, pull requests, issues ni etiquetas disponibles localmente. No se consultaron archivos `.env`, credenciales, tokens ni datos personales. Los documentos fuente externos mencionados por `docs/product/source-notes.md` no están versionados y, por tanto, no se revisaron directamente.

## Limitaciones de la reconstrucción

- El historial incluye dos raíces y varias líneas paralelas de trabajo/publicación que después se fusionaron. Se documentan como tales y no como funcionalidades independientes.
- Los mensajes de commit casi nunca explican el motivo. Cuando no existe ADR, documento o evidencia de producto, el historial indica **“Motivo no documentado”**.
- Que un commit añada o modifique pruebas demuestra cobertura versionada, no que esas pruebas se ejecutaran en aquel momento. Sólo se atribuyen resultados cuando quedaron documentados o se ejecutaron durante esta revisión.
- La existencia de configuración de despliegue no demuestra por sí sola qué SHA está publicado; para P0 se registraron explícitamente el SHA, versión de Sites, despliegue y smoke verificables.
- La presencia de migraciones Supabase no confirma por sí sola que todas estén aplicadas en producción.

## Cómo actualizar estos documentos

1. Verificar rama, `HEAD`, referencias y `git status`.
2. Revisar el diff efectivo y relacionarlo con la entrada en curso; no crear una entrada por mensaje o intento.
3. Actualizar `HISTORIAL.md` con fecha, impacto, evidencia, validaciones y estado real de entrega.
4. Actualizar `ESTADO_ACTUAL.md` cuando cambien comportamiento, arquitectura, decisiones, pendientes, pruebas o punto de continuidad.
5. Ajustar en este archivo la fecha, SHA y alcance sólo con datos reales.
6. Entregar la documentación junto con los cambios del producto, sin commit, push o deploy salvo autorización expresa.
