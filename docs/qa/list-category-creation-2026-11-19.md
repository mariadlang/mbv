# Creación directa en Mis listas — 2026-11-19

Estado: implementación y comprobaciones en curso; publicación autorizada, todavía no realizada.

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
