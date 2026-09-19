import { describe, expect, it } from "vitest";
import {
  mercadoPagoSignatureManifest,
  signMercadoPagoManifest,
  verifyMercadoPagoWebhookSignature,
} from "@/src/server/billing/webhookSignature";

const secret = "test_secret_with_at_least_thirty_two_characters";

describe("Mercado Pago webhook signature", () => {
  it("validates the documented HMAC manifest", async () => {
    const manifest = mercadoPagoSignatureManifest("123456", "request-abc", "1742505638683");
    const hash = await signMercadoPagoManifest(manifest, secret);
    await expect(verifyMercadoPagoWebhookSignature({
      dataId: "123456",
      requestId: "request-abc",
      signature: `ts=1742505638683,v1=${hash}`,
      secret,
      now: new Date(1742505638683),
    })).resolves.toBe(true);
  });

  it("rejects tampering, missing fields and malformed signatures", async () => {
    const hash = await signMercadoPagoManifest(
      mercadoPagoSignatureManifest("resource", "request-abc", "1742505638"),
      secret,
    );
    await expect(verifyMercadoPagoWebhookSignature({
      dataId: "different-resource",
      requestId: "request-abc",
      signature: `ts=1742505638,v1=${hash}`,
      secret,
      now: new Date(1742505638000),
    })).resolves.toBe(false);
    await expect(verifyMercadoPagoWebhookSignature({
      dataId: "resource",
      requestId: "",
      signature: `ts=1742505638,v1=${hash}`,
      secret,
      now: new Date(1742505638000),
    })).resolves.toBe(false);
    await expect(verifyMercadoPagoWebhookSignature({
      dataId: "resource",
      requestId: "request-abc",
      signature: "ts=bad,v1=nope",
      secret,
      now: new Date(1742505638000),
    })).resolves.toBe(false);
  });

  it("supports signature rotation with more than one v1 hash", async () => {
    const hash = await signMercadoPagoManifest(
      mercadoPagoSignatureManifest("resource", "request-abc", "1742505638"),
      secret,
    );
    await expect(verifyMercadoPagoWebhookSignature({
      dataId: "resource",
      requestId: "request-abc",
      signature: `ts=1742505638,v1=${"0".repeat(64)},v1=${hash}`,
      secret,
      now: new Date(1742505638000),
    })).resolves.toBe(true);
  });

  it("rejects a correctly signed notification outside the replay window", async () => {
    const timestamp = "1742505638";
    const hash = await signMercadoPagoManifest(
      mercadoPagoSignatureManifest("resource", "request-abc", timestamp),
      secret,
    );
    await expect(verifyMercadoPagoWebhookSignature({
      dataId: "resource",
      requestId: "request-abc",
      signature: `ts=${timestamp},v1=${hash}`,
      secret,
      now: new Date(1742505638000 + 5 * 60 * 1000 + 1),
    })).resolves.toBe(false);
  });
});
