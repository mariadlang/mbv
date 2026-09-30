// @vitest-environment jsdom

import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LandingLaunchInvitation } from "@/src/features/landing/LandingLaunchInvitation";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { useUiStore } from "@/src/stores/useUiStore";

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

function renderInvitation(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("fetch", fetchMock);
  return render(
    <I18nProvider>
      <MemoryRouter>
        <LandingLaunchInvitation />
      </MemoryRouter>
    </I18nProvider>,
  );
}

function createFetch(response: Response = jsonResponse(202, { status: "confirmation_pending" })) {
  return vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => (
    init?.method === "POST" ? response : jsonResponse(200, { status: "open" })
  ));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  useUiStore.setState({ language: "es" });
});

describe("invitación de lanzamiento de la landing", () => {
  it("se abre al cargar, puede cerrarse y conserva la CTA para reabrirla", async () => {
    const view = renderInvitation(createFetch());

    expect(await view.findByRole("dialog", { name: "Sé parte del lanzamiento." })).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(view.getByRole("textbox", { name: /Correo electrónico/ })));
    expect(view.getByRole("link", { name: "Política de privacidad" }).getAttribute("href")).toBe("/privacy");

    fireEvent.click(view.getByRole("button", { name: "Cerrar" }));
    expect(view.queryByRole("dialog")).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Ver la invitación" }));
    expect(view.getByRole("dialog", { name: "Sé parte del lanzamiento." })).toBeTruthy();
  });

  it("valida el correo sin enviar una solicitud", async () => {
    const fetchMock = createFetch();
    const view = renderInvitation(fetchMock);
    await view.findByRole("dialog", { name: "Sé parte del lanzamiento." });
    fireEvent.change(view.getByRole("textbox", { name: /Correo electrónico/ }), { target: { value: "correo-invalido" } });
    fireEvent.click(view.getByRole("button", { name: "Quiero mi acceso de lanzamiento" }));

    expect((await view.findByRole("alert")).textContent).toBe("Introduce un correo electrónico válido.");
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  });

  it("acepta sólo el éxito persistido, evita doble envío y conserva el resultado al reabrir", async () => {
    const fetchMock = createFetch();
    const view = renderInvitation(fetchMock);
    await view.findByRole("dialog", { name: "Sé parte del lanzamiento." });
    fireEvent.change(view.getByRole("textbox", { name: /Correo electrónico/ }), { target: { value: "maria@example.com" } });
    const submit = view.getByRole("button", { name: "Quiero mi acceso de lanzamiento" });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(await view.findByText("Revisa tu correo.")).toBeTruthy();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    expect(document.activeElement).toBe(view.getByText("Revisa tu correo.").closest(".landing-launch-state"));

    fireEvent.click(view.getByRole("button", { name: "Cerrar" }));
    expect(view.queryByRole("dialog")).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Ver la invitación" }));
    expect(view.getByText("Revisa tu correo.")).toBeTruthy();
    expect(view.queryByRole("textbox", { name: /Correo electrónico/ })).toBeNull();
  });

  it("mantiene el correo ante un error recuperable y no simula éxito", async () => {
    const fetchMock = createFetch(jsonResponse(503, { error: "REQUEST_UNAVAILABLE" }));
    const view = renderInvitation(fetchMock);
    await view.findByRole("dialog", { name: "Sé parte del lanzamiento." });
    const input = view.getByRole("textbox", { name: /Correo electrónico/ }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "maria@example.com" } });
    fireEvent.click(view.getByRole("button", { name: "Quiero mi acceso de lanzamiento" }));

    expect((await view.findByRole("alert")).textContent).toBe("No pudimos completar tu solicitud. Inténtalo de nuevo.");
    expect(input.value).toBe("maria@example.com");
    expect(document.activeElement).toBe(input);
    expect(view.queryByText("Revisa tu correo.")).toBeNull();
  });

  it("deja de ofrecer el beneficio cuando el servidor confirma el cierre", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { status: "closed" }));
    const view = renderInvitation(fetchMock);

    await waitFor(() => expect(view.getByRole("dialog", { name: "Los 20 accesos gratuitos de lanzamiento ya se asignaron." })).toBeTruthy());
    expect(view.queryByRole("textbox", { name: /Correo electrónico/ })).toBeNull();
  });

  it("no ofrece un formulario cuando el estado público no está disponible", async () => {
    const fetchMock = vi.fn(async () => (
      jsonResponse(200, { status: "unavailable" })
    ));
    const view = renderInvitation(fetchMock);

    expect(await view.findByRole("dialog", { name: "La invitación no está disponible por ahora." })).toBeTruthy();
    expect(view.getByText("No estamos recibiendo registros en este momento. Puedes volver más tarde; no guardamos tu correo.")).toBeTruthy();
    expect(view.queryByRole("textbox", { name: /Correo electrónico/ })).toBeNull();
    expect(view.getByText("Invitación no disponible por ahora")).toBeTruthy();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  });

  it("propaga el idioma inglés en la solicitud", async () => {
    useUiStore.setState({ language: "en" });
    const fetchMock = createFetch();
    const view = renderInvitation(fetchMock);

    await view.findByRole("dialog", { name: "Be part of the launch." });
    fireEvent.change(view.getByRole("textbox", { name: /Email address/ }), { target: { value: "maria@example.com" } });
    fireEvent.click(view.getByRole("button", { name: "I want launch access" }));
    expect(await view.findByText("Check your email.")).toBeTruthy();

    const request = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(request).toBeTruthy();
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({ email: "maria@example.com", locale: "en" });
  });
});
