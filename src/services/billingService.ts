import { MercadoPagoBillingRepository } from "@/src/repositories/billing/MercadoPagoBillingRepository";
import type { BillingInterval } from "@/src/domain/commercialOffer";
import { authService } from "@/src/services/authService";

const repository = new MercadoPagoBillingRepository();

export const billingService = {
  async startCheckout(interval: BillingInterval) {
    const accessToken = await authService.getAccessToken();
    if (!accessToken) throw new Error("AUTH_REQUIRED");
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await repository.createCheckout(accessToken, interval);
      if (result.status === "ready") return result;
      await new Promise((resolve) => setTimeout(resolve, result.retryAfterSeconds * 1_000));
    }
    throw new Error("CHECKOUT_STILL_CREATING");
  },
  async getStatus() {
    const accessToken = await authService.getAccessToken();
    if (!accessToken) throw new Error("AUTH_REQUIRED");
    return repository.getStatus(accessToken);
  },
  async cancelSubscription() {
    const accessToken = await authService.getAccessToken();
    if (!accessToken) throw new Error("AUTH_REQUIRED");
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await repository.cancelSubscription(accessToken);
      if (result.status !== "processing") return result;
      await new Promise((resolve) => setTimeout(resolve, result.retryAfterSeconds * 1_000));
    }
    throw new Error("BILLING_CANCELLATION_STILL_PROCESSING");
  },
};
