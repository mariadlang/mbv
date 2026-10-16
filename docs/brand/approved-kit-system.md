# Identidad canónica — 13 de octubre de 2026

Logo definitivo aprobado por la usuaria: libreta abierta del brand kit. El monograma MBV y la hoja no son alternativas autorizadas de identidad. Playfair Display para títulos e Inter para cuerpo/UI. Las tareas de flujo o funcionalidad no autorizan modificaciones de la identidad global.

Esta decisión expresa sustituye las reglas históricas de Nunito y la excepción tipográfica por pantalla/ancho. No sustituye el recorrido R1–R7, las funciones ni sus recursos decorativos. La referencia in-house aporta calidez, no su monograma ni su dashboard anterior.

## Fuente y activos

- Lámina suministrada: `final My_Best_Version_Brand_Kit.pdf`, una página, copia disponible en Downloads. No se encontró otra copia con sufijo `(3)`; no se atribuye a una fuente distinta.
- `public/brand-icon.svg`: contenedor de PNG de 235×255, no vector maestro. `public/brand-icon.png` contiene el mismo raster; libreta con check, líneas y marcador sobre fondo rosa. Se conserva sin redibujar, estirar ni recortar con `object-fit: cover`.
- `src/components/ui/BrandMark.tsx`: completa (símbolo, MY BEST / VERSION, PLANEA · ACCIONA · LOGRA), compacta (símbolo y nombre), icono solo con nombre accesible. La disposición horizontal es adaptación técnica a cabeceras; no se afirma que sea un arte maestro exacto del conjunto vertical del PDF. El lettering es Inter en mayúsculas, no Playfair.
- Favicon vigente: `/brand-icon.svg`, sólo el símbolo. No se añadió PWA ni cambió caché.
- El lema comercial `BRAND_SLOGAN` no se modifica; el conjunto de logo usa `BRAND_LOGO_TAGLINE` independiente.
- Fotografías, papelería, botánicos, iconos funcionales Lucide, iniciales de avatar y logo Google se conservan. No se convierten las sustituciones fotográficas anteriores en originales aprobados.

## Tipografía y componentes

`app/layout.tsx` carga Inter y Playfair Display una vez con next/font/google, estilos normal e italic reales. Sin Nunito en la carga de UI ni cursiva sintética (`font-synthesis: none`). Google Fonts es la procedencia de estas familias, distribuidas bajo SIL Open Font License; no se entregan archivos de fuentes en el ZIP.

Tokens: `--font-family-primary` (Inter), `--font-family-heading` (Playfair), `--font-family-brand` (Inter). Pesos compartidos 400/500/600; se mantienen escalas y tamaños responsivos existentes. Encabezados legacy dejan de volver a la familia de cuerpo. Campos, navegación, controles, portales y canvas de compartir reutilizan la familia cargada de UI.

`primitives.css` y `primitives-enhancements.css` mantienen las familias de controles existentes. Botones editoriales usan los mismos tokens de texto, fondo, radio y hover, también en móvil y oscuro. Radios técnicos: control12px, campo8px, tarjeta18px, tamaños44px de interacción estándar; las composiciones editoriales conservan sus tarjetas y densidad. No son medidas extraídas del PDF.

## Paleta y límites de aprobación

| Primitiva | Valor | Uso técnico |
|---|---|---|
| rose | #E8A7AF | acentos/acción/selección |
| sand | #E6D3B8 | apoyo |
| ivory | #FFF6F2 | fondo claro |
| charcoal | #2F2F33 | texto |
| lavender | #B8B1C9 | apoyo |
| rose-soft | #FBEAEC, temporal conservado | superficies suaves, NO valor oficial del primer rosa |

El primer código del kit dice `#F6CCC`; es incompleto. No hay evidencia acreditada para completar el dígito. El antiguo `--landing-blush: #f6cccc` permanece como dato histórico de la landing, no como prueba de ese color. Único token del kit pendiente: primer rosa.

Éxito/aviso/error/foco conservan tokens semánticos distintos. Rosa profundo y taupe son derivados técnicos para contraste, no nuevos colores declarados oficiales. El tema oscuro existente se conserva como adaptación accesible no definida por el kit. El color del meta theme-color claro se alinea con ivory; requiere literal por API, documentado en baseline.

Limitación del raster: 235×255 nativos, fondo integrado y margen original asimétrico. No se amplió para fingir alta resolución; si se necesita impresión o tamaños grandes, hace falta producir/obtener un maestro fiel aprobado, no elegir otro logo.
