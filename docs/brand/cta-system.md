# Sistema de CTA

## Objetivo

Cada CTA debe describir el siguiente paso real. La taxonomía vive en `src/lib/cta.ts`; el copy narrativo puede hablar de “crear un espacio”, pero esa frase no sustituye las acciones de registro, onboarding o acceso.

## Taxonomía principal

| Etapa | CTA | Destino o resultado | Evento analítico |
| --- | --- | --- | --- |
| Adquisición | **Comienza tu prueba gratis** | `/signup` | `landing_primary_cta_clicked` |
| Formulario | **Crear mi cuenta** | Envía el registro | `signup_started`; `signup_completed` después del registro email exitoso |
| Verificación | **Ir a verificar mi correo** | Abre el cliente de correo mediante `mailto:` | `email_verified` al volver con una cuenta verificada |
| Primer acceso | **Crear mi primera acción** | Inicia el onboarding | `onboarding_started` |
| Usuaria autenticada | **Ir a mi espacio** | `/app/dashboard` | Sin evento de clic específico |
| Login | **Iniciar sesión** | `/login` o envío del formulario | `login_succeeded` después de autenticación exitosa |
| Paywall | **Desbloquear Premium** | `/upgrade` | `premium_gate_viewed` en el gate y `upgrade_opened` al abrir la página |
| Checkout externo | **Continuar en Mercado Pago** | URL externa de checkout | `checkout_started` |
| Recuperación | **Volver a mi espacio** | `/login` | Sin evento específico |

## Uso por superficie

### Landing y trial

- Landing y trial usan “Comienza tu prueba gratis” para una visitante sin sesión.
- La landing usa “Ir a mi espacio” cuando ya existe una sesión.
- `source` diferencia `landing_header`, `landing_hero`, `landing_footer` y `trial`.
- “Ver qué incluye” es una acción secundaria informativa hacia `/trial`.

### Signup y verificación

- El formulario usa “Crear mi cuenta”; no “Crear mi espacio”.
- `signup_started` ocurre después de validar campos y consentimientos, antes de solicitar el alta.
- El registro por correo exitoso emite `signup_completed`.
- Google y enlace mágico conservan una intención analítica consentida y minimizada. Al volver con una sesión autenticada, emiten una sola vez `signup_completed` o `login_succeeded` según la acción que inició el flujo.
- La pantalla de verificación separa “Ir a verificar mi correo” de “Ya verifiqué mi correo: Iniciar sesión”.

### Onboarding

- “Crear mi primera acción” inicia el recorrido.
- El resultado final del onboarding puede decir “Ver mi primera acción”; es un CTA contextual distinto, no un CTA de adquisición.

### Premium

- El gate usa “Desbloquear Premium” y dirige a `/upgrade`.
- La página de upgrade usa “Continuar en Mercado Pago” únicamente para abandonar la app hacia el checkout.
- No usar “Continuar”, “Comprar” o “Activar Premium” si la acción real sólo abre Mercado Pago.

## Reglas de tracking

1. La analítica opcional debe estar consentida antes de crear la cola.
2. Nunca incluir correo, nombre, títulos de metas o tareas, nombres de hábitos, journal, salud, finanzas ni tokens.
3. Sólo se admiten `source`, `route`, `view`, `section`, `period`, `result` y `version`.
4. Los eventos de hitos usan dedupe keys estables; las interacciones repetibles pueden usar una clave única.
5. El servidor decide la funcionalidad canónica y rechaza eventos fuera de la allowlist cliente.
6. `/api/events` requiere autenticación. Un evento público sólo se envía al servidor si la persona consiente y posteriormente autentica en el mismo navegador.

## Variantes que no deben volver como CTA principal

- Crear mi espacio.
- Comenzar prueba gratis.
- Comenzar mi prueba.
- Comenzar mi prueba gratis.
- Crear cuenta.
- Ver Premium.
