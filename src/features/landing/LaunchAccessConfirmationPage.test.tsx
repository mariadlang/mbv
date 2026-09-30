// @vitest-environment jsdom

import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CookieConsentProvider } from "@/src/features/legal/CookieConsent";
import { LaunchAccessConfirmationPage } from "@/src/features/landing/LaunchAccessConfirmationPage";
import { I18nProvider } from "@/src/i18n/I18nProvider";

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

function renderConfirmation(fetchMock: ReturnType<typeof vi.fn>, token = "token-seguro-de-prueba") {
  vi.stubGlobal("fetch", fetchMock);
  window.history.replaceState({}, "", `/launch-access/confirm#token=${token}`);
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={["/launch-access/confirm"]}>
        <CookieConsentProvider>
          <LaunchAccessConfirmationPage />
        </CookieConsentProvider>
      </MemoryRouter>
    </I18nProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
});

describe("confirmación del acceso de lanzamiento", () => {
  it("consume el token desde el fragmento, lo retira de la URL y confirma por POST", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { status: "email_confirmed" }));
    const view = renderConfirmation(fetchMock, "token-que-no-debe-quedar-en-la-url");

    expect(await view.findByRole("heading", { name: "Correo confirmado." })).toBeTruthy();
    expect(window.location.hash).toBe("");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith("/api/launch-access/confirm", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ token: "token-que-no-debe-quedar-en-la-url" }),
    }));
  });

  it("permite solicitar otro enlace vencido sin afirmar que el acceso está reservado", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(410, { status: "expired" }))
      .mockResolvedValueOnce(jsonResponse(202, { status: "confirmation_pending" }));
    const view = renderConfirmation(fetchMock);

    expect(await view.findByRole("heading", { name: "Este enlace ha vencido." })).toBeTruthy();
    fireEvent.change(view.getByRole("textbox", { name: /Correo electrónico/ }), {
      target: { value: "maria@example.com" },
    });
    fireEvent.click(view.getByRole("button", { name: "Solicitar un enlace nuevo" }));

    await waitFor(() => expect(view.getByRole("heading", { name: "Revisa tu correo." })).toBeTruthy());
    expect(view.queryByText("Tu acceso de lanzamiento está reservado.", { exact: true })).toBeNull();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/launch-access/request", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ email: "maria@example.com", locale: "es" }),
    }));
  });
});
