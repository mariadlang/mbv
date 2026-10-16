// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { Modal } from "./Modal";

afterEach(cleanup);
function Nested() {
  const [editor, setEditor] = useState(true);
  const [guard, setGuard] = useState(false);
  return <I18nProvider><button>Fondo</button>
    <Modal open={editor} title="Editor" inertBackground onClose={() => setGuard(true)}><button onClick={() => setGuard(true)}>Cerrar editor</button></Modal>
    <Modal open={guard} title="Borrador" inertBackground onClose={() => setGuard(false)}><button onClick={() => { setEditor(false); setGuard(false); }}>Descartar ambos</button><button onClick={() => setGuard(false)}>Seguir</button></Modal>
  </I18nProvider>;
}
describe("nested modal locks", () => {
  it("restores background and scroll after closing both dialogs in one batch", async () => {
    document.body.style.overflow = "auto";
    const view = render(<Nested />);
    expect(view.container.inert).toBe(true);
    fireEvent.click(view.getByText("Cerrar editor"));
    await view.findByRole("dialog", { name: "Borrador" });
    fireEvent.click(view.getByText("Descartar ambos"));
    await waitFor(() => expect(view.queryAllByRole("dialog")).toHaveLength(0));
    expect(Boolean(view.container.inert)).toBe(false);
    expect(document.body.style.overflow).toBe("auto");
    view.getByText("Fondo").focus();
    expect(document.activeElement).toBe(view.getByText("Fondo"));
    document.body.style.overflow = "";
  });
  it("keeps the page locked while returning from the guard to its editor", async () => {
    const view = render(<Nested />);
    fireEvent.click(view.getByText("Cerrar editor"));
    fireEvent.click(await view.findByText("Seguir"));
    expect(view.getByRole("dialog", { name: "Editor" })).toBeTruthy();
    expect(view.container.inert).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
  });
});
