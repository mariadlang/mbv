# Validación del cierre funcional y UX

Fecha de ejecución: **2026-09-24 a 2026-09-28**, America/Bogota.

## Automatización aprobada

- `pnpm test`: **68 archivos, 399 pruebas** aprobadas.
- `pnpm lint`: aprobado.
- `pnpm exec tsc --noEmit`: aprobado después de generar los tipos de Next.
- `pnpm audit:i18n`: **1.598 claves estables ES/EN** y **803/803** entradas legacy; aprobado con advertencias conocidas de claves dinámicas/no usadas.
- `pnpm audit:design-tokens`: **298/298** coincidencias dentro del baseline; aprobado.
- `pnpm test:contrast`: **22/22** pares aprobados.
- `pnpm build`: aprobado con Next.js 16.2.6 y 21 rutas.
- `git diff --check`: sin errores; sólo advertencias CRLF del worktree de Windows.

`pnpm build:vinext` se ejecutó y se detuvo de forma segura porque el entorno local aislado no contiene `NEXT_PUBLIC_SUPABASE_URL` ni `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No se copiaron secretos desde otro worktree ni se inventaron valores. El destino productivo de esta entrega es Vercel/Next; su build local y el build de CI aprobaron.

## Navegador real

Playwright usa Chromium, datos sintéticos identificables, Auth simulado y el repositorio local de prueba. No utiliza cuentas ni contenido personal.

Flujos dirigidos aprobados en **1440×900** y **390×844**:

- fecha importante incompleta, mensaje accesible, corrección y reapertura;
- guardado repetido sin duplicar una acción;
- Meta → resultado mensual → Semana → Mi día → Progreso;
- logro nocturno de Bogotá durante 31 de diciembre → 1 de enero;
- hábito medible `4/10` → navegación → recarga → edición a `6/10` desde el editor compartido;
- días anteriores al inicio mostrados como `Sin seguimiento`;
- proyecto listo para cerrar → cierre explícito → reapertura;
- rueda de vida sin promedio implícito → reflexión sin confirmación → confirmación explícita persistente;
- modo inglés en los flujos actualizados.

La suite E2E completa y la matriz visual existente también se ejecutaron. El primer proceso permaneció suspendido por el host durante 10,3 horas: 91 casos aprobaron, 16 se omitieron por diseño, cuatro quedaron interrumpidos y uno detectó una expectativa antigua (`Tu prueba`) frente al copy comercial ya vigente (`Tu prueba anterior`). Tras alinear esa aserción, el grupo de cinco escenarios se repitió en ambos proyectos: 9 aprobaron y 1 se omitió por diseño. Resultado compuesto final: **96/96 casos ejecutables aprobados y 16 omisiones intencionales**.

## Compatibilidad y límites

- Los respaldos legacy con fechas importantes incompletas y las nuevas claves opcionales se validaron.
- No se reescribieron timestamps ni datos históricos.
- No se ejecutaron pagos, correos, OAuth ni comunicaciones externas.
- El smoke autenticado de producción se ejecutó con la sesión disponible sin accionar controles que escriben en el planner ni inspeccionar contenido personal detallado. La carga de rutas puede registrar actividad de retorno o telemetría consentida.

## Publicación y smoke de producción

- Commit funcional: `ad0fa5d08c959f883dafd6d56123ee96920f5bf6` (`fix: close planning habits and project UX gaps`).
- Push: `origin/fix/ux-audit-2026-09-24` y avance directo sin force push de `origin/main` al mismo SHA.
- GitHub Actions: ejecución [`36465516462`](https://github.com/mariadlang/mbv/actions/runs/36465516462), `success`; lint, typecheck, unit-tests y build aprobaron. E2E se omitió por diseño en push y queda cubierto por la matriz local descrita arriba.
- Vercel: deployment Production de GitHub `6717547820`, `success`, asociado al mismo SHA; URL única `https://vercel-upload-r4u74ncaz-mariadelosangelesgtg-4145s-projects.vercel.app` y alias público `https://mybestversion.life`.
- Superficies públicas comprobadas: landing, Política de Privacidad y Trial.
- Superficies autenticadas comprobadas: Planificación, Plan semanal, Hábitos, Metas, Proyectos y tareas, Visión, Progreso y Mi día.
- Matriz del smoke: **1440×900** y **390×844**; títulos/rutas correctos, contenido principal presente, sin carga atascada, sin overflow horizontal y sin errores de consola.
