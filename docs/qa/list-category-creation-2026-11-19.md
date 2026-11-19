# Creación directa en Mis listas — 2026-11-19

Estado: publicada y comprobada en el dominio existente. Los intentos previos se conservan debajo.

Base: ed8d3426c07c0b9b18d1d88f6e34b301ecdf9b17. Copia aislada MBV-Lists-2026-11-19; no incluye los cambios locales ajenos de la copia original.

Cambio: botón Añadir junto a la cabecera tanto vacía como poblada; reutilización del editor y servicio existentes, categoría inicial según filtro, nombre obligatorio y sin fecha. Todas permite elegir categoría. Guardado con bloqueo síncrono, campos deshabilitados, confirmación tras resolver y borrador recuperable al fallar. Captura rápida sin clasificar y registros previos conservados. Sin cambio de modelo, migración, permisos, configuración Supabase ni marca.

Pruebas dirigidas iniciales: LifeHubPage 29/29. Controles globales y E2E en curso. Evidencia separada fuera del repositorio: MBV-Lists-Evidence-2026-11-19. No confundir E2E sintético con autenticación normal productiva.

## Intentos conservados y preparación local

- Primera suite: 678/683 aprobadas, 5 fallidas. Cuatro timeouts de 5000 ms en SavePendingFields (month-map, meal, workout, settings); no se modificaron esos casos ni sus límites. Un fallo SQL esperaba una cadena LF sobre un checkout CRLF: índice -1; la misma cadena normalizada está en posición 10657. Se normalizó únicamente la copia de trabajo de ese SQL, sin diferencia de contenido para Git ni migración/remoto.
- Dirigidas aisladas: 48/48 (LifeHub 29, SavePendingFields y SQL). El pase aislado no demuestra por sí solo la causa de los timeouts anteriores. Corrida completa adicional con dos workers, para reducir la concurrencia de la máquina; resultados separados.
- Compilación local inicial Turbopack rechazada por node_modules enlazado fuera de la raíz. La revisión automática bloqueó retirar esa junction; no se eliminó ni se reemplazó. Intento webpack compila pero encuentra un contrato legacy de exportación createCheckoutHandler en rutas; no se cambió ese código ajeno.
- Preparación segura alternativa: raíz de resolución Turbopack temporal apuntando al padre compartido de los worktrees. No cambia opciones de acceso ni se publicará esa ruta local. Build normal aprobada WtuM23WkEC_e6B4o3a-ho, E2E=0. Los chunks contienen la nueva creación.
- Correcciones de tipos sólo en los tests nuevos: se retiró exact (opción Playwright, no RTL) y se ajustó un cast DOM. tsc final aprobado; lint sin errores, un aviso previo en useAccount. Auditorías i18n/tokens aprobadas. No se cambió comportamiento por estos errores de preparación.

## Revisión móvil adicional

La corrida funcional inicial aprobó 8/8 (principal 6 y categorías 2). La inspección de la captura completa motivó una aserción adicional de visibilidad real del formulario, no sólo éxito del clic. Resultado inicial: escritorio aprobado, móvil fallido; diagnóstico móvil posterior confirmó Guardar/Cancelar entre y=787.72 y 831.72, cubiertos por mobile-nav__item en viewport 390×844, incluso tras esperar estabilización. Intentos conservados en e2e-visual y e2e-visibility-diagnostic.

Corrección mínima: el nuevo editor se centra al abrirse mediante scrollIntoView, como el editor de Mi día. No se mueve navegación ni se oculta el botón flotante. La prueba nueva comprueba los puntos centrales de todos los campos/botones y captura el viewport; no desplaza el formulario desde el test para ocultar el problema. Regresión de LifeHub y navegador repetidas por este cambio de presentación. La primera suite completa aprobada fue 683/683, dos workers, 109 archivos; corresponde a la implementación previa a este ajuste de desplazamiento. Validación final se registra por separado.

## Candidata lista para publicar

- Implementación final: LifeHub 29/29, lint dirigido y tipos aprobados. E2E final 8/8 en 1.6 min, 0 omitidos y 0 reintentos; build N-4bmm2v3zlvwO562cgaZ en http://127.0.0.1:3159, adaptador E2E y datos sintéticos, configuración separada de producción.
- Cada tamaño crea siete registros por categoría y uno desde Todas: 0 + 8 = 8; ocho IDs distintos, mismos contenidos/IDs tras recarga, sin fecha. Tareas previas idénticas. Cancela sin guardar; doble clic de escritorio y doble toque emulado no duplican. Error/demora/reintento comprobados de forma controlada en unitarias, no provocados en producción.
- Capturas finales de viewport revisadas: formulario completo, encabezado, navegación fija y acciones utilizables. Móvil 390×844 emulado, no teléfono físico. Control de desbordamiento aprobado.
- Estado: commit/push/deploy autorizados; resultado remoto y comprobación con sesión normal se registrarán después. Configuración temporal de resolución local y next-env generados restaurados antes del commit. No se publican flags E2E, credenciales, respaldos, logs privados ni cambios de Supabase.

## Publicación y comprobación normal

Código funcional e43d418424ca82827c80b63252975c304b993aef publicado en https://mybestversion.life/app/life-hub; Vercel HMwPchJkWE6E3Z8ALVUeRceqVR7S success. CI 44613091536 sobre ese commit: lint, tipos, 683/683 unitarias (109 archivos) y build aprobados; E2E remoto omitido por la regla existente de main, no se presenta como recorrido. E2E local final separado 8/8, cero omisiones/reintentos. Sesión normal productiva Superadmin: siete categorías preseleccionadas, creación desde Todas, cancelación, ocho registros sintéticos/IDs distintos, mismos datos tras recarga y registros anteriores/perfil intactos mediante exportaciones UI. Móvil 390×844 emulado, controles libres de superposición. Sin cambios de permisos, datos personales, Supabase ni servicios. Ficha: [creación directa](../qa/list-category-creation-2026-11-19.md).

- Fecha: 19/11/2026. Commit funcional e43d418; despliegue HMwPchJkWE6E3Z8ALVUeRceqVR7S. [CI exacto](https://github.com/mariadlang/mbv/actions/runs/44613091536): 683/683, 40.30 s, sin reejecución del job; lint/tipos/build success. Esta ejecución sí incluye el ajuste final de desplazamiento del editor. Los resultados locales anteriores no se mezclan con ella.
- Dominio responde 200; GET /api/feedback con bearer sintético e2e-user devuelve 401. Sesión normal existente, sin identidades inyectadas/interceptores ni modificaciones de configuración productiva. Supabase de producción conservado.
- Escritorio 1448×1086: siete altas mediante cada categoría, preselección correcta, una fila por registro y presencia en Todas; botón disponible en vacío y con contenido. Móvil 390×844: las siete listas conservan cada registro; alta adicional desde Todas eligiendo Quiero leer; cancelación de borrador no crea registro. Las siete altas también se comprobaron independientemente en móvil E2E.
- Exportación UI anterior: 0 elementos de lista. Posterior: 8; tras recargar: 8; IDs únicos: 8. Las siete primeras identidades y todos sus campos permanecen idénticos, y una segunda recarga confirma las ocho. Registros anteriores de todas las colecciones y perfil sin cambios. Sin fechas, estado idea; no se completan tareas. Datos sintéticos prefijados PRUEBA 19-11 permanecen identificables; no se eliminan registros personales ni LIM01.
- Evidencia externa al repositorio: C:/Users/maria/Documents/Codex/MBV-Lists-Evidence-2026-11-19/production-normal.json (sólo registros sintéticos y resultados), production-desktop.jpg, production-mobile.jpg y production-mobile-form.jpg. Capturas reales sin retoque. Respaldos completos no publicados ni adjuntados.
- En móvil, Nombre/Categoría/Guardar/Cancelar libres de superposición, botones y=518.47–562.47 dentro de 844 px; ancho de contenido375 dentro de viewport390. No teléfono físico ni teclado virtual físico.
- Límites: autenticación normal con rol Superadmin existente; no se elevan permisos ni se presenta como nueva validación normal Gratis/Premium o aislamiento de cuentas. Error, demora y doble envío controlados en unitarias/E2E, sin inducir fallos en producción. Aviso lint preexistente y timeouts iniciales documentados, no borrados ni atribuidos automáticamente a una causa.
- Archivos funcionales: LifeHubPage.tsx, navigation-space-progress.ts y contextual-planning.css; pruebas LifeHubPage.test.tsx y e2e/list-category-creation.spec.ts; continuidad ESTADO_ACTUAL/HISTORIAL y esta ficha. Cierre documental posterior no cambia la aplicación.
