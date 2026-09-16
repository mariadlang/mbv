# Motion y microinteracciones

**Estado:** especificación P2 sobre los tokens vigentes. No añade una librería de animación.

## Principios

Motion confirma, orienta y conecta causa con efecto. Nunca retrasa una acción, oculta información, comunica un estado sólo por movimiento ni convierte cada cambio en celebración.

| Token vigente | Duración | Uso |
| --- | --- | --- |
| `--transition-fast` | 140 ms ease | hover, press, check, cambio de icono o color |
| `--transition-base` | 220 ms ease | drawer, modal, tabs y feedback de guardado |
| transición amplia | hasta 320–350 ms | entrada de recap o preview cuando aporta continuidad espacial |

No se permiten loops decorativos, parallax o transiciones superiores a 350 ms sin una razón funcional documentada.

## Patrones

| Evento | Propiedades | Resultado esperado |
| --- | --- | --- |
| Completar tarea/hábito | color + opacidad + microescala máxima 1.02 | confirma sin confetti |
| Guardado | fade breve del feedback | la confirmación permanece legible aunque no anime |
| Drawer/modal | opacidad de overlay + translate corto | foco entra al diálogo al abrir y vuelve al trigger al cerrar |
| Tabs | color/fondo; contenido con fade opcional | teclado no espera la animación |
| Onboarding/primera acción | progreso y cambio de panel | no bloquea retroceso ni envío |
| Weekly Recap | revelado por secciones, una sola vez | el resumen completo existe en DOM desde el inicio |
| Share preview | fade/scale del canvas al regenerar | no parpadea ni anuncia cada frame |

## Reduced motion

El fallback global de `prefers-reduced-motion: reduce` reduce animaciones y transiciones a duración mínima y desactiva scroll suave. Las features no deben sobreescribirlo con mayor especificidad. En reduced motion:

- no hay movimiento perceptible: las duraciones se reducen al mínimo global;
- cualquier translate, scale o progreso salta visualmente al estado final;
- loading conserva texto o estado semántico;
- ningún significado desaparece.

## Accesibilidad y performance

- Animar sólo `opacity` y `transform` cuando sea posible.
- No animar altura de listas extensas, filtros gráficos o canvas continuo.
- Conservar foco visible y no mover el objetivo mientras se pulsa.
- `aria-live` anuncia el resultado, no cada paso visual.
- Cargar código de exportación sólo al abrir sharing.

## QA

Probar keyboard, touch, zoom 200 %, reduced motion y dispositivos lentos. Un patrón se acepta sólo si la acción sigue siendo inmediata y comprensible con todas las animaciones desactivadas.
