# Primitives vigentes

**Estado:** vigente desde P1.

Los primitives compartidos viven en `src/components/ui`. Su objetivo es consolidar comportamiento repetido y accesible sin convertir cada patrón específico de una feature en una abstracción global.

## Contratos

- `Button`: variantes `primary`, `secondary`, `outline`, `ghost`, `text` y `danger`; tamaños `sm`, `md`, `lg`; estados disabled, loading y feedback semántico.
- `IconButton`: acción sólo icono con nombre accesible obligatorio.
- `Card`, `StatCard`: superficies y métricas; el contenido sigue siendo responsabilidad de cada feature.
- `Badge`, `Chip`: estado informativo y selección. `Chip` conserva `aria-pressed` como contrato.
- `Tabs`, `TabPanel`: semántica ARIA, relación tab/panel y teclado con flechas, Home y End.
- `SegmentedControl`: alterna una vista o modo sin representar páginas de contenido.
- `FormField`, `FormActions`: asocian label, ayuda, error y acciones sin ocultar el control nativo.
- `ProgressBar`, `ProgressRing`: valor limitado a 0–100 y nombre accesible.
- `Alert`, `InlineMessage`: feedback informativo, success, warning o danger; danger se anuncia como `alert`.
- `Skeleton`, `EmptyState`, `SectionHeading` y `TextLink`: carga, vacío, jerarquía y navegación editorial.
- `LoadingState`, `ErrorState`: estados completos con anuncio semántico y espacio para recuperación.
- `Modal`: diálogo modal con Escape, bloqueo de scroll, trampa y restauración de foco.

## Cuándo usar cada primitive

| Primitive | Variantes o función | Usar cuando | No usar cuando | Contrato accesible |
| --- | --- | --- | --- | --- |
| `Button` | `primary`, `secondary`, `outline`, `ghost`, `text`, `danger`; `sm`, `md`, `lg`; loading y feedback | La persona ejecuta una acción | El destino es navegación; usar un enlace con estilo de botón | Conserva nombre, foco, `disabled` y `aria-busy` |
| `IconButton` | Acción de icono único | El icono es estándar y el espacio es limitado | La acción necesita explicación visible | `label` es obligatorio y crea el nombre accesible |
| `Card` / `StatCard` | Superficie o resumen cuantitativo | Hay contenido relacionado que necesita agrupación | Una capa extra no aporta jerarquía | No introduce roles interactivos por sí sola |
| `Badge` / `Chip` | Estado; selección binaria | Badge informa y Chip cambia selección | Se necesita navegación o una acción primaria | Chip expone `aria-pressed`; el estado no depende sólo del color |
| `Tabs` / `TabPanel` | Vistas mutuamente excluyentes | Varias vistas comparten contexto y una permanece visible | Son filtros que no cambian un panel, o enlaces a páginas | Tablist/tab/tabpanel, roving focus, flechas, Home y End |
| `SegmentedControl` | Cambio de modo o visualización | Las opciones son breves y equivalentes | El contenido necesita semántica de tabs | Grupo nombrado y selección mediante `aria-pressed` |
| `FormField` / `FormActions` | Label, ayuda, error y acciones | Un control nativo necesita asociación y feedback | El control compuesto exige un `fieldset` propio | `htmlFor`, `aria-describedby`, `aria-invalid` y error anunciado |
| `Alert` / `InlineMessage` | `info`, `success`, `warning`, `danger` | Se comunica resultado o contexto persistente | Es sólo texto descriptivo normal | Danger usa `role="alert"`; otros tonos usan estado no intrusivo |
| `LoadingState` / `ErrorState` / `Skeleton` | Estados de una superficie | Una espera o fallo reemplaza contenido | La operación cabe dentro de un botón | Loading se anuncia; Error permite recuperación; Skeleton es decorativo |
| `ProgressBar` / `ProgressRing` | Progreso 0–100 | Existe un denominador comprensible | Ánimo o satisfacción se presentarían como rendimiento | Valor limitado, label accesible y explicación cercana |
| `EmptyState` / `SectionHeading` / `TextLink` | Vacío, jerarquía y enlace editorial | Una superficie necesita orientación clara | Se busca decorar sin aportar decisión | Jerarquía semántica y copy orientado a la siguiente acción |
| `Modal` | Diálogo bloqueante con título y descripción | La tarea es breve y necesita conservar contexto | El flujo es largo o requiere una URL compartible | `aria-modal`, Escape, focus trap, retorno de foco y scroll lock |

## Estados mínimos

Todo control interactivo debe conservar default, hover, active, `:focus-visible`, disabled y, cuando haya una operación asíncrona, loading. Success, warning y error se expresan con tokens semánticos y nunca sólo mediante color.

## Límites de adopción

Los controles con lógica específica —filas editables, calendarios, selectores de días y compositores— pueden permanecer en su feature. Se promueve un patrón a primitive cuando aparece en varias superficies y comparte semántica, teclado y estados.

## Accesibilidad

- Objetivo táctil mínimo: 44 × 44 px para acciones principales y controles sólo icono.
- El foco visible nunca se elimina sin reemplazo equivalente.
- Tabs usan selección única y navegación con teclado.
- Los mensajes de error deben asociarse al campo cuando exista uno y anunciarse con `role="alert"`.
- El contenido creado por la usuaria no se usa como clave ni se transforma desde el sistema de traducción.

## Ejemplos técnicos

```tsx
<Button loading={saving} disabled={!isValid} feedback="success">
  Guardar cambios
</Button>

<IconButton label="Cerrar" onClick={onClose}>
  <X aria-hidden="true" />
</IconButton>
```

Cuando varios tabs controlan un único panel dinámico, todos reciben el mismo `panelId` y el panel apunta al tab activo:

```tsx
<Tabs
  id="task-tabs"
  ariaLabel="Vistas de tareas"
  items={views}
  value={view}
  onChange={setView}
  panelId="task-list-panel"
/>
<div
  id="task-list-panel"
  role="tabpanel"
  aria-labelledby={`task-tabs-${view}-tab`}
>
  {content}
</div>
```

```tsx
<FormField label="Nombre" hint="Así aparecerá en tu espacio" error={errors.name} required>
  <input value={name} onChange={handleName} />
</FormField>
<FormActions>
  <Button variant="ghost">Cancelar</Button>
  <Button type="submit">Guardar</Button>
</FormActions>
```

Los textos de estos ejemplos son ilustrativos. En superficies migradas deben proceder de `m("clave.estable")` y el contenido personal debe mantenerse fuera del traductor.
