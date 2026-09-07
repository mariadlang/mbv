# Evolución opcional del planner a Supabase

Supabase ya se utiliza para cuenta, acceso, preferencias, legal, soporte y plataforma. Esta propuesta se refiere únicamente a una eventual sincronización remota del contenido detallado del planner, que actualmente permanece en IndexedDB.

Una sincronización futura debe implementar `PlannerRepository` sin cambiar features ni reglas de dominio. El orden recomendado es:

1. Reutilizar la cuenta autenticada y pedir consentimiento explícito para asociar el planner local con su identificador estable.
2. Crear tablas equivalentes con `user_id`, timestamps y políticas RLS.
3. Implementar `SupabasePlannerRepository` y resolver conflictos con `updatedAt`.
4. Mantener IndexedDB como caché y cola offline.
5. Migrar sólo con consentimiento, mostrando qué datos se subirán.

No debe introducirse una dependencia de Supabase en componentes de React.
