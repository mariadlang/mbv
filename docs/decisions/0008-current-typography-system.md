# ADR 0008: Tipografía única y capas del sistema visual

**Estado:** aceptada.

**Fecha:** 2026-09-09.

## Contexto

El producto acumuló tres familias declaradas —Nunito Sans, Inter y Playfair Display— y estilos globales en un único archivo de más de 3.600 líneas. La cascada funcionaba, pero la fuente visible variaba según la ruta y la decisión de ADR 0007 no coincidía con el código desplegado. También existían aliases históricos, variables sin declaración y cientos de colores directos que no era seguro migrar en un solo cambio.

## Decisión

1. **Nunito Sans es la única familia tipográfica de producto y marketing.** Se carga una sola vez con `next/font/google` en `app/layout.tsx`, como fuente variable, subconjunto latino y estrategia `swap`.
2. `--font-family-primary` es la única puerta de entrada desde CSS. La pila de respaldo es `"Segoe UI", Arial, sans-serif`; no se introduce una familia serif de apoyo.
3. Los tamaños, pesos, interlineados y espaciados de letra reutilizables se expresan como roles en `src/styles/tokens.css`. Se conservan las medidas visuales existentes al sustituir valores por tokens equivalentes.
4. El CSS global se compone desde `app/globals.css` mediante módulos ordenados. La secuencia explícita preserva la cascada histórica; por eso dos bloques heredados de producto permanecen antes de foundations y otros ajustes de feature se intercalan con primitives/layout. Reordenarlos por categoría cambiaría la precedencia visual. Los archivos de `features/` conservan los ajustes específicos y sus overrides responsivos; `utilities.css` cierra la cascada.
5. Los colores se organizan en tres niveles: valores de marca, tokens semánticos y tokens de componente. Los aliases históricos permanecen temporalmente por compatibilidad y no deben usarse en código nuevo.
6. La deuda de colores directos queda congelada por `scripts/design-token-baseline.json`. `scripts/audit-design-tokens.mjs` permite reducirla, pero falla cuando aparece un literal nuevo o aumenta el número revisado de ocurrencias.

## Reglas

- Los componentes nuevos usan roles tipográficos y tokens semánticos; no agregan `font-family`, colores hexadecimales, `rgb()` o `hsl()` directos.
- Los pesos oficiales son 400, 500, 600, 650, 700 y 750. Nunito Sans variable evita descargar archivos separados por peso.
- Los estados `hover`, `active`, `focus-visible`, `disabled`, `loading`, `success`, `warning` y `danger` deben conservar contraste y no depender solo del color.
- Una excepción de color solo se acepta cuando CSS variables no son utilizables o cuando forma parte de la migración heredada registrada. Debe documentarse y revisarse antes de actualizar el baseline.
- Cambiar el orden de los imports globales requiere validación visual porque puede modificar la especificidad efectiva aunque las reglas individuales no cambien.

## Consecuencias

- La identidad tipográfica es coherente entre producto, onboarding, autenticación, marketing y planificación.
- El bundle carga una sola familia optimizada por Next.js y mantiene fallback estable durante el intercambio de fuente.
- La modularización hace localizable cada tipo de regla sin autorizar refactors de pantallas ni cambios funcionales.
- Persisten colores y tamaños directos heredados. Se migrarán de forma incremental, con pruebas visuales por flujo, en lugar de realizar una sustitución masiva de alto riesgo.

## Referencias

- [Guía tipográfica](../brand/typography.md)
- [Excepciones y baseline de tokens](../design-system/token-exceptions.md)
- `src/styles/tokens.css`
- `app/globals.css`
