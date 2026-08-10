# ADR 0001: Persistencia local-first

**Estado:** aceptada.

Usamos IndexedDB mediante Dexie porque el producto debe funcionar sin cuenta, proteger la intimidad y seguir disponible sin conexión. La contrapartida es que los datos no se sincronizan entre dispositivos; se mitiga con backup JSON y una interfaz de repositorio sustituible.
