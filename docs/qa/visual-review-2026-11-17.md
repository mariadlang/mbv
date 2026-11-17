# Revisión visual MBV — 17 de noviembre de 2026

## Continuación de pendientes — cuentas y estados secundarios

María confirma que todavía no hay cuenta de prueba Premium. No se concede acceso ni se cambia ningún permiso. Cuenta H06 A documentada Gratis tras retirar Premium temporal; cuenta LIM01 autorizada conservada, sin modificar contraseña/datos. Backend mbv-h06-pruebas confirmado ACTIVE_HEALTHY por conector de lectura.

**Bloqueo de Gratis/recuperación:** pestaña3119 muestra sitio inaccesible;3130 es E2E y producción conserva sesión Superadmin. Se preparó copia aislada actual en work/visual-normal-20261117, pero la política de ejecución rechazó el comando de build/arranque normal con backend de pruebas en3141, antes de ejecutarlo, sin motivo específico. No se intentó otra vía para eludirlo. No nueva sesión Gratis, solicitud de correo ni token válido comprobados. Hace falta un entorno actualizado normal de pruebas en ejecución; la introducción/confirmación de una nueva contraseña de prueba debe hacerla María mediante el navegador. No usar contraseña personal ni sustitución E2E para dar el paso por aprobado.

**Comprobación independiente realizada:** reto sintético largo existente de3130: cerrar→Retos cerrados→retomar→pausar→retomar; formulario vacío muestra validación y foco en nombre. No se crea otro registro. Título/contenido conservados al volver a activo. Entorno sintético, no prueba de persistencia remota ni permisos. Capturas a360×400CSS (viewport720×800, zoom200%, ventana corta); primer intento de captura completa falló y se conserva ese límite, no se atribuye a la aplicación.

**Nuevo defecto demostrado y corregido:** tarjeta compartida de retos pausados/cerrados mantenía el botón Retomar junto al título y lo comprimía en una columna estrecha. Se permite envolver la fila, título flexible con mínimo0 y ajuste de palabras, botón a la derecha en su fila. Sólo src/styles/features/editorial-and-modules.css, sin lógica, textos ni datos. Evidencia antes/después en evidence/visual-2026-11-17/remaining.

**Validación pertinente:** E2E de Retos2/2 (23.7s), escritorio/móvil; build normal8qRZIvrxQhDgVkMScv_W3 con TypeScript y auditorías i18n/tokens aprobados. Se reutilizan unitarias673/673, lint y recorridos no afectados anteriores, sin presentarlos como nuevas ejecuciones. No se repite H03:2/2 optimizados anteriores conservados, causa completa de timeouts históricos NO aislada. Corrección publicada como e46b81d en https://mybestversion.life, Vercel BK2Paz4A6nFYQ19h3pvxaXXR3Ehf success; dominio200, CSS nuevo de tarjetas cerradas/pausadas comprobado y token E2E rechazado401. No hay nueva observación visual de esos estados con cuenta normal en producción: sólo registro sintético local, sin crear/modificar datos personales productivos.

Pendientes: Gratis/Premium normal, token válido y final de recuperación, rechazo/demora remotos inducidos y variantes/colecciones extensas de la cobertura anterior. No se declara auditoría completa.
## Continuación desde 1806a03 — verificación y correcciones adicionales

La revisión anterior y sus fallos se conservan abajo como antecedentes. Estado actualizado: sesión normal productiva recuperada en el navegador integrado con URL verificable, rol Superadmin; no representa cuentas user Gratis/Premium. Zoom de navegador al200% comprobado en localhost3130: viewport solicitado1440×900, área CSS720×450, DPR2 y CSS zoom1. No se eludió el bloqueo de Chrome ni se usó CSS zoom. Se verificaron Inicio, Mi guía, Mi día, revisión semanal y controles finales de Retos; asistencia previa de María para fijar el zoom. Capturas y medidas en evidence/visual-2026-11-17/followup/zoom200.

### Cobertura adicional efectiva

| Pantalla/estado | Resultado y límite |
|---|---|
| Producción normal: Mi día1280, Inicio/Ajustes768, Finanzas360, Hábitos/Entrenamiento/revisión semanal360, Listas/Progreso/Privacidad360 | Lectura, finales y apertura/cierre de modales comprobados; sin guardar datos personales. Capturas privadas conservadas localmente en normal-production, no publicadas en Git. |
| Administración | Resumen y Usuarios con sesión autorizada; ocho apartados también recorridos con datos sintéticos locales: Resumen, Usuarios, Uso, Comercial, Soporte, Sugerencias, Audiencias, Configuración. Sin conceder permisos ni ejecutar acciones comerciales. No tickets con contenido ni acciones destructivas. |
| Retos | Editor personal, título largo, guardado, recarga, pausa y regreso con registro sintético local. Sin alterar registros anteriores. |
| /verify-email sin token | Aviso de revisar correo legible; no equivale a confirmar correo ni recuperar con token válido. |

### Defectos adicionales demostrados

| Pantalla | Antes | Corrección y después |
|---|---|---|
| /platform,360px | Métricas fuerzan desbordamiento global; prueba previa falla con26px | Columnas minmax(0,1fr), mínimo0 y ajuste de palabras en tarjetas. Regresión4/4 a360,390,768,1440 sin desbordamiento global ni interno. |
| Retos/editor,360px CSS | Campos pegados al borde | Padding coherente con otros formularios. |
| Retos/título largo,360px CSS | Botón Pausar comprime texto en columna estrecha | Cabecera permite envolver y da espacio flexible al título; botón queda accesible debajo. Recarga y pausa/retorno conservan contenido. |

Antes/después sintéticos en evidence/visual-2026-11-17/followup/{before,after}. Las capturas de retos usan viewport solicitado720×1600 con zoom200%, área CSS360×800; la prueba administrativa automatizada usa360×800 al100%. No teléfono físico. Registro nuevo: «QA visual: dedicar unos minutos a la lectura y reconocer pequeños avances durante una semana de prueba», descripción «Registro sintético para comprobar texto largo y controles del reto.», inicio17/11/2026, conservado activo en3130.

### Diagnóstico de los dos timeouts H03

Se analizaron los tres traces fallidos originales antes de cambiar nada. Los dos candidatos consumen el presupuesto global180s durante una secuencia extensa de navegación/recarga, no en una única operación bloqueada: goto+reload suman97.35s escritorio y86.92s móvil. La base tiene110.30s en navegación, incluido primer goto52.34s por compilación fría. Que falle la base no se usa como resolución.

Comparación con runtime optimizado (next build/start3140), mismo archivo de prueba SHA256 AAFF6F365F84C4DC11C55BD54CB56E8740EE96B7F2E4E357355269A0EBE4E2D2, límite180s y aserciones intactos:2/2 en2.1min, escritorio53.4s y móvil1.0min. Ambos completan22 navegaciones y16 recargas; su tiempo acumulado baja a12.08s y10.91s. Cada trace completa117 expectativas. No se repitió hasta verde ni se omitieron casos: cambió explícitamente el runtime para contrastar la hipótesis.

Clasificación respaldada: sobrecoste acumulado del entorno de desarrollo dentro del presupuesto de una prueba larga; no se demostró un defecto funcional de preparación. La contribución exacta de compilación/HMR/carga del equipo a cada segundo no quedó aislada; no se declara solucionada toda intermitencia histórica. No se cambia la aplicación, el test H03 ni su timeout por este diagnóstico. Traces originales y nuevos conservados localmente; análisis y resultados en followup/logs.

### Validación de esta continuación

Completa unitaria673/673,109archivos,310.93s, dos trabajadores. Regresión nueva administrativa: antes0/1 (overflow26px), después4/4. Build normal local ilnPmOHj9r_ZIWDGjsaL1. Principal E2E y Retos8/8 en3.1min, sin omisiones/reintentos. Tipos, lint completo, i18n y tokens aprobados (un aviso lint previo). Publicado código funcional f821c2edb1a95a52dea4d5877331cdce5b71d656 en https://mybestversion.life mediante main; Vercel DB45LpamqLL52R7jQmv9YtZQHrky success. Dominio200, CSS nuevo comprobado, token E2E rechazado401. Revisión normal posterior Superadmin: administración360×800 sin desbordamiento (scrollWidth=clientWidth=345), métricas legibles y editor de Retos con campos/acciones accesibles; cerrado sin guardar datos. Título largo comprobado sólo con registro sintético local, producción no tiene reto activo. Capturas privadas en normal-production. No cambios de permisos, datos personales, Supabase ni servicios.

Pendientes reales: matriz user Gratis/Premium normal, recuperación/confirmación con token válido, errores remotos inducidos, colecciones masivas y variantes de cada registro señaladas en la tabla histórica. No se envían correos ni se cambian credenciales o permisos para ampliar cobertura. No cierre H06 ni certificación visual exhaustiva.

## Entrega anterior y entorno (antecedente conservado)

Base f24c3e5, verificada Production/Ready en Vercel (4SotArqKQqqi6t6u1FpgxZviyGAd). Destino autorizado: https://mybestversion.life, proyecto existente vercel-upload-mbv. Publicado código funcional **1806a036e176d637d3a762a45682fe1ed657bdd7**, commit y push a main completados. [Vercel B4Yb7vxEZPZF9rBNLEXRGfocZiio](https://vercel.com/mariadelosangelesgtg-4145s-projects/vercel-upload-mbv/B4Yb7vxEZPZF9rBNLEXRGfocZiio), estado success. El17/11 a19:14UTC el dominio respondió200 y sirvió el CSS nuevo de Hábitos, revisión semanal, solicitudes y estados vacíos. GET /api/feedback con credencial sintética E2E fue rechazado401. [Comprobación técnica del dominio](evidence/visual-2026-11-17/production-verification.json). Cierre documental posterior conserva exactamente el mismo código funcional. No se contrató ni configuró ningún servicio.

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

El zoom real200% sigue pendiente: Ctrl+igual no modifica innerWidth ni devicePixelRatio del navegador integrado. Chrome nativo fue detenido por verificación de URL. María preparó manualmente Chrome al200% durante la reanudación; un único nuevo intento sobre la ventana identificada volvió a ser rechazado por la herramienta. No se obtuvo observación verificable del zoom ni se eludió el bloqueo. No se ha sustituido por CSS zoom ni por un viewport menor para afirmar que pasó. La reanudación utilizó el navegador integrado permitido, sin eludir ese bloqueo.

Matriz Gratis/Premium con autenticación normal y administración no comprobada. La sesión normal productiva previamente disponible es Superadmin, y no representa una cuenta normal de cada plan. No se provocaron caídas remotas ni se activó E2E en producción. Estados de guardado, error/reintento e identidad tienen pruebas controladas anteriores; no se atribuyen a observación visual nueva.

## Registros sintéticos conservados

En3130, fecha17/11/2026: tarea «QA visual: revisar el documento de prueba…», prioridad1; resultado mensual «QA visual: completar un resultado mensual suficientemente largo…»; prioridad mensual de materiales; libro «QA visual: libro de prueba…»; proyecto de presentación y desayuno ficticio largo. Se conservaron tras navegación/recarga. No recrear LIM01 ni mover su fecha24/10. Capturas y logs completos locales: `C:/Users/maria/Documents/Codex/2026-10-16/files-pasted-by-the-user-my/outputs/MBV-Visual-2026-11-17`.

## Validación e intentos conservados

- Primera completa unitarias:670/673, tres timeouts de SavePendingFields; no se alteran aserciones ni límites.
- Completa candidata con dos trabajadores:673/673,109archivos,312.84s. Control de concurrencia, no cambio de pruebas. No demuestra resuelta la intermitencia histórica.
- Base archivada f24c3e5 con dos trabajadores:672/673. Fallo SQL por CRLF de git archive frente a búsqueda literal LF; no cambios SQL. SavePendingFields pasó en esa ejecución.
- Flujo E2E principal:6/6, escritorio/móvil; onboarding, tarea/hábito y planificación/módulos. Datos desechables en contextos separados.
- E2E adicional:8/10,11.7min. Navegación de Mi guía, biblioteca de comidas/entrenamientos e Inicio pasan en escritorio y móvil. Preparación H03 agota180s en ambos tamaños. Comparación separada sobre base f24c3e5 sin correcciones, escritorio:0/1, también timeout180s. Esto demuestra que la limitación existe sin este diff, no su causa ni que cada timeout sea idéntico. Traces y capturas conservados; no se aumentan límites ni se omiten casos. No se declara verde la suite completa histórica.
- Lint completo: sin errores, un aviso previo useAccount. i18n y tokens aprobados; contraste aprobado. No nuevos textos. Typecheck explícito (next typegen y tsc --noEmit) aprobado. Build final normal aprobado, build local wy9ayqisdH1-s49Wx2W63. Logs originales incluidos en evidence/visual-2026-11-17/logs.
- Primer build Webpack compiló pero rechazó un export previo de ruta API en su generador de tipos. El build normal Turbopack de la copia enlazada primero rechazó node_modules fuera de raíz. Se ajustó exclusivamente turbopack.root en la copia aislada para incluir ambas carpetas, sin cambiar configuración del repositorio. Build normal posterior pasó con TypeScript. Todos los logs fallidos se conservan.

## Cómo repetir desde la interfaz

Usar primero3130 con registros QA conservados. Abrir las rutas de la tabla de defectos, fijar el viewport indicado, comparar captura anterior/posterior, desplazar hasta el final y abrir/cerrar cada modal. No enviar PQR, no comprar, no borrar ni importar datos. Repetir Mi día/Inicio/Guía tras navegar y recargar; comprobar marca y etiquetas. En producción usar sólo sesión normal existente y lectura, E2E desactivado. Registrar rol y no confundir ausencia de permiso con defecto visual. Zoom200% requiere navegador que exponga y confirme el zoom real.

## Límites de la comprobación productiva posterior

La pestaña normal del dominio llegó a «Comprobando tu acceso / Preparando tu espacio…» antes del bloqueo de la herramienta. Esto NO demuestra que la transición terminara ni permite acreditar los recorridos corregidos con sesión normal en esta publicación. La comprobación del despliegue mediante estado Vercel, HTTP y CSS servido se registra por separado y no sustituye esa revisión visual. H06 y los fallos históricos siguen abiertos.
