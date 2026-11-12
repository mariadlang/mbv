// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { CookieConsentProvider } from "./CookieConsent";
import { AiPrivacyPage, CookiesPage, DataDeletionPage, DataPolicyPage, LegalCenterPage, LegalNoticesPage, PaymentsPage, PqrPage, PrivacyPage, ProviderInfoPage, RetractPage, SecurityPage, TermsPage } from "./LegalPages";

const account = vi.hoisted(() => ({ user: null as null | { id: string; email: string } }));
const createRequest = vi.hoisted(() => vi.fn());
vi.mock("@/src/hooks/useAccount", () => ({ useAccount: () => account }));
vi.mock("@/src/hooks/useLegalPrivacy", () => ({ useLegalPrivacy: () => ({ createRequest }) }));
afterEach(() => { cleanup(); account.user = null; createRequest.mockClear(); });

function mount(Page: () => React.JSX.Element) {
  return render(<I18nProvider><MemoryRouter><CookieConsentProvider><Page /></CookieConsentProvider></MemoryRouter></I18nProvider>);
}

describe("H02 public pages reuse the existing main landmark", () => {
  it.each([
    ["/legal", LegalCenterPage], ["/legal-notices", LegalNoticesPage], ["/pqr", PqrPage],
    ["/terms", TermsPage], ["/privacy", PrivacyPage], ["/data-policy", DataPolicyPage],
    ["/cookies", CookiesPage], ["/data-deletion", DataDeletionPage], ["/payments", PaymentsPage],
    ["/retract", RetractPage], ["/ai-privacy", AiPrivacyPage], ["/provider-info", ProviderInfoPage], ["/security", SecurityPage],
  ] as const)("has one main containing the heading, content and existing navigation: %s", (_route, Page) => {
    const view = mount(Page);
    const main = view.getByRole("main");
    expect(main.className).toBe("public-frame");
    expect(view.container.querySelectorAll("main, [role='main']")).toHaveLength(1);
    expect(main.querySelector("main, [role='main']")).toBeNull();
    expect(main.contains(view.getByRole("heading", { level: 1 }))).toBe(true);
    expect(main.querySelector("header a[href='/terms']")).not.toBeNull();
    expect(main.querySelector("footer a[href='/pqr']")).not.toBeNull();
    expect(createRequest).not.toHaveBeenCalled();
  });

  it("keeps the authenticated PQR form structure in the same single main, without submitting", () => {
    account.user = { id: "h02-disposable", email: "h02@example.invalid" };
    const view = mount(PqrPage);
    expect(view.getAllByRole("main")).toHaveLength(1);
    const form = view.container.querySelector("form")!;
    expect(view.getByRole("main").contains(form)).toBe(true);
    expect(view.getByLabelText("Tipo de solicitud")).toBeTruthy();
    expect(view.getByLabelText("Asunto").getAttribute("required")).not.toBeNull();
    expect(view.getByLabelText("Descripción").getAttribute("required")).not.toBeNull();
    expect(view.getByLabelText(/Adjunto opcional/).getAttribute("accept")).toBe("application/pdf,image/jpeg,image/png,text/plain");
    expect(view.getByRole("button", { name: "Radicar solicitud" }).getAttribute("type")).toBe("submit");
    expect(createRequest).not.toHaveBeenCalled();
  });
});
