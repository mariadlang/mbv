import { MercadoPagoBillingRepository } from "@/src/repositories/billing/MercadoPagoBillingRepository";

const repository = new MercadoPagoBillingRepository();

export const billingService = {
  getCheckoutUrl: () => repository.getCheckoutUrl(),
};
