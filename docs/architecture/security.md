# Seguridad y privacidad

- Datos personales almacenados únicamente en IndexedDB en la versión actual.
- Importaciones validadas y sin evaluación de código.
- Formularios renderizados como texto; no se inyecta HTML de usuario.
- Sin secretos en cliente ni en el repositorio.
- Sin contenido sensible en logs o telemetría.
- Borrado total detrás de una confirmación explícita.

Para un backend futuro: TLS obligatorio, RLS por propietario, cifrado de secretos en servidor, límites de tamaño para backups y una política de retención clara.
