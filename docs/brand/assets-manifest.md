# Manifiesto de assets

**Fecha de verificación:** 2026-09-16. **Estado:** inventario técnico; no concede aprobación creativa nueva.

| ID | Nombre / ubicación | Tipo / tamaño | Licencia y fuente | Uso / canal | Fecha verificada | Owner | Estado / alt | Versión | Master / derivados |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `MBV-LOGO-001` | `public/brand-icon.svg` | SVG wrapper, 235 × 255; contiene PNG | Propiedad declarada MBV; master/procedencia pendientes | Símbolo activo en producto y metadata | 2026-09-16 | Fundadora · validación pendiente | `approved-temporary`; alt contextual: “My Best Version” | heredado sin identificar | Master vectorial pendiente; deriva del PNG incrustado |
| `MBV-LOGO-002` | `public/brand-icon.png` | PNG, 235 × 255 | Propiedad/procedencia pendientes | Duplicado técnico, sin referencia directa | 2026-09-16 | Fundadora · validación pendiente | `restricted`; no usar en piezas nuevas | heredado sin identificar | Posible master raster de `MBV-LOGO-001`; no confirmado |
| `MBV-ICON-001` | `public/favicon.png` | PNG, 128 × 128 | Sin documentar | Uso externo por confirmar | 2026-09-16 | Producto | `restricted`; decorativo cuando acompaña nombre | heredado | Master/derivados no identificados |
| `MBV-SOCIAL-001` | `public/og.png` | PNG, 1200 × 630 | Sin documentar | Sin referencia vigente | 2026-09-16 | Marca | `restricted`; alt pendiente | heredado | Master no identificado; sin derivados aprobados |
| `MBV-SOCIAL-002` | `public/og-v2.jpg` | JPEG, 1730 × 909 | Sin documentar | Sin referencia vigente | 2026-09-16 | Marca | `restricted`; alt pendiente | heredado | Master no identificado; sin derivados aprobados |
| `MBV-SOCIAL-GEN-001` | `app/opengraph-image.tsx` | Fuente generativa, 1200 × 630 | Código propio versionado | Open Graph vigente | 2026-09-16 | Ingeniería + Marca | `approved`; texto equivalente en metadata | v1 | Código es master; PNG servido es derivado runtime |
| `MBV-PRODUCT-QA-001` | `docs/qa/screenshots/p0-dashboard-1440x900.png` | PNG, 1440 × 900 | Captura real del candidato P0, generada e inspeccionada por QA | Hero desktop y showcase de la nueva landing | 2026-09-16 | Ingeniería + Producto | `approved`; alt localizado describe Dashboard real | P0 QA | La captura QA es el master usado por `LandingProductVisuals.tsx` |
| `MBV-PRODUCT-QA-002` | `docs/qa/screenshots/p0-today-390x844.png` | PNG, 390 × 844 | Captura real del candidato P0, generada e inspeccionada por QA | Hero móvil y showcase de la nueva landing | 2026-09-16 | Ingeniería + Producto | `approved`; alt localizado describe Mi día real | P0 QA | La captura QA es el master usado por `LandingProductVisuals.tsx` |
| `MBV-PRODUCT-QA-003` | `docs/qa/screenshots/p0-habits-1440x900.png` | PNG, 1440 × 900 | Captura real del candidato P0, generada e inspeccionada por QA | Showcase de la nueva landing | 2026-09-16 | Ingeniería + Producto | `approved`; alt localizado describe Hábitos real | P0 QA | La captura QA es el master usado por `LandingProductVisuals.tsx` |

`brand-icon.svg` y `brand-icon.png` contienen el mismo raster según la auditoría P0. Se conservan todos los archivos porque la ausencia de una referencia interna no descarta usos externos.

Las tres capturas `MBV-PRODUCT-QA-*` son evidencia real del producto, no mockups recreados para marketing. `LandingProductVisuals.tsx` las importa desde `docs/qa/screenshots/`; Dashboard y Mi día componen el hero, y Dashboard/Mi día/Hábitos forman el showcase publicado en `7abddae651f34ff4e086a5b6a278c7032c73466d`. Sustituirlas exige nueva inspección visual, revisión de datos visibles y actualización de este manifiesto.

## Dependencias externas

Faltan el vector maestro aprobado, las variantes oficiales, área de seguridad, tamaños mínimos, fondos permitidos y fuentes de export. No se debe redibujar, vectorizar, renombrar ni borrar ningún asset hasta recibirlos y revisar los usos externos. La referencia técnica detallada está en [logo-assets-status.md](logo-assets-status.md).

## Reglas de alta

Un asset nuevo no pasa a `approved` hasta registrar licencia, autor/fuente, release cuando corresponda, usos y canales, fecha de aprobación, alt text, owner, master y derivados. `restricted` significa conservar sin reutilizar. Los futuros exports se organizan por `logo`, `social`, `product`, `patterns` e `illustrations`; fotografía pesada aprobada permanece fuera del bundle hasta que una ruta la necesite.

## Estado de la biblioteca P2

La biblioteca fotográfica y los templates editables están **PENDIENTES DE DEFINICIÓN**: no existen todavía masters con derechos y aprobación suficientes para poblar `public/brand/social`, `product`, `patterns` o `illustrations`. No se crean placeholders que puedan confundirse con assets oficiales. La guía de producción, el esquema de alta y las ubicaciones destino sí quedan preparados; la primera incorporación requerirá licencia verificable, owner y aprobación de la fundadora.
