import { describe, expect, it } from "vitest";
import { billingErrorResponse } from "@/src/server/billing/http";

describe("billingErrorResponse", () => {
  it.each([
    "BILLING_SUBSCRIPTION_ALREADY_EXISTS",
    "CHECKOUT_ALREADY_OPEN",
  ])("maps %s database conflicts to HTTP 409", async (code) => {
    const response = billingErrorResponse(new Error(code));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: code });
  });
});
