# Framework de experimentación

## Principio

Un experimento reduce incertidumbre de producto; no justifica patrones manipulativos. La unidad de decisión es una hipótesis con resultado y guardrails, no una variante “ganadora” por clics.

## Plantilla

| Campo | Contenido requerido |
| --- | --- |
| ID / owner | nombre estable, responsable y fechas |
| Problema | evidencia y segmento no sensible |
| Hipótesis | cambio → conducta esperada → por qué |
| Superficie | ruta/paso exacto; un experimento relevante por paso |
| Variante control/tratamiento | diferencia mínima interpretable |
| Métrica primaria | activación, retención, valor o conversión con ventana |
| Guardrails | errores, abandono, soporte, privacidad, accesibilidad, latencia |
| Cohorte/exclusiones | elegibilidad previa y denominador observable |
| Sample/duración | cálculo o límite explícito; no detener por picos tempranos |
| Implementación | flag, asignación, exposición y kill switch |
| Resultado | efecto, intervalo/incertidumbre, anomalías |
| Decisión | adoptar, iterar, descartar o inconcluso |

## Flags y asignación

Los flags P2 se resuelven desde configuración pública y están apagados por defecto. En P2 no existe aún un servicio de asignación persistente: por tanto se usan para rollout controlado, no para afirmar resultados A/B. Como exigen un nuevo build/deploy, no son un kill switch remoto instantáneo; esa capacidad queda como requisito futuro.

Antes de ejecutar un experimento real:

1. asignación estable por cuenta, no por contenido ni atributo sensible;
2. variante inmutable durante la ventana;
3. exposición sólo cuando la variante se renderiza;
4. exclusión mutua para cambios sobre el mismo paso;
5. fallback control ante fallo;
6. auditoría de configuración y fecha de cierre.

## Análisis

- Definir ventana antes de observar resultados.
- Reportar numerador, denominador, tamaño de cohorte y pérdidas de observabilidad.
- Segmentar sólo por dimensiones previamente aprobadas y con tamaño suficiente.
- No perseguir clics si cae activación, retorno, accesibilidad o confianza.
- Retención actual debe etiquetarse según su definición SQL; no mezclar rolling retention con retorno en una ventana exacta.

## Privacidad

No experimentar usando emociones, salud, finanzas, journal, texto de metas, hábito escrito, identidad, demografía sensible o inferencias psicológicas. `experiment_exposure_recorded` sólo admite ID de experimento, variante, flag y surface tokenizados.

## Registro de experimentos

| ID | Hipótesis | Flag | Estado | Métrica | Decisión |
| --- | --- | --- | --- | --- | --- |
| — | No hay experimentos activos en P2 | — | preparado, no iniciado | — | requiere plan y asignación persistente |
