# Changelog — MBV Brand System

El número vigente es **1.1**. P2 añade canales y patrones compatibles sin cambiar promesa, identidad central ni requerir una versión mayor.

| Fecha | Decisión | Responsable | Reemplaza | Impacto | Archivos |
| --- | --- | --- | --- | --- | --- |
| 2026-09-16 | Brand System 1.1: se documentan motion, social, fotografía, campañas y portal operativo P2 | Producto, Diseño e Ingeniería | MBV Brand System 1.0; no reemplaza identidad | Añade canales y patrones reproducibles con guardrails; assets finales siguen sujetos a aprobación | `docs/design-system/motion.md`, `docs/brand/social-design-system.md`, `photo-production-guide.md`, `campaigns-and-partnerships.md`, `index.md` |
| 2026-09-09 | Nunito Sans queda como única familia digital vigente | Producto e Ingeniería | Parte tipográfica de ADR 0007 | Unifica producto y documentación | `typography.md`, `p1-implementation-audit.md` |
| 2026-09-09 | Se formalizan CTA, diccionario y jerarquía de mensajes | Producto e Ingeniería | Copy heredado inconsistente | Fuente canónica para producto/marketing | `cta-system.md`, `product-language-dictionary.md`, `messaging-hierarchy.md` |

## Regla de versionado

- Patch documental: aclaración sin cambiar reglas.
- Minor: nuevo canal o patrón compatible.
- Major: cambia promesa, identidad central, tipografía principal o sistema de color.

Toda entrada futura registra owner, aprobación, impacto, archivos y migración de piezas existentes. No se incrementa versión por añadir una campaña aislada.
