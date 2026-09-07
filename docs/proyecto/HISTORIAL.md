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

## Nota sobre el grafo

El repositorio no es superficial. `main` alcanza 61 commits y contiene dos raíces: `18fe17f` y `1002103`. Varias mejoras aparecen en pares o variantes para la línea principal y ramas de Sites; se fusionaron mediante `5a52b46`, `82bb24e` y `c357130`. Las referencias `sites/main`, `sites-v7/main`, `sites/current`, `sites/latest`, `sites/remote-main` y `sites-publish` son ancestros de `main`; no contienen trabajo adelantado respecto a `main` en la revisión. No hay etiquetas Git.

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
- **Archivos principales:** `src/features/planning/WeeklyPlanView.tsx`, `src/features/planning/PlanningPage.tsx`, `src/services/plannerService.ts`, `src/hooks/usePlanner.ts`, `src/components/layout/AppShell.tsx`, `app/layout.tsx`, `app/globals.css`, `src/i18n/translations.ts` y `e2e/app.spec.ts`.
- **Evidencia visual:** `outputs/weekly-plan-option-b-1488x992.png` y `outputs/weekly-plan-option-b-full.png`, generadas con datos locales aislados.
- **Estado de implementación:** incluido en la entrega consolidada a `main` y en la publicación del Site del 2026-09-07.
- **Validación ejecutada:** ESLint y TypeScript aprobados; 69 pruebas unitarias aprobadas; build de producción aprobado. Los E2E específicos de la semana aprobaron en desktop/mobile, junto con 390×844, 430×932, 768×1024, 1440×900 y 1488×992. La suite global obtuvo 57/60 en paralelo; dos fallos externos aprobaron de forma aislada y la matriz global desktop restante terminó por `ERR_NETWORK_IO_SUSPENDED`, no por una aserción de producto.
- **Pendientes o limitaciones:** reintentar la matriz E2E global desktop con conectividad estable.
