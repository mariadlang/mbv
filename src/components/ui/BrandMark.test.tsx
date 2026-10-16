// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BrandMark } from "./BrandMark";

afterEach(cleanup);

describe("approved notebook identity", () => {
  it("uses the canonical notebook without replacing the marketing slogan", () => {
    const { container } = render(<BrandMark />);
    expect(container.querySelector("img")).toHaveAttribute("src", "/brand-icon.svg");
    expect(screen.getByText("MY BEST")).toBeVisible();
    expect(screen.getByText("VERSION")).toBeVisible();
    expect(screen.getByText("PLANEA · ACCIONA · LOGRA")).toBeVisible();
    expect(container.querySelector("svg")).toBeNull();
  });
  it("keeps the notebook and wordmark in the compact variant", () => {
    const { container } = render(<BrandMark compact />);
    expect(container.querySelector("img")).toHaveAttribute("src", "/brand-icon.svg");
    expect(screen.getByText("VERSION")).toBeVisible();
    expect(screen.queryByText("PLANEA · ACCIONA · LOGRA")).toBeNull();
  });
  it("names the icon-only variant accessibly", () => {
    render(<BrandMark iconOnly />);
    expect(screen.getByRole("img", { name: "My Best Version" })).toBeVisible();
    expect(screen.queryByText("VERSION")).toBeNull();
  });
});
