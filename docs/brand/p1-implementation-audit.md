# Auditoría de implementación P1

Fecha de revisión: **2026-09-09 (America/Bogota, UTC-05:00)**.

## Estado previo y relación con P0

P1 comenzó sobre `8e6ede1995cef4656ef8b23cac3f04a98d4ebdf2`, con `main`, `origin/main` y el working tree alineados. Ese punto ya contenía el release técnico P0, su auditoría y su informe de QA. P1 conserva la jerarquía de mensajes, el sistema de CTA, la matriz Trial/Premium, la activación v2, la arquitectura local-first y las decisiones de privacidad de P0.

El objetivo de esta fase es consolidar el sistema existente. No se rediseñó la marca, no se cambió el modelo de datos, no se añadió sincronización y no se modificaron precios o condiciones comerciales.

## Contradicciones encontradas

| Área | Estado encontrado | Decisión P1 |
| --- | --- | --- |
| Tipografía | El runtime cargaba Nunito Sans, Inter y Playfair Display; ADR 0007 describía Cormorant Garamond y DM Sans. | Formalizar Nunito Sans como única familia vigente y marcar la decisión anterior como reemplazada en esa parte. |
| CSS | `app/globals.css` concentraba más de 3.600 líneas, varias generaciones de estilos y colores directos. | Separar por responsabilidad preservando el orden efectivo; introducir tokens en tres niveles y una auditoría incremental. |
| Navegación | Existían cinco destinos conceptuales, pero Bienestar y Finanzas podían leerse como destinos equivalentes en desktop; Mi espacio abría directamente Bandeja. | Mantener cinco destinos principales en todos los tamaños y presentar Bienestar/Finanzas como accesos secundarios de Mi espacio. |
| Mi espacio | La ruta base no explicaba el conjunto de módulos y el alias de calendario no convergía con la query canónica. | Añadir Resumen como puerta de entrada, conservar Bandeja y herramientas, y normalizar `calendar` hacia `events`. |
| i18n | Se mezclaban llamadas explícitas, frases españolas como claves y traducción del DOM mediante `MutationObserver`. | Añadir catálogos ES/EN con claves estables, formatters y límites explícitos; mantener un bridge acotado sólo para deuda legacy. |
| Idioma inglés | El selector estaba operativo, pero no existe una decisión comercial de cobertura completa. | Conservarlo para no retirar funcionalidad, marcarlo **Beta** y no presentar las superficies legacy como migradas. |
| Gamificación | Hábitos destacaba “Mejor racha”, trofeo/llama y algunos días no programados se dibujaban como 0 %. | Priorizar consistencia, usar “Mayor continuidad”, separar “No programado” de 0 % y mantener retos pausables sin borrar registros. |
| Documentación | README, ADR y documentos históricos mezclaban arquitectura y decisiones antiguas. | Crear índices vigentes y un mapa técnico actual, conservando el historial con estado explícito. |

## Decisiones aplicadas

- Nunito Sans es la única tipografía de producto y marca digital vigente en P1.
- Los tokens de marca, semánticos y de componente viven en `src/styles`; los aliases heredados se conservan sólo como compatibilidad documentada.
- `app/globals.css` es el punto de entrada ordenado de capas de estilos.
- Los colores directos heredados no se migran de forma masiva: un baseline revisable impide que aumenten.
- Button, IconButton, Tabs, SegmentedControl, FormField, feedback y estados de carga/error comparten contratos accesibles.
- Inicio, Mi día, Planificar, Mi espacio y Progreso son los cinco destinos principales. Bienestar y Finanzas continúan visibles como accesos de Mi espacio.
- Español es canónico. EN sigue visible como Beta hasta una decisión comercial explícita.
- La consistencia sobre días elegidos tiene prioridad sobre cualquier señal de continuidad.
- Lucide React continúa como sistema iconográfico; no se aprobaron fotografías, ilustraciones ni una nueva versión del logo.

## Cobertura del alcance

| Bloque | Resultado |
| --- | --- |
| P1.1 | Tipografía única documentada e implementada |
| P1.2 | CSS dividido por capas, tokens en tres niveles, dark mode y auditoría incremental |
| P1.3 | Primitives consolidadas con contratos accesibles y pruebas |
| P1.4 | Cinco destinos principales; Bienestar/Finanzas secundarios; Mi espacio como resumen |
| P1.5 | Catálogos estables, formatters, EN Beta y límites de contenido personal |
| P1.6 | Diccionario canónico de términos y microcopy |
| P1.7 | Continuidad amable, “No programado” separado y retos pausables |
| P1.8 | Dirección visual e inventario de assets sin inventar recursos |
| P1.9 | Arquitectura, ADR, índices y documentación operativa actualizados |
| P1.10 | Auditorías, pruebas, matrices, builds, publicación y smoke aprobados |

## Deuda heredada y alcance progresivo

- El baseline registra **291 coincidencias directas en 15 archivos**, distribuidas entre fuentes de tokens, excepciones técnicas y deuda heredada. La porción heredada debe reducirse únicamente con migraciones visualmente verificadas.
- El bridge i18n permanece activo con **803 entradas legacy permitidas**. El contenido de usuaria queda fuera del bridge y las superficies migradas no pueden depender de él.
- Algunas features conservan controles especializados porque abstraerlos no aportaría accesibilidad o reutilización suficiente.
- La estructura CSS preserva un orden deliberado de compatibilidad; reordenar imports requiere repetir la matriz visual.

## Archivos principales afectados

- Runtime y estilos: `app/layout.tsx`, `app/globals.css`, `src/styles/**`.
- Design System: `src/components/ui/Primitives.tsx`, `src/components/ui/Modal.tsx`, `src/components/ui/LanguageSwitcher.tsx`.
- Navegación: `src/components/layout/AppShell.tsx`, `src/components/layout/SectionNavigation.tsx`, `src/features/lifehub/LifeHubPage.tsx`.
- Producto: Dashboard, Mi día, Planificación, Hábitos, Progreso, Retos y superficies con formatters o límites de contenido personal.
- i18n: `src/i18n/**`, `scripts/audit-i18n.mjs`.
- Auditoría visual: `scripts/audit-design-tokens.mjs`, `scripts/design-token-baseline.json`, `scripts/check-contrast.mjs`.
- Documentación: `README.md`, `AGENTS.md`, `docs/architecture`, `docs/brand`, `docs/decisions`, `docs/design-system`, `docs/product`, `docs/qa` y `docs/proyecto`.

El inventario exacto de archivos, comandos, publicación y smoke se encuentra en `docs/qa/p1-release-report.md`.

## Decisiones pendientes externas

1. Master vectorial aprobado del logo y sus reglas de exportación.
2. Fotografía o ilustración aprobada para futuras campañas; P1 sólo documenta dirección.
3. Alcance comercial definitivo de EN; P1 lo identifica como Beta.
4. Precio, moneda, periodicidad, impuestos, renovación, cancelación y reembolsos de Premium.
5. Webhook, firma y conciliación automática de Mercado Pago.
6. Revisión jurídica definitiva y dominio personalizado `mybestversion.life` conectado al despliegue.

## Riesgos

- Una migración de tokens indiscriminada podría cambiar contraste o jerarquía; por eso se usa un baseline incremental.
- Una superficie marcada como i18n explícita con strings sin migrar quedaría parcialmente en español; la cobertura se comprueba por ruta y en EN.
- El contenido local puede perderse si se borra IndexedDB sin respaldo; P1 no cambia esa arquitectura.
- El build descarga Nunito Sans mediante `next/font/google` y requiere conectividad en un entorno sin caché.
- La reanudación de un reto cuyo periodo ya terminó lo devuelve a activos para consulta, pero no amplía ni sobrescribe automáticamente sus fechas.

## Estado de cierre

Los diez bloques P1 están implementados y validados. Auditorías, lint, tipos, 140 pruebas unitarias, 22 pares de contraste, matrices, builds y smoke de producción aprobaron; la evidencia completa está en `docs/qa/p1-release-report.md`. Las dependencias comerciales externas no bloquean el release técnico P1, pero sí impiden declarar listo un lanzamiento Premium autoservicio.
