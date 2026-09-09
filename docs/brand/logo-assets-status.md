# Estado de activos de logo

Fecha de auditoría: **2026-09-08**.

## Conclusión

**PENDIENTE DE DEFINICIÓN — Se necesita el archivo vectorial maestro aprobado.**

El archivo `public/brand-icon.svg` no es un vector real. Es un contenedor SVG con una única imagen PNG embebida, sin elementos `<path>`. Para conservar el diseño aprobado, el producto continúa usando temporalmente ese archivo y no intenta trazarlo o rediseñarlo.

## Inventario verificado

| Archivo | Dimensiones | Tamaño | Formato real | Referencia activa |
| --- | ---: | ---: | --- | --- |
| `public/brand-icon.svg` | viewBox 235 × 255 | 46.143 B | SVG con 1 `<image>` PNG y 0 `<path>` | Sí: fuente temporal principal |
| `public/brand-icon.png` | 235 × 255 | 34.509 B | PNG | No directa; es idéntico al payload embebido en el SVG |
| `public/favicon.png` | 128 × 128 | 1.965 B | PNG | No existe referencia explícita vigente |
| `public/og.png` | 1200 × 630 | 480.799 B | PNG | No existe referencia vigente |
| `public/og-v2.jpg` | 1730 × 909 | 86.080 B | JPEG | No existe referencia vigente |
| `app/opengraph-image.tsx` | 1200 × 630 | Generado en runtime/build | PNG dinámico | Sí: pieza Open Graph vigente |

El SHA-256 de `public/brand-icon.png` y del payload PNG contenido en `public/brand-icon.svg` coincide:

`CA1F6564B2B67B9C07409641F305372A7A42E5196B3550EDDA5AF28A3416EEDC`

## Asset utilizado actualmente

`/brand-icon.svg` es la única fuente temporal del símbolo en las superficies activas auditadas. Se consume mediante:

- `src/components/ui/BrandMark.tsx`;
- landing;
- onboarding;
- sidebar y menú móvil;
- estados de carga, error, recuperación y acceso;
- plataforma privada;
- icono y shortcut de metadata en `app/layout.tsx`.

La pieza social no incrusta un símbolo alternativo: `app/opengraph-image.tsx` utiliza nombre, tipografía y paleta, sin crear un monograma.

## Duplicados y archivos heredados

- `brand-icon.svg` y `brand-icon.png` contienen el mismo raster. Es una duplicación técnica confirmada, pero no se elimina hasta recibir el master y verificar dependencias externas.
- `favicon.png`, `og.png` y `og-v2.jpg` no tienen referencias activas dentro del código versionado auditado.
- La ausencia de una referencia interna no demuestra que un archivo no sea usado por configuración externa, bookmarks o material publicado. Por ello se conservan.

## Estructura objetivo cuando exista el master

El paquete aprobado debería distinguir, sin inventar variantes:

- logo principal;
- icon-only;
- favicon;
- Open Graph;
- exports raster derivados del master.

Los nombres, formatos, proporciones y variantes finales deben definirse al recibir el archivo fuente y su guía de uso.

## Entregables pendientes

1. Archivo vectorial maestro aprobado.
2. Confirmación del logo principal y de la versión icon-only.
3. Export oficial para favicon en tamaños requeridos.
4. Confirmación de fondos permitidos y versiones de contraste.
5. Fuente de generación para exports raster.
6. Inventario de usos externos antes de retirar archivos heredados.

## Qué no debe modificarse sin aprobación

- Forma, proporciones, trazos o colores del símbolo.
- Área de seguridad o tamaño mínimo.
- Versiones monocromáticas, invertidas o simplificadas.
- Monogramas `MBV` u otros símbolos alternativos.
- Eliminación de raster heredados.
