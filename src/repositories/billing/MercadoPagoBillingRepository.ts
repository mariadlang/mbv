import { publicConfig } from "@/src/lib/publicConfig";
import type { BillingRepository } from "@/src/repositories/interfaces/BillingRepository";

export class MercadoPagoBillingRepository implements BillingRepository {
  getCheckoutUrl() { return publicConfig.mercadoPagoCheckoutUrl; }
}
