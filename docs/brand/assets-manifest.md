# Manifiesto de assets

**Fecha de verificación:** 2026-09-09. **Estado:** inventario técnico; no concede aprobación creativa nueva.

| Nombre / ubicación | Formato y tamaño | Uso verificado | Estado / versión | Propietario | Master | Export derivado | Aprobación | Obsoleto |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `public/brand-icon.svg` | SVG wrapper, viewBox 235 × 255; contiene un PNG | Símbolo activo en `BrandMark` y metadata | Temporal, versión sin identificar | My Best Version | No disponible | Sí: contenedor del raster PNG | Uso vigente; reemplazo pendiente de master | No mientras siga siendo el activo |
| `public/brand-icon.png` | PNG, 235 × 255 | Payload idéntico al embebido en el SVG; sin referencia directa | Duplicado técnico conservado | My Best Version | No disponible | Procedencia desconocida | No retirar todavía | Pendiente de confirmar |
| `public/favicon.png` | PNG, 128 × 128 | Sin referencia explícita en código | Heredado | Sin documentar | No disponible | Procedencia desconocida | Pendiente de confirmar | Pendiente de confirmar |
| `public/og.png` | PNG, 1200 × 630 | Sin referencia vigente | Heredado | Sin documentar | No disponible | Procedencia desconocida | Pendiente de confirmar | Pendiente de confirmar |
| `public/og-v2.jpg` | JPEG, 1730 × 909 | Sin referencia vigente | Heredado | Sin documentar | No disponible | Procedencia desconocida | Pendiente de confirmar | Pendiente de confirmar |
| `app/opengraph-image.tsx` | PNG dinámico, 1200 × 630 | Open Graph vigente | Código fuente versionado | Equipo de producto | Sí, código | No: es la fuente generativa | Vigente | No |

`brand-icon.svg` y `brand-icon.png` contienen el mismo raster según la auditoría P0. Se conservan todos los archivos porque la ausencia de una referencia interna no descarta usos externos.

## Dependencias externas

Faltan el vector maestro aprobado, las variantes oficiales, área de seguridad, tamaños mínimos, fondos permitidos y fuentes de export. No se debe redibujar, vectorizar, renombrar ni borrar ningún asset hasta recibirlos y revisar los usos externos. La referencia técnica detallada está en [logo-assets-status.md](logo-assets-status.md).
