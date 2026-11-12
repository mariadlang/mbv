# Publicación de mejoras aceptadas — 12 de noviembre de 2026

## Autorización y destino

María autoriza commit, push y despliegue de las mejoras pendientes al proyecto existente, sin gastos adicionales. Esta autorización sustituye la restricción anterior de mantenerlas sólo localmente. No autoriza iniciar el piloto cerrado, contratar servicios ni trasladar la configuración de pruebas.

- Dominio: https://mybestversion.life.
- Vercel: vercel-upload-mbv, prj_gsy7i7tYwnIQDsTuxZym6qXq4z5C, equipo team_AAK4O3G3pgvNs7FbN31mE9BI, plan Hobby existente.
- Supabase de producción: supabase-cinereous-umbrella, yvrvetuzuinoinukrivo. URL contrastada con los assets públicos servidos antes de publicar; proyecto ACTIVE_HEALTHY.
- Variables Vercel: integración de Supabase conservada en Production; búsqueda MBV sin resultados. E2E y beta están desactivados por defecto explícito en código (sólo se activan con el valor 1). No se cambian secretos, permisos, SMTP, DNS ni cron de producción.
- Base Git anterior: 5c060810a7782d5a8533fa24ac11c991808c93e8, coincidente con main remoto al iniciar.

## Alcance revisado

H08 evita pulsaciones repetidas por sugerencia/visita/fecha, conservando reintento y tareas manuales homónimas. H03 comparte el total aplicable entre Inicio y Mi guía, diferencia exclusión semanal y desactivación y conserva estado neutral. H01 muestra la hora local guardada en Mi día. H02 elimina landmarks principales anidados. TasksPage publica el borrador confirmado antes del reintento. La comprobación de acceso mantiene carga mientras espera y descarta respuestas antiguas. Metas vuelve a tener entrada desde Plan y sus controles móviles quedan fuera del botón flotante. Incluye el formulario de recuperación de contraseña ya probado.

La infraestructura optativa de beta queda inactiva: no se aplica el filtro de altas ni su configuración remota. El repositorio local del planificador, los IDs y sus migraciones permanecen sin cambios. Los datos del origen local 3119 y LIM01 no se trasladan ni se modifican.

## Comprobación de publicación en curso

Artefactos aislados: C:/Users/maria/Documents/Codex/MBV-Release-2026-11-12/checks. No contienen credenciales y no se incluyen en la publicación.

- Manifest de fuentes previo a publicación, sin .env, .vercel ni respaldos personales.
- Comparación de 417 archivos app/src/public/tests/e2e contra la candidata E2E anterior: cero diferencias. Su resultado conservado es 10/10, build K0_DcyfwIGewpvPyR4Znp; autenticación adaptada E2E, no validación en producción.
- Build local normal YWoKdAYsgNKQPZCAN-ex-: salida 0, beta/E2E desactivados. La copia aislada requiere ampliar únicamente la raíz de Turbopack para resolver el enlace de dependencias; next.config.ts de producción queda intacto. Primer intento de build falló por ese enlace y se conserva por separado.
- Lint: 0 errores, 1 aviso previo de react-hooks/exhaustive-deps en useAccount. Auditorías i18n y tokens: salida 0.
- La primera orden unitaria se lanzó antes de terminar la copia y no inició Vitest: MODULE_NOT_FOUND, conservado como fallo de preparación, no como ejecución de casos.
- La ejecución unitaria posterior coincidió inicialmente con build/lint y mostró timeouts en SavePendingFields. No se atribuyen automáticamente a esa coincidencia; se conservará su resultado y se comprobarán los casos sin esos procesos simultáneos, sin aumentar límites ni modificar aserciones.

La validación de producción y la identificación definitiva del despliegue se añadirán después de observar su resultado. Este documento no declara todavía publicada la candidata ni cerrada H06.

Actualización de preparación: primera completa 663/665, 106/107 archivos aprobados. Los dos errores son timeout de 5000 ms en `locks the month-map editor and preserves its draft after a failed save` y `locks every 'workout' field and restores editing on failure`. Después de finalizar build/lint, TypeScript sale 0 y la dirigida instrumentada pasa 13/13 en 32.75 s; las limpiezas terminan sin interacciones pendientes. No se cambió aplicación, prueba, límite ni aserción. Se inicia una única completa adicional sin compilaciones simultáneas para comprobar esa condición, sin atribuir retrospectivamente todos los timeouts históricos a carga del equipo.

## Continuación del 13 de noviembre

La segunda completa (`unit-stable`) terminó 664/665 después de permanecer suspendida durante la noche: inicio 12/11 19:17:50 UTC, fin 13/11 18:28:19 UTC. El único caso fallido fue `locks every 'workout' field and restores editing on failure`, por timeout. Los eventos Windows Kernel-Power 506/507 y la traza de interacción confirman la interrupción por suspensión/tapa; el registro se conserva como ejecución interrumpida, no se cuenta como aprobación. Esta evidencia no demuestra la causa de los timeouts del primer intento ni de todos los históricos.

María confirma mantener el equipo encendido y abierto. Se ejecuta `unit-final`, sin compilaciones simultáneas, sin reintentos automáticos y sin cambiar pruebas, límites o código. La aplicación permanece idéntica a la del commit local 6c12b321f0a4eddbec18cefbdf0f59e03de7faf5; sólo se amplía esta documentación antes del push.

Vercel Settings/Git confirma conexión activa con `mariadlang/mbv` desde agosto; producción sigue main. No hay variables compartidas enlazadas ni flags MBV de beta/E2E en el proyecto. La sesión normal existente permite abrir el dashboard productivo antes de publicar; esto acredita una sesión vigente, no un nuevo login ejecutado ni una prueba de permisos Gratis.

Resultado final antes del push: **665/665 pruebas, 107/107 archivos, 0 fallos, 0 omitidas, 0 reintentos automáticos**. `unit-final-status.json`: 13/11/2026 18:28:19–18:38:48 UTC, salida 0; Vitest 622.90 s. Se mantienen intactos los informes anteriores 663/665 y 664/665. SavePendingFields 12/12, TasksPage 7/7 y regresiones de acceso aprobadas dentro de esta ejecución. No se alteraron aplicación, aserciones o tiempos para obtener el resultado. La evidencia E2E vigente sigue siendo la corrida 10/10 de la misma fuente; no se presenta como autenticación normal en producción.
