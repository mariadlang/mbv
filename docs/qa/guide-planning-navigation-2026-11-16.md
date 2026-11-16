# Planificación dentro de Mi guía — 16/11/2026

María solicita agrupar Mi año, Mi mes y Mi semana dentro de Mi guía. Se conserva cada ruta y la información guardada. La navegación interna aparece en Mi guía y en las vistas de planificación; el menú principal marca Mi guía como sección activa. Los accesos independientes a los periodos salen de la barra izquierda y del menú móvil. La barra inferior móvil conserva Inicio, Mi guía, Hoy y Más. Visión, Metas y Calendario siguen disponibles; los enlaces de periodo duplicados se retiran de esa navegación secundaria.

Cambios limitados a AppShell, GuideNavigation, SectionNavigation, estilos de navegación, una etiqueta ES/EN y sus comprobaciones. Sin cambios de datos, servicios, permisos o gastos. Los enlaces funcionan con teclado, muestran el periodo activo y se distribuyen en filas cuando falta anchura.

Base comprobada: 56dda89, árbol limpio; rama de trabajo separada. El primer control de tipos detectó una comparación que aún hacía referencia al enlace móvil Plan retirado; se corrigió esa referencia. No se altera el historial de pruebas anterior.

Verificación y publicación pendientes. Se comprobarán entrada por menú, los tres periodos, recarga, vuelta a Mi guía, acceso a Metas y conservación de planes, tareas, metas y áreas mediante exportación antes/después. Se ejecutan los controles del proyecto y recorridos principales en CI sobre el código fijado, con datos sintéticos; esto no equivale a una nueva revisión con cuenta normal en producción.
