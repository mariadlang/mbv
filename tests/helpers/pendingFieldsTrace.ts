import { appendFileSync } from "node:fs";
import userEvent from "@testing-library/user-event";

// Opt-in diagnostics: only synthetic test values, never mounted in the app.
type Trace = { name: string; start: number; closed: boolean; pending: Set<string>; interactions: Set<Promise<unknown>>; sequence: number; stopped: Promise<void>; stop(): void };
let current: Trace;
const traces: Trace[] = [];
function emit(owner: Trace, event: string, details: object = {}) {
  const path = process.env.MBV_PENDING_TRACE;
  if (path) appendFileSync(path, JSON.stringify({ test: owner.name, ms: performance.now() - owner.start, event, afterCleanup: owner.closed, ...details }) + "\n");
}
function field(element: unknown) {
  if (!(element instanceof HTMLElement)) return {};
  return { tag: element.tagName, connected: element.isConnected, disabled: element.matches(":disabled"), value: "value" in element ? element.value : undefined };
}
export function beginPendingTrace(name: string) {
  let stop!: () => void;
  const stopped = new Promise<void>(resolve => { stop = resolve; });
  current = { name, start: performance.now(), closed: false, pending: new Set(), interactions: new Set(), sequence: 0, stopped, stop };
  traces.push(current);
  emit(current, "test:start", { earlierPending: traces.filter(t => t !== current && t.pending.size).map(t => ({ name: t.name, pending: [...t.pending] })) });
}
export function pendingTrace(event: string, details: object = {}) { emit(current, event, details); }
export async function endPendingTrace() {
  const owner = current;
  emit(owner, "cleanup:before", { pending: [...owner.pending] });
  owner.closed = true;
  owner.stop();
  // Vitest's timeout ends its wait, not user-event's keyboard loop. Cancel at
  // its next scheduling boundary and drain before another case can take focus.
  await Promise.allSettled([...owner.interactions]);
  emit(owner, "cleanup:drained", { interactions: owner.interactions.size });
}
export function tracedUser(options: Parameters<typeof userEvent.setup>[0] = {}) {
  const owner = current;
  const user = userEvent.setup({ ...options, advanceTimers: async delay => {
    if (owner.closed) throw new Error("Test interaction cancelled during cleanup");
    await Promise.race([Promise.resolve(options.advanceTimers?.(delay)), owner.stopped]);
    if (owner.closed) throw new Error("Test interaction cancelled during cleanup");
  } });
  function interaction<T>(label: string, operation: () => Promise<T>, element: Element, details = {}) {
    const result = tracked(owner, label, operation, element, details);
    owner.interactions.add(result);
    void result.then(() => owner.interactions.delete(result), () => owner.interactions.delete(result));
    return result;
  }
  return {
    ...user,
    click: (element: Element) => interaction("click", () => user.click(element), element),
    clear: (element: Element) => interaction("clear", () => user.clear(element), element),
    type: (element: Element, text: string) => interaction("type", () => user.type(element, text), element, { text }),
  };
}
async function tracked<T>(owner: Trace, label: string, operation: () => Promise<T>, element?: Element, details = {}): Promise<T> {
  if (owner.closed) throw new Error("Test interaction cancelled during cleanup");
  const id = `${++owner.sequence}:${label}`;
  owner.pending.add(id);
  emit(owner, label + ":start", { id, ...field(element), ...details });
  try { const result = await operation(); emit(owner, label + ":end", { id, ...field(element) }); return result; }
  catch (error) { emit(owner, label + ":error", { id, message: String(error) }); throw error; }
  finally { owner.pending.delete(id); }
}
export function tracedSave<T>(operation: () => Promise<T>) {
  const owner = current;
  return () => tracked(owner, "save", operation);
}
