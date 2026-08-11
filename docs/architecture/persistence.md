# Persistencia y backup

Dexie crea la base `my-best-version-planner` en IndexedDB. Los datos pertenecen al navegador y dispositivo actuales; borrar los datos del sitio también elimina el planner.

El repositorio realiza lecturas y reemplazos transaccionales. La exportación genera JSON versionado. La importación pasa por un esquema Zod completo antes de sustituir la base, por lo que un archivo incompleto o alterado no entra en persistencia.

No se usan cookies, analytics ni almacenamiento remoto. La pantalla Ajustes ofrece exportar, importar y borrar con confirmación explícita.
