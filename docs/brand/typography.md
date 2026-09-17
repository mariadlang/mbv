# Tipografía de My Best Version

## Familias vigentes por superficie

My Best Version mantiene **Nunito Sans** como familia del tracker autenticado, navegación de producto, formularios, onboarding, autenticación y superficies públicas legacy. La nueva landing editorial usa una combinación deliberadamente acotada: **Playfair Display** para titulares y acentos editoriales, e **Inter** para navegación, cuerpo, botones, tablas y controles.

Las tres familias se cargan en `app/layout.tsx` mediante `next/font/google` y se exponen como `--font-nunito-sans`, `--font-playfair` y `--font-inter`. La separación se realiza por alcance CSS:

```css
/* Tracker y superficies compartidas */
font-family: var(--font-family-primary);

/* Landing editorial */
.landing-page { font-family: var(--font-inter), "Segoe UI", Arial, sans-serif; }
.landing-page :where(h1, h2) { font-family: var(--font-playfair), Georgia, serif; }
```

Playfair e Inter no redefinen los tokens globales del tracker y no deben filtrarse fuera de `.landing-page`. Nunito Sans conserva la pila `"Segoe UI"`, Arial y `sans-serif`; Playfair usa Georgia como fallback editorial e Inter usa `"Segoe UI"`, Arial y `sans-serif`.

## Pesos aprobados

| Token | Peso | Uso principal |
| --- | ---: | --- |
| `--font-weight-regular` | 400 | Texto corrido y descripciones |
| `--font-weight-medium` | 500 | Navegación y controles discretos |
| `--font-weight-semibold` | 600 | Botones, etiquetas y subtítulos |
| `--font-weight-emphasis` | 650 | Titulares con énfasis moderado |
| `--font-weight-bold` | 700 | Titulares y métricas principales |
| `--font-weight-heavy` | 750 | Énfasis excepcional y cifras destacadas |

Nunito Sans, Inter y Playfair Display se cargan como fuentes variables, por lo que sus pesos usados no requieren imports adicionales. La escala de tokens anterior continúa siendo la autoridad del tracker. En la landing, Inter usa principalmente 400–800 y Playfair 500–600 según los estilos acotados de `landing.css`; esos valores no crean nuevos pesos globales.

## Roles de tamaño

| Rol | Token de tamaño | Interlineado recomendado | Uso |
| --- | --- | --- | --- |
| Display | `--type-display-size` | `--line-height-tight` | Displays del tracker o marketing legacy; la landing tiene escala editorial propia y acotada |
| Display compacto | `--type-display-compact-size` | `--line-height-display-compact` | Planificación semanal |
| H1 | `--type-h1-size` | `--line-height-heading` | Título principal de página |
| H2 | `--type-h2-size` | `--line-height-title` | Secciones de primer nivel |
| H3 | `--type-h3-size` | `--line-height-subheading` | Tarjetas y módulos |
| H4 | `--type-h4-size` | `--line-height-subheading` | Subsecciones y títulos internos |
| Body large | `--type-body-large-size` | `--line-height-body` | Entradillas |
| Body | `--type-body-size` | `--line-height-body` | Texto base; mínimo 16 px |
| Body small | `--type-body-small-size` | `--line-height-body` | Contenido secundario |
| Caption | `--type-caption-size` | `--line-height-label` | Metadatos y ayudas breves |
| Label | `--type-label-size` | `--line-height-label` | Etiquetas de campos, chips y tabs |
| Button | `--type-button-size` | `--line-height-label` | Acciones |
| Navigation | `--type-navigation-size` | `--line-height-label` | Destinos principales |
| Eyebrow | `--type-eyebrow-size` | `--line-height-label` | Etiqueta contextual en mayúsculas |
| Quote / Highlight | `--type-quote-size` / `--type-highlight-size` | `--line-height-relaxed` | Citas o énfasis editorial puntual |

Los roles responsivos especializados (`--type-plan-display-size`, `--type-auth-display-size` y `--type-highlight-size`) mantienen escalas ya aprobadas en flujos concretos.

`Body`, H1–H4, Button, Navigation, Eyebrow, Caption y Label ya tienen consumidores directos en foundations o primitives. `Body Large`, `Body Small` y `Quote / Highlight` son roles opt-in para componentes que ya necesiten esa jerarquía. La landing conserva sus roles dentro de `src/styles/features/landing.css`; no deben promoverse a tokens globales sin revisar el tracker completo.

## Jerarquía y tono

- El título de página es claro y cercano; no compite con la acción primaria.
- El texto base mantiene 16 px y un interlineado cómodo. Los tamaños de caption se reservan para información secundaria, nunca para instrucciones críticas.
- Eyebrows y marca pueden usar tracking amplio; el cuerpo y los controles conservan espaciado normal.
- El énfasis se crea primero con tamaño, peso y espacio. El color es un apoyo y no la única señal.
- En móvil se permiten overrides de tamaño cuando evitan cortes o desbordes, sin cambiar de familia.
- La landing puede usar Playfair para jerarquía editorial e Inter para legibilidad operativa; el tracker no adopta esas familias por herencia accidental.

## Uso correcto

```css
.feature-title {
  font-family: var(--font-family-primary);
  font-size: var(--type-h2-size);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-heading);
  letter-spacing: var(--letter-spacing-title);
}
```

No se deben importar fuentes dentro de componentes ni introducir una familia para una pantalla aislada. La excepción editorial aprobada se define una sola vez en `app/layout.tsx` y se consume únicamente bajo `.landing-page`. Cualquier ampliación de Playfair/Inter al tracker, o de Nunito a la landing, requiere una decisión de diseño y QA responsive. Los valores tipográficos directos heredados se migran pantalla por pantalla con validación visual.
