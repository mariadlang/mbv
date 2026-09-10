// @vitest-environment jsdom

import { createElement } from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider, useI18n } from "@/src/i18n/I18nProvider";
import { useUiStore } from "@/src/stores/useUiStore";

function Probe() {
  const { language, setLanguage, m } = useI18n();
  return createElement("div", null,
    createElement("button", { type: "button", onClick: () => setLanguage(language === "es" ? "en" : "es") }, "switch"),
    createElement("span", { "data-testid": "explicit", "data-i18n-explicit": "true" }, m("onboarding.start")),
    createElement("span", { "data-testid": "legacy" }, "Inicio"),
    createElement("span", { "data-testid": "personal", "data-no-translate": "true", translate: "no" }, "Hoy"),
  );
}

describe("I18nProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useUiStore.setState({ language: "es" });
  });

  afterEach(() => {
    cleanup();
    useUiStore.setState({ language: "es" });
  });

  it("updates document language, renders stable keys, and limits the legacy bridge", async () => {
    const view = render(createElement(I18nProvider, null, createElement(Probe)));
    fireEvent.click(view.getByRole("button", { name: "switch" }));

    await waitFor(() => expect(document.documentElement.lang).toBe("en"));
    expect(view.getByTestId("explicit").textContent).toBe("Create my first action");
    await waitFor(() => expect(view.getByTestId("legacy").textContent).toBe("Home"));
    expect(view.getByTestId("personal").textContent).toBe("Hoy");
  });
});
