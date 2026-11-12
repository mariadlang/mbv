// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { useUiStore } from "@/src/stores/useUiStore";
import { CookieConsentProvider } from "@/src/features/legal/CookieConsent";
import { LoginPage } from "./AccountPages";

const mocks = vi.hoisted(() => ({ update: vi.fn(), account: { user: { emailVerified: true }, loading: false, access: null } }));
vi.mock("@/src/services/authService", () => ({ authService: { updatePassword: mocks.update } }));
vi.mock("@/src/hooks/useAccount", () => ({ useAccount: () => mocks.account }));
const mount = () => render(<I18nProvider><MemoryRouter initialEntries={["/login?reset=1"]}><CookieConsentProvider><LoginPage /></CookieConsentProvider></MemoryRouter></I18nProvider>);
afterEach(cleanup);
beforeEach(() => { mocks.update.mockReset(); mocks.account.user.emailVerified = true; useUiStore.getState().setLanguage("es"); });
describe("normal password recovery entry", () => {
  it("waits for real save, protects fields, preserves draft on error and retries once", async () => {
    let reject!: (reason: Error) => void;
    mocks.update.mockReturnValueOnce(new Promise<void>((_, no) => { reject = no; }));
    const view = mount();
    const fields = view.container.querySelectorAll<HTMLInputElement>('input[type="password"]');
    fields.forEach((field) => fireEvent.change(field, { target: { value: "Synthetic-Password-42" } }));
    fireEvent.submit(view.container.querySelector("form")!);
    fireEvent.submit(view.container.querySelector("form")!);
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect([...fields].every((field) => field.disabled)).toBe(true);
    expect(view.queryByText(/Contraseña actualizada/)).toBeNull();
    await act(async () => reject(new Error("controlled save failure")));
    expect(view.getByRole("alert").textContent).toContain("No pudimos guardar");
    expect([...fields].every((field) => !field.disabled && field.value === "Synthetic-Password-42")).toBe(true);
    mocks.update.mockResolvedValueOnce(undefined);
    await act(async () => fireEvent.submit(view.container.querySelector("form")!));
    expect(mocks.update).toHaveBeenCalledTimes(2);
    expect(view.getByRole("status").textContent).toContain("Contraseña actualizada");
    expect(view.container.querySelector("form")).toBeNull();
  });
  it("does not submit mismatched values or an unverified session", async () => {
    const view = mount();
    const fields = view.container.querySelectorAll<HTMLInputElement>('input[type="password"]');
    fireEvent.change(fields[0], { target: { value: "Synthetic-Password-42" } });
    fireEvent.submit(view.container.querySelector("form")!);
    expect(mocks.update).not.toHaveBeenCalled();
    mocks.account.user.emailVerified = false;
    fireEvent.change(fields[1], { target: { value: "Synthetic-Password-42" } });
    await act(async () => fireEvent.submit(view.container.querySelector("form")!));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(view.getByRole("alert").textContent).toContain("No pudimos guardar");
  });
  it("renders the existing reset destination in English without redirecting an authenticated account", () => {
    useUiStore.getState().setLanguage("en");
    const view = mount();
    expect(view.getByRole("heading", { name: "Choose your new password" })).toBeTruthy();
    expect(view.getByRole("button", { name: "Save password" })).toBeTruthy();
  });
});
