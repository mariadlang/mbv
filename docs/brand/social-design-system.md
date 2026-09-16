# Social Design System

**Versión:** MBV Brand System 1.1 · extensión social P2. **Estado:** especificación reproducible; no contiene campañas finales ni archivos editables aprobados.

## Reconocimiento MBV

Una pieza se reconoce por espacio generoso, jerarquía simple, Nunito Sans, fondo marfil/blanco, rosa usado como señal y no como relleno dominante, acentos arena/lavanda/salvia, bordes suaves y lenguaje concreto. El logo es una firma discreta; no compensa una composición genérica.

## Formatos

| Canal | Lienzo | Zona segura | Nota |
| --- | --- | --- | --- |
| Instagram post/carrusel | 1080 × 1350 | 72 px lateral, 90 px vertical | Una idea por slide; CTA al final |
| Story/Reel cover | 1080 × 1920 | 90 px lateral; evitar 250 px arriba y 310 px abajo | Titular en tercio central; UI de plataforma libre |
| TikTok | 1080 × 1920 | 96 px izquierda, 180 px derecha, 220 px arriba, 320 px abajo | Subtítulos alejados de controles |
| YouTube thumbnail | 1280 × 720 | 64 px | Máximo 5–7 palabras grandes |
| Shorts cover | 1080 × 1920 | igual a Story | Comprobar crop de feed central |

## Recetas reproducibles por formato

| Pieza | Orden de composición | Evidencia / media | Cierre |
| --- | --- | --- | --- |
| Instagram educativo | eyebrow de pilar → hook → 2–4 pasos | diagrama simple o UI ficticia | una acción pequeña; no vender por defecto |
| Instagram testimonial | contexto autorizado → cita breve → alcance del resultado | retrato con licencia y consentimiento trazable | disclaimer si el resultado no es generalizable |
| Instagram quote | una frase canónica → fuente | textura o espacio real, nunca cita inventada | firma discreta, sin CTA obligatorio |
| Instagram product demo | tensión → captura anonimizada → gesto clave | una sola superficie del producto | resultado observable → CTA del sistema |
| Carrusel | portada con una promesa → una idea por slide → síntesis | numeración persistente 01/N | CTA únicamente en la última lámina |
| Reel cover | hook de 3–6 palabras en tercio central | frame humano o UI con contraste | firma fuera del área de controles |
| TikTok talking head | hook 0–2 s → escena → reframe | rostro en tercio izquierdo; subtítulos centrales | acción concreta o continuación de serie |
| TikTok storytelling | escena → tensión → descubrimiento → aprendizaje | B-roll real con derechos | aprendizaje, no moraleja culpabilizante |
| TikTok product demo | problema → toque/cursor → cambio visible | datos totalmente ficticios | “Pruébalo en tu espacio” sólo cuando aplique |
| YouTube tutorial | resultado esperado → capítulos → ejecución → recap | grabación 16:9, cursor visible, zoom funcional | siguiente acción y recursos |
| YouTube storytelling | cold open → contexto → conflicto → decisión | A-roll + B-roll con continuidad | aprendizaje y pregunta honesta |
| YouTube demo | antes operativo → flujo MBV → después operativo | cuenta demo aislada | límites y CTA explícitos |
| YouTube educativo | pregunta → modelo mental → ejemplo → aplicación | gráfico simple + subtítulos | resumen de 3 puntos |

En TikTok, la firma se coloca arriba a la izquierda dentro de `x=96–360 px`, `y=220–300 px`; nunca bajo iconos laterales ni navegación inferior. En YouTube, el logo queda en una esquina con 64 px de margen y no compite con rostro o titular.

## Escala y componentes

- Márgenes: múltiplos de 24/32 px; separación amplia antes que adornos.
- Titular: 64–92 px en vertical, 54–72 px en feed; peso 700–750.
- Cuerpo/subtítulos: mínimo 34 px vertical y 28 px feed.
- Firma: `My Best Version` o activo aprobado, 24–32 px, esquina inferior con área de seguridad.
- CTA: una frase; no simular botones del producto si no son interactivos.
- Capturas de producto: ocultar nombres, email, notas, eventos, montos y cualquier contenido real.

## Seis templates base

1. **Educación:** promesa breve → 3 pasos → acción pequeña.
2. **Identificación:** escena cotidiana → tensión → reframe sin culpa.
3. **Storytelling:** escena → descubrimiento → aprendizaje.
4. **Producto:** problema → UI anonimizada → resultado → CTA.
5. **Progreso amable:** dato agregado o frase → contexto → reconocimiento.
6. **Conversión:** problema → mecanismo MBV → evidencia verificable → trial/CTA.

Cada template se define como componentes editables: fondo, eyebrow, titular, cuerpo, media, CTA y firma. No rasterizar texto maestro. Los archivos Canva/Figma siguen **PENDIENTES DE DEFINICIÓN** hasta elegir herramienta, owner y librería con derechos; esta especificación es el contrato para producirlos sin improvisar.

## TikTok y video

- Hook legible en los primeros 2 segundos, sin promesa absoluta.
- Subtítulos quemados o disponibles como captions; máximo dos líneas.
- Talking head usa encuadre humano y entorno real, no estética clínica.
- Demo muestra una sola tarea y cursor/touch visible, con datos ficticios.
- Series comparten nombre y número, no un layout completamente nuevo.

## Do / Don't

**Sí:** progreso específico, vida multidimensional, manos/espacios reales, silencios visuales, CTA honesto. **No:** before/after corporal, culpa, productividad extrema, relojes urgentes, falso testimonio, cifra sin fuente, gradientes ajenos o saturar con el logo.

## Entrega a Canva/Figma

Crear páginas por canal y template, nombrar `MBV / canal / template / v1`, bloquear fondo y firma, exponer tokens como estilos, incluir safe-zone overlay no exportable y un frame de ejemplo ficticio. Toda exportación registra owner, licencia de media, fecha y versión en el manifiesto.
