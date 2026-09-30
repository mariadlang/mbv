// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

function createFetch(response: Response = jsonResponse(202, { status: "request_received" })) {
  return vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => (
    init?.method === "POST" ? response : jsonResponse(200, { status: "open" })
  ));
}

async function openManually(view: ReturnType<typeof render>) {
  const trigger = await view.findByRole("button", { name: "Ver la invitación" });
  fireEvent.click(trigger);
  return view.findByRole("dialog", { name: "Únete a la waitlist de My Best Version." });
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  useUiStore.setState({ language: "es" });
});

describe("waitlist de lanzamiento de la landing", () => {
  it("espera cuatro segundos antes de abrirse automáticamente y no insiste en visitas posteriores", async () => {
    vi.useFakeTimers();
    const firstView = renderInvitation(createFetch());
    await act(async () => { await Promise.resolve(); });

    expect(firstView.queryByRole("dialog")).toBeNull();
    act(() => { vi.advanceTimersByTime(3_999); });
    expect(firstView.queryByRole("dialog")).toBeNull();
    act(() => { vi.advanceTimersByTime(1); });
    expect(firstView.getByRole("dialog", { name: "Únete a la waitlist de My Best Version." })).toBeTruthy();

    fireEvent.click(firstView.getByRole("button", { name: "Cerrar" }));
    firstView.unmount();
    renderInvitation(createFetch());
    await act(async () => { await Promise.resolve(); });
    act(() => { vi.advanceTimersByTime(4_000); });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("cuenta los cuatro segundos desde la entrada aunque el estado tarde más en responder", async () => {
    vi.useFakeTimers();
    let resolveState!: (response: Response) => void;
    const stateResponse = new Promise<Response>((resolve) => {
      resolveState = resolve;
    });
    const fetchMock = vi.fn<typeof fetch>(() => stateResponse);
    const view = renderInvitation(fetchMock);

    act(() => { vi.advanceTimersByTime(4_000); });
    expect(view.queryByRole("dialog")).toBeNull();

    await act(async () => {
      resolveState(jsonResponse(200, { status: "open" }));
      await stateResponse;
    });
    expect(view.getByRole("dialog", { name: "Únete a la waitlist de My Best Version." })).toBeTruthy();
  });

  it("puede abrirse manualmente, cerrarse y conserva la CTA para reabrirla", async () => {
    const view = renderInvitation(createFetch());
    await openManually(view);
    await waitFor(() => expect(document.activeElement).toBe(view.getByRole("textbox", { name: /Tu correo electrónico/ })));
    expect(view.getByRole("link", { name: "Política de privacidad" }).getAttribute("href")).toBe("/privacy");

    fireEvent.click(view.getByRole("button", { name: "Ahora no, seguir explorando" }));
    expect(view.queryByRole("dialog")).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Ver la invitación" }));
    expect(view.getByRole("dialog", { name: "Únete a la waitlist de My Best Version." })).toBeTruthy();
  });

  it("valida el correo con el mensaje acordado sin enviar una solicitud", async () => {
    const fetchMock = createFetch();
    const view = renderInvitation(fetchMock);
    await openManually(view);
    fireEvent.change(view.getByRole("textbox", { name: /Tu correo electrónico/ }), { target: { value: "correo-invalido" } });
    const submit = view.getByRole("button", { name: "Quiero unirme a la waitlist" });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect((await view.findByRole("alert")).textContent).toBe("Revisa tu correo electrónico e inténtalo de nuevo.");
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  });

  it("guarda la waitlist sin obligar a aceptar novedades y confirma sólo tras persistencia", async () => {
    const fetchMock = createFetch();
    const view = renderInvitation(fetchMock);
    await openManually(view);
    fireEvent.change(view.getByRole("textbox", { name: /Tu correo electrónico/ }), { target: { value: " MARIA@example.com " } });
    const submit = view.getByRole("button", { name: "Quiero unirme a la waitlist" });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(await view.findByRole("heading", { name: "¡Recibimos tu solicitud!" })).toBeTruthy();
    expect(view.getByText("Te notificaremos de primero en el lanzamiento para que puedas empezar tu periodo de prueba de 30 días.")).toBeTruthy();
    expect(view.queryByRole("textbox")).toBeNull();
    const request = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({
      email: "MARIA@example.com",
      locale: "es",
      requestType: "waitlist",
      newsletterOptIn: false,
      origin: "landing_launch",
    });
    expect(window.localStorage.getItem("mbv:launch-waitlist:v1:submitted")).toBe("waitlist");
  });

  it("mantiene el correo ante un error recuperable y no simula éxito", async () => {
    const fetchMock = createFetch(jsonResponse(500, { error: "REQUEST_FAILED" }));
    const view = renderInvitation(fetchMock);
    await openManually(view);
    const input = view.getByRole("textbox", { name: /Tu correo electrónico/ }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "maria@example.com" } });
    fireEvent.click(view.getByRole("button", { name: "Quiero unirme a la waitlist" }));

    expect((await view.findByRole("alert")).textContent).toBe("No pudimos guardar tu solicitud. Inténtalo de nuevo.");
    expect(input.value).toBe("maria@example.com");
    expect(document.activeElement).toBe(input);
    expect(view.queryByText("¡Recibimos tu solicitud!")).toBeNull();
  });

  it("retira el formulario si el servidor confirma que la campaña no está disponible", async () => {
    const fetchMock = createFetch(jsonResponse(503, { error: "REQUEST_UNAVAILABLE" }));
    const view = renderInvitation(fetchMock);
    await openManually(view);
    fireEvent.change(view.getByRole("textbox", { name: /Tu correo electrónico/ }), { target: { value: "maria@example.com" } });
    fireEvent.click(view.getByRole("button", { name: "Quiero unirme a la waitlist" }));

    expect(await view.findByRole("heading", { name: "La invitación no está disponible por ahora." })).toBeTruthy();
    expect(view.queryByRole("textbox")).toBeNull();
    expect(view.queryByText("No pudimos guardar tu solicitud. Inténtalo de nuevo.")).toBeNull();
  });

  it("muestra newsletter cuando se llenan los cupos sin convertir la solicitud silenciosamente", async () => {
    const fetchMock = createFetch(jsonResponse(409, { error: "CAMPAIGN_CLOSED" }));
    const view = renderInvitation(fetchMock);
    await openManually(view);
    fireEvent.change(view.getByRole("textbox", { name: /Tu correo electrónico/ }), { target: { value: "maria@example.com" } });
    fireEvent.click(view.getByRole("button", { name: "Quiero unirme a la waitlist" }));

    expect(await view.findByRole("heading", { name: "Gracias por tu interés" })).toBeTruthy();
    expect(view.getByText("Los 20 cupos de acceso anticipado ya se han solicitado.")).toBeTruthy();
    expect((view.getByRole("textbox", { name: /Tu correo electrónico/ }) as HTMLInputElement).value).toBe("maria@example.com");
    expect(view.queryByText("¡Recibimos tu solicitud!")).toBeNull();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });

  it("persiste newsletter sólo después del consentimiento explícito en estado lleno", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => (
      init?.method === "POST"
        ? jsonResponse(202, { status: "newsletter_subscribed" })
        : jsonResponse(200, { status: "closed" })
    ));
    const view = renderInvitation(fetchMock);
    const trigger = await view.findByRole("button", { name: "Recibir novedades" });
    fireEvent.click(trigger);
    const email = view.getByRole("textbox", { name: /Tu correo electrónico/ });
    fireEvent.change(email, { target: { value: "maria@example.com" } });
    fireEvent.click(view.getByRole("button", { name: "Quiero recibir novedades" }));
    expect((await view.findByRole("alert")).textContent).toBe("Confirma que quieres recibir novedades para continuar.");
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);

    fireEvent.click(view.getByRole("checkbox", { name: "También quiero recibir novedades de My Best Version." }));
    fireEvent.click(view.getByRole("button", { name: "Quiero recibir novedades" }));
    expect(await view.findByRole("heading", { name: "¡Gracias por suscribirte!" })).toBeTruthy();
    const request = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(String(request?.[1]?.body))).toMatchObject({
      requestType: "newsletter_only",
      newsletterOptIn: true,
      origin: "landing_launch",
    });
  });

  it("permite solicitar waitlist si reabre después de una suscripción previa a novedades", async () => {
    window.localStorage.setItem("mbv:launch-waitlist:v1:submitted", "newsletter");
    const view = renderInvitation(createFetch());
    const trigger = await view.findByRole("button", { name: "Ver la invitación" });
    expect(view.queryByRole("dialog")).toBeNull();

    fireEvent.click(trigger);
    expect(view.getByRole("dialog", { name: "Únete a la waitlist de My Best Version." })).toBeTruthy();
    expect(view.getByRole("button", { name: "Quiero unirme a la waitlist" })).toBeTruthy();
    expect(view.queryByRole("heading", { name: "¡Gracias por suscribirte!" })).toBeNull();
  });

  it("no abre automáticamente ni ofrece formulario si el backend está indisponible", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(200, { status: "unavailable" }));
    const view = renderInvitation(fetchMock);
    await act(async () => { await Promise.resolve(); });
    act(() => { vi.advanceTimersByTime(4_100); });
    expect(view.queryByRole("dialog")).toBeNull();

    fireEvent.click(view.getByRole("button", { name: "Ver el estado" }));
    expect(view.getByRole("dialog", { name: "La invitación no está disponible por ahora." })).toBeTruthy();
    expect(view.queryByRole("textbox")).toBeNull();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  });

  it("propaga idioma, consentimiento y origen en inglés", async () => {
    useUiStore.setState({ language: "en" });
    const fetchMock = createFetch();
    const view = renderInvitation(fetchMock);
    const trigger = await view.findByRole("button", { name: "View the invitation" });
    fireEvent.click(trigger);
    fireEvent.change(view.getByRole("textbox", { name: /Your email address/ }), { target: { value: "maria@example.com" } });
    fireEvent.click(view.getByRole("checkbox", { name: "I would also like to receive My Best Version news." }));
    fireEvent.click(view.getByRole("button", { name: "Join the waitlist" }));
    expect(await view.findByRole("heading", { name: "We received your request!" })).toBeTruthy();

    const request = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({
      email: "maria@example.com",
      locale: "en",
      requestType: "waitlist",
      newsletterOptIn: true,
      origin: "landing_launch",
    });
  });
});
