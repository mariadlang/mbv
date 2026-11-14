# Mi espacio y navegación simplificados — 14/11/2026

## Cambio autorizado

María amplía la petición inicial de Finanzas durante el trabajo. La barra izquierda y el menú móvil compartido ofrecen Hábitos, Proyectos y tareas, Finanzas, Alimentación y Entrenamiento. Mi espacio abre Mis listas directamente. Más conserva tres grupos: Organizar y explorar la app (Rutinas, Retos, Tablero de visión y Calendario), Apoyo (Desbloquearme, Aprende y Ajustes) y Mis listas.

Se eliminan del resumen de Mi espacio los destinos duplicados y el acceso Más herramientas. El título de Más herramientas pasa a Más. Diario y notas deja de exponerse en la navegación, el acceso rápido y el router; /app/journal redirige a Mis listas. No se eliminan colecciones, registros, módulos del repositorio ni respaldos anteriores. El cierre del día sigue guardando y actualizando el mismo registro, con un mensaje independiente del módulo retirado.

Bandeja pasa a Mis listas en capturas, planificación y tareas, conservando identificadores internos, filtros, fechas, relaciones y servicios. Las traducciones ES/EN usan claves estables. La barra inferior móvil y las restricciones Premium existentes no cambian. Sin cambios de permisos, backend, servicios ni costes contratados.

## Verificación

Base de GitHub 8e5bb62; se actualizó la copia local limpia sin sobrescribir su rama anterior. Prueba local de navegación inicial 24/24; después de ampliar alcance, 52/52 dirigidas (AppShell, LifeHub, TasksPage e i18n). Lint cero errores y un aviso previo de useAccount; tipos aprobados. Auditorías i18n/tokens aprobadas después de corregir dos claves afectadas por un reemplazo de texto; ese intento fallido se conserva aquí. 1982 claves ES/EN, 185 advertencias de uso literal no detectado; tokens 296/298 de la base.

El navegador Playwright local no estaba instalado y Chromium del sistema no pudo iniciar por socket() Operation not permitted. Se usa CI para los controles completos y los recorridos de interfaz. Se adaptan pruebas existentes a la estructura solicitada, sin eliminar verificaciones de persistencia, alterar aserciones ajenas ni ampliar tiempos.

## Publicación

Pendiente de CI y comprobación del despliegue en el Vercel y dominio actuales. La autorización habitual de María sigue vigente. No se declara todavía publicado.
