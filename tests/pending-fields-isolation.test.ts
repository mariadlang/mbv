// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { beginPendingTrace, endPendingTrace, tracedUser } from "./helpers/pendingFieldsTrace";

beforeEach(context => beginPendingTrace(context.task.name));
afterEach(async () => { await endPendingTrace(); cleanup(); });

it("cancels and drains unfinished typing before the next case takes focus", async () => {
  let release!: () => void;
  let entered!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { entered = resolve; });
  const firstView = render(createElement("input", { "aria-label": "first" }));
  const first = firstView.getByRole("textbox") as HTMLInputElement;
  first.focus();
  const oldUser = tracedUser({ skipClick: true, advanceTimers: () => { entered(); return held; } });
  const typing = oldUser.type(first, "Mi intención aceptada");
  const cancellation = expect(typing).rejects.toThrow("Test interaction cancelled during cleanup");
  await started;
  await endPendingTrace();
  await cancellation;
  expect(first.value).toBe("");
  cleanup();

  beginPendingTrace("next case after cancelled typing");
  const secondView = render(createElement("input", { "aria-label": "second" }));
  const second = secondView.getByRole("textbox") as HTMLInputElement;
  second.focus();
  release();
  await tracedUser({ skipClick: true }).type(second, "Mi intención aceptada");
  expect(second.value).toBe("Mi intención aceptada");
  expect(first.value).toBe("");
  expect(first.isConnected).toBe(false);
  await expect(oldUser.type(second, "late text")).rejects.toThrow("Test interaction cancelled during cleanup");
  expect(second.value).toBe("Mi intención aceptada");
});
