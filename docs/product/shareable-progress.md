# Progreso compartible

## Contrato de privacidad

Compartir es opt-in en tres pasos: abrir → revisar/editar → exportar o iniciar Web Share. Nunca se publica automáticamente.

Permitido por defecto:

- conteos agregados de acciones elegidas/completadas;
- consistencia con denominador de días programados;
- avance promedio de metas sin título, motivo ni hito;
- titular opcional escrito, editado o eliminado por la propia usuaria;
- mensajes editoriales MBV sin datos personales.

Prohibido: journal, ánimo, energía, salud, alimentación, peso, medidas, finanzas, cuentas, montos, deudas, eventos privados, nombres de terceros, email, identidad, IDs o URLs internas.

## Arquitectura

`src/features/sharing/` encapsula templates, composición Canvas, preview, descarga y Web Share/fallback dentro del estudio; `src/domain/shareCards.ts` construye el modelo permitido y sanitizado. La exportación es declarativa y no depende de capturar el DOM. Se carga sólo al abrir la experiencia.

Templates implementados:

- `weekly`: acciones completadas, registros y días intencionales de los últimos siete días;
- `habits`: registros, consistencia sobre ocurrencias programadas y días intencionales del mismo periodo;
- `progress`: acciones recientes, días intencionales y avance promedio agregado de metas.

Formatos:

| Formato | Tamaño |
| --- | --- |
| Story | 1080 × 1920 |
| Feed | 1080 × 1350 |
| Cuadrado | 1080 × 1080 |

## Controles requeridos

- elegir formato y template;
- preview antes de generar archivo;
- activar/desactivar cada dato;
- editar o eliminar titular;
- descargar PNG;
- usar Web Share cuando soporte archivos y fallback seguro cuando no;
- mensaje de error recuperable.

## Analytics

Registra sólo tipo de acción, template, formato, surface y channel con consentimiento. Nunca titular, nombre de hábito, cifras, metas ni contenido de la tarjeta. Descarga y fallback se clasifican como exportaciones para que el share rate no dependa de Web Share.

## Marca y accesibilidad

Nunito Sans, paleta/tokens vigentes, símbolo oficial vigente y marca discreta, con composición de contraste equivalente a AA para texto esencial. El preview tiene descripción y resumen textual accesible; la imagen descargada no sustituye ese resumen en UI.
