// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { createMemoryRouter, Link, Outlet, RouterProvider } from "react-router-dom";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { UnsavedDraftProvider, useUnsavedDraft } from "./UnsavedDraftProvider";
afterEach(cleanup);
function harness(save = vi.fn(async () => true)) {
  function Editor() {
    const [text, setText] = useState("");
    const draft = useUnsavedDraft({ dirty: Boolean(text), onSave: async () => { const ok = await save(); if (ok) setText(""); return ok; }, onDiscard: () => setText("") });
    return <><input aria-label="Borrador" value={text} onChange={(event) => setText(event.target.value)} /><Link to="/other">Otra pantalla</Link><button onClick={() => draft.request(() => setText(""))}>Cerrar editor</button></>;
  }
  const router = createMemoryRouter([{ element: <I18nProvider><UnsavedDraftProvider><Outlet /></UnsavedDraftProvider></I18nProvider>, children: [{ path: "/", element: <Editor /> }, { path: "/other", element: <p>Destino</p> }] }]);
  return { ...render(<RouterProvider router={router} />), router, save };
}
describe("unsaved drafts", () => {
  it("keeps a draft, then saves once and resumes the requested navigation", async () => {
    const view = harness();
    fireEvent.change(view.getByLabelText("Borrador"), { target: { value: "No perder" } });
    fireEvent.click(view.getByText("Otra pantalla"));
    await waitFor(() => expect(view.getByRole("dialog")).toBeTruthy());
    fireEvent.click(view.getByText("Seguir editando"));
    expect((view.getByLabelText("Borrador") as HTMLInputElement).value).toBe("No perder");
    fireEvent.click(view.getByText("Otra pantalla"));
    fireEvent.click(await view.findByText("Guardar y continuar"));
    await view.findByText("Destino");
    expect(view.save).toHaveBeenCalledTimes(1);
  });
  it("retains failed saves and discards only after an explicit choice", async () => {
    const view = harness(vi.fn(async () => false));
    fireEvent.change(view.getByLabelText("Borrador"), { target: { value: "Texto" } });
    fireEvent.click(view.getByText("Cerrar editor"));
    fireEvent.click(view.getByText("Guardar y continuar"));
    await view.findByRole("alert");
    expect((view.getByLabelText("Borrador") as HTMLInputElement).value).toBe("Texto");
    fireEvent.click(view.getByText("Descartar cambios"));
    await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());
    expect((view.getByLabelText("Borrador") as HTMLInputElement).value).toBe("");
    fireEvent.click(view.getByText("Otra pantalla"));
    await view.findByText("Destino");
  });
  it("blocks browser-history navigation, not only clicked links", async () => {
    const view = harness();
    await view.router.navigate("/other"); await view.router.navigate("/");
    fireEvent.change(await view.findByLabelText("Borrador"), { target: { value: "Atrás" } });
    await view.router.navigate(-1);
    fireEvent.click(await view.findByText("Seguir editando"));
    expect(view.router.state.location.pathname).toBe("/");
    fireEvent.click(view.getByText("Cerrar editor"));
    fireEvent.click(view.getByText("Descartar cambios"));
  });
  it("does not navigate or double-save until persistence has completed", async () => {
    let resolve!: (ok: boolean) => void;
    const save = vi.fn(() => new Promise<boolean>((done) => { resolve = done; }));
    const view = harness(save);
    fireEvent.change(view.getByLabelText("Borrador"), { target: { value: "Esperar guardado" } });
    fireEvent.click(view.getByText("Otra pantalla"));
    fireEvent.click(await view.findByText("Guardar y continuar"));
    const busy = await view.findByText("Guardando…");
    fireEvent.click(busy);
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    expect(view.router.state.location.pathname).toBe("/");
    resolve(true);
    await view.findByText("Destino");
  });
  it("requests native unload protection only while a draft is dirty", () => {
    const view = harness();
    const clean = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    fireEvent.change(view.getByLabelText("Borrador"), { target: { value: "No perder al recargar" } });
    const dirty = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
    fireEvent.click(view.getByText("Cerrar editor"));
    fireEvent.click(view.getByText("Descartar cambios"));
    const discarded = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(discarded);
    expect(discarded.defaultPrevented).toBe(false);
  });
});
