# ADR 0008: Tipografía por superficie y capas del sistema visual

**Estado:** aceptada.

**Fecha:** 2026-09-09. **Enmienda vigente:** 2026-09-16.

## Contexto

El producto acumuló tres familias declaradas —Nunito Sans, Inter y Playfair Display— y estilos globales en un único archivo de más de 3.600 líneas. La cascada funcionaba, pero la fuente visible variaba según la ruta y la decisión de ADR 0007 no coincidía con el código desplegado. También existían aliases históricos, variables sin declaración y cientos de colores directos que no era seguro migrar en un solo cambio.

P1 resolvió esa inconsistencia usando sólo Nunito Sans. El 2026-09-16 la nueva landing introdujo una dirección editorial explícita, revisable y acotada a `/`: Playfair Display + Inter. La excepción no cambia la tipografía del tracker ni autoriza combinaciones distintas por feature.

## Decisión

1. **Nunito Sans es la familia del tracker y de las superficies compartidas.** `--font-family-primary` sigue siendo su única puerta de entrada desde CSS, con `"Segoe UI"`, Arial y `sans-serif` como fallback.
2. **La landing editorial es una excepción acotada.** Bajo `.landing-page`, Inter se usa para navegación, cuerpo y controles; Playfair Display para titulares y acentos editoriales. Sus fallbacks son `"Segoe UI"`, Arial y `sans-serif` para Inter, y Georgia/serif para Playfair.
3. Las tres familias se cargan una sola vez con `next/font/google` en `app/layout.tsx`, como fuentes variables, subconjunto latino y estrategia `swap`. Inter/Playfair no redefinen `--font-family-primary` ni se heredan en el tracker.
4. Los tamaños, pesos, interlineados y espaciados de letra reutilizables del tracker se expresan como roles en `src/styles/tokens.css`. La landing conserva su escala editorial en `src/styles/features/landing.css` hasta que exista una decisión de sistema más amplia.
5. El CSS global se compone desde `app/globals.css` mediante módulos ordenados. La secuencia explícita preserva la cascada histórica; por eso dos bloques heredados de producto permanecen antes de foundations y otros ajustes de feature se intercalan con primitives/layout. Reordenarlos por categoría cambiaría la precedencia visual. Los archivos de `features/` conservan los ajustes específicos y sus overrides responsivos; `utilities.css` cierra la cascada.
6. Los colores se organizan en tres niveles: valores de marca, tokens semánticos y tokens de componente. Los aliases históricos permanecen temporalmente por compatibilidad y no deben usarse en código nuevo.
7. La deuda de colores directos queda congelada por `scripts/design-token-baseline.json`. `scripts/audit-design-tokens.mjs` permite reducirla, pero falla cuando aparece un literal nuevo o aumenta el número revisado de ocurrencias.

## Reglas

- Los componentes nuevos del tracker usan roles tipográficos y tokens semánticos; no agregan `font-family`, colores hexadecimales, `rgb()` o `hsl()` directos.
- Una regla Playfair/Inter nueva sólo es válida dentro de `.landing-page` y debe pasar QA responsive; no se crean excepciones tipográficas por pantalla fuera de esa capa.
- Los pesos oficiales del tracker son 400, 500, 600, 650, 700 y 750. Las tres familias variables evitan descargar archivos separados por peso.
- Los estados `hover`, `active`, `focus-visible`, `disabled`, `loading`, `success`, `warning` y `danger` deben conservar contraste y no depender solo del color.
- Una excepción de color solo se acepta cuando CSS variables no son utilizables o cuando forma parte de la migración heredada registrada. Debe documentarse y revisarse antes de actualizar el baseline.
- Cambiar el orden de los imports globales requiere validación visual porque puede modificar la especificidad efectiva aunque las reglas individuales no cambien.

## Consecuencias

- El tracker, onboarding, autenticación y planificación conservan una identidad consistente en Nunito Sans; la landing tiene una voz editorial reconocible sin contaminar esas superficies.
- El bundle carga tres familias optimizadas por Next.js. Este coste se acepta sólo para la landing actual y debe reevaluarse si su alcance cambia.
- La modularización hace localizable cada tipo de regla sin autorizar refactors de pantallas ni cambios funcionales.
- Persisten colores y tamaños directos heredados. Se migrarán de forma incremental, con pruebas visuales por flujo, en lugar de realizar una sustitución masiva de alto riesgo.

## Referencias

- [Guía tipográfica](../brand/typography.md)
- [Excepciones y baseline de tokens](../design-system/token-exceptions.md)
- `src/styles/tokens.css`
- `app/globals.css`
