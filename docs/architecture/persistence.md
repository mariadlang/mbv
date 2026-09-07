# Persistencia y backup

Dexie crea la base `my-best-version-planner` en IndexedDB. Los datos pertenecen al navegador y dispositivo actuales; borrar los datos del sitio también elimina el planner.

El repositorio realiza lecturas y reemplazos transaccionales. La exportación genera JSON versionado. La importación pasa por un esquema Zod completo antes de sustituir la base, por lo que un archivo incompleto o alterado no entra en persistencia.

La pantalla Ajustes ofrece exportar, importar y borrar el planner con confirmación explícita. La cuenta, el acceso, preferencias, consentimientos, solicitudes legales, soporte y eventos minimizados sí pueden usar Supabase; las preferencias de cookies se gestionan por separado. Estos flujos remotos no sincronizan metas, journal, finanzas, salud ni demás contenido detallado de IndexedDB.

La aplicación no incorpora analítica publicitaria en el estado revisado. La taxonomía permitida de eventos propios excluye contenido personal y se documenta en `docs/PRODUCT_SUPPORT_PLATFORM.md`.
