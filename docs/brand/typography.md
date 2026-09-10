# Tipografía de My Best Version

## Familia oficial

My Best Version utiliza **Nunito Sans** en toda la experiencia: producto, navegación, formularios, onboarding, autenticación y superficies de marketing. La fuente se carga una sola vez en `app/layout.tsx` mediante `next/font/google` y se expone como `--font-nunito-sans`.

El CSS consume exclusivamente:

```css
font-family: var(--font-family-primary);
```

La pila completa es Nunito Sans, `"Segoe UI"`, Arial y `sans-serif`. No hay una segunda familia editorial o serif.

## Pesos aprobados

| Token | Peso | Uso principal |
| --- | ---: | --- |
| `--font-weight-regular` | 400 | Texto corrido y descripciones |
| `--font-weight-medium` | 500 | Navegación y controles discretos |
| `--font-weight-semibold` | 600 | Botones, etiquetas y subtítulos |
| `--font-weight-emphasis` | 650 | Titulares con énfasis moderado |
| `--font-weight-bold` | 700 | Titulares y métricas principales |
| `--font-weight-heavy` | 750 | Énfasis excepcional y cifras destacadas |

Nunito Sans se usa como fuente variable, por lo que estos pesos no requieren imports adicionales.

## Roles de tamaño

| Rol | Token de tamaño | Interlineado recomendado | Uso |
| --- | --- | --- | --- |
| Display | `--type-display-size` | `--line-height-tight` | Hero principal de marketing |
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

`Body`, H1–H4, Button, Navigation, Eyebrow, Caption y Label ya tienen consumidores directos en foundations o primitives. `Body Large`, `Body Small` y `Quote / Highlight` son roles opt-in para componentes que ya necesiten esa jerarquía; P1 no los aplica de forma masiva a bloques heredados porque eso cambiaría la composición visual sin una revisión por pantalla.

## Jerarquía y tono

- El título de página es claro y cercano; no compite con la acción primaria.
- El texto base mantiene 16 px y un interlineado cómodo. Los tamaños de caption se reservan para información secundaria, nunca para instrucciones críticas.
- Eyebrows y marca pueden usar tracking amplio; el cuerpo y los controles conservan espaciado normal.
- El énfasis se crea primero con tamaño, peso y espacio. El color es un apoyo y no la única señal.
- En móvil se permiten overrides de tamaño cuando evitan cortes o desbordes, sin cambiar de familia.

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

No se deben importar fuentes dentro de componentes, declarar una fuente alternativa para una pantalla ni introducir pesos fuera de la escala sin una decisión de diseño revisada. Los valores tipográficos directos que aún existen son deuda heredada y se migran pantalla por pantalla con validación visual.
