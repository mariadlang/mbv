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

`pnpm build:vinext` se ejecutó y se detuvo de forma segura porque el entorno local aislado no contiene `NEXT_PUBLIC_SUPABASE_URL` ni `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No se copiaron secretos desde otro worktree ni se inventaron valores. El destino productivo de esta entrega es Vercel/Next; el resultado de CI y de su build productivo se añadirá al cierre del release.

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
- La verificación autenticada de producción requiere una cuenta de prueba expresamente autorizada. Si no existe, el smoke productivo se limita a superficies públicas y al comportamiento de acceso anónimo.
