# Sistema repetible de contenido

## Pilares

| Pilar | Tensión real | Trabajo del contenido | Producto demostrable |
| --- | --- | --- | --- |
| Claridad | No sé por dónde empezar | reducir opciones y elegir una acción | Mi día, prioridad, modo mínimo |
| Progreso amable | Si no cumplo, siento que fallé | separar ajuste de fracaso | reprogramar, consistencia sobre días elegidos |
| Vida multidimensional | Quiero cuidar demasiadas áreas | hacer visible el equilibrio sin exigir simultaneidad | Metas, Mi espacio, planificación |
| Del plan a la acción | Planifico pero no sé qué hacer hoy | conectar horizonte con siguiente acción | meta → mes → semana → día |
| Producto en contexto | No entiendo cómo ayuda una app | mostrar una decisión real, no una lista de features | demos breves con datos ficticios |
| Reflexión y aprendizaje | Avanzo pero no lo reconozco | convertir evidencia en una nueva decisión | Weekly Recap y Progreso |

## Estructuras editoriales

- Educativo: hook → tensión → insight → sistema → acción.
- Identificación: situación → pensamiento → verdad incómoda → reframe.
- Storytelling: escena → tensión → descubrimiento → cambio → aprendizaje.
- Producto: problema → MBV → demostración → resultado → CTA.
- Conversión: problema → deseo → mecanismo → evidencia → trial → CTA.
- Retención: momento real → pequeña decisión → herramienta → resultado.

## Content database

| Campo | Tipo / valores |
| --- | --- |
| `id` | `CNT-YYYY-NNN`, estable |
| `pillar` | uno de los seis pilares |
| `format` | post, carrusel, reel, story, TikTok, Short, video, email futuro |
| `funnel` | awareness, consideration, activation, retention, conversion |
| `hook` | copy de trabajo; no contiene datos de usuarias |
| `message` | una sola idea principal |
| `cta` | acción concreta y verificable |
| `product_surface` | ruta/flujo que se muestra o `none` |
| `asset_id` | referencia al manifiesto, nunca archivo suelto |
| `status` | idea, draft, review, approved, scheduled, published, retired |
| `publish_at` | fecha/zona horaria |
| `result` | métrica primaria + denominador |
| `learning` | decisión para la siguiente iteración |
| `owner` | responsable |

Puede vivir inicialmente en una tabla documental versionada; no se justifica un CMS hasta que volumen, permisos o calendario lo requieran.

### Registro inicial reutilizable

Duplicar esta fila por pieza; sustituir cada valor entre corchetes y conservar el ID estable:

| id | pillar | format | funnel | hook | message | cta | product_surface | asset_id | status | publish_at | result | learning | owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `CNT-YYYY-NNN` | `[pilar]` | `[formato]` | `[etapa]` | `[una tensión concreta]` | `[una sola idea]` | `[acción verificable o none]` | `[ruta o none]` | `[MBV-ASSET-ID o pending]` | `idea` | `[ISO + zona o pending]` | `[métrica / denominador]` | `[se completa al cerrar]` | `[responsable]` |

Ejemplo ficticio, no programado para publicar:

| id | pillar | format | funnel | hook | message | cta | product_surface | asset_id | status | publish_at | result | learning | owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `CNT-2026-001` | Del plan a la acción | carrusel | activation | “Planificar no siempre aclara qué hacer hoy.” | Conectar una meta con una sola acción reduce decisiones abiertas. | “Elige una acción para hoy” | `/app/today` | `pending` | `idea` | `pending` | `signup_started / sesiones observables con consentimiento` | `pending` | `Producto + Contenido` |

No reemplazar `pending` con un asset, claim o fecha inventados. El registro pasa a `approved` únicamente después de revisión de marca, privacidad, accesibilidad y derechos.

## Cadencia y mezcla

Planificar por objetivo, no por llenar días. En una ventana de seis piezas debe haber al menos una demostración real de producto y no más de dos piezas de conversión directa. Identificación y educación no terminan siempre en venta.

## Medición

Asignar una sola métrica primaria: retención del video, guardados, sesiones observables con consentimiento, inicio de signup, activación o retorno. El tráfico anónimo completo requiere una fuente externa aprobada; no se infiere desde analytics de producto. Reportar alcance sólo como contexto. No usar testimonios, citas o contenido de una usuaria sin autorización explícita y trazable.

## Checklist

Mensaje compatible con jerarquía de marca; CTA del sistema; datos ficticios; asset con licencia; contraste; subtítulos/alt; review de claims; URL etiquetada sin PII; resultado y aprendizaje registrados.
