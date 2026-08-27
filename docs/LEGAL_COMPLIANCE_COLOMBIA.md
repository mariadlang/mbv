# My Best Version — matriz legal y de privacidad para Colombia

Fecha de auditoría técnica: 27 de agosto de 2026. Versión documental: `2026-08-27.co-1`.

Este archivo documenta la implementación técnica y las tareas administrativas pendientes. No sustituye la revisión de una abogada o un abogado colombiano.

## Inventario verificado

- Supabase: autenticación, perfiles, acceso, preferencias, consentimientos y solicitudes legales.
- Vercel: hosting del dominio oficial `mybestversion.life`.
- OpenAI Sites: publicación secundaria de la aplicación.
- Google: inicio de sesión opcional con nombre, correo y foto de perfil.
- Mercado Pago: enlace externo de checkout; la aplicación no recibe números completos de tarjeta.
- IndexedDB: metas, planificación, hábitos, tareas, journal, finanzas, fitness, alimentación, fotos y demás contenido detallado del planner.
- No se encontró proveedor externo activo de analítica publicitaria, marketing, correo transaccional o inteligencia artificial.
- No existe conexión con bancos ni importación automática de movimientos.

## Bases y controles implementados

- Términos, política de tratamiento, aviso de privacidad, cookies, pagos, retracto, supresión, IA, seguridad, proveedor y PQR públicos.
- Consentimientos separados y no preseleccionados para términos, tratamiento de datos, mayoría de edad y marketing opcional.
- Autorización separada para datos sensibles antes de Fitness y Alimentación.
- Evidencia versionada en `user_consents`; metadatos mínimos de cuenta y respaldo local si la migración remota aún no está aplicada.
- Solicitudes trazables en `privacy_requests`, número de referencia, estado y cálculo inicial de 10 o 15 días hábiles.
- Adjuntos privados validados con Zod: PDF, JPG, PNG o TXT, máximo 2 MB.
- Exportación local de datos y flujo reforzado de borrado del dispositivo.
- Gestor de cookies con categorías necesarias, funcionales, analítica y marketing. Las opcionales comienzan apagadas.
- Inventario visible de datos, almacenamiento, proveedores y transmisiones internacionales.
- El journal informa que sus entradas permanecen locales y no se usan para publicidad personalizada.
- Fitness incluye aviso de alcance y no sustituye atención médica o nutricional.

## Datos que debe proporcionar el responsable antes del lanzamiento comercial

Configurar en los entornos de Vercel y Sites, sin inventar valores:

- `NEXT_PUBLIC_LEGAL_RESPONSIBLE_NAME`
- `NEXT_PUBLIC_LEGAL_TAX_ID`
- `NEXT_PUBLIC_LEGAL_ADDRESS`
- `NEXT_PUBLIC_LEGAL_CITY_COUNTRY`
- `NEXT_PUBLIC_LEGAL_PRIVACY_EMAIL`
- `NEXT_PUBLIC_LEGAL_SUPPORT_EMAIL`
- `NEXT_PUBLIC_LEGAL_PQR_EMAIL`
- `NEXT_PUBLIC_LEGAL_SUPPORT_PHONE`

Mientras falten, los documentos muestran un aviso de preparación y no una identidad ficticia.

## Tareas administrativas y jurídicas pendientes

1. Revisión y aprobación de todos los textos por asesoría jurídica colombiana.
2. Determinar la persona natural o jurídica responsable, su NIT, domicilio y canales.
3. Aplicar la migración `supabase/migrations/202608270001_legal_privacy.sql` al proyecto de producción.
4. Confirmar región, DPA, subencargados, retención y salvaguardas internacionales de Supabase, Vercel, OpenAI Sites, Google y Mercado Pago.
5. Evaluar obligación de inscripción o actualización en el Registro Nacional de Bases de Datos (RNBD) según naturaleza jurídica, activos y tratamientos reales.
6. Documentar el procedimiento interno de atención, verificación de identidad, prórrogas, cierres y conservación de evidencias PQR.
7. Definir oferta Premium real: precio total, impuestos, periodicidad, renovación, cancelación, retracto y reversión antes de promocionarla como disponible.
8. Definir un procedimiento interno de incidentes, responsables, tiempos de escalamiento y notificación.
9. Verificar y configurar en Google Cloud la marca, dominio, página principal, términos, privacidad, correo de soporte y dominios autorizados.
10. Repetir la evaluación legal antes de activar analítica, marketing, correo, IA o cualquier proveedor nuevo.

## Observación sobre plazos

La función SQL calcula días hábiles excluyendo sábados y domingos. Los festivos colombianos deben integrarse a un calendario operativo o revisarse manualmente antes de comunicar la fecha final.
