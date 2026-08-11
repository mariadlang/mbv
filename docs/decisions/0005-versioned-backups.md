# ADR 0005: Backups versionados y validados

**Estado:** aceptada.

Las exportaciones incluyen versión, fecha y payload. Zod valida toda importación antes del reemplazo transaccional, creando una base segura para migraciones de formato.
