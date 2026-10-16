// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDraftImageReader } from "./useDraftImageReader";

class DeferredReader {
  static instances: DeferredReader[] = [];
  result = "data:image/png;base64,test";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  abort = vi.fn();
  readAsDataURL = vi.fn();
  constructor() { DeferredReader.instances.push(this); }
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); DeferredReader.instances = []; });
describe("draft image reads", () => {
  it("ignores an old read after another file is selected", () => {
    vi.stubGlobal("FileReader", DeferredReader);
    const { result } = renderHook(useDraftImageReader);
    const accept = vi.fn(); const failure = vi.fn();
    act(() => result.current.read(new File([], "first.png"), accept, failure));
    expect(result.current.reading).toBe(true);
    act(() => result.current.read(new File([], "second.png"), accept, failure));
    act(() => DeferredReader.instances[0].onload?.());
    expect(accept).not.toHaveBeenCalled();
    expect(result.current.reading).toBe(true);
    act(() => DeferredReader.instances[1].onload?.());
    expect(accept).toHaveBeenCalledTimes(1);
    expect(result.current.reading).toBe(false);
  });
  it("ignores a read after reset or unmount and exposes errors without locking the editor", () => {
    vi.stubGlobal("FileReader", DeferredReader);
    const { result, unmount } = renderHook(useDraftImageReader);
    const accept = vi.fn(); const failure = vi.fn();
    act(() => result.current.read(new File([], "a.png"), accept, failure));
    act(() => result.current.cancel());
    act(() => DeferredReader.instances[0].onload?.());
    expect(accept).not.toHaveBeenCalled();
    act(() => result.current.read(new File([], "b.png"), accept, failure));
    act(() => DeferredReader.instances[1].onerror?.());
    expect(failure).toHaveBeenCalledTimes(1);
    expect(result.current.reading).toBe(false);
    act(() => result.current.read(new File([], "c.png"), accept, failure));
    unmount();
    DeferredReader.instances[2].onload?.();
    expect(accept).not.toHaveBeenCalled();
    expect(DeferredReader.instances[2].abort).toHaveBeenCalledTimes(1);
  });
});
