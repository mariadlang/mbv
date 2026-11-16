# Planificación dentro de Mi guía — 16/11/2026

María solicita agrupar Mi año, Mi mes y Mi semana dentro de Mi guía. La navegación interna aparece en Mi guía y en las vistas de planificación, y el menú principal marca Mi guía como sección activa. Los accesos independientes a los periodos salen de la barra izquierda y del menú móvil. La barra inferior conserva Inicio, Mi guía, Hoy y Más. Visión, Metas y Calendario siguen disponibles. Se mantienen las URL existentes y la información guardada.

Cambios limitados a AppShell, GuideNavigation, SectionNavigation, estilos de navegación, una etiqueta ES/EN y sus comprobaciones. Sin cambios de datos, servicios, permisos o gastos. Los enlaces funcionan con teclado, muestran el periodo activo y se distribuyen en filas cuando falta anchura. Los bloqueos existentes de borradores sin guardar siguen gestionando la navegación.

## Versiones y verificación

Base comprobada: `56dda89`, árbol limpio y rama de trabajo separada. Código funcional `789a07c`; `e431770` añade únicamente comprobaciones de visibilidad a la prueba, sin cambiar la aplicación. El primer control de tipos detectó una comparación del antiguo enlace móvil Plan retirado; se corrigió esa referencia antes de la verificación final.

- [CI completo de controles y flujos principales](https://github.com/mariadlang/mbv/actions/runs/43964953421), checkout fijado a `789a07c`: **673/673 unitarias**, 109 archivos; **22/22 E2E**, cero omisiones y reintentos. Lint sin errores y un aviso previo de useAccount; tipos, build, i18n y tokens aprobados. No es la suite E2E integral del repositorio.
- Los 22 casos cubren los ocho recorridos principales, entrada a Metas, preparación semanal y el nuevo recorrido de Mi guía en escritorio y móvil. Entrada real por menú, las tres URL originales, recarga, vuelta con teclado y sección activa comprobadas. Exportaciones antes/después idénticas para planes, tareas, metas y áreas; sin desbordamiento horizontal.
- La primera captura de entrada se tomó durante el desplazamiento hacia arriba. Se añadió una espera comprobada hasta scrollY=0, visibilidad completa y ausencia de solapamiento de la cabecera; no se fuerza el desplazamiento desde la prueba ni se cambia la app para la captura. [Comprobación adicional fijada a e431770](https://github.com/mariadlang/mbv/actions/runs/43966745556): **2/2**, cero omisiones y reintentos. No se suma como una sola corrida con los 22 anteriores.
- Capturas revisadas: escritorio 1448×1086 y móvil 390×844 emulado. Mi guía y los tres periodos. [Evidencia inicial](https://github.com/mariadlang/mbv/actions/runs/43964953421/artifacts/14276136072) y [capturas finales con entrada visible](https://github.com/mariadlang/mbv/actions/runs/43966745556/artifacts/14276441553), conservadas como artefactos CI con datos sintéticos y retención hasta el 23/11. No son capturas de cuentas personales ni de producción.

Tipos locales vuelven a pasar tras reforzar la prueba de visibilidad. No se repitieron las suites completas localmente después de la corrida CI; Chromium local sigue limitado por el entorno. Los workflows auxiliares permanecen en la rama de verificación, fuera de main. El workflow habitual de main mantiene su configuración previa.

## Publicación y límites

`e431770` enviado a main mediante avance directo, comprobando el SHA anterior. Publicado en el Vercel y dominio existentes, sin cambios de Supabase, configuración, contratación o permisos. [Despliegue existente](https://vercel.com/mariadelosangelesgtg-4145s-projects/vercel-upload-mbv/2uagQpfVSb1zmb32uvpUFxx8TCY1), estado success. El dominio devuelve HTTP 200 y entrega el nuevo componente guide-planning-navigation con las tres rutas solicitadas (chunk 08ztb_u5tsb6q.js). Esta comprobación del código servido no equivale a entrar con una cuenta normal. El commit de cierre documental no altera ese código funcional.

El navegador disponible llega a la pantalla de inicio de sesión del dominio; no hay sesión normal disponible y no se repite la solicitud de autenticación previamente cancelada. **No se acredita una nueva comprobación autenticada en producción.** La evidencia funcional corresponde a CI con datos sintéticos, no a una nueva matriz Gratis/Premium ni a teléfono físico. Permanecen los pendientes anteriores de H06 y el timeout histórico de la suite integral; esta mejora no los cierra.
