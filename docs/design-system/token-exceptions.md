# Excepciones y baseline de design tokens

## Política

El código nuevo usa tokens semánticos y de componente. Los colores hexadecimales, `rgb()`/`rgba()` y `hsl()`/`hsla()` directos no deben aumentar.

La auditoría se ejecuta con:

```bash
node scripts/audit-design-tokens.mjs
```

El baseline versionado en `scripts/design-token-baseline.json` registra el máximo permitido para cada literal y archivo. Una reducción pasa automáticamente; un literal nuevo o un aumento falla e informa archivo, línea, valor, cantidad actual y cantidad permitida.

## Inventario inicial

Al cierre técnico de P1 del 2026-09-10 existen **291 ocurrencias directas en 15 archivos** dentro de `app/` y `src/`. El inventario incluye fuentes autoritativas de tokens, excepciones técnicas y deuda heredada. Este número no es un objetivo ni una licencia para reutilizar colores directos: congela la superficie revisada para permitir una migración progresiva y visualmente segura.

El detalle exacto por archivo y literal vive en el baseline. Sus categorías son:

| Categoría | Ubicación | Tratamiento |
| --- | --- | --- |
| Fuente de tokens | `src/styles/tokens.css`, `src/styles/tokens-dark.css` | Literales autorizados para definir valores de marca, semánticos y de tema. |
| Metadata del navegador | `app/layout.tsx` | `themeColor` requiere valores serializables; no puede resolver variables CSS. |
| Imagen Open Graph | `app/opengraph-image.tsx` | El renderer de imagen usa estilos inline y no comparte la cascada CSS del documento. |
| CSS heredado de features | `src/styles/features/**` y módulos globales | Deuda existente; debe disminuir al intervenir cada pantalla. |
| Sombras o visualizaciones específicas | Reglas registradas en el baseline | Migrar a token cuando el patrón sea reutilizable; mantener solo si es genuinamente único. |

## Cómo resolver un fallo

1. Buscar un token semántico o de componente que exprese la intención.
2. Si no existe y el valor será reutilizable, agregar un token de marca/semántico en `tokens.css` y consumirlo desde el componente.
3. Si CSS variables no son técnicamente utilizables, documentar la razón en esta página.
4. Solo después de revisión explícita, actualizar el baseline con:

```bash
node scripts/audit-design-tokens.mjs --update-baseline
```

El diff del JSON debe demostrar que el cambio es intencional. Nunca se actualiza el baseline únicamente para silenciar la auditoría.

## Alcance conocido

La auditoría inspecciona archivos `.css`, `.ts` y `.tsx` bajo `app/` y `src/`. Detecta colores hexadecimales y funciones RGB/HSL. No valida por sí sola contraste, nombres semánticos, imágenes rasterizadas ni valores recibidos en runtime; esas dimensiones requieren revisión de accesibilidad y pruebas visuales.
