# Historial verificable de My Best Version

Reconstrucción realizada el **2026-09-04 (America/Bogota, UTC-05:00)**. El orden es cronológico y agrupa commits relacionados para explicar cambios de producto sin duplicar las líneas paralelas de publicación.

## Índice de etapas

1. [Fundación local-first](#2026-08-10--fundación-local-first)
2. [Producto editorial y módulos básicos](#2026-08-10--experiencia-editorial-y-módulos-básicos)
3. [Finanzas, revisiones y esquema 2](#2026-08-10--finanzas-revisiones-y-esquema-local-2)
4. [Planificación en cascada y Mi espacio](#2026-08-10--planificación-en-cascada-mi-espacio-y-esquema-local-3)
5. [Publicación, marca y consolidación inicial](#2026-08-10-a-2026-08-15--publicación-marca-y-consolidación-inicial)
6. [Runtime, persistencia y CI](#2026-08-16--endurecimiento-del-runtime-la-persistencia-y-ci)
7. [Activación y sistema de planificación](#2026-08-18-a-2026-08-19--activación-y-ampliación-del-sistema-de-planificación)
8. [Retos y activos sociales](#2026-08-20--retos-amables-y-activos-sociales)
9. [Tipografía, planificación y Fitness en Mi espacio](#2026-08-23--tipografía-planificación-y-fitness-en-mi-espacio)
10. [Cuenta, trial y Premium](#2026-08-23--cuenta-trial-premium-y-administración)
11. [Experiencia bilingüe y doce meses](#2026-08-24--experiencia-bilingüe-tutorial-y-doce-meses)
12. [Legal público y Fitness Hub](#2026-08-26--experiencia-legal-pública-consentimientos-y-fitness-hub)
13. [Privacidad, soporte y plataforma](#2026-08-27--privacidad-soporte-analítica-minimizada-y-plataforma-privada)
14. [Estabilización de producción](#2026-08-28--estabilización-de-rutas-y-cliente-de-autenticación)
15. [Nueva arquitectura de información y Hoy](#2026-08-29-a-2026-08-30--arquitectura-de-información-y-evolución-de-hoy)
16. [Fitness flexible y navegación](#2026-08-31--fitness-flexible-y-navegación)
17. [Flujos conectados](#2026-09-01--simplificación-de-planificación-proyectos-y-mi-espacio)
18. [Planificación orientada a resultados](#2026-09-02--planificación-orientada-a-resultados-y-navegación-visible)
19. [Onboarding de primera acción y Hábitos](#2026-09-03--onboarding-de-primera-acción-planificación-y-hábitos)
20. [Trabajo local actual](#2026-09-04--auditoría-correcciones-locales-y-continuidad-documental)
21. [Plan semanal opción B](#2026-09-07--plan-semanal-opción-b-conectado-al-planner)
22. [Ajustes P0 de prelanzamiento](#2026-09-08--ajustes-p0-de-prelanzamiento)
23. [Consolidación P1](#2026-09-09-a-2026-09-10--consolidación-p1-de-experiencia-y-sistema)
24. [Google Calendar: implementación y pausa](#2026-09-11--integración-bidireccional-google-calendar)
25. [P2: retención y crecimiento amable](#2026-09-16--implementación-p2-de-retención-y-crecimiento-amable)
26. [Publicación controlada de Calendar y P2](#2026-09-16--publicación-controlada-de-la-pausa-calendar-y-p2-detrás-de-flags)

## Nota sobre el grafo

El repositorio no es superficial. El punto base de P1, `8e6ede1`, alcanza 65 commits y contiene dos raíces: `18fe17f` y `1002103`. Varias mejoras históricas aparecen en pares o variantes para la línea principal y ramas de Sites; se fusionaron mediante `5a52b46`, `82bb24e` y `c357130`. No hay etiquetas Git. La entrega P1 se documenta como un hito nuevo y no reescribe la historia anterior.

---

### 2026-08-10 — Fundación local-first

- **Identificador estable:** `MBV-H-001`.
- **Tipo de cambio:** creación inicial de producto y arquitectura.
- **Área afectada:** aplicación completa.
- **Resumen:** se creó una primera aplicación funcional para convertir visión, metas, hábitos, tareas y reflexión en un planner personal.
- **Situación anterior:** no existe un registro Git anterior accesible en esta raíz; no puede afirmarse que sea el inicio absoluto fuera de Git.
- **Qué se hizo:** se añadieron rutas de aplicación, Dashboard, Hoy, planificación, metas, hábitos, progreso, journal, ajustes, onboarding, dominio, servicio, repositorio Dexie, validación Zod, backup y pruebas.
- **Impacto:** la persona podía configurar un espacio local, planificar y registrar avances sin una cuenta remota.
- **Motivo o decisión documentada:** los ADR `0001`–`0007` fijaron privacidad local-first, capas sustituibles, progreso configurable, constancia sin castigo, backups versionados, rutas cliente y sistema visual sereno.
- **Archivos principales:** `app/PlannerApp.tsx`, `src/domain/planner.ts`, `src/services/plannerService.ts`, `src/repositories/local/IndexedDbPlannerRepository.ts`, `docs/decisions/`.
- **Evidencia:** commit `18fe17f` (63 archivos, 11.036 inserciones).
- **Estado de implementación:** incorporado en `main`; evolucionó en hitos posteriores.
- **Validación histórica:** se versionaron `tests/backup-schema.test.ts`, `tests/domain-rules.test.ts` y `e2e/app.spec.ts`; su ejecución en esa fecha no está registrada.
- **Pendientes o limitaciones:** sin cuenta ni sincronización; limitación coherente con la decisión inicial.

### 2026-08-10 — Experiencia editorial y módulos básicos

- **Identificador estable:** `MBV-H-002`.
- **Tipo de cambio:** ampliación funcional y visual.
- **Área afectada:** navegación, Dashboard, onboarding, visión, tareas, ánimo y ayuda.
- **Resumen:** el planner adoptó una presentación editorial y añadió destinos específicos para Visión, Tareas, Mood y Ayuda.
- **Qué se hizo:** nuevas páginas `VisionPage`, `TasksPage`, `MoodPage` y `HelpPage`; reorganización visual de Dashboard y onboarding; temas de interfaz y formularios asociados.
- **Impacto:** las áreas antes concentradas en pocas pantallas quedaron accesibles como flujos separados y más guiados.
- **Motivo o decisión documentada:** alineación con la referencia editorial y el sistema visual documentado; el detalle del motivo no quedó registrado.
- **Archivos principales:** `app/globals.css`, `src/components/layout/AppShell.tsx`, `src/features/vision/`, `tasks/`, `mood/`, `help/`.
- **Evidencia:** commit `5bc1acd`.
- **Estado de implementación:** incorporado; Mood fue posteriormente integrado en Hábitos/Hoy y su ruta redirige.
- **Validación histórica:** `e2e/app.spec.ts` se amplió; ejecución histórica no registrada.
- **Pendientes o limitaciones:** motivo detallado no documentado.

### 2026-08-10 — Finanzas, revisiones y esquema local 2

- **Identificador estable:** `MBV-H-003`.
- **Tipo de cambio:** nueva funcionalidad y migración de datos.
- **Área afectada:** Finanzas, planificación, proyectos, journal y persistencia.
- **Resumen:** se incorporaron presupuesto, cuentas, movimientos, ahorro, deudas y revisiones, junto con más relaciones entre proyectos, tareas y periodos.
- **Qué se hizo:** `FinancePage`, reglas financieras, nuevas entidades del planner, tablas Dexie y backup ampliado al esquema 2.
- **Impacto:** la persona podía observar ingresos, gastos, fondos y deudas dentro del mismo espacio y conservarlos en respaldos.
- **Motivo o decisión documentada:** motivo no documentado.
- **Archivos principales:** `src/features/finance/FinancePage.tsx`, `src/domain/financeRules.ts`, `src/domain/planner.ts`, `IndexedDbPlannerRepository.ts`.
- **Evidencia:** commit `172a05c`.
- **Estado de implementación:** incorporado y vigente con evoluciones posteriores.
- **Validación histórica:** se añadió `tests/finance-rules.test.ts` y se actualizaron backup/E2E; ejecución histórica no registrada.
- **Pendientes o limitaciones:** los datos financieros permanecen locales; no existe conexión bancaria automática.

### 2026-08-10 — Planificación en cascada, Mi espacio y esquema local 3

- **Identificador estable:** `MBV-H-004`.
- **Tipo de cambio:** ampliación del modelo y de la organización personal.
- **Área afectada:** planificación de largo plazo, listas, rutinas, eventos, vision board, fitness y retos.
- **Resumen:** se añadió la estructura que conecta horizontes de planificación y módulos opcionales de vida personal.
- **Qué se hizo:** `LifeHubPage`, reglas de cascada, proyectos/checklists, planes, brain dump, rutinas, eventos, vision board, entrenamiento, nutrición, medidas, retos y compras pendientes; Dexie y backup pasaron al esquema 3.
- **Impacto:** el producto dejó de ser sólo una lista de tareas y pasó a reunir planificación temporal y áreas personales en una misma instantánea local.
- **Motivo o decisión documentada:** motivo no documentado.
- **Archivos principales:** `src/domain/cascadeRules.ts`, `src/features/lifehub/LifeHubPage.tsx`, `src/domain/planner.ts`, `src/lib/schemas.ts`.
- **Evidencia:** commit `bc9c0d5`.
- **Estado de implementación:** incorporado; varias secciones fueron reorganizadas después.
- **Validación histórica:** se añadieron pruebas de reglas de cascada y se actualizó E2E; ejecución histórica no registrada.
- **Pendientes o limitaciones:** interfaz todavía evolucionó de forma sustancial durante agosto.

### 2026-08-10 a 2026-08-15 — Publicación, marca y consolidación inicial

- **Identificador estable:** `MBV-H-005`.
- **Tipo de cambio:** publicación, sistema visual y fusión de historias.
- **Área afectada:** repositorio, metadatos, marca y experiencia completa.
- **Resumen:** una segunda raíz mínima (`1002103`) recibió una copia completa del producto y documentación de despliegue; en paralelo se desarrollaron variantes de marca que se consolidaron en la línea actual.
- **Qué se hizo:** publicación completa, registro de publicación automática desde `main`, ajuste de builds de pnpm, dos variantes de marca, revisión de producto, metadatos y activo de marca portable.
- **Impacto:** el producto obtuvo identidad visual más estable y configuración de publicación desde GitHub.
- **Motivo o decisión documentada:** la rama documentó Vercel como publicación desde `main`; el motivo de las variantes paralelas no está documentado.
- **Archivos principales:** `README.md`, `app/globals.css`, `app/layout.tsx`, `BrandMark.tsx`, `public/`.
- **Evidencia:** `1002103`, `6c54492`, `6002070`, `e988f5a`, `1f1cb1f`, `245869b`, `fbf47e7`, merge `5a52b46`, `fc2553b`, `885fdee`.
- **Estado de implementación:** consolidado en `main`; `6002070` acredita la configuración declarada, no el SHA actualmente desplegado.
- **Validación histórica:** pruebas E2E fueron modificadas; no hay resultado histórico verificable.
- **Pendientes o limitaciones:** no se encontraron tags de versión ni registros locales de releases.

### 2026-08-16 — Endurecimiento del runtime, la persistencia y CI

- **Identificador estable:** `MBV-H-006`.
- **Tipo de cambio:** estabilidad técnica y calidad.
- **Área afectada:** Next.js/Vinext, fechas, escrituras locales, backup, onboarding y navegación E2E.
- **Resumen:** se alineó el runtime principal con Next.js/Vercel, se serializaron escrituras de snapshots y se creó CI.
- **Qué se hizo:** `snapshotWriteQueue`, utilidades de fecha, migraciones de backup, configuración de Vercel, workflow con lint/typecheck/unit/build/E2E, y varios ajustes de espera/aislamiento en pruebas de rutas.
- **Impacto:** menor riesgo de perder una escritura local y mayor repetibilidad de compilación y navegación.
- **Motivo o decisión documentada:** el README del hito declara Next.js como runtime principal y Vinext como publicación adicional.
- **Archivos principales:** `.github/workflows/ci.yml`, `src/services/snapshotWriteQueue.ts`, `src/lib/dates.ts`, `playwright.config.ts`, `vercel.json`.
- **Evidencia:** líneas paralelas `81e8bee`/`5d497f7`; estabilizaciones `67a4d7d`/`26c0a67`, `4293d71`/`7d2b2a4`, `e7967dc`/`94fd9a8`, `811b7f6`/`cd5cd9e`; color `f757b34`/`cbe2cca`.
- **Estado de implementación:** incorporado; duplicados de ramas quedaron unidos posteriormente.
- **Validación histórica:** se añadieron pruebas de fechas y cola de escritura y CI versionado; no se recuperaron resultados de ejecuciones antiguas.
- **Pendientes o limitaciones:** E2E en CI se ejecuta sólo en pull requests según el workflow actual.

### 2026-08-18 a 2026-08-19 — Activación y ampliación del sistema de planificación

- **Identificador estable:** `MBV-H-007`.
- **Tipo de cambio:** integración de producto y QA.
- **Área afectada:** Dashboard, planificación, metas, tareas, hábitos, progreso, finanzas, ayuda y aprendizaje.
- **Resumen:** se conectaron mejor los módulos alrededor de prioridades diarias, orientación, resistencia a tareas y recorridos de activación.
- **Qué se hizo:** nuevas reglas de guía, Top 3, sugerencias, pantallas refinadas y `LearnPage`; variantes paralelas fueron publicadas y después consolidadas.
- **Impacto:** la aplicación empezó a orientar el siguiente paso, no sólo a almacenar información.
- **Motivo o decisión documentada:** coherencia con el lenguaje “sin culpa” de `AGENTS.md`; otros motivos no documentados.
- **Archivos principales:** `src/domain/guidanceRules.ts`, `src/features/today/`, `planning/`, `learn/`, `dashboard/`.
- **Evidencia:** `29ef8ff`, variante `289f922` y publicación `43b27d8`.
- **Estado de implementación:** incorporado mediante la consolidación del 23 de agosto; varias interfaces se reemplazaron después.
- **Validación histórica:** se ampliaron pruebas de dominio y E2E; ejecución histórica no registrada.
- **Pendientes o limitaciones:** diferencias exactas entre variantes paralelas no se documentaron como decisiones de producto.

### 2026-08-20 — Retos amables y activos sociales

- **Identificador estable:** `MBV-H-008`.
- **Tipo de cambio:** funcionalidad y metadatos visuales.
- **Área afectada:** Retos, Más herramientas y Open Graph.
- **Resumen:** se añadieron retos personales de ritmo flexible y generación dinámica de imagen social.
- **Qué se hizo:** `ChallengesPage`, reglas de retos, persistencia/servicio, rutas y `app/opengraph-image.tsx`.
- **Impacto:** la persona podía iniciar y registrar experimentos personales sin una lógica punitiva de rachas.
- **Motivo o decisión documentada:** el tono amable deriva de las reglas de producto; motivo específico no documentado.
- **Archivos principales:** `src/features/challenges/ChallengesPage.tsx`, `src/domain/challengeRules.ts`, `app/opengraph-image.tsx`.
- **Evidencia:** `29e4b82`, variantes `2e1e3db` y `28161eb`, publicación `5648067`.
- **Estado de implementación:** Retos continúa incorporado dentro de Mi espacio.
- **Validación histórica:** prueba de dominio y E2E modificadas; ejecución histórica no registrada.
- **Pendientes o limitaciones:** ninguna limitación histórica adicional verificada.

### 2026-08-23 — Tipografía, planificación y Fitness en Mi espacio

- **Identificador estable:** `MBV-H-009`.
- **Tipo de cambio:** UX/UI y reorganización.
- **Área afectada:** planificación, metas, visión, Hoy, Mood, Mi espacio y navegación.
- **Resumen:** se refinó la tipografía y la planificación, y Fitness/Retos se agruparon dentro de Mi espacio.
- **Qué se hizo:** mejoras de formularios de metas y planes, revisión semanal, navegación por pestañas de Mi espacio y vínculos de Fitness/Retos.
- **Impacto:** menos destinos aislados y mayor continuidad entre planificación y herramientas personales.
- **Motivo o decisión documentada:** motivo específico no documentado.
- **Archivos principales:** `PlanningPage.tsx`, `GoalsPage.tsx`, `LifeHubPage.tsx`, `AppShell.tsx`, `app/globals.css`.
- **Evidencia:** `3da8b0e`, publicación paralela `e858f70`, `26bfde7`, `46875ae` y merge múltiple `82bb24e`.
- **Estado de implementación:** incorporado; Fitness pasó después a `/app/health` y Retos permaneció embebido.
- **Validación histórica:** backup y E2E actualizados; ejecución histórica no registrada.
- **Pendientes o limitaciones:** el código actual conserva una rama interna antigua de Fitness en `LifeHubPage` que ya no aparece en sus pestañas.

### 2026-08-23 — Cuenta, trial, Premium y administración

- **Identificador estable:** `MBV-H-010`.
- **Tipo de cambio:** autenticación, autorización y facturación externa.
- **Área afectada:** entrada pública, cuenta, acceso, planificación Premium y administración.
- **Resumen:** se añadió Supabase Auth, prueba de 15 días, roles, capacidades Premium y fundamento administrativo.
- **Situación anterior:** el planner funcionaba sin cuenta y sólo con almacenamiento local.
- **Qué se hizo:** páginas de cuenta, `useAccount`, repositorios Supabase/E2E, reglas de acceso, migración de perfiles y auditoría, enlace externo de Mercado Pago y gates de funcionalidad.
- **Impacto:** el acceso al planner pasó a requerir cuenta verificada y estado válido; el contenido detallado siguió local.
- **Motivo o decisión documentada:** `docs/AUTH_BILLING_SETUP.md` separa responsabilidades y prohíbe activar Premium por el retorno del navegador.
- **Archivos principales:** `src/features/account/AccountPages.tsx`, `src/domain/access.ts`, `src/hooks/useAccount.tsx`, `supabase/migrations/202608230001_accounts_access.sql`.
- **Evidencia:** `438d32d`, merge de publicación `c357130` y corrección `fa01660`.
- **Estado de implementación:** incorporado; Google y enlace mágico fueron añadidos como alternativas. Premium automatizado por webhook no está implementado.
- **Validación histórica:** reglas de acceso y E2E fueron añadidas; ejecución histórica no registrada.
- **Pendientes o limitaciones:** Mercado Pago sólo abre checkout externo; activación automática requiere backend y validación de firma.

### 2026-08-24 — Experiencia bilingüe, tutorial y doce meses

- **Identificador estable:** `MBV-H-011`.
- **Tipo de cambio:** accesibilidad lingüística, acompañamiento y planificación anual.
- **Área afectada:** cuenta, navegación, ajustes, tutorial y planificación.
- **Resumen:** se añadió interfaz español/inglés, tutorial guiado persistente y visualización automática de los doce meses.
- **Qué se hizo:** proveedor i18n, traducciones, selector de idioma, preferencias remotas, tutorial y reglas probadas de meses anuales; build de Sites pasó a exigir configuración Auth.
- **Impacto:** la persona puede elegir idioma y entrar a un año completo sin crear manualmente cada tarjeta mensual.
- **Motivo o decisión documentada:** motivo específico no documentado.
- **Archivos principales:** `src/i18n/`, `GuidedTutorial.tsx`, `monthPlanning.ts`, migración `202608240001_i18n_tutorial.sql`, `scripts/build-vinext.mjs`.
- **Evidencia:** `3a070dc`, `b9d0dde`, `54b1049`.
- **Estado de implementación:** incorporado y cubierto actualmente por pruebas.
- **Validación histórica:** se añadieron pruebas de traducciones y meses; ejecución histórica no registrada.
- **Pendientes o limitaciones:** no se acreditó revisión lingüística profesional externa.

### 2026-08-26 — Experiencia legal pública, consentimientos y Fitness Hub

- **Identificador estable:** `MBV-H-012`.
- **Tipo de cambio:** cumplimiento, formularios de cuenta y bienestar.
- **Área afectada:** páginas públicas, registro, ajustes, entrenamiento, nutrición y medidas.
- **Resumen:** se añadieron recursos legales públicos y consentimientos separados; Fitness se convirtió en un hub dedicado y optativo.
- **Qué se hizo:** páginas de privacidad/términos, ampliación de evidencias legales, `FitnessPage`, reglas de fitness, entrenamiento, comidas/macros, medidas y autorización sensible.
- **Impacto:** mayor claridad antes del registro y seguimiento físico/nutricional opcional con avisos de alcance.
- **Motivo o decisión documentada:** privacidad y consentimiento explícito; la auditoría legal posterior detalla el alcance.
- **Archivos principales:** `AccountPages.tsx`, `FitnessPage.tsx`, `fitnessRules.ts`, `schemas.ts`, `tests/fitness-rules.test.ts`.
- **Evidencia:** `fa688da`, `a13a6bf`, `ffd23fe`.
- **Estado de implementación:** incorporado; Fitness fue refinado el 31 de agosto.
- **Validación histórica:** E2E y pruebas de fitness añadidas; ejecución histórica no registrada.
- **Pendientes o limitaciones:** la funcionalidad no sustituye asesoría médica o nutricional.

### 2026-08-27 — Privacidad, soporte, analítica minimizada y plataforma privada

- **Identificador estable:** `MBV-H-013`.
- **Tipo de cambio:** cumplimiento, soporte y operación remota.
- **Área afectada:** legal, cookies, PQR, soporte, eventos de producto y superadmin.
- **Resumen:** se implementaron recursos legales para Colombia, solicitudes de privacidad, tickets de soporte y panel privado con métricas reales.
- **Qué se hizo:** rutas API autenticadas, repositorios de privacidad/soporte/plataforma, páginas legales, cookie center, migraciones con RLS, buckets privados, taxonomía cerrada de eventos y rollback de soporte/plataforma.
- **Impacto:** las personas pueden gestionar consentimientos y solicitudes; el equipo puede atender soporte y observar métricas minimizadas sin recibir contenido del planner.
- **Motivo o decisión documentada:** `LEGAL_COMPLIANCE_COLOMBIA.md` y `PRODUCT_SUPPORT_PLATFORM.md` documentan minimización, separación de marketing y pendientes jurídicos.
- **Archivos principales:** `app/api/`, `src/features/legal/`, `support/`, `platform/`, migraciones `202608270001` y `202608270002`.
- **Evidencia:** commit `c639c9d`.
- **Estado de implementación:** código y migraciones incorporados; aplicación efectiva de todas las migraciones en producción no verificada.
- **Validación histórica:** pruebas legales, soporte/analítica y E2E añadidas; ejecución histórica no registrada.
- **Pendientes o limitaciones:** revisión jurídica, datos del responsable, operación PQR, festivos colombianos y oferta Premium real siguen pendientes según el documento legal.

### 2026-08-28 — Estabilización de rutas y cliente de autenticación

- **Identificador estable:** `MBV-H-014`.
- **Tipo de cambio:** corrección técnica.
- **Área afectada:** generación de tipos, metadatos Supabase, rutas de producción y cliente Auth.
- **Resumen:** se centralizó el cliente Supabase del navegador y se ajustó la resolución de rutas/autenticación para producción.
- **Qué se hizo:** `supabaseBrowserClient.ts`, reutilización del cliente en repositorios, ajustes del router y exclusión de metadata local de Supabase.
- **Impacto:** sesiones y navegación profunda más estables en el runtime publicado.
- **Motivo o decisión documentada:** motivo detallado no documentado.
- **Archivos principales:** `app/PlannerApp.tsx`, `src/lib/supabaseBrowserClient.ts`, repositorios Supabase, `.gitignore`.
- **Evidencia:** `df2ff3d`, `a3c34d6`, `214a9aa`.
- **Estado de implementación:** incorporado.
- **Validación histórica:** no se recuperó un resultado de prueba asociado.
- **Pendientes o limitaciones:** ninguna adicional verificada.

### 2026-08-29 a 2026-08-30 — Arquitectura de información y evolución de Hoy

- **Identificador estable:** `MBV-H-015`.
- **Tipo de cambio:** reorganización de navegación y UX/UI.
- **Área afectada:** Inicio, Hoy, Planificar, Progreso, Mi espacio y utilidades.
- **Resumen:** se definieron cinco destinos principales y se separó la vista agregada de la ejecución diaria; Hoy recibió tres iteraciones visuales sucesivas.
- **Qué se hizo:** `SectionNavigation`, resumen de Dashboard, nueva composición por áreas, aliases de rutas conservados y rediseños de cabecera, prioridades, timeline, hábitos, bienestar y cierre diario.
- **Impacto:** la navegación expresa mejor dónde mirar, ejecutar, planificar y revisar, manteniendo rutas previas compatibles.
- **Motivo o decisión documentada:** `docs/information-architecture-refactor.md` limita el cambio a jerarquía/navegación y preserva la fuente de verdad del planner.
- **Archivos principales:** `AppShell.tsx`, `SectionNavigation.tsx`, `DashboardPage.tsx`, `TodayPage.tsx`, `TodayVisuals.tsx`, `app/globals.css`.
- **Evidencia:** `61c5d65`, `321fa56`, `3631fff`, `589ff2f`.
- **Estado de implementación:** incorporado; Hoy volvió a evolucionar el 3 y 4 de septiembre.
- **Validación histórica:** se añadieron pruebas de resumen y navegación; ejecución histórica no registrada.
- **Pendientes o limitaciones:** algunas páginas/componentes anteriores quedaron sin ruta directa y requieren una futura limpieza controlada, no funcional.

### 2026-08-31 — Fitness flexible y navegación

- **Identificador estable:** `MBV-H-016`.
- **Tipo de cambio:** corrección funcional y refinamiento visual.
- **Área afectada:** Bienestar, hábitos, tareas, onboarding, marca y navegación.
- **Resumen:** Fitness permitió registrar cardio/deporte sin ejercicios obligatorios y se ajustaron destinos y flujos relacionados.
- **Qué se hizo:** validación flexible de entrenamiento, navegación hacia `/app/health`, actualización de layouts, textos, marca y cobertura E2E.
- **Impacto:** un entrenamiento puede representar pesas, cardio o deporte sin forzar una estructura incorrecta de series.
- **Motivo o decisión documentada:** adaptar el registro al tipo real de actividad; evidencia funcional en esquema, servicio y E2E.
- **Archivos principales:** `FitnessPage.tsx`, `src/lib/schemas.ts`, `plannerService.ts`, `AppShell.tsx`, `e2e/app.spec.ts`.
- **Evidencia:** `b983a25`.
- **Estado de implementación:** incorporado y vigente.
- **Validación histórica:** se añadió prueba de esquema y E2E; ejecución en esa fecha no acreditada.
- **Pendientes o limitaciones:** ninguna funcional verificada en este flujo.

### 2026-09-01 — Simplificación de planificación, proyectos y Mi espacio

- **Identificador estable:** `MBV-H-017`.
- **Tipo de cambio:** UX, CRUD y conectividad.
- **Área afectada:** onboarding, proyectos/tareas, metas, planificación, bandeja, journal, fitness y navegación secundaria.
- **Resumen:** se priorizaron resultados antes que tareas, se progresaron detalles opcionales y se hicieron editables más entidades.
- **Qué se hizo:** proyectos antes de tareas, formularios progresivos, edición/eliminación de entrenamiento, tarjetas personalizadas de Dream Life y conexión con áreas, ajustes de Brain Dump y flujos iniciales del onboarding.
- **Impacto:** menor carga inicial al capturar y más control para corregir información existente.
- **Motivo o decisión documentada:** simplificar la experiencia y conservar conexiones; motivo detallado no documentado.
- **Archivos principales:** `TasksPage.tsx`, `GoalsPage.tsx`, `PlanningPage.tsx`, `LifeHubPage.tsx`, `Onboarding.tsx`, `plannerService.ts`.
- **Evidencia:** `932cf6c`.
- **Estado de implementación:** incorporado; el onboarding de elección de destino fue sustituido el 3 de septiembre por primera acción real.
- **Validación histórica:** E2E agregó proyectos, tarjetas, edición, móvil e inglés; ejecución histórica no registrada.
- **Pendientes o limitaciones:** no asumir que todos los CRUD quedaron completos para cada entidad.

### 2026-09-02 — Planificación orientada a resultados y navegación visible

- **Identificador estable:** `MBV-H-018`.
- **Tipo de cambio:** producto, conectividad, responsive y navegación.
- **Área afectada:** áreas de vida, metas, mes, semana, Mi día, Progreso, captura rápida, Bienestar y Finanzas.
- **Resumen:** se reforzó el flujo de resultado mensual hacia acciones semanales/diarias y se agrupó la semana por procedencia.
- **Qué se hizo:** reglas de áreas, creación/edición de áreas, contexto mensual, acciones disponibles agrupadas, captura global reutilizable, evidencia de progreso, recorridos Meta → mes → semana → Mi día → Progreso y Bienestar/Finanzas visibles en el lateral desktop.
- **Impacto:** una acción conserva de dónde viene mientras se mueve hacia el día de ejecución; los dos módulos sensibles quedan accesibles sin ocultarse en Más herramientas.
- **Motivo o decisión documentada:** mejorar conectividad y reducir navegación innecesaria; detalle adicional no documentado.
- **Archivos principales:** `lifeAreaRules.ts`, `progressEvidence.ts`, `QuickCaptureDrawer.tsx`, `PlanningPage.tsx`, `AppShell.tsx`, `e2e/app.spec.ts`.
- **Evidencia:** `a0360a7`, `f4b8f24`, `e6d8b8b`.
- **Estado de implementación:** incorporado y vigente.
- **Validación histórica:** nuevas pruebas unitarias y E2E del flujo completo; ejecución histórica no registrada.
- **Pendientes o limitaciones:** la barra móvil conserva exactamente cinco destinos y Bienestar/Finanzas se acceden desde otras superficies en móvil.

### 2026-09-03 — Onboarding de primera acción, planificación y Hábitos

- **Identificador estable:** `MBV-H-019`.
- **Tipo de cambio:** simplificación de activación, reglas de hábito y UI.
- **Área afectada:** onboarding, recuperación de cuenta, Hábitos, Mood, Hoy, planificación y captura rápida.
- **Resumen:** el onboarding dejó de pedir una configuración extensa y pasó a crear un resultado y una primera acción real; Hábitos obtuvo dashboard y registros medibles.
- **Qué se hizo:** cuatro puntos de partida (`Mi día`, `Una meta`, `Mi semana`, `Un hábito`), acción conectada en Mi día, recuperación de espacios existentes, `TodayMoodCard`, tipos de hábito boolean/cantidad/duración, edición y rachas basadas sólo en días programados, protección de ruta y mejoras responsive.
- **Impacto:** una cuenta nueva comienza haciendo algo concreto; una cuenta ya creada no debe repetir el recorrido; los hábitos pueden registrar progreso parcial y el bienestar se reutiliza entre Hoy y Hábitos.
- **Motivo o decisión documentada:** orientación a la primera acción real y constancia sin castigo, coherente con `AGENTS.md` y ADR 0004.
- **Archivos principales:** `Onboarding.tsx`, `PlannerApp.tsx`, `HabitsPage.tsx`, `TodayMoodCard.tsx`, `rules.ts`, `plannerService.ts`.
- **Evidencia:** commit `b58d8f5c0424ee272e46fabe80f08bb36af29a6f`.
- **Estado de implementación:** último commit de `main` y `origin/main` al documentar.
- **Validación histórica:** se añadieron/actualizaron pruebas de onboarding, cuenta existente, hábitos, ánimo, fechas, responsive e inglés; su resultado en el commit no está registrado aquí.
- **Pendientes o limitaciones:** el estado publicado exacto no se puede identificar sólo desde Git.

### 2026-09-04 — Auditoría, correcciones locales y continuidad documental

- **Identificador estable:** `MBV-H-020`.
- **Tipo de cambio:** cambio local sin commit; UX, corrección funcional, accesibilidad, pruebas y documentación.
- **Área afectada:** Hoy, Dashboard, Diario, Bienestar, Hábitos, carga global y documentación.
- **Resumen:** se auditó producción y el repositorio; se corrigieron duplicación del cierre diario, estados vacíos, overflow, feedback y accesibilidad. Después se restauró `👋` únicamente en la cabecera de Hoy por solicitud expresa y se creó esta memoria persistente.
- **Situación anterior:** el cierre diario podía duplicarse para la misma fecha; Agenda repetía el estado vacío y CTAs; el borrado de comida no confirmaba; Diario permitía intentar guardar vacío; filtros podían desbordar; la documentación central no existía y parte del README/arquitectura estaba desactualizada.
- **Qué se hizo:** `TodayPage` actualiza el cierre existente, mantiene un CTA principal y vuelve a mostrar `Buenos días, {nombre} 👋`; Diario exige contenido; Bienestar confirma y comunica el borrado de comida; cargas son anunciadas; filtros y empty state de Hábitos se ajustaron; se añadió prueba E2E de no duplicación; se consolidó documentación en `docs/proyecto/`.
- **Impacto:** menor riesgo de datos repetidos, acciones más claras, mejor feedback y una continuidad de desarrollo verificable sin perder el saludo visual solicitado.
- **Motivo o decisión documentada:** auditoría UX/UI solicitada y referencia visual posterior para el saludo. Las correcciones reutilizan `usePlanner`/`plannerService` y no cambian la arquitectura.
- **Archivos principales del producto:** `app/PlannerApp.tsx`, `app/globals.css`, `e2e/app.spec.ts`, `DashboardPage.tsx`, `FitnessPage.tsx`, `JournalPage.tsx`, `TodayPage.tsx`.
- **Archivos documentales:** `AGENTS.md`, `README.md`, `docs/proyecto/`, `docs/architecture/`, `docs/decisions/0001-local-first.md` y `docs/CHANGE_HISTORY.md` como enlace de compatibilidad.
- **Evidencia:** working tree sobre `main` con SHA base `b58d8f5`; no existe hash de commit para estos cambios.
- **Estado de implementación:** incluido en la entrega consolidada a `main` y en la publicación del Site del 2026-09-07.
- **Validación ejecutada:** lint y TypeScript aprobados; 69 pruebas unitarias, build y suite E2E completa 56/56 aprobados antes de restaurar el saludo; después del saludo, ESLint/TypeScript aprobaron y la prueba de matriz responsive pasó 2/2 en proyectos desktop/mobile. La matriz incluye 375×812, 390×844, 430×932, 768×1024, 1366×768 y 1440×900.
- **Validación documental:** `git diff --check` aprobado; los 61 commits alcanzables están referenciados; los enlaces locales resuelven; no se detectaron valores con forma de credencial; no hay cambios staged.
- **Pendientes o limitaciones:** verificar en producción las integraciones que dependen de configuración externa.

### 2026-09-07 — Plan semanal opción B conectado al planner

- **Identificador estable:** `MBV-H-021`.
- **Tipo de cambio:** cambio local sin commit; UX/UI, funcionalidad, responsive y pruebas.
- **Área afectada:** Planificación semanal, tareas, hábitos, Brain Dump, revisión semanal, Hoy y estilos globales acotados a la ruta semanal.
- **Resumen:** la vista semanal se reconstruyó como una lista vertical de lunes a domingo con prioridades, pendientes sin fecha y creación/asignación directa, conservando las entidades y servicios existentes.
- **Situación anterior:** Semana combinaba contexto mensual, tarjetas de procedencia, un tablero de siete columnas y una revisión permanente; la densidad y la asignación rápida se alejaban de la referencia visual solicitada.
- **Qué se hizo:** se añadió `WeeklyPlanView` con navegación de semana, prioridades derivadas de tareas reales, tareas y hábitos por día, creación inline protegida contra dobles envíos, edición/cambio de fecha, panel responsive de pendientes, conversión idempotente desde Brain Dump y revisión semanal en modal. La cabecera global se oculta sólo en esta ruta y se aplican tipografías/estilos encapsulados para reproducir la opción B sin alterar otras pantallas.
- **Integridad funcional:** mover una tarea conserva su identificador y sus enlaces a meta/proyecto/plan; la misma tarea aparece en Mi día al asignarla. Reabrir una tarea sin fecha la devuelve a bandeja, no a un estado planificado inválido. Las operaciones siguen el flujo `usePlanner` → `plannerService` → repositorio.
- **Impacto:** la semana ofrece una lectura cronológica más clara, permite organizar pendientes sin duplicarlos y mantiene visibles prioridades, procedencia de meta y recurrencias de hábitos.
- **Motivo o decisión documentada:** implementación solicitada de Plan semanal opción B basada en el mockup adjunto, preservando arquitectura, navegación existente y datos locales.
- **Archivos principales:** `src/features/planning/WeeklyPlanView.tsx`, `src/features/planning/PlanningPage.tsx`, `src/services/plannerService.ts`, `src/hooks/usePlanner.ts`, `src/components/layout/AppShell.tsx`, `app/layout.tsx`, `app/globals.css`, `src/i18n/translations.ts`, `e2e/app.spec.ts` y la referencia de tipos generada por Vinext en `next-env.d.ts`.
- **Evidencia visual:** `outputs/weekly-plan-option-b-1488x992.png` y `outputs/weekly-plan-option-b-full.png`, generadas con datos locales aislados.
- **Estado de implementación:** incluido en la entrega consolidada a `main` y en la publicación del Site del 2026-09-07.
- **Validación ejecutada:** ESLint y TypeScript aprobados; 69 pruebas unitarias aprobadas; build de producción y build de Sites/Vinext aprobados. Los E2E específicos de la semana aprobaron en desktop/mobile, junto con 390×844, 430×932, 768×1024, 1440×900 y 1488×992. La suite global obtuvo 57/60 en paralelo; dos fallos externos aprobaron de forma aislada y la matriz global desktop restante terminó por `ERR_NETWORK_IO_SUSPENDED`, no por una aserción de producto.
- **Pendientes o limitaciones:** reintentar la matriz E2E global desktop con conectividad estable.

### 2026-09-08 — Ajustes P0 de prelanzamiento

- **Identificador estable:** `MBV-H-022`.
- **Tipo de cambio:** release P0; marca, UX writing, acceso, accesibilidad, analítica, QA y documentación.
- **Área afectada:** superficies públicas, cuenta, onboarding, planificación, Hábitos, Mi día, navegación, plataforma privada y telemetría propia.
- **Resumen:** se consolidaron la arquitectura verbal, CTA, trial/Premium y activación; se corrigieron contradicciones de copy, contraste y accesibilidad sin cambiar la arquitectura local-first.
- **Situación anterior:** marca y CTA usaban variantes; trial y Premium mezclaban el límite de tres meses con un mensaje de tres años; el Open Graph incluía un monograma y slogan no vigentes; la activación exigía crear una meta; la cola analítica no estaba vinculada explícitamente al consentimiento; y el SVG del logo no era un vector real aunque su extensión lo sugiriera.
- **Qué se hizo — marca y funnel:** `src/lib/brand.ts` pasó a contener siete niveles de mensaje; `src/lib/cta.ts` centralizó CTA; landing, trial, signup, onboarding, metadata, Open Graph, paywalls y estados de acceso reutilizan esas fuentes. Se retiraron de superficies activas “Planea · Acciona · Logra” y “Planea · Haz · Vive · Avanza”.
- **Qué se hizo — trial y Premium:** `src/domain/access.ts` centralizó duración, capacidades y copy; el mismo horizonte local de tres meses se aplica a periodos y fechas de mes, semana, día y captura rápida, con validación adicional antes de persistir; los planes existentes fuera del horizonte se conservan en solo lectura con actividades históricas, tareas y eventos enlazados sin duplicar equivalentes; cinco años continúa como Premium; una capacidad experimental sin ruta se mantuvo fuera de la oferta y fue retirada posteriormente.
- **Qué se hizo — accesibilidad y voz:** se añadieron foregrounds semánticos en claro/oscuro, focus visible, targets táctiles críticos, soporte de teclado en drawer/cookies y nombres o explicaciones para gráficos. Hábitos usa “Aún no registrado”; revisión semanal y mensual adoptan copy no prescriptivo.
- **Qué se hizo — activación:** la definición v2 requiere onboarding, una acción conectada, completar/registrar/reprogramar y segunda sesión dentro de siete días. Se añadieron una función pura, pruebas, dedupe, timestamp original, cola consentida, sincronización del retiro de consentimiento entre pestañas y sesiones compartidas que sólo se renuevan ante actividad real después de 30 minutos. Onboarding y activación usan como denominador la cohorte observable con eventos v2, sin interpretarla como registro persistido de consentimiento. La migración SQL genera los hitos derivados.
- **Qué se hizo — documentación:** se añadieron auditoría P0, jerarquía de mensajes, CTA, voz, matriz trial/Premium, estado de logo e informe de release; se actualizó la operación de soporte/analítica y esta memoria de continuidad.
- **Integridad funcional:** el contenido del planner continúa en IndexedDB y las operaciones de producto conservan el flujo componente → `usePlanner` → `plannerService` → `PlannerRepository`. La telemetría no accede al contenido local del planner.
- **Impacto:** adquisición, onboarding, acceso y producto comunican la misma propuesta; el trial no amenaza con pérdida de datos; las cuatro rutas iniciales pueden conducir a activación sin exigir una meta.
- **Archivos principales de producto:** `app/PlannerApp.tsx`, `app/api/events/route.ts`, `app/api/platform/route.ts`, `app/globals.css`, `app/layout.tsx`, `app/opengraph-image.tsx`, `src/components/access/PremiumFeatureGate.tsx`, `src/components/layout/AppShell.tsx`, `src/domain/access.ts`, `src/domain/monthPlanning.ts`, `src/domain/platform.ts`, `src/domain/productAnalytics.ts`, `src/features/account/AccountPages.tsx`, `src/features/legal/CookieConsent.tsx`, `src/features/onboarding/Onboarding.tsx`, `src/features/planning/PlanningPage.tsx`, `src/features/planning/WeeklyPlanView.tsx`, `src/features/platform/PlatformPage.tsx`, `src/features/tasks/QuickCaptureDrawer.tsx`, `src/hooks/useAccount.tsx`, `src/hooks/usePlanner.ts`, `src/repositories/interfaces/LegalPrivacyRepository.ts`, `src/repositories/supabase/SupabaseLegalPrivacyRepository.ts`, `src/services/analyticsService.ts` y `src/services/legalPrivacyService.ts`.
- **Archivos de pruebas y migración:** `scripts/check-contrast.mjs`, `src/domain/access.test.ts`, `src/domain/monthPlanning.test.ts`, `src/domain/productAnalytics.test.ts`, `tests/analytics-queue.test.ts`, `tests/cookie-consent-sync.test.ts`, `tests/support-analytics.test.ts` y `supabase/migrations/202609080001_product_analytics_v2.sql`.
- **Archivos documentales:** `docs/brand/`, `docs/product/trial-premium-matrix.md`, `docs/qa/p0-release-report.md`, `docs/PRODUCT_SUPPORT_PLATFORM.md`, `docs/proyecto/ESTADO_ACTUAL.md` y este historial.
- **Evidencia:** commit funcional `5c5f5a0bfd342a4b731fa927f992d7233959006d`, enviado a `origin/main` y publicado como versión 27 de Sites.
- **Validación ejecutada:** ESLint, TypeScript, build de producción Next.js y build de Sites/Vinext aprobados; 20 archivos y 96 pruebas unitarias aprobadas; 12 pares de contraste aprobados; ocho screenshots P0 generados e inspeccionados. La suite Playwright final aprobó 66 casos, omitió 8 de forma intencional y no tuvo fallos. La migración analítica v2 fue aplicada y un segundo dry-run confirmó `Remote database is up to date`. El smoke de producción aprobó rutas públicas y críticas de producto, metadata y Open Graph sin errores de consola.
- **Estado de implementación:** release técnico P0 publicado. El despliegue `appgdep_6aa199690ba08191a458b52f4d5abcc4` terminó en `succeeded` y el smoke de producción aprobó landing/trial, dashboard, Mi día, Semana, Hábitos, Upgrade y Open Graph 1200×630 sin errores de consola.
- **Pendientes o limitaciones:** implementar webhook/conciliación segura de Mercado Pago; definir las condiciones comerciales; adjuntar `mybestversion.life`; y recibir el master vectorial aprobado. Estos puntos impiden declarar listo el lanzamiento comercial Premium autoservicio, no el release técnico P0.

### 2026-09-09 a 2026-09-10 — Consolidación P1 de experiencia y sistema

- **Identificador estable:** `MBV-H-023`.
- **Tipo de cambio:** release técnico P1; sistema visual, navegación, lenguaje, accesibilidad, documentación y QA.
- **Área afectada:** tipografía, arquitectura CSS, primitives, Mi espacio, navegación, i18n, lenguaje de producto, continuidad de hábitos, documentación y QA.
- **Estado previo:** release P0 documentado en `8e6ede1`, con `main`, `origin/main` y working tree alineados antes de iniciar P1.
- **Objetivo:** consolidar decisiones ya vigentes sin rediseñar el producto, cambiar la matriz Trial/Premium, alterar persistencia ni incorporar assets sin aprobación.
- **Qué se hizo — tipografía y CSS:** Nunito Sans quedó como única familia activa; `app/globals.css` pasó a ser un manifiesto ordenado de capas y `src/styles` separa tokens, foundations, layout, primitives, marketing, utilidades y features. Se definieron tres niveles de tokens, modo oscuro y una auditoría incremental con baseline de 291 coincidencias directas en 15 archivos, distribuidas entre fuentes de tokens, excepciones técnicas y deuda heredada.
- **Qué se hizo — design system:** Button, IconButton, Card, Badge, Tabs, SegmentedControl, FormField, feedback, carga, vacío y error comparten contratos. Modal y drawer conservan foco, Escape, bloqueo de scroll y retorno al disparador.
- **Qué se hizo — navegación y Mi espacio:** Inicio, Mi día, Planificar, Mi espacio y Progreso son los cinco destinos principales en desktop/mobile. Bienestar y Finanzas permanecen visibles como accesos secundarios. Mi espacio abre un Resumen, conserva sus módulos y normaliza el alias `calendar` a `events`.
- **Qué se hizo — lenguaje e i18n:** se añadieron 1.230 claves ES/EN tipadas, formatters y auditoría de paridad; el bridge legacy quedó congelado en 803 entradas. EN permanece Beta. Las superficies revisadas aíslan contenido personal para que títulos como “Hoy” no se traduzcan.
- **Qué se hizo — progreso amable:** Hábitos prioriza “Mayor continuidad”, separa “No programado” de 0 % y Retos puede pausarse/reanudarse sin borrar registros.
- **Qué se hizo — documentación:** se añadieron fuente de verdad de marca, tipografía, dirección visual, manifiesto de assets, diccionario de producto, arquitectura actual, índice ADR, contratos de primitives, excepciones de tokens e informe P1.
- **Integridad funcional:** se conservaron los flujos, reglas Trial/Premium, persistencia local-first y relaciones Meta → resultado mensual → semana → Mi día → Progreso. No se añadieron capacidades P2.
- **Validación ejecutada:** auditorías de tokens e i18n, ESLint, TypeScript, 25 archivos y 140 pruebas unitarias, 22/22 pares de contraste, builds Next/Vinext y `git diff --check` aprobados. La matriz pública aprobó 10 rutas × 9 viewports; la matriz de producto aprobó 16 rutas × 9 viewports en claro/oscuro; el plan semanal aprobó su matriz específica y los recorridos ES/EN aprobaron en desktop/mobile. La suite Playwright quedó aprobada de forma acumulada con 65 casos, 9 omisiones intencionales y 0 fallos pendientes.
- **Estado de entrega:** release técnico P1 consolidado en `8f240f5b1516d212da65630e36ea3d5a15fd40e9`, enviado a `origin/main` y publicado como versión 29 mediante `appgdep_6aa2f93962bc81919311825a6c2bc6b4`. El despliegue terminó en `succeeded`; el smoke aprobó portada, Trial, Dashboard, Mi día, Plan semanal y Hábitos sin errores de consola observados.
- **Pendientes o limitaciones:** el bridge i18n y los colores directos restantes son deuda gradual. Webhook/conciliación de Mercado Pago, condiciones comerciales, revisión jurídica, dominio personalizado y master vectorial siguen bloqueando el lanzamiento comercial Premium, no el release técnico P1.

### 2026-09-10 — Hotfix forward de telemetría P0 detectado al cerrar P1

- **Identificador estable:** `MBV-H-024`.
- **Tipo de cambio:** corrección SQL forward y verificación de producción; sin cambio de UI ni datos del planner.
- **Área afectada:** RPC `record_user_event` y observabilidad de eventos autenticados.
- **Situación anterior:** producción devolvía `500` en `/api/events`; el bridge retenía la cola consentida y reintentaba con espera incremental, sin interrumpir la experiencia visible.
- **Causa confirmada:** `supabase db lint --linked --level error` reportó SQLSTATE `42702` porque `second_session_at` era simultáneamente una variable PL/pgSQL y una columna no calificada del CTE de hitos.
- **Qué se hizo:** se añadió y aplicó `supabase/migrations/202609100001_fix_product_analytics_v2_ambiguity.sql`, que conserva la firma/contrato del RPC, renombra la variable local y califica las columnas del CTE. No se modificó la migración histórica ya aplicada.
- **Impacto:** los eventos vuelven a persistirse y la cola pendiente puede vaciarse; no cambia navegación, onboarding, planificación, Hábitos, Trial/Premium ni persistencia local-first.
- **Validación ejecutada:** lint remoto sin incidencias, dry-run remoto `upToDate: true`, siete respuestas consecutivas `200` de `/api/events` y cero errores nuevos en la ventana posterior.
- **Estado de implementación:** aplicado en la base remota y preparado para quedar versionado en `main`.

### 2026-09-11 — Integración bidireccional Google Calendar

- **Identificador estable:** `MBV-H-025`.
- **Tipo de cambio:** integración externa, seguridad, sincronización, UX y documentación.
- **Área afectada:** Ajustes, Plan semanal, Mi día, Calendario de Mi espacio, eventos locales, APIs autenticadas y migración Supabase.
- **Objetivo:** conectar exclusivamente Google Calendar mediante OAuth independiente del login, permitir elegir calendarios visibles y uno editable predeterminado, y sincronizar eventos en ambos sentidos sin convertir tareas, hábitos o prioridades en eventos.
- **Avance verificable:** se añadieron dominio/contrato/repositorio HTTP y provider de Calendar; formularios de evento con fecha, hora, todo el día, calendario y control de sincronización; lectura diferenciada en Semana, Mi día y Mi espacio; estados local, pendiente, sincronizado, conflicto y reconexión; tokens AES-GCM server-only; OAuth con PKCE y finalización autenticada ligada a la misma cuenta MBV; entitlement; outbox local; operaciones idempotentes y protección por ETag/operación; sync incremental acotado, rebase tras `410`, lotes, deduplicación de recurrencias y recepción webhook durable con generación/lease.
- **Decisiones de seguridad:** el callback de Google no activa por sí solo la integración; entrega un token opaco en cookie `HttpOnly` y la finalización requiere Bearer válido del mismo `user_id`. Desconectar invalida primero los flujos OAuth para evitar reactivaciones concurrentes. Los tokens y la caché no se exponen a clientes autenticados ni a respaldos locales.
- **Persistencia:** el planner continúa local-first en IndexedDB. La migración nueva crea tablas server-only para credenciales cifradas, calendarios conectados, caché/identidad de eventos, estados OAuth y RPC de aplicación por lotes, cola/lease, revocación durable y finalización transaccional. Las transiciones críticas usan bloqueos, generación y compare-and-swap para evitar defaults duplicados, activaciones OAuth obsoletas y carreras entre sync, webhook y escrituras locales. La migración aún no está aplicada a un entorno remoto.
- **Cierre de seguridad y datos:** la resolución de conflictos sólo puede reclamar el UUID exacto del conflicto visto por el cliente, cerrando la carrera ABA; PATCH/DELETE comparan el ETag cliente↔caché dentro del bloqueo SQL antes de sobrescribir y conservan ambas versiones; un reintento de creación duplicada sólo adopta el evento si ownership y contenido coinciden. `winner=mbv` no puede mutar un evento remoto sin validar las tres marcas privadas, y una colisión al borrar un alta pendiente termina únicamente el vínculo local. Los eventos conservan su zona IANA al editar, y cualquier vínculo pendiente se vuelve local si la integración o el calendario ya no son los activos. Los leases se liberan en errores recuperables; los eventos importados sólo recuperan identidad local si las tres marcas privadas pertenecen al usuario actual; el mantenimiento exige `CRON_SECRET` fuerte y la revocación externa se reintenta desde una cola server-only.
- **Validación ejecutada:** ESLint y TypeScript aprobados; 33 archivos/184 pruebas unitarias aprobadas; 1.302 claves estables ES/EN y 803/803 entradas legacy verificadas; auditoría de tokens 291/291 y contraste 22/22 aprobados; builds Next.js y Vinext aprobados. La última suite E2E global completó 66 casos aprobados y 9 omisiones intencionales; el único caso restante perdió su sesión de navegador durante una suspensión del entorno de 10,5 horas. Esa matriz de producto se repitió de forma continua y aprobó en 6 minutos. El flujo de eventos entre Mi espacio, Semana y Mi día, incluida la preservación de zona horaria, volvió a aprobar en desktop y mobile.
- **Estado de commit, push y deploy:** el código funcional quedó consolidado en `14ec6226dfb433db6de0956cae223d7b6ca1a482` (`feat: add secure bidirectional Google Calendar integration`), enviado a `origin/main` y al repositorio fuente de Sites. El paquete Worker validado se guardó como versión 30 y se publicó correctamente mediante `appgdep_6aa82c3d545c819188a007479e6bc342` en `https://my-best-version-habitos.maria-delosangelesgt.chatgpt.site`, conservando acceso público y la revisión 1 de variables.
- **Estado operativo y riesgos:** código, pruebas, empaquetado, push y despliegue quedan cerrados. La integración real permanece desactivada de forma segura porque la migración no está aplicada y Sites sólo tiene las dos variables públicas Supabase; faltan `SUPABASE_SERVICE_ROLE_KEY`, credenciales OAuth, claves fuertes de cifrado/cron, `APP_BASE_URL`, Redirect URI HTTPS y certificación con una cuenta Google real. No se ejecutó una prueba concurrente HTTP + PostgreSQL real; las revisiones estáticas no hallaron P0/P1 pendientes.

### 2026-09-14 — Compatibilidad delegada y activación inicial de Google Calendar

- **Identificador estable:** `MBV-H-026`.
- **Tipo de cambio:** hotfix de compatibilidad OAuth, ajuste de migración pendiente y avance operativo externo.
- **Área afectada:** parser OAuth de Calendar, tipado de Google CalendarList, clasificación escribible de calendarios conectados, prueba unitaria y documentación operativa.
- **Situación anterior:** Google puede devolver `accessRole: writerWithoutPrivateAccess` para calendarios delegados con lectura y escritura, pero el payload pendiente sólo aceptaba `freeBusyReader`, `reader`, `writer` y `owner`. Ese valor válido hacía fallar el parseo completo del callback; además, la migración no lo clasificaba como escribible.
- **Qué se hizo:** se amplió el contrato TypeScript y Zod, la migración pendiente ahora marca el rol delegado como escribible y se añadió una prueba de regresión. Se corrigió también la documentación que decía cuatro tablas aunque la migración crea cinco.
- **Evidencia:** commit funcional `83860806234c4aebea274803192a908d12294b4f` (`fix: support delegated Google Calendar writer access`).
- **Validación ejecutada:** prueba dirigida de OAuth 3/3, TypeScript y ESLint aprobados; `git diff --check` aprobado antes del commit funcional.
- **Avance de producción:** Google Calendar API quedó habilitada y verificada en el proyecto Google Cloud que ya contiene el cliente OAuth de Supabase. No se crearon credenciales nuevas ni se añadieron secretos parciales al runtime.
- **Estado operativo:** la activación real continúa bloqueada hasta iniciar sesión en el Supabase correcto, comprobar/aplicar la migración sin drift, crear un cliente OAuth web dedicado, configurar juntas las seis variables server-side y redeplegar. El runtime Sites tampoco acredita la ejecución del cron declarado sólo para Vercel.
- **Archivos principales:** `src/server/calendar/googleApi.ts`, `src/server/calendar/oauthCompletion.ts`, `supabase/migrations/202609110001_google_calendar_integration.sql`, `tests/calendar-oauth.test.ts`, `docs/integrations/google-calendar.md`, `docs/proyecto/ESTADO_ACTUAL.md` y este historial.

### 2026-09-14 — Aplicación segura de la migración Google Calendar

- **Identificador estable:** `MBV-H-027`.
- **Tipo de cambio:** activación operativa de base de datos y documentación; sin cambio de UI, lógica del planner ni datos personales existentes.
- **Área afectada:** proyecto Supabase `yvrvetuzuinoinukrivo`, ledger de migraciones y documentación de Calendar.
- **Preflight:** el Data Editor de Vercel y una consulta read-only en Supabase confirmaron `202609110001` ausente y las cinco tablas objetivo inexistentes. El historial remoto terminaba en `202609100001`, igual que las seis migraciones predecesoras locales.
- **Qué se hizo:** se autorizó Supabase CLI de forma explícita, `migration list --linked` confirmó una única pendiente, `db push --linked --dry-run` enumeró exclusivamente `202609110001_google_calendar_integration.sql` y el runner oficial la aplicó de forma transaccional al proyecto enlazado.
- **Validación ejecutada:** `migration list --linked` muestra local/remoto alineados hasta `202609110001`; el Dashboard muestra `google_calendar_integration` como última migración; `db lint --linked --level error` terminó sin incidencias y el proyecto permaneció `Healthy`.
- **Seguridad:** no se pegó SQL manualmente en el ledger, no se incluyeron contraseñas/tokens en comandos ni archivos y no se modificaron o eliminaron datos existentes. Las tablas nuevas mantienen RLS y privilegios exclusivos de `service_role` según la migración versionada.
- **Estado operativo:** base de datos lista. Permanecen pendientes el cliente OAuth web dedicado, la Redirect URI del dominio Sites, las seis variables server-only, el redeploy y la certificación real de conexión/sincronización.
- **Archivos documentales:** `docs/integrations/google-calendar.md`, `docs/proyecto/ESTADO_ACTUAL.md` y este historial.

### 2026-09-14 — Activación del runtime Google Calendar en Sites

- **Identificador estable:** `MBV-H-028`.
- **Tipo de cambio:** configuración operativa de producción, despliegue y documentación; sin cambio de UI, lógica del planner, migraciones ni datos personales existentes.
- **Área afectada:** cliente OAuth de Google Calendar, variables de runtime Sites y despliegue de la versión 31.
- **Preflight:** se confirmó la versión 31 con archive guardado y fuente `496aca8a3857f981242756e428cba39f4eccf50f`; por tratarse sólo de variables no se reconstruyó, empaquetó ni guardó una versión nueva. La revisión 1 contenía exclusivamente las dos variables públicas de Supabase.
- **Qué se hizo:** se creó un cliente OAuth web dedicado. La primera descarga detectó una Redirect URI con un `5` final accidental y se detuvo la activación; después de corregirla en Google Cloud, una segunda descarga verificó la coincidencia exacta. Se cargaron juntas `APP_BASE_URL`, la clave server-side de Supabase, ID/secreto OAuth y secretos aleatorios independientes de 48 bytes para cifrado y mantenimiento.
- **Seguridad:** las cuatro variables sensibles quedaron marcadas como secret y no se escribieron en el repositorio ni se mostraron en logs o documentación. Las variables públicas existentes se preservaron. Una prueba autenticada posterior descubrió que la representación entregada por Supabase CLI estaba ocultada y no era una clave utilizable; este estado queda corregido y sucedido por `MBV-H-029`.
- **Despliegue:** Sites creó la revisión 2 y redeplegó la versión 31 mediante `appgdep_6aa86141b1408191ba8c412c12d2e692`; el despliegue terminó en `succeeded`, pero la operación autenticada de Calendar devolvió `500` por la clave server-side ocultada. El intento diagnóstico con la clave legacy tampoco era válido porque las claves legacy están deshabilitadas.
- **Estado operativo:** hito histórico superado por `MBV-H-029`. El mantenimiento periódico sigue necesitando un scheduler HTTP autenticado compatible con Sites.
- **Archivos documentales:** `docs/integrations/google-calendar.md`, `docs/proyecto/ESTADO_ACTUAL.md` y este historial.

### 2026-09-14 — Certificación real de Google Calendar y diagnóstico de rollout público

- **Identificador estable:** `MBV-H-029`.
- **Tipo de cambio:** corrección de configuración sensible, redeploy sin cambio de fuente, certificación OAuth/sync real y documentación.
- **Área afectada:** secreto server-side de Supabase en Sites, flujo OAuth de Calendar, selección de calendarios, sync inicial, Mi espacio y preparación del rollout público.
- **Causa del bloqueo:** Supabase CLI ocultaba las claves `sb_secret_…` en su salida. Esa representación se había cargado como si fuera el valor real y provocaba `500` en `status` y `connect`; la clave legacy de `service_role` tampoco servía porque el proyecto la tiene deshabilitada.
- **Qué se hizo:** se copió la clave real `app_server_rotated` desde el Dashboard de Supabase y se verificaron prefijo, longitud, ausencia de caracteres de redacción y huella esperada sin mostrar ni persistir el secreto. Se reemplazó únicamente `SUPABASE_SERVICE_ROLE_KEY`, creando la revisión 4 de Sites, y se redeplegó la misma versión 31 mediante `appgdep_6aa8662a06d08191a8b3b9de6cedde6d`.
- **Certificación en producción:** `status`, `connect`, callback Google, `complete`, `configure`, webhook y `sync` respondieron sin error. Una cuenta real concedió los dos scopes de Calendar, seleccionó sólo su calendario principal editable y completó la primera sincronización. Mi espacio mostró los eventos importados con estado `Sincronizado` y el botón manual quedó habilitado. No se creó, editó ni eliminó un evento remoto de prueba.
- **Validación local:** la suite dirigida aprobó 8 archivos y 45 pruebas; TypeScript y ESLint permanecen aprobados; `git diff --check` no encontró errores. No se modificó código de aplicación.
- **Seguridad y privacidad:** el secreto real sólo transitó desde Supabase al almacén secreto de Sites con autorización explícita; Sites lo devuelve oculto. Se evitó activar automáticamente un calendario externo de sólo lectura y no se realizaron mutaciones en los eventos personales.
- **Disponibilidad pública:** Google muestra “app no verificada”. La integración funciona para cuentas admitidas, pero no está lista para un onboarding público sin fricción: en `Testing` sólo acceden usuarios de prueba y, publicada sin verificación, la advertencia y el límite acumulado de 100 usuarios permanecen. Deben completarse la verificación de marca y la verificación de scopes sensibles antes del lanzamiento general.
- **Pendientes externos:** someter OAuth a verificación de Google, configurar un scheduler HTTP autenticado para mantenimiento en Sites y, sólo con autorización explícita, ejecutar una prueba controlada de escritura Google ↔ MBV.
- **Archivos documentales:** `docs/integrations/google-calendar.md`, `docs/proyecto/ESTADO_ACTUAL.md` y este historial.

### 2026-09-15 — Preparación del rollout Calendar en el dominio oficial

- **Identificador estable:** `MBV-H-030`.
- **Tipo de cambio:** preparación de producción, privacidad rastreable y documentación; sin modificación de eventos personales.
- **Área afectada:** proyecto Google Cloud de producción, variables Vercel Production, aviso de privacidad y guía operativa de Calendar.
- **Qué se hizo:** se creó el proyecto independiente `MBV Calendar Production` (`mbv-calendar-production`), se habilitó Google Calendar API y se añadieron en Vercel Production `APP_BASE_URL=https://mybestversion.life`, una clave exclusiva de cifrado y `CRON_SECRET`. Después se validó el JSON de un cliente OAuth web del mismo proyecto —client ID, secreto presente y única Redirect URI oficial— y se guardaron juntas `GOOGLE_CALENDAR_CLIENT_ID` y `GOOGLE_CALENDAR_CLIENT_SECRET` como Secret sólo en Production. La política pública pasó a una ruta Next server-side con canonical, contenido completo de Google/Calendar, Uso Limitado, `robots.txt` y `sitemap.xml`, compartiendo una sola fuente con la SPA.
- **Seguridad:** las credenciales se transfirieron sin imprimir el secreto, no se escribieron archivos `.env`, se retiró la copia temporal del portapapeles, no se modificaron calendarios ni eventos y ningún valor secreto quedó en el repositorio o en esta documentación.
- **Validación:** TypeScript y ESLint sin errores; 33 archivos/185 pruebas unitarias; 8 suites Calendar/45 casos; i18n 1306 claves, tokens 291/291 y contraste 22/22; builds Next y Vinext; HTML crudo de privacidad, canonical, robots y sitemap; recorrido Calendar dirigido; y matriz pública en 390×844, 430×932, 768×1024 y 1440×900.
- **Despliegue y smoke:** `ec22cb1c7a8987e167c9f4c1629ed8487c8e0aa6` se publicó en Production como `dpl_FhhWeG6fVQ95m7RhaJTMyjzpGRAH` y quedó `Ready`, con `mybestversion.life` asociado. `/privacy`, `/robots.txt` y `/sitemap.xml` respondieron `200`; `/api/integrations/google-calendar/status` sin sesión respondió `401` sin exponer configuración. En sesión, Ajustes acreditó configuración activa y convirtió de forma segura el grant legado de Sites en `reconnect_required` por el cambio de cliente/clave, sin modificar eventos.
- **Pendientes antes del acceso general:** completar la reautorización con el nuevo cliente y una cuenta de prueba, revisar Branding cuando Google Cloud vuelva a cargar, completar identidad/contactos legales reales, verificar `mybestversion.life` en Search Console, preparar el video/justificación de scopes y enviar la verificación de Google con autorización específica. La escritura controlada Google ↔ MBV requiere una autorización independiente.
- **Archivos modificados:** `app/privacy/page.tsx`, `app/robots.ts`, `app/sitemap.ts`, `src/features/legal/PrivacyPolicyContent.tsx`, `src/features/legal/LegalPages.tsx`, `src/features/settings/GoogleCalendarIntegrationCard.tsx`, `src/i18n/messages/features/calendar.ts`, `src/lib/legalConfig.ts`, `e2e/app.spec.ts`, `docs/integrations/google-calendar.md`, `docs/proyecto/ESTADO_ACTUAL.md` y este historial.

### 2026-09-15 — Reautorización de Google Calendar en producción

- **Identificador estable:** `MBV-H-031`.
- **Tipo de cambio:** configuración operativa OAuth, certificación autenticada y documentación; sin cambio de código de aplicación, despliegue ni eventos personales.
- **Área afectada:** usuario de prueba de Google Auth Platform, grant OAuth de Calendar y estado de la integración en Ajustes.
- **Qué se hizo:** se añadió una cuenta de prueba autorizada al proyecto `mbv-calendar-production` y se autorizó el cliente de `mybestversion.life` con identidad/email, lectura de la lista de calendarios y lectura/escritura de eventos. El primer retorno fue rechazado correctamente como `invalid_state`: Vercel registró 28 min 15 s entre `/connect` y el callback, frente al TTL de 10 minutos de cookie/state. Se inició un flujo nuevo y se completó dentro de la ventana válida.
- **Validación de producción:** el segundo recorrido llegó a `calendar=pending`, completó la activación autenticada y terminó en `calendar=connected`. Ajustes muestra la cuenta esperada, estado `Conectado` y los controles `Configurar` y `Sincronizar ahora` habilitados. Las solicitudes `connect`, callback y `complete` terminaron correctamente; el refresco automático posterior respondió `200` y sus trazas sólo muestran lectura `GET` de Google Calendar Events.
- **Seguridad:** se conservaron PKCE y la validación estricta de state; no se reutilizó el enlace vencido ni se debilitó la protección CSRF. No se pulsó sincronización manual, no se cambió la selección de calendarios y las trazas no contienen `POST`, `PATCH` ni `DELETE` contra Google: no se creó, editó ni eliminó ningún evento.
- **Pendientes antes del acceso general:** completar identidad/contactos legales reales, verificar el dominio en Search Console, preparar la evidencia y justificación de scopes, y enviar la verificación pública de Google sólo con autorización específica.
- **Archivos documentales:** `docs/integrations/google-calendar.md`, `docs/proyecto/ESTADO_ACTUAL.md` y este historial.

### 2026-09-16 — Pausa de Google Calendar y cierre del proyecto OAuth

- **Identificador estable:** `MBV-H-032`.
- **Tipo de cambio:** retirada temporal, cierre de infraestructura externa, protección del calendario local y actualización de privacidad.
- **Decisión confirmada:** la fundadora pidió eliminar Google Calendar por ahora y confirmó apagar el proyecto dedicado. En Google Cloud se verificó el destino exacto `MBV Calendar Production` (`mbv-calendar-production`, número `177884213036`) y, tras la confirmación, la consola mostró `Se está cerrando el proyecto “MBV Calendar Production”`. Google mantiene una ventana de recuperación de 30 días antes de la eliminación definitiva.
- **Aplicación:** `NEXT_PUBLIC_GOOGLE_CALENDAR_ENABLED=0` queda como estado por defecto. La tarjeta de integración, controles, badges, conflictos y eventos remotos dejan de mostrarse; el provider conserva su contrato pero no consulta, sincroniza ni reintenta. Los endpoints de usuario devuelven `404 CALENDAR_DISABLED`, webhook/mantenimiento responden `204` y el cron fue retirado.
- **Preservación funcional:** Mi espacio, Semana y Mi día mantienen el CRUD del calendario local. Un evento histórico vinculado que se edite durante la pausa pasa explícitamente a local; borrarlo sólo elimina su copia local y no intenta mutar Google.
- **Privacidad y reversibilidad:** no se purgaron tablas históricas de Supabase ni secretos de Vercel porque no se autorizó esa acción destructiva adicional. La app pausada no usa esos datos; la política y el centro de eliminación explican revocación desde Google y supresión mediante PQR/Centro de Privacidad. Reactivar exige un proyecto OAuth nuevo o recuperado, credenciales rotadas, revisión legal y QA completo.
- **Validación registrada:** TypeScript, ESLint, 33 archivos/185 pruebas unitarias, auditorías i18n/tokens, 22 pares de contraste y builds Next/Vinext aprobados. El E2E dirigido pasó 4/4 casos en desktop y mobile: integración externa ausente/sin llamadas API y CRUD de eventos locales conservado entre Mi espacio, Semana y Mi día.
- **Archivos principales:** `.env.example`, `vercel.json`, rutas `app/api/integrations/google-calendar/**`, `src/hooks/useCalendarIntegration.tsx`, superficies Calendar en Settings/Mi espacio/Semana/Mi día, copy legal, `e2e/app.spec.ts`, `docs/integrations/google-calendar.md`, `docs/proyecto/ESTADO_ACTUAL.md` y este historial.
- **Publicación:** pendiente. No se creó commit, no se hizo push y no se desplegó este cambio.

### 2026-09-16 — Implementación P2 de retención y crecimiento amable

- **Identificador estable:** `MBV-H-033`.
- **Tipo de cambio:** implementación funcional P2-A, hardening local-first, preparación analítica y sistema documental P2-B/P2-C; sin activación pública.
- **Base preservada:** se conservan P0/P1 y la pausa de Google Calendar de `MBV-H-032`. El calendario local continúa disponible y esta entrega no reactiva OAuth, sync ni el proyecto Google Cloud.
- **Retención P2-A:** Weekly Recap resume evidencia real de tareas, prioridades, hábitos, metas, hitos y reprogramaciones sólo hasta el día actual; registra decisiones textuales y prepara la semana siguiente. La experiencia de regreso sí propone acciones directas —pendiente, prioridad, mínimo viable, mover a hoy o soltar— sin culpa ni borrado implícito.
- **Crecimiento P2-A:** las share cards son voluntarias, previsualizables y exportables en Story 1080×1920, Feed 1080×1350 o cuadrado 1080×1080 usando únicamente métricas agregadas permitidas. Referral usa un código opaco estable, atribución first-touch local de hasta 29 días y sólo transmite esa atribución con consentimiento analítico. No se definió recompensa comercial ni se declara aprobación jurídica.
- **Analítica y lifecycle:** se añadió una taxonomía cerrada con allowlist de metadatos, cohortes observables y métricas agregadas de D1/D7/D30, WAU, recap, sharing, referrals y conversión. Las reglas lifecycle incluyen deduplicación y separación transaccional, pero no existe envío externo de email/push, proveedor ni UI final de preferencias.
- **Aislamiento de datos:** el repositorio IndexedDB usa un namespace por cuenta autenticada. La adopción de la base legacy es conservadora y reversible: no elimina el origen, espera escrituras pendientes y evita mezclar estados entre cuentas.
- **Flags y base remota:** `weekly_recap`, `return_experience`, `share_cards`, `referrals` y `premium_contextual_prompts` siguen apagados por defecto. Las cinco superficies consumen su flag; Premium sólo varía la descripción del gate de planificación a 5 años, conserva `canAccessFeature()` como autoridad y no altera otras capacidades. Tras revisión de seguridad, `migration list`, dry-run y lint, `202609160001_p2_growth_analytics.sql` se aplicó al proyecto enlazado `yvrvetuzuinoinukrivo`. El postcheck alineó el ledger local/remoto hasta `202609160001`, confirmó `Remote database is up to date` y dejó `db lint` sin resultados.
- **P2-B/P2-C:** quedaron definidos los sistemas de motion, diseño social y contenido, además de guías de fotografía/assets, portal de marca, campañas, partnerships y experimentación. Su documentación no equivale a producción de activos finales, licencias, canales lifecycle, campañas reales, presupuesto ni acuerdos externos; esas dependencias permanecen explícitamente pendientes.
- **Privacidad y seguridad:** sharing no toma texto libre del planner; sólo admite un titular opcional escrito/revisado explícitamente y nunca enviado a analytics. Referral no expone identidad; analytics continúa sujeto a consentimiento y no convierte la cohorte observable en una medición universal. Cualquier cambio de versión legal o reconsentimiento requiere revisión y decisión expresa.
- **Riesgo referral conservado:** el backend valida el formato opaco, pero todavía no registra propiedad del código ni fuerza en SQL el orden visita → signup dentro de una ventana propia. Como no hay recompensa y el flag sigue apagado, no bloquea merge; sí bloquea incentivos o rollout amplio hasta su hardening.
- **QA cerrado:** lint y TypeScript aprobados; 44 archivos/243 pruebas unitarias; builds Next y Vinext; 82 E2E aprobadas, 12 saltadas por diseño y 0 fallos en la suite completa previa; después del cableado Premium, su recorrido dirigido aprobó 2/2 en desktop/mobile. La matriz visual P2 cubre 375×812, 390×844, 430×932, 768×1024, 1366×768 y 1440×900, claro/oscuro y ES/EN Beta. i18n quedó en 1.404 claves estables, tokens en 291/291 y contraste en 22/22.
- **Archivos principales:** `src/domain/weeklyRecap.ts`, `src/domain/shareCards.ts`, `src/services/referralAttributionService.ts`, `src/domain/productAnalytics.ts`, `src/domain/lifecycle.ts`, `src/features/planning/WeeklyPlanView.tsx`, `src/features/dashboard/ReturnExperienceCard.tsx`, `src/features/sharing/ShareCardStudio.tsx`, `src/features/sharing/ReferralPrompt.tsx`, `src/repositories/local/IndexedDbPlannerRepository.ts`, `src/features/platform/PlatformPage.tsx`, `supabase/migrations/202609160001_p2_growth_analytics.sql`, `e2e/app.spec.ts` y documentación en `docs/product/`, `docs/analytics/`, `docs/design-system/`, `docs/brand/`, `docs/marketing/` y `docs/qa/`.
- **Estado de entrega:** working tree local y migración remota aplicada. No se creó commit, no se hizo push, no se desplegó P2 y ningún flag se activó en producción. Permanecen como gates de rollout el smoke autenticado, la revisión legal de referral y un owner/rollback explícito por flag.

### 2026-09-16 — Publicación controlada de la pausa Calendar y P2 detrás de flags

- **Identificador estable:** `MBV-H-034`.
- **Tipo de cambio:** consolidación Git, CI, despliegue Production, smoke público y actualización documental; sin activación de superficies P2 ni mutación de datos personales.
- **Commit funcional:** `7628074708e379dd5c79b9b76f3102022e25a5a6` (`feat: pause Calendar and prepare P2 retention`) consolida `MBV-H-032` y `MBV-H-033`. Se envió a `origin/main`; en el momento del release, `HEAD`, `main` y `origin/main` quedaron alineados.
- **CI:** GitHub Actions `35160635628` terminó en `success`; lint, typecheck, unit-tests y build aprobaron. El job E2E quedó omitido por diseño en push directo; la evidencia Playwright completa y dirigida ya estaba registrada en `MBV-H-032`/`MBV-H-033`.
- **Despliegue:** Vercel registró el deployment Production `6492084626` y el estado `Deployment has completed`. La URL única queda protegida por SSO; el alias público `https://mybestversion.life` sirve el release.
- **Smoke público:** el dominio y 21 rutas públicas respondieron `200`; `/privacy`, `/robots.txt` y `/sitemap.xml` entregaron contenido y tipos esperados. `GET /api/integrations/google-calendar/status` devolvió `404 {"error":"CALENDAR_DISABLED"}` y mantenimiento devolvió `204`, confirmando la pausa sin escrituras ni datos creados. La sesión web existente cargó el gate conservador de adopción de datos locales del nuevo release sin errores de consola; no se eligió ninguna opción ni se modificó el espacio de la usuaria.
- **Estado P2:** los cinco flags continúan apagados. Publicar el código no equivale a rollout; siguen pendientes el smoke autenticado de `/api/events`/métricas, owner y rollback por flag, hardening de referral y revisión legal antes de activación.
- **Estado Calendar:** la integración externa queda inactiva y el calendario local se conserva. El cierre del proyecto Google Cloud mantiene su ventana de recuperación; no se purgaron tablas históricas ni secretos porque no hubo autorización destructiva adicional.
- **Documentación:** `docs/proyecto/ESTADO_ACTUAL.md`, `docs/qa/p2-release-report.md`, `docs/product/p2-implementation-audit.md`, `docs/product/p2-roadmap.md`, `docs/integrations/google-calendar.md`, `docs/proyecto/README.md` y este historial.

### 2026-09-16 — Landing editorial y matriz comercial real

- **Identificador estable:** `MBV-H-035`.
- **Tipo de cambio:** implementación local de landing, alineación del acceso Premium y actualización documental; sin publicación en este task.
- **Landing:** la portada se descompone en features bajo `src/features/landing/`, con Playfair Display para titulares/acento editorial e Inter para navegación, cuerpo y controles. El tracker autenticado conserva Nunito Sans. La navegación interna usa `#inicio`, `#como-funciona`, `#que-incluye`, `#beneficios`, `#planes` y `#faq`.
- **Evidencia visual:** hero y showcase reutilizan capturas reales ya generadas e inspeccionadas por QA: Dashboard `p0-dashboard-1440x900.png`, Mi día `p0-today-390x844.png` y Hábitos `p0-habits-1440x900.png`. No se introdujeron mockups que pudieran confundirse con producto disponible.
- **Trial y matriz comercial:** la prueba mantiene 15 días, horizonte editable de tres meses, sin tarjeta y sin cobro automático. Premium comunica USD 2.99/mes y USD 30.99/año. Fitness y alimentación (`fitness_and_nutrition`) y planificación a cinco años (`five_year_planning`) están disponibles; análisis avanzado, recomendaciones con IA y planificación específica de un año quedan `coming_soon`, sin ruta ni acceso activo.
- **Acceso y datos:** `/app/health` usa `PremiumFeatureGate` con `account.access`; `superadmin` conserva el bypass. Entrenamientos, comidas, macros, medidas, fotos y el resto del planner continúan en IndexedDB local y no se sincronizan entre dispositivos por este cambio. Una capacidad experimental anterior y su ruta fueron retiradas de código y documentación sin modificar migraciones históricas aplicadas.
- **Checkout:** Landing y Upgrade obtienen una sola URL mediante `billingService` → `MercadoPagoBillingRepository` → `publicConfig.mercadoPagoCheckoutUrl`, configurada con `NEXT_PUBLIC_MERCADO_PAGO_URL` o su fallback público. Mensual y anual comparten ese destino; el selector sólo cambia copy y telemetría, no envía el periodo ni genera una preferencia distinta. El frontend no confirma pagos ni activa Premium; sigue faltando webhook, firma y conciliación idempotente.
- **Analítica, SEO y accesibilidad:** los eventos de landing esperan consentimiento analítico hidratado y cada vista se registra una sola vez. El canonical y el copy SEO comercial quedan acotados a `/`; la imagen Open Graph existente continúa como preview social. Menú móvil, FAQ, skip link, foco, movimiento reducido, texto alternativo y estados no dependientes sólo del color se validaron con teclado y contraste AA.
- **Validación local:** TypeScript, ESLint, build de producción Next y `git diff --check` pasaron; Vitest aprobó 46 archivos y 254 pruebas. Playwright aprobó los cuatro escenarios de landing, la regresión pública y el gate Premium contextual, con revisión sin overflow en 375, 390, 430, 768, 1024, 1280 y 1440 px.
- **Documentación:** se actualizaron README, autenticación/facturación, matriz Trial/Premium, arquitectura, IA, tipografía, manifiesto de assets y continuidad. Los informes históricos nombran la capacidad retirada sólo de forma genérica.
- **Estado de entrega:** cambios locales en el working tree. **No se creó un release ni se desplegó la nueva landing en este task**; `mybestversion.life` continúa en el SHA publicado `7628074708e379dd5c79b9b76f3102022e25a5a6` hasta un commit, push, CI y despliegue posteriores.

### 2026-09-16 — Publicación de landing editorial y acceso Premium

- **Identificador estable:** `MBV-H-036`.
- **Tipo de cambio:** migración forward-only, consolidación Git, CI, despliegue Production, smoke público y cierre documental de `MBV-H-035`.
- **Base de datos:** el dry-run enumeró exclusivamente `202609160002_landing_analytics.sql`. Supabase aplicó la migración transaccional al proyecto enlazado `yvrvetuzuinoinukrivo`; el ledger local/remoto quedó alineado hasta `202609160002`, el dry-run posterior devolvió `Remote database is up to date` y `db lint --linked --level error` terminó con cero resultados. No se borraron tablas ni datos.
- **Commit funcional y push:** `7abddae651f34ff4e086a5b6a278c7032c73466d` (`feat: launch editorial landing and premium access`) contiene 52 archivos y se envió a `origin/main` sin archivos temporales ni secretos detectados.
- **CI:** GitHub Actions `35168586376` terminó en `success`; lint, typecheck, unit-tests y build aprobaron. La suite registra 46 archivos y 254 pruebas. El job E2E quedó omitido por diseño en push directo; la matriz Playwright local de `MBV-H-035` ya estaba aprobada.
- **Despliegue:** Vercel publicó `5sUK7zBYxYyeQC5sRBkiVsw8R5u4` en 49 segundos, con estado `Ready`, entorno `Production`, marca `Latest`, source exacto `main`/`7abddae` y dominio actual `mybestversion.life`.
- **Smoke público:** Chromium validó a 390×844 y 1440×900 el título SEO, hero “Tu mejor versión empieza aquí”, promo de 15 días, anchors, precio mensual, selector/precio anual, checkout oficial, rutas Trial/Login, FAQ accesible y ausencia de overflow o errores de consola. `/trial`, `/login`, `/upgrade`, `/privacy`, `/robots.txt` y `/sitemap.xml` respondieron `200`; Calendar status devolvió `404 {"error":"CALENDAR_DISABLED"}` y mantenimiento `204`.
- **Observabilidad:** los logs del deployment mostraron cero warnings, errores o fatales y las peticiones del smoke con estados esperados. La sesión autenticada alcanzó el gate conservador de adopción de datos locales; no se eligió opción ni se modificaron datos de la usuaria.
- **Alcance:** la publicación no activó flags P2, no añadió un plan gratuito permanente y no convirtió capacidades `coming_soon` en funciones disponibles. Mercado Pago continúa sin webhook/conciliación automática y ambos periodos comparten el checkout vigente.

### 2026-09-19 — Publicación del acceso comercial v2

- **Identificador estable:** `MBV-H-037`.
- **Tipo de cambio:** acceso comercial, landing, administración, migración forward-only, CI, despliegue Production, smoke público y documentación; sin habilitar cobros ni correo transaccional real.
- **Oferta vigente:** nuevas altas reciben Gratis permanente. Premium conserva las mismas capacidades en USD 2.99/mes o USD 29.99/año. La campaña de constancia puede dejar una cuenta elegible después de 30 fechas válidas consecutivas y sólo un superadmin puede activar manualmente los 30 días promocionales con confirmación explícita.
- **Backend comercial:** se incorporaron checkout mensual/anual server-side, intentos idempotentes, webhook firmado, conciliación, recuperación conservadora de checkout stale, cancelación autoservicio con paid-through, serialización por cuenta, administración y outbox de correo. Volver del proveedor no activa Premium y el cliente no modifica la autoridad de acceso.
- **Base de datos:** antes de migrar se creó un respaldo operativo no versionado de los campos afectados, con SHA-256 `0F564B55161469844970A8DB83365D8B7D3F1FE023B7567BC49CC14CD3ACEEFA`. `202609190001_commercial_access_v2.sql` se aplicó a Supabase Production; el dry-run posterior quedó al día y los postchecks confirmaron 11 tablas comerciales, RPC, alta Gratis y normalización prevista de accesos históricos.
- **Validación:** lint, TypeScript, build Vercel, auditorías de tokens/i18n/contraste y 61 archivos/357 pruebas unitarias aprobaron. El recorrido comercial focal aprobó 8/8 casos desktop/mobile y la matriz P2 cubrió seis tamaños, ES/EN y claro/oscuro. El smoke público validó `/`, `/trial`, `/upgrade`, `/privacy` y `/login` a 1440×900 y 390×844 sin overflow, errores de consola ni contenido comercial legado.
- **Publicación:** el commit funcional `7fba6e996217ddb8320bb2853d6caca05757f244` se envió a `origin/main`. GitHub Actions `35460493277` aprobó lint, tipos, unit y build. Vercel publicó `C8BgoZGgmU7K6j7TYztHNN7KcCh8` como `Ready`/`Production` y lo asoció a `mybestversion.life`.
- **Límites operativos:** Vercel permanece en Hobby; no están configurados token/modo/firma de Mercado Pago ni transporte/remitente de email. Cobros y correo real quedan apagados hasta migrar a un plan apto para operación comercial, certificar sandbox USD mensual/anual, webhook y cancelación, y conectar un proveedor transaccional verificado. Google Calendar continúa pausado.
- **Archivos documentales:** `docs/product/commercial-access-v2.md`, `docs/product/trial-premium-matrix.md`, `docs/AUTH_BILLING_SETUP.md`, `docs/proyecto/ESTADO_ACTUAL.md` y este historial.

### 2026-09-19 — Integración transaccional Resend publicada y verificada

- **Identificador estable:** `MBV-H-038`.
- **Tipo de cambio:** integración de infraestructura, transporte transaccional y publicación productiva.
- **Avance verificable:** Vercel Marketplace aprovisionó el recurso gratuito `mbv-transactional-email`. Resend muestra `mybestversion.life` con estado **Verified** y listo para enviar correos.
- **Configuración:** `RESEND_API_KEY` y `RESEND_EMAIL_DOMAIN` existen como secretos limitados únicamente a Production del proyecto Vercel. No se copiaron a Preview o Development y la documentación no registra sus valores, identificadores sensibles ni datos personales.
- **Decisión fail-closed implementada:** las credenciales por sí solas no drenan el outbox. El transporte exige además `TRANSACTIONAL_EMAIL_ENABLED=1`, valida remitente/dominio/base URL y conserva las filas sin reclamar cuando la configuración es incompleta.
- **Transporte y outbox:** el adaptador Resend usa la clave de deduplicación como idempotency key, tags controlados, `providerMessageId` real y errores estables sin PII. Mantenimiento conecta el renderer canónico y las rutas vigentes de Dashboard, Mi plan y ficha administrativa.
- **Auditoría previa:** antes de activar la kill switch se consultaron únicamente conteos agregados del outbox productivo; había `0` filas pendientes en `generated`, `queued` o `failed`.
- **Prueba real controlada:** se envió exactamente un correo mediante el mismo renderer/transporte, sin crear pago ni escribir en Supabase. El asunto fue `[PRUEBA] Tu Premium de My Best Version está activo: empieza por aquí`, el importe visible fue `USD 0,00` y el cuerpo indicó que no hubo cargo real. Resend confirmó primero `accepted` y luego `Delivered`. El endpoint y secreto temporales usados para el smoke se retiraron antes del código final.
- **Seguridad y semántica:** un fallo de entrega no debe revertir acceso o pago. La evidencia futura debe distinguir `accepted` de `delivered` y no puede presentar una aceptación del proveedor como entrega confirmada.
- **Pruebas ejecutadas:** 31/31 focales de email/comercial, 360/360 unitarias completas, TypeScript, ESLint, build Vercel, auditoría i18n y auditoría de tokens aprobadas; `git diff --check` sin errores (sólo avisos de CRLF del worktree).
- **Commit y push:** `7af51a3f8b13eb602b90d74d37c923ecdbcabc0e` se envió a `origin/feat/commercial-access-v2` y `origin/main` por avance directo verificable.
- **CI y deploy:** GitHub Actions `35479356783` aprobó lint, tipos, 360 pruebas y build. Vercel Production `dpl_89C9CvoSuB7F7SsKgAoUgvdb6w42` quedó `Ready` en 53 segundos y asociado a `mybestversion.life`. El smoke público devolvió HTTP 200 en `/`, HTTP 401 en mantenimiento anónimo y confirmó que la ruta temporal de email ya no existe como API.
- **Estado de entrega:** integración completa. El siguiente control es observar el primer ciclo regular del outbox; no se debe repetir el correo de prueba.
- **Archivos documentales:** `docs/AUTH_BILLING_SETUP.md`, `docs/product/commercial-access-v2.md`, `docs/proyecto/ESTADO_ACTUAL.md` y este historial.
