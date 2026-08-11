# Evolución opcional a Supabase

Una sincronización futura debe implementar `PlannerRepository` sin cambiar features ni reglas de dominio. El orden recomendado es:

1. Añadir autenticación opcional y un identificador estable por usuario.
2. Crear tablas equivalentes con `user_id`, timestamps y políticas RLS.
3. Implementar `SupabasePlannerRepository` y resolver conflictos con `updatedAt`.
4. Mantener IndexedDB como caché y cola offline.
5. Migrar sólo con consentimiento, mostrando qué datos se subirán.

No debe introducirse una dependencia de Supabase en componentes de React.
