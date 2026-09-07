# Seguridad y privacidad

- Contenido detallado del planner almacenado en IndexedDB en la versión actual.
- Identidad, acceso, preferencias, consentimientos, solicitudes, soporte y eventos minimizados gestionados mediante Supabase y rutas autenticadas.
- Importaciones validadas y sin evaluación de código.
- Formularios renderizados como texto; no se inyecta HTML de usuario.
- Sólo claves públicas de cliente previstas en el navegador; secretos de servidor no deben entrar al cliente ni al repositorio.
- Sin contenido sensible en logs o telemetría.
- Borrado total detrás de una confirmación explícita.

Las migraciones incluidas aplican RLS por propietario y privilegios de superadmin para las tablas remotas. Su aplicación efectiva y configuración en producción deben verificarse fuera del código. Una futura sincronización del planner requerirá consentimiento, resolución de conflictos, política de retención y una revisión de seguridad adicional.
