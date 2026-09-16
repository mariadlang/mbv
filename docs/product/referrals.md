# Referral Loop

## V1 técnica implementada detrás de flag

La activación pública requiere revisión legal y aplicación/validación de la migración analytics P2.

Referral aparece únicamente después de valor verificable: una revisión semanal guardada, un hito completado o uso activo equivalente. No aparece en registro, primer ingreso, errores, pago fallido, cancelación, ánimo ni energía.

La V1 ofrece:

- `Compartir My Best Version`;
- enlace con código aleatorio opaco;
- copy breve sin datos de la usuaria;
- copiar enlace;
- Web Share con fallback;
- ignorar el bloque sin consecuencia ni recordatorio.

No existe recompensa económica, descuento, días Premium ni extensión de trial hasta una decisión comercial explícita.

## Identificador y URL

- Formato cliente: prefijo `ref_` y 32–64 caracteres hexadecimales minúsculos derivados de 16–32 bytes criptográficos. Servidor y analytics aplican el mismo contrato.
- No contiene UUID de cuenta, nombre, email, plan ni hash reversible de identidad.
- La URL sólo incluye el código opaco; no incluye progreso o contexto.
- El código debe generarse con `crypto.getRandomValues`, nunca `Math.random`.

## Atribución

El cliente conserva como first-touch sólo el código y la fecha de llegada durante un máximo de 29 días. Cuando existe una sesión autenticada y consentimiento analítico, encola `referral_visit_recorded`, elimina la atribución temporal y deja que signup y activación se deriven en servidor; el cliente no puede emitir esos hitos. Sin consentimiento no transmite atribución ni identidad.

El código de invitación propio se reutiliza por cuenta sólo en el navegador local. No contiene UUID, email ni otro dato de quien invita.

La métrica se reporta agregada: visitas, registros, activaciones y tasas con denominador. El dashboard no muestra códigos individuales.

## Futuro, no activo

La arquitectura puede asociar un tipo de beneficio aprobado a un referral confirmado, pero no debe prometerlo ni mostrar saldos. Cualquier incentivo requerirá antifraude, términos, soporte, caducidad, impuestos y conciliación.

## Aceptación

- Sólo post-valor y detrás de flag.
- Ignorable, sin popup repetitivo.
- Copiar y Web Share funcionan.
- Enlace no revela identidad.
- Atribución no depende de texto libre.
- El producto funciona igual si nunca se recomienda.
