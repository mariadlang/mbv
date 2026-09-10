# Diccionario oficial de lenguaje de producto

**Estado:** vigente desde P1. Español es el idioma canónico; inglés se conserva habilitado y visible como Beta mientras se confirma su alcance comercial.

## Principios

- Hablar de progreso posible, no de rendimiento personal.
- Preferir acciones concretas y frases breves.
- Nombrar límites, descansos y cambios de ritmo sin culpa.
- No presentar métricas, hábitos o logros como medida del valor de una persona.
- El contenido creado por la usuaria no se traduce ni se usa como clave.
- Copy legal, clínico o comercial requiere revisión específica; este diccionario no lo sustituye.

## Términos canónicos

| Español | Inglés | Uso |
| --- | --- | --- |
| Inicio | Home | Destino principal agregado. |
| Mi día | My day | Destino principal para ejecutar y registrar el día. “Hoy” puede usarse como adverbio o fecha, no como nombre alterno del destino. |
| Planificar | Plan | Destino principal. “Planificación” nombra la capacidad; evitar “planeación”. |
| Mi espacio | My space | Puerta de entrada a sistemas y contenido personal. |
| Progreso | Progress | Destino principal. No usarlo como juicio sobre la persona. |
| acción | action | Paso visible y ejecutable. |
| tarea | task | Unidad operativa, con o sin vínculo a una meta. |
| meta | goal | Resultado con dirección y seguimiento. |
| hábito | habit | Práctica repetible; no equivale a una obligación diaria. |
| rutina | routine | Secuencia o estructura reutilizable. |
| consistencia | consistency | Métrica principal de hábitos; excluye días no programados. |
| continuidad | continuity | Señal secundaria descriptiva. Evitar “racha” como promesa dominante. |
| revisión semanal | weekly review | Revisión consciente de la semana. No mostrar “Weekly Reset” en español. |
| Vida soñada | Dream Life | Traducir según idioma; no mezclar “Dream Life” en la interfaz española. |
| Bienestar | Wellbeing | Área personal; “salud” sólo cuando el contexto legal o clínico lo exige. |
| Finanzas | Finances | Organización personal, sin implicar asesoría financiera ni conexión bancaria. |
| Bandeja | Inbox | Captura sin organizar. |
| Más herramientas | More tools | Utilidades secundarias dentro de Mi espacio. |
| Aún no registrado | Not yet logged | Estado sin dato. Mantener la misma capitalización según contexto. |
| Retomar | Resume | Reanudar sin comunicar fallo. |
| progreso amable | gentle progress | Principio rector; no convertirlo en eslogan repetido en cada pantalla. |
| Prueba gratis | Free trial | Nombre de la modalidad. “Prueba de 15 días” puede describir la duración. |
| Premium | Premium | Nivel de acceso. No inventar plan, precio, renovación ni disponibilidad. |

## Patrones de microcopy

| Evitar | Preferir |
| --- | --- |
| “Perdiste tu racha.” | “Tu ritmo cambió. Puedes retomarlo desde hoy.” |
| “Fallaste hoy.” | “Hoy no registraste esta acción.” |
| “Debes completar…” | “Puedes continuar con…” |
| “Vas atrasada.” | “Hay acciones pendientes que puedes reorganizar.” |
| “Mejor racha” como logro principal | “Consistencia” o una descripción neutral de continuidad. |

## Reglas de implementación

Las nuevas superficies usan claves estables de `src/i18n/messages`. No se añaden frases al catálogo heredado `src/i18n/translations.ts`. Fechas, números, moneda y plurales se forman con `src/i18n/formatters.ts`; no se concatenan fragmentos traducidos cuando el orden gramatical puede cambiar.
