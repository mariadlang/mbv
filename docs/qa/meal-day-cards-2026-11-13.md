# Comidas en tarjetas por día — 2026-11-13

## Alcance

Referencia: diseño de tarjetas elegido por María. Semana con siete días según la preferencia de inicio de semana, tres comidas siempre visibles, texto libre y varios snacks opcionales. Mi día utiliza los mismos registros. Los detalles anteriores siguen disponibles de forma opcional, sin exigir el editor nutricional.

## Datos y compatibilidad

- Se reutilizan `nutritionLogs` y sus comidas, la cola de escrituras del servicio y el repositorio existente. Categoría opcional `slot`; los backups antiguos siguen siendo válidos. No hay migración destructiva ni nuevo almacenamiento.
- Las comidas antiguas sin categoría permanecen visibles en «Otras comidas guardadas». No se deduce una categoría a partir de su nombre.
- Upsert de desayuno/almuerzo/cena por fecha y categoría. Snacks con identidad estable durante guardado/reintento. Cada edición mantiene ID del día, ID de comida, datos nutricionales previos y estado de consumo. Una comida nueva se crea sin consumir.
- Edición del registro vinculado al plan mensual crea una excepción semanal y conserva el original y la restauración. Agregar otras comidas no reemplaza la relación mensual existente.
- Mismo componente en Semana, pestaña Mi día de Alimentación y sección Mis comidas de Mi día. Mismos límites de planificación y gate Premium de Alimentación; no se modifican roles, cuentas ni configuración de Supabase.

## Verificación local

- Dirigidas iniciales: 15/15 (dominio, servicio y componentes).
- Suite completa: 672/672, 109 archivos, sin omisiones ni reintentos automáticos; dos corridas aprobadas (44.12 s y 61.86 s).
- Tipos y build aprobados tras corregir dos errores de compilación detectados durante implementación.
- Lint: cero errores, aviso previo de `useAccount`.
- Auditorías de i18n y tokens aprobadas. Primer intento i18n detectó claves dinámicas; reemplazadas por mapa explícito de claves.
- Revisión React: hooks incondicionales, estado de borrador local, guard de navegación, bloqueo síncrono de envío, errores sin descartar texto, labels y foco, sin nuevas dependencias.
- Chromium local no pudo iniciarse: socket() Operation not permitted del entorno. No se presenta como ejecución E2E aprobada. Se preparó recorrido Playwright escritorio/móvil con guardado, doble pulsación, reload, cambio de semana/día, mismos IDs y capturas; ejecutado después en CI (ver resultados siguientes).

## CI y revisión de capturas — 2026-11-14 UTC

- PR [#4](https://github.com/mariadlang/mbv/pull/4), commits `151401a` y `7bf351c`: lint, tipos, 672 unitarias y build aprobados en GitHub. Previews Vercel listos en el proyecto existente; aún no publicados en el dominio.
- Run [43521183794](https://github.com/mariadlang/mbv/actions/runs/43521183794): **167 E2E aprobadas, 4 fallidas, 25 omitidas**, 30.2 minutos. Los dos recorridos nuevos de comidas pasaron, incluidos cinco registros únicos, guardado/recarga, edición entre vistas y conservación de IDs y estado sin consumir. Las omisiones existentes no se presentan como aprobadas. El run anterior 43520876762 permanece registrado como fallido: 167 aprobadas, 4 fallidas, 25 omitidas, 35.3 minutos.
- Dos fallos (escritorio/móvil) de preparación: selector nuevo demasiado amplio, que coincidía con fecha y textarea. Se restringe al nombre accesible «Otras comidas guardadas», manteniendo las aserciones de persistencia y restauración.
- Dos fallos (escritorio/móvil) de Inicio: fixture existente fija 15:00 Bogotá, pero el navegador CI interpreta el evento sin zona a las 16:00 UTC, ya pasado a las 20:00 UTC. Se fija `America/Bogota` sólo para ese archivo de prueba; no se cambia la lógica de eventos ni la expectativa de dos eventos.
- Las cuatro capturas se descargaron del artefacto 14084957360 y se inspeccionaron. La captura de elemento semanal incluía la cabecera sticky a media imagen, pues el elemento excedía el viewport. Se cambia la captura a página real completa desde arriba, esperando fuentes y sin alterar CSS ni ocultar controles. La evidencia nueva se conserva más abajo en cuatro capturas de página completa.
- La solicitud de acceso normal quedó cancelada; no se reintenta ni se alteran credenciales. La comprobación autenticada en producción continúa pendiente.

- Revisión adicional de compatibilidad: una comida legacy sin propiedad `completed` debe seguir sin ella al editar su nombre. El nuevo método conserva esa ausencia, además de los estados true/false existentes; sólo las comidas nuevas nacen con false. Regresión específica añadida; dirigidas posteriores 8/8. La limpieza de EOF en el helper de pruebas no cambia su comportamiento.

## Candidata final

Código funcional: `8299b97d0eb33792fd042249bf67c8e4b7fde40b`. CI [43552709003](https://github.com/mariadlang/mbv/actions/runs/43552709003): lint, tipos, **673/673 unitarias en 109 archivos (40.11 s)** y build aprobados. **E2E: 170 aprobadas, 1 fallida y 25 omitidas (42.7 minutos)**. Los recorridos de comidas y las correcciones de preparación e Inicio pasan. Vista previa del mismo proyecto Vercel `4TAhN1rx9sWKQEt4E9hEqeaugmYD`, estado success/Ready; no equivale a despliegue productivo. La corrida anterior [43551904205](https://github.com/mariadlang/mbv/actions/runs/43551904205) de `37aed59` queda aprobada: **171 E2E, cero fallos, 25 omisiones, 31.5 minutos**. No se presenta como una corrida completa de la revisión posterior.

## Incidencia aislada de la última completa

El caso desktop `an existing month outside the trial horizon remains available in read-only mode` agotó su límite original de 30 s. Traza: el intento de pulsar Guardar plan empieza unos 10.4 s después de iniciar el caso; el botón deja de estar estable y se desprende del DOM unos 0.47 s después. Por tanto, no se atribuye el fallo simplemente a que el setup hubiera consumido todo el presupuesto ni se afirma una causa demostrada. El caso y su aplicación no fueron modificados por esta mejora.

Se realizó una comprobación independiente y acotada del mismo test, mismas aserciones y límite de 30 s, un worker, sobre el commit exacto `8299b97`. Rama de verificación `verify/meal-release-2026-11-14`, workflow auxiliar `c1c0e38` (no forma parte de la publicación), [run 43556884520](https://github.com/mariadlang/mbv/actions/runs/43556884520). Ese primer intento no ejecutó casos: el filtro anclado por título no incluía el prefijo de archivo/proyecto usado por Playwright. Se corrige la selección a `e2e/app.spec.ts:2223`, comprobada con `--list` (exactamente un test desktop), sin modificar el test ni su límite. La ejecución corregida [43557054695](https://github.com/mariadlang/mbv/actions/runs/43557054695), workflow `827c1cb` con checkout fijado a `8299b97`, pasó: **1/1, 23.7 s**, un worker, mismas aserciones, timeout original y sin reintentos automáticos. Este resultado separado no elimina el fallo de la completa ni demuestra su causa. No se modificó el plan mensual para resolverlo.

## Capturas de la candidata

Capturadas por Playwright con datos sintéticos, adaptador E2E y móvil emulado; no acreditan una sesión de producción. Las cuatro imágenes de `8299b97` son byte a byte idénticas a las revisadas de `37aed59`. Son capturas completas de página; la navegación móvil fija aparece a la altura del primer viewport. Los controles se ejercitaron mediante clic/toque normal, sin forzarlos, y se comprobó que no hay desplazamiento horizontal de página.

| Vista | Escritorio 1448×1086 | Móvil 390×844 emulado |
| --- | --- | --- |
| Semana | [Captura](screenshots/meals-week-desktop-2026-11-14.png) | [Captura](screenshots/meals-week-mobile-2026-11-14.png) |
| Mi día | [Captura](screenshots/meals-day-desktop-2026-11-14.png) | [Captura](screenshots/meals-day-mobile-2026-11-14.png) |

## Publicación — 2026-11-14 UTC

PR [#4](https://github.com/mariadlang/mbv/pull/4) fusionada en `main`: **`02708b210d09c2e6a682d70f8e43084d6adcdf67`**, mismo árbol probado de `8299b97` (`46bc032a63cfb5de9063427a6eca9f58e7c6170d`). Base anterior `fdcc399`. Commit y push completados; integración Git existente de Vercel, proyecto `vercel-upload-mbv`, equipo `mariadelosangelesgtg-4145s-projects`, destino productivo **https://mybestversion.life**. [Despliegue 36bJZLFGU6jRdCBvpCZF9scNAQ66](https://vercel.com/mariadelosangelesgtg-4145s-projects/vercel-upload-mbv/36bJZLFGU6jRdCBvpCZF9scNAQ66): estado success/Ready.

El conector GitHub se utilizó porque el push de terminal no tenía credencial. El conector Vercel devolvía 404 pese a existir el proyecto; no se creó otro proyecto ni se cambió su configuración. No se contrataron servicios, modificaron planes de pago, credenciales, permisos, DNS ni Supabase. La rama auxiliar de verificación no forma parte de `main`.

CI posterior a la fusión [43557382505](https://github.com/mariadlang/mbv/actions/runs/43557382505): lint, tipos, **673/673 unitarias (109 archivos, 53.89 s)** y build aprobados. E2E omitido por la regla existente de push a main; se utiliza la evidencia PR descrita arriba.

Comprobación pública a las **04:40 UTC**: `/app/health` y `/login` responden 200; los archivos JavaScript servidos desde el dominio incluyen las nuevas tarjetas y `savePlannedMeal`; el host de Supabase sigue siendo `yvrvetuzuinoinukrivo.supabase.co`. La API de estado de facturación rechaza el token sintético E2E con **401**; no se inició ningún checkout. Esta comprobación de entrega de código y rechazo de acceso no acredita persistencia autenticada. Archivos de tarjetas verificados: `/_next/static/chunks/0bgvlgu_7qgts.js`, `/_next/static/chunks/17embxz.wst51.js`.

La primera inspección sólo buscó en scripts iniciales y no detectó las tarjetas: se cargan como módulos diferidos. Al seguir las referencias reales de esos scripts, se encontró el código nuevo. No se trató esa ausencia inicial como un fallo de despliegue ni se cambió la configuración de producción.

**Pendiente al cierre anterior (conservado como histórico):** guardar, editar y recargar con autenticación normal en el dominio, y obtener capturas de esa sesión en ambos tamaños. El navegador disponible sólo mostró el login y la solicitud segura de acceso fue cancelada. No se reintentó, se inyectaron sesiones ni se habilitó E2E en producción. Las capturas de las secciones anteriores corresponden exclusivamente a CI. En ese momento no se declaró cerrado el criterio completo de aceptación de María. También quedó sin explicar el timeout aislado del plan mensual; su aprobación posterior es una comprobación separada.

Este cierre incorpora documentación y cuatro PNG de evidencia, sin cambios posteriores al código funcional. Los pendientes anteriores de H06, identidad visual, datos legales y Node permanecen fuera de alcance.

## Comprobación normal completada — 2026-11-14, America/Bogota

Se retomó la sesión autenticada existente de `https://mybestversion.life` mediante la interfaz real del navegador. No hubo login simulado, identidad inyectada, interceptores, borrado de almacenamiento ni cambios de permisos. La cuenta ya tenía rol **Superadmin**; esta comprobación no representa una nueva matriz Gratis/Premium ni de cambio entre cuentas. Se conservan esos permisos y los datos anteriores. El planificador continúa guardando localmente por cuenta en IndexedDB, no se afirma sincronización cloud.

Versión observada en Vercel: **`e600dbdd85393a2d27e973adf7db0e13e067ce35`**, deployment **`7a7CLyyWJMmkooxvyRnMKFbKYwFB`**, **Ready / Production**, dominio `mybestversion.life`. Diff contra `02708b2`: únicamente documentación y capturas; aplicación igual a la candidata funcional probada. No se reconstruyó ni sustituyó esa implementación. El 14/11 a las12:02-05:00, login200, token sintético E2E rechazado401 y endpoint beta404. Backend productivo conservado; ninguna configuración de mbv-h06-pruebas trasladada.

| Comprobación en el dominio | Resultado observado |
| --- | --- |
| Estado inicial del14/11 | Tres comidas principales vacías, snacks ausentes en Mi día. No se sobrescribió una comida anterior. |
| Semana escritorio → guardar | Desayuno, almuerzo y dos snacks sintéticos; cuatro entradas en la tarjeta después de recargar. Cena continúa vacía. |
| Mi día → editar desayuno | Avena con fruta → Avena con fruta y canela; cambio conservado tras recarga y reflejado en la semana. |
| Semana móvil → editar almuerzo | Arroz con verduras → Arroz, verduras y pollo; cambio conservado tras recarga y reflejado en Mi día. |
| Mi día móvil → recarga | Los mismos cuatro contenidos, una vez cada uno dentro de Mis comidas; Sin planificar y Añadir disponibles para cena. Abrir/cancelar edición funciona. |
| Cambiar día/semana | Domingo15 y semana16–22 no contienen las comidas del14; volver recupera las cuatro. |
| Presentación | Escritorio1448×1086: siete tarjetas. Móvil390×844 emulado: siete botones de día, una tarjeta visible. Ancho de documento1433≤1448 en escritorio,375≤390 en semana móvil y390≤390 en Mi día. Controles usados sin clic forzado; no se ocultaron barras ni se retocaron imágenes. |

Textos de prueba identificables con prefijo `PRUEBA MBV 14-11`. Cantidad por tarjeta: **0 antes +4 nuevas =4 después =4 después de editar/recargar**. Los IDs, consumo=false de registros nuevos, conservación de estado legacy, relaciones mensuales, guardado concurrente, fallo y reintento se comprueban en las pruebas de dominio/componente/E2E ya registradas; esta revisión normal acredita contenidos y cantidades visibles, no una nueva extracción de IDs de IndexedDB. La agenda anterior también representa las comidas como filas: esa segunda representación no implica duplicación de registros.

No se provocaron fallos de almacenamiento ni se demoró artificialmente producción. La prueba controlada de `MealPlanning.test.tsx` verifica un único envío durante guardado pendiente, ausencia de éxito prematuro, borrador conservado tras rechazo y reintento con la misma identidad. `mealPlanning.test.ts` verifica persistencia, otras fechas, original mensual, estado de consumo y snacks múltiples. Se reutilizan las ejecuciones correspondientes al código sin modificaciones, sin repetir suites para obtener otro verde. El timeout mensual histórico continúa abierto; la prueba dirigida aprobada no demuestra su causa.

Evidencia estructurada sin credenciales: [meals-production-normal-2026-11-14.json](meals-production-normal-2026-11-14.json). Capturas reales de página completa (las barras fijas permanecen donde las captura el navegador):

| Vista | Escritorio | Móvil emulado |
| --- | --- | --- |
| Semana | [Normal](screenshots/meals-production-week-desktop-2026-11-14.jpg) | [Normal](screenshots/meals-production-week-mobile-2026-11-14.jpg) |
| Mi día | [Normal](screenshots/meals-production-day-desktop-2026-11-14.jpg) | [Normal](screenshots/meals-production-day-mobile-2026-11-14.jpg) |

[Vista cercana de Mis comidas en móvil](screenshots/meals-production-day-mobile-viewport-2026-11-14.jpg), obtenida con desplazamiento normal de la página. No es una prueba en teléfono físico ni de teclado virtual. No hubo cambios de código, diseño, servicios, cuentas, pagos ni gastos adicionales en esta ampliación de evidencia; no se borraron las comidas sintéticas para evitar eliminar datos sin recuperación.
