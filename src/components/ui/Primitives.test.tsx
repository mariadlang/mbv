// @vitest-environment jsdom

import { createElement, useState } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button, Chip, FormField, IconButton, InlineMessage, SegmentedControl, Tabs } from "@/src/components/ui/Primitives";
import { Modal } from "@/src/components/ui/Modal";
import { I18nProvider } from "@/src/i18n/I18nProvider";

afterEach(cleanup);

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <I18nProvider>
      <button type="button" onClick={() => setOpen(true)}>Abrir</button>
      <Modal open={open} title="Confirmar cambio" description="Revisa la información" onClose={() => setOpen(false)}>
        <button type="button">Guardar</button>
      </Modal>
    </I18nProvider>
  );
}

describe("design-system primitives", () => {
  it("exposes a disabled busy button while loading", () => {
    const view = render(createElement(Button, { loading: true }, "Guardar"));
    const button = view.getByRole("button", { name: "Guardar" });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });

  it("keeps the chip contract when consumers add a class", () => {
    const view = render(createElement(Chip, { selected: true, className: "feature-chip" }, "Semana"));
    const chip = view.getByRole("button", { name: "Semana" });
    expect(chip.getAttribute("aria-pressed")).toBe("true");
    expect(chip.classList.contains("chip")).toBe(true);
    expect(chip.classList.contains("feature-chip")).toBe(true);
  });

  it("requires an accessible name for icon-only actions", () => {
    const view = render(createElement(IconButton, { label: "Cerrar", type: "button" }, "×"));
    expect(view.getByRole("button", { name: "Cerrar" })).toBeTruthy();
  });

  it("moves tabs with arrow keys and preserves aria relationships", () => {
    const onChange = vi.fn();
    const view = render(createElement(Tabs, {
      id: "planning-tabs",
      ariaLabel: "Horizonte de planificación",
      items: [{ id: "month", label: "Mes" }, { id: "week", label: "Semana" }] as const,
      value: "month",
      onChange,
    }));
    const month = view.getByRole("tab", { name: "Mes" });
    fireEvent.keyDown(month, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("week");
    expect(view.getByRole("tab", { name: "Semana" }).getAttribute("aria-controls")).toBe("planning-tabs-week-panel");
  });

  it("can associate dynamic tabs with one shared panel", () => {
    const view = render(createElement(Tabs, {
      id: "task-filters",
      ariaLabel: "Filtrar tareas",
      panelId: "task-list-panel",
      items: [{ id: "today", label: "Mi día" }, { id: "completed", label: "Completadas" }] as const,
      value: "today",
      onChange: vi.fn(),
    }));
    expect(view.getByRole("tab", { name: "Mi día" }).getAttribute("aria-controls")).toBe("task-list-panel");
    expect(view.getByRole("tab", { name: "Completadas" }).getAttribute("aria-controls")).toBe("task-list-panel");
  });

  it("announces danger messages assertively", () => {
    const view = render(<InlineMessage tone="danger">No pudimos guardar</InlineMessage>);
    expect(view.getByRole("alert").textContent).toBe("No pudimos guardar");
  });

  it("associates field errors with the control", () => {
    const view = render(<FormField label="Nombre" error="Es obligatorio"><input /></FormField>);
    const input = view.getByRole("textbox", { name: /Nombre/ });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(view.getByRole("alert").id);
  });

  it("propagates required semantics and preserves consumer validation state", () => {
    const view = render(<FormField label="Nombre" required><input aria-invalid="grammar" /></FormField>);
    const input = view.getByRole("textbox", { name: /Nombre/ });
    expect(input.hasAttribute("required")).toBe(true);
    expect(input.getAttribute("aria-required")).toBe("true");
    expect(input.getAttribute("aria-invalid")).toBe("grammar");
  });

  it("uses pressed state for segmented controls", () => {
    const onChange = vi.fn();
    const view = render(createElement(SegmentedControl, {
      ariaLabel: "Vista",
      items: [{ id: "list", label: "Lista" }, { id: "calendar", label: "Calendario" }] as const,
      value: "list",
      onChange,
    }));
    fireEvent.click(view.getByRole("button", { name: "Calendario" }));
    expect(onChange).toHaveBeenCalledWith("calendar");
  });

  it("traps modal focus, closes with Escape, restores focus, and locks scroll", () => {
    const view = render(createElement(ModalHarness));
    const trigger = view.getByRole("button", { name: "Abrir" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = view.getByRole("dialog", { name: "Confirmar cambio" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-describedby")).toBe(view.getByText("Revisa la información").id);
    expect(document.body.style.overflow).toBe("hidden");

    const close = view.getByRole("button", { name: "Cerrar" });
    const save = view.getByRole("button", { name: "Guardar" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(save);
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(close);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(view.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(trigger);
  });
});
