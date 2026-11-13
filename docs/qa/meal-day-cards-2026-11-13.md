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
- Chromium local no pudo iniciarse: socket() Operation not permitted del entorno. No se presenta como ejecución E2E aprobada. Se preparó recorrido Playwright escritorio/móvil con guardado, doble pulsación, reload, cambio de semana/día, mismos IDs y capturas; pendiente ejecutarlo en CI.

## Publicación

Base: `fdcc399e7487b0c5954c1ac33c9da6ea3c15b35b`. Rama `feat/meal-day-cards`. El push por terminal no dispone de credencial; se usa el conector GitHub existente. Destino autorizado: proyecto Vercel y dominio actuales, sin nuevas contrataciones ni cambios de backend.

Pendiente: CI de la revisión, despliegue, comprobar UI publicada con sesión normal y E2E desactivado, capturas de ambos tamaños. El navegador de comprobación ha mostrado la pantalla de inicio de sesión; no hay sesión normal disponible todavía. Esta ficha no declara terminado el pedido.
