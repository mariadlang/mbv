# Brand Portal — My Best Version

**Sistema vigente:** MBV Brand System 1.1. **Fuente de verdad:** repositorio versionado. Los entregables marcados `PENDIENTE DE DEFINICIÓN` no se consideran assets aprobados.

## Respuestas rápidas

| Necesito saber… | Fuente operativa |
| --- | --- |
| qué color usar | `src/styles/tokens.css`: usar tokens semánticos; rosa para énfasis, marfil para fondo, carbón para texto. [Dirección visual](visual-direction.md) |
| qué tipografía usar | [Tipografía](typography.md): Nunito Sans en producto y comunicación digital |
| cómo escribir | [Voz y microcopy](voice-and-microcopy-p0.md) + [diccionario](product-language-dictionary.md) |
| cómo diseñar un CTA | [CTA system](cta-system.md) + [primitives](../design-system/primitives.md) |
| qué promesa utilizar | [Messaging hierarchy](messaging-hierarchy.md) |
| cómo hablar de Premium | [Trial / Premium](../product/trial-premium-matrix.md) |
| qué icono usar | [Iconografía](visual-direction.md#iconografía): Lucide, trazo consistente, sin emoji funcional |
| qué fotografía elegir | [Dirección visual](visual-direction.md#fotografía) + [guía de producción](photo-production-guide.md) |
| cómo crear un Reel | [Social Design System](social-design-system.md#recetas-reproducibles-por-formato) |
| qué no parece MBV | [Do / Don't esencial](#do--dont-esencial) |

### Paleta canónica rápida

| Rol | Token | Valor de referencia |
| --- | --- | --- |
| fondo | `--color-background` / `--brand-ivory` | `#f7f4ef` |
| superficie | `--color-surface` / `--brand-white` | `#ffffff` |
| acción principal | `--color-brand` / `--brand-rose` | `#e8a7af` |
| énfasis/focus | `--color-brand-strong` / `--brand-rose-deep` | `#a95568` |
| texto | `--color-text-primary` / `--brand-charcoal` | `#292724` |
| texto secundario | `--color-text-secondary` / `--brand-taupe` | `#6f6964` |
| apoyo | `--color-accent-sand`, `--color-accent-lavender`, `--color-success` | arena, lavanda, salvia canónicas |

Los valores directos son referencia, no autorización para hardcodearlos. Componentes y piezas deben consumir el token semántico correspondiente y comprobar contraste.

## Empieza aquí

- Fundamentos y jerarquía: [Messaging hierarchy](messaging-hierarchy.md)
- Voz: [Voice & microcopy](voice-and-microcopy-p0.md)
- Términos canónicos: [Product language dictionary](product-language-dictionary.md)
- CTA: [CTA system](cta-system.md)

## Identidad visual

- [Dirección visual](visual-direction.md)
- [Tipografía](typography.md)
- [Logo y estado de assets](logo-assets-status.md)
- [Manifiesto de assets](assets-manifest.md)
- [Tokens y excepciones](../design-system/token-exceptions.md)
- [Primitives](../design-system/primitives.md)
- [Motion](../design-system/motion.md)

## Crecimiento y comunicación

- [Social Design System](social-design-system.md)
- [Content System](../marketing/content-system.md)
- [Guía fotográfica](photo-production-guide.md)
- [Campañas y partnerships](campaigns-and-partnerships.md)
- [Shareable Progress](../product/shareable-progress.md)
- [Trial / Premium](../product/trial-premium-matrix.md)

## Producto, privacidad y medición

- [Growth loops](../product/product-growth-loops.md)
- [Lifecycle](../product/lifecycle.md)
- [Taxonomía de eventos](../analytics/event-taxonomy.md)
- [Experimentación](../analytics/experimentation-framework.md)
- [Seguridad](../architecture/security.md)

## Do / Don't esencial

**Do:** progreso específico, una acción posible, jerarquía clara, tokens vigentes, Lucide, datos ficticios, privacidad por defecto. **Don't:** culpa, promesas absolutas, logo improvisado, colores nuevos, fotografías sin derechos, contenido personal en demos, paywalls fuera de contexto o marketing basado en bienestar.

## Checklist antes de publicar o mergear

Jerarquía y CTA canónicos; tokens sin hex nuevos; Nunito Sans; icono Lucide; contraste y focus; reduced motion; copy sin culpa; datos ficticios; asset/licencia/alt registrados; sin PII en URL ni analytics; responsive; revisión light/dark; owner y versión anotados.

## Cambios y evidencia

- [Changelog de marca](CHANGELOG.md)
- [Auditoría P0](p0-implementation-audit.md)
- [Auditoría P1](p1-implementation-audit.md)
- [Auditoría P2](../product/p2-implementation-audit.md)
- [Release QA P2](../qa/p2-release-report.md)

Si un documento histórico contradice este portal o el runtime, detener el cambio, registrar la contradicción y resolverla antes de producir nuevos assets.
