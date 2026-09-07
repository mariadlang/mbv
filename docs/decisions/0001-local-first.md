# ADR 0001: Persistencia local-first

**Estado:** aceptada para el contenido del planner; requisito de acceso sin cuenta sustituido el 23 de agosto de 2026.

Usamos IndexedDB mediante Dexie para proteger la intimidad del contenido personal y mantenerlo disponible en el dispositivo. La contrapartida es que el planner no se sincroniza entre dispositivos; se mitiga con backup JSON y una interfaz de repositorio sustituible.

El commit `438d32d` añadió una cuenta obligatoria con Supabase para identidad, trial, acceso y preferencias. Esa evolución no trasladó a Supabase metas, tareas, hábitos, journal, finanzas ni datos de bienestar. La decisión vigente es **cuenta remota + contenido detallado local-first**.
