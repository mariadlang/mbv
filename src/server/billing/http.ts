import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { BillingConfigurationError } from "@/src/server/billing/config";
import { MercadoPagoApiError } from "@/src/server/billing/mercadoPagoClient";

function databaseErrorCode(error: unknown): { code: string; status: number } | null {
  const message = error && typeof error === "object" && "message" in error && typeof error.message === "string"
    ? error.message
    : "";
  const match = [
    ["BILLING_ALREADY_ACTIVE", 409],
    ["BILLING_SUBSCRIPTION_ALREADY_EXISTS", 409],
    ["BILLING_CHECKOUT_CONFLICT", 409],
    ["CHECKOUT_ALREADY_OPEN", 409],
    ["BILLING_CATALOG_MISMATCH", 409],
    ["BILLING_EVENT_CONFLICT", 409],
    ["BILLING_CHECKOUT_NOT_FOUND", 404],
    ["BILLING_SUBSCRIPTION_NOT_FOUND", 404],
    ["BILLING_SUBSCRIPTION_OWNERSHIP_MISMATCH", 409],
    ["BILLING_SUBSCRIPTION_REFERENCE_MISMATCH", 409],
    ["BILLING_CANCELLATION_NOT_CONFIRMED", 502],
    ["BILLING_CANCELLATION_REQUIRES_REVIEW", 409],
  ] as const;
  const found = match.find(([code]) => message.includes(code));
  return found ? { code: found[0], status: found[1] } : null;
}

export function billingErrorResponse(error: unknown): NextResponse {
  if (error instanceof Response) return error as NextResponse;
  if (error instanceof ZodError) return NextResponse.json({ error: "INVALID_BILLING_REQUEST" }, { status: 400 });
  if (error instanceof BillingConfigurationError) {
    return NextResponse.json({ error: "BILLING_NOT_CONFIGURED" }, { status: 503 });
  }
  if (error instanceof MercadoPagoApiError) {
    return NextResponse.json(
      { error: error.code },
      { status: error.retryable ? 503 : 502, headers: error.retryable ? { "Retry-After": "10" } : undefined },
    );
  }
  const database = databaseErrorCode(error);
  if (database) return NextResponse.json({ error: database.code }, { status: database.status });
  return NextResponse.json({ error: "BILLING_REQUEST_FAILED" }, { status: 500 });
}
