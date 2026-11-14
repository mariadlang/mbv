# Mi espacio y navegación simplificados — 14/11/2026

## Cambio autorizado

María amplía la petición inicial de Finanzas durante el trabajo. La barra izquierda y el menú móvil compartido ofrecen Hábitos, Proyectos y tareas, Finanzas, Alimentación y Entrenamiento. Mi espacio abre Mis listas directamente. Más conserva tres grupos: Organizar y explorar la app (Rutinas, Retos, Tablero de visión y Calendario), Apoyo (Desbloquearme, Aprende y Ajustes) y Mis listas.

Se eliminan del resumen de Mi espacio los destinos duplicados y el acceso Más herramientas. El título de Más herramientas pasa a Más. Diario y notas deja de exponerse en la navegación, el acceso rápido y el router; /app/journal redirige a Mis listas. No se eliminan colecciones, registros, módulos del repositorio ni respaldos anteriores. El cierre del día sigue guardando y actualizando el mismo registro, con un mensaje independiente del módulo retirado.

Bandeja pasa a Mis listas en capturas, planificación y tareas, conservando identificadores internos, filtros, fechas, relaciones y servicios. Las traducciones ES/EN usan claves estables. La barra inferior móvil y las restricciones Premium existentes no cambian. Sin cambios de permisos, backend, servicios ni costes contratados.

## Verificación

Base de GitHub 8e5bb62; se actualizó la copia local limpia sin sobrescribir su rama anterior. Prueba local de navegación inicial 24/24; después de ampliar alcance, 52/52 dirigidas (AppShell, LifeHub, TasksPage e i18n). Lint cero errores y un aviso previo de useAccount; tipos aprobados. Auditorías i18n/tokens aprobadas después de corregir dos claves afectadas por un reemplazo de texto; ese intento fallido se conserva aquí. 1982 claves ES/EN, 185 advertencias de uso literal no detectado; tokens 296/298 de la base.

El navegador Playwright local no estaba instalado y Chromium del sistema no pudo iniciar por socket() Operation not permitted. Se usa CI para los controles completos y los recorridos de interfaz. Se adaptan pruebas existentes a la estructura solicitada, sin eliminar verificaciones de persistencia, alterar aserciones ajenas ni ampliar tiempos.

## Publicación

Código funcional **11c08fa**, publicado desde main en https://mybestversion.life mediante el Vercel existente, estado success. Sin cambios concurrentes sobrescritos, servicios contratados, cambios de dominio, permisos ni configuración de acceso.

[Verificación CI previa](https://github.com/mariadlang/mbv/actions/runs/43621149261), checkout fijado a ese SHA: **673/673 unitarias en 109 archivos; 16/16 E2E**, cero fallos, omisiones y reintentos dentro de la selección. Lint, tipos, build, i18n y tokens aprobados. Ocho recorridos en cada tamaño: tarea, meta y redirección de diario, finanzas, planificación en cascada, exportación/restauración, arquitectura de navegación, historial/scroll y cierre del día sin duplicados. Workers=1, tiempos y aserciones conservados. El workflow auxiliar queda en una rama de verificación, no se incorpora a producción. [CI de main](https://github.com/mariadlang/mbv/actions/runs/43621852368) también aprobado; E2E omitido por su regla habitual de push.

Comprobación HTTP del dominio: /app/life-hub responde 200; el código público servido contiene el menú de seis accesos, la redirección del diario a Mis listas, el título Mis listas y exactamente los tres grupos de Más.

## Capturas y límites

[Seis capturas del recorrido CI](https://github.com/mariadlang/mbv/actions/runs/43621149261/artifacts/14124406729), artefacto space-navigation-evidence, retención hasta 21/11/2026. Contienen Mis listas y Más en ambos tamaños, Finanzas en barra de escritorio y menú móvil. Son capturas reales del entorno aislado con datos sintéticos y adaptador E2E, **no de una cuenta normal en producción**. Se revisaron visualmente las seis; escritorio 1280×720 y móvil Pixel 7 emulado. Los controles fijos de la captura larga móvil aparecen a la altura del viewport inicial; no implican contenido inaccesible al desplazar la página.

No se añaden copias de las imágenes al repositorio público: la revisión automática rechazó esa subida por posible exposición de datos de interfaz. Se conserva la evidencia ya generada por CI y su enlace, sin repetir la subida ni solicitar permiso adicional para un paso que no bloquea la mejora.

El navegador disponible abre la dirección de Mi espacio y redirige a **https://mybestversion.life/login**. No hay sesión normal disponible en él; no se crean cuentas, se piden otra vez credenciales ni se inyecta autenticación. Por ello queda pendiente una nueva revisión visual autenticada en producción. La publicación y los bundles están comprobados; los recorridos interactivos se acreditan en CI. Se conservan los pendientes anteriores de H06, Gratis/Premium normal, teléfono físico y timeout histórico de la E2E completa de comidas: estos 16 casos no sustituyen aquella completa.
