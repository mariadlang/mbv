# Revisión visual MBV — 17 de noviembre de 2026

## Entrega y entorno

Base f24c3e5, verificada Production/Ready en Vercel (4SotArqKQqqi6t6u1FpgxZviyGAd). Destino autorizado: https://mybestversion.life, proyecto existente vercel-upload-mbv. Publicación de esta revisión pendiente al redactar esta primera ficha; el cierre se incorpora aquí.

Revisión práctica mediante navegador integrado, copia aislada en http://127.0.0.1:3130. E2E local, cuenta sintética Premium/user, sin credenciales de Supabase. No equivale a autenticación normal ni prueba de permisos. Origen3119, LIM01, datos personales y almacenamiento existente conservados. No cambios de persistencia, permisos, funciones de negocio, traducciones personales, marca o servicios. next-env.d.ts ya estaba modificado antes de este trabajo y se excluye del commit.

## Defectos demostrados y correcciones

Abrir la ruta indicada, usar el tamaño indicado y desplazarse al elemento. Capturas originales y posteriores en [evidence/visual-2026-11-17](evidence/visual-2026-11-17). Los nombres siguientes existen en before/ y after/, salvo la revisión semanal que compara escritorio inicial con comprobación móvil adicional.

| Pantalla / tamaño | Reproducción y defecto | Corrección y comprobación | Captura |
|---|---|---|---|
| Mi día,1280×720 | Abrir /app/today: lateral reducido corta marca/lema y etiquetas | Retirar ancho/lettering particular; marca no encoge y etiquetas pueden envolver. Menú consistente con Inicio | today-sidebar-1280.jpg |
| Finanzas ingresos,360×800 | Estado sin movimientos usa columnas de una fila de datos, comprime el título | Excluir empty-state de la cuadrícula de movimientos/recurrentes | finance-empty-360.jpg |
| Finanzas revisión,360×800 | Al final, acciones rápidas tapa parte de Guardar | Espacio inferior compartido para páginas móviles con FAB; botón accesible al final | finance-review-360-bottom.jpg |
| Alimentación detalle,360×800 | Abrir biblioteca→Ver detalle: contenido pegado al borde | Clase compartida prep-dialog en detalle, propuesta, editor y listas mensuales | health-detail-360.jpg |
| Entrenamiento,360×800 | Añadir entrenamiento: formulario sin margen interior | Padding del formulario de fitness dentro del modal, también configuración | workout-dialog-360.jpg |
| Progreso,1440×900 | Tarjetas inferiores sin margen | Padding de tarjetas de progreso, metas próximas y estado vacío | progress-1440-bottom.jpg |
| Mis listas,1440×900 | Captura universal pegada al borde | Padding del contenedor de captura | lists-1440.jpg |
| Inicio EN,768×1024 | Preparación semanal deja título en columna de icono de48px | Mantener disposición icono/título hasta800px | dashboard-768-en.jpg |
| Ajustes EN,768×1024 | Encabezado alineado a la derecha en disposición vertical | Estirar encabezados móviles/tableta; Finanzas comparte corrección | settings-768-en.jpg |
| Privacidad,360×800 | Tarjetas del mapa y formulario de solicitudes sin margen | Padding de las tarjetas concretas; campos y Radicar solicitud visibles | privacy-request-360.jpg |
| Hábitos,390×844 | Crear hábito: Personalizar pegado a su descripción e icono suelto | Flex para control y grid para título/ayuda; desplegado y cerrado comprobados | habit-customize-390.jpg |
| Mi semana,1280×720 y360×800 | Revisión semanal: campos pegados al borde | Padding del formulario; acciones finales accesibles con scroll | before/weekly-review-1280.jpg; after/weekly-review-360-bottom.jpg |

No se modificaron textos, logo, fuentes, colores, IDs ni guardados. Se conservan los controles y contenido, sin ocultarlos para eliminar desbordamientos.

## Inventario y cobertura efectiva

Esta tabla es una lista de cobertura, no una certificación de todas las combinaciones de tamaño/estado. Escritorio1440×900, portátil1280×720, tableta768×1024, móvil390×844 y360×800 son viewports emulados; no teléfono físico ni teclado virtual. ES y EN Beta revisados; contenido sintético largo permanece en español.

| Rutas / pantallas | Comprobación realizada | Límite |
|---|---|---|
| /app/dashboard, /app/today | Escritorio,1280,768,390/360 según capturas; tarjetas vacías/con contenido, menús y desplazamiento | No todos los estados de error/retorno |
| /app/guide | Escritorio,1280,768,390; checklist y accesos internos | Personalización extensa cubierta por E2E, con resultado separado |
| /app/planning?view=annual | Escritorio,768,390; tarjetas de meses y editor | No doce meses con contenido abundante |
| /app/planning?view=month | Escritorio,1280,768,360; Resumen/Plan/Listas/Notas, editor, lista larga, guardado | No errores remotos inducidos |
| /app/planning/weekly y planning?view=day | Escritorio,1280,768,360; semana, contexto largo, pendientes, revisión semanal; navegación día en E2E | No todos los popovers de cada registro |
| /app/vision |360, visión por áreas, rueda vacía y editor | No todas las áreas con contenido ni imágenes |
| /app/goals |1440/360/390, vacío, filtros, editor y acciones finales | No todas las variantes de cálculo/estado de una meta |
| /app/tasks |1440/360, tarea larga, creación de proyecto largo, navegación | No todos los estados de edición masiva |
| /app/habits |1440/360/390, vacío, resumen horizontal, editor simple/personalizado | E2E verifica creación y registro; no todas las frecuencias |
| /app/finance |1440/768/360; los nueve apartados, formularios y final de revisión | Vacío; sin movimientos personales ni compras reales |
| /app/health y ?section=training |1440/768/360/390; semana/día/mes/biblioteca, comida larga, detalle, configuración, entrenamiento | Plantillas detalladas y reutilización en E2E; sin errores remotos inducidos |
| /app/life-hub?tab=lists |1440/360; captura, libro largo y listados | No colección masiva |
| life-hub tabs routines/challenges/vision/events |360; rutinas, retos, tablero y calendario; formularios y finales cuando indicados en evidencia | Sin subir imágenes ni crear eventos externos; no todos los editores de retos |
| /app/progress |1440/360; resumen, vacíos, tarjetas inferiores | Sin historial abundante de estadísticas |
| /app/settings |768EN/360ES; perfil, preferencias, respaldo y áreas; selector de idioma | Sin borrado, restauración ni cambios personales |
| /app/more |360; todos los grupos y final | — |
| /app/help, /app/learn, /app/support |1440EN, controles y contenido informativo, final de soporte | Sin enviar soporte ni aplicar contenido |
| /app/legal, /app/privacy-center |1440/360; documentos, mapa, acciones, solicitud y seguimiento vacío | No enviar PQR ni cambiar autorizaciones productivas |
| /, /trial, /upgrade |360/390 y1440 según recorrido; portada, menú, planes y pie | No compra, checkout ni recompensa de30días |
| /login, /signup, /forgot-password |390; formularios, consentimientos sin aceptar y pie | Sin enviar alta/correo ni cambiar contraseña |
| /legal, /legal-notices, /terms, /privacy, /data-policy, /cookies, /payments, /retract, /data-deletion, /ai-privacy, /security, /provider-info, /pqr |360/390; cabeceras y finales, lectura de documentos, modal cookies y PQR sintético | No revisión jurídica ni de cada párrafo en cada tamaño; datos legales pendientes previos permanecen |
| /verify-email, recuperación con token válido |No comprobado | No generar confirmación ni cambiar credenciales |
| /platform, /admin |No comprobado en esta revisión | No elevar permisos sintéticos |
| Alias /app/profile, /app/journal, /app/challenges, /app/mood, /app/life-hub/fitness, planificación antigua |Inventariados por código como redirecciones | No nueva pantalla; no todos repetidos visualmente |

El zoom real200% sigue pendiente: Ctrl+igual no modifica innerWidth ni devicePixelRatio del navegador integrado. El intento anterior de Chrome nativo fue detenido por verificación de URL. No se ha sustituido por CSS zoom ni por un viewport menor para afirmar que pasó. La reanudación utilizó el navegador integrado permitido, sin eludir ese bloqueo.

Matriz Gratis/Premium con autenticación normal y administración no comprobada. La sesión normal productiva previamente disponible es Superadmin, y no representa una cuenta normal de cada plan. No se provocaron caídas remotas ni se activó E2E en producción. Estados de guardado, error/reintento e identidad tienen pruebas controladas anteriores; no se atribuyen a observación visual nueva.

## Registros sintéticos conservados

En3130, fecha17/11/2026: tarea «QA visual: revisar el documento de prueba…», prioridad1; resultado mensual «QA visual: completar un resultado mensual suficientemente largo…»; prioridad mensual de materiales; libro «QA visual: libro de prueba…»; proyecto de presentación y desayuno ficticio largo. Se conservaron tras navegación/recarga. No recrear LIM01 ni mover su fecha24/10. Capturas y logs completos locales: `C:/Users/maria/Documents/Codex/2026-10-16/files-pasted-by-the-user-my/outputs/MBV-Visual-2026-11-17`.

## Validación e intentos conservados

- Primera completa unitarias:670/673, tres timeouts de SavePendingFields; no se alteran aserciones ni límites.
- Completa candidata con dos trabajadores:673/673,109archivos,312.84s. Control de concurrencia, no cambio de pruebas. No demuestra resuelta la intermitencia histórica.
- Base archivada f24c3e5 con dos trabajadores:672/673. Fallo SQL por CRLF de git archive frente a búsqueda literal LF; no cambios SQL. SavePendingFields pasó en esa ejecución.
- Flujo E2E principal:6/6, escritorio/móvil; onboarding, tarea/hábito y planificación/módulos. Datos desechables en contextos separados.
- E2E adicional: resultados finales por incorporar; timeout180s del caso de preparación conservado con trace. No se declara verde la suite completa histórica.
- Lint completo: sin errores, un aviso previo useAccount. i18n y tokens aprobados; contraste aprobado. No nuevos textos. Build final normal y comparación E2E base por cerrar en esta ficha.
- Primer build Webpack compiló pero rechazó un export previo de ruta API en su generador de tipos. El build normal Turbopack de la copia enlazada primero rechazó node_modules fuera de raíz. Se ajustó exclusivamente turbopack.root en la copia aislada para incluir ambas carpetas, sin cambiar configuración del repositorio. Build normal posterior pasó con TypeScript. Todos los logs fallidos se conservan.

## Cómo repetir desde la interfaz

Usar primero3130 con registros QA conservados. Abrir las rutas de la tabla de defectos, fijar el viewport indicado, comparar captura anterior/posterior, desplazar hasta el final y abrir/cerrar cada modal. No enviar PQR, no comprar, no borrar ni importar datos. Repetir Mi día/Inicio/Guía tras navegar y recargar; comprobar marca y etiquetas. En producción usar sólo sesión normal existente y lectura, E2E desactivado. Registrar rol y no confundir ausencia de permiso con defecto visual. Zoom200% requiere navegador que exponga y confirme el zoom real.
