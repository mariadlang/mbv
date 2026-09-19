import { describe, expect, it } from "vitest";
import { buildAuthEntryPath, DEFAULT_AUTH_DESTINATION, resolveAuthDestination } from "@/src/lib/authRedirect";

describe("retorno seguro después de autenticación", () => {
  it("conserva Upgrade y el periodo comercial como parámetros separados", () => {
    expect(resolveAuthDestination("?next=/upgrade&interval=monthly")).toBe("/upgrade?interval=monthly");
    expect(resolveAuthDestination("?next=/upgrade&interval=annual")).toBe("/upgrade?interval=annual");
    expect(buildAuthEntryPath("/login", "/upgrade?interval=annual")).toBe("/login?next=%2Fupgrade&interval=annual");
    expect(buildAuthEntryPath("/signup", "/upgrade?interval=monthly")).toBe("/signup?next=%2Fupgrade&interval=monthly");
  });

  it("permite rutas internas de la aplicación sin aceptar queries arbitrarios", () => {
    expect(resolveAuthDestination("?next=/app/progress")).toBe("/app/progress");
    expect(resolveAuthDestination("?next=/upgrade&interval=weekly")).toBe("/upgrade");
    expect(resolveAuthDestination("?next=/app/progress?admin=1")).toBe(DEFAULT_AUTH_DESTINATION);
    expect(buildAuthEntryPath("/login", "https://evil.example/app/progress")).toBe("/login");
    expect(buildAuthEntryPath("/signup", "//evil.example/steal")).toBe("/signup");
  });

  it.each([
    "?next=https://evil.example/steal",
    "?next=//evil.example/steal",
    "?next=\\\\evil.example\\steal",
    "?next=/app/../admin",
    "?next=%2F%2Fevil.example%2Fsteal",
    "?next=/login",
  ])("rechaza un retorno abierto o fuera de la allowlist: %s", (search) => {
    expect(resolveAuthDestination(search)).toBe(DEFAULT_AUTH_DESTINATION);
  });
});
