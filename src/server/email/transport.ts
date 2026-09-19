export interface TransactionalEmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  dedupeKey: string;
  tags?: Readonly<Record<string, string>>;
}

export type EmailTransportResult =
  | { status: "accepted"; providerMessageId: string }
  | { status: "disabled"; providerMessageId: null };

export interface TransactionalEmailTransport {
  readonly name: string;
  readonly mode: "disabled" | "test" | "live";
  send(message: TransactionalEmailMessage): Promise<EmailTransportResult>;
}

export class DisabledEmailTransport implements TransactionalEmailTransport {
  readonly name = "disabled";
  readonly mode = "disabled";

  async send(): Promise<EmailTransportResult> {
    return { status: "disabled", providerMessageId: null };
  }
}

export class FakeEmailTransport implements TransactionalEmailTransport {
  readonly name = "fake";
  readonly mode = "test";
  readonly messages: TransactionalEmailMessage[] = [];

  async send(message: TransactionalEmailMessage): Promise<EmailTransportResult> {
    this.messages.push(structuredClone(message));
    return { status: "accepted", providerMessageId: `fake-${this.messages.length}` };
  }
}

export interface EmailDeliveryLedger {
  claim(dedupeKey: string): Promise<boolean>;
  complete(dedupeKey: string, providerMessageId: string): Promise<void>;
  release(dedupeKey: string, reason: "disabled" | "failed"): Promise<void>;
}

export class InMemoryEmailDeliveryLedger implements EmailDeliveryLedger {
  private readonly claimed = new Set<string>();
  private readonly completed = new Set<string>();

  async claim(dedupeKey: string): Promise<boolean> {
    if (this.claimed.has(dedupeKey) || this.completed.has(dedupeKey)) return false;
    this.claimed.add(dedupeKey);
    return true;
  }

  async complete(dedupeKey: string): Promise<void> {
    this.claimed.delete(dedupeKey);
    this.completed.add(dedupeKey);
  }

  async release(dedupeKey: string): Promise<void> {
    this.claimed.delete(dedupeKey);
  }
}

export function emailDedupeKey(kind: string, triggerKey: string, audienceId: string): string {
  const parts = [kind, triggerKey, audienceId].map((part) => part.trim().toLowerCase());
  if (parts.some((part) => !/^[a-z0-9][a-z0-9_.:-]{0,199}$/.test(part))) {
    throw new Error("INVALID_EMAIL_DEDUPE_KEY");
  }
  return `transactional:${parts.join(":")}`;
}

export class TransactionalEmailDispatcher {
  constructor(
    private readonly transport: TransactionalEmailTransport,
    private readonly ledger: EmailDeliveryLedger,
  ) {}

  async send(message: TransactionalEmailMessage): Promise<
    | EmailTransportResult
    | { status: "duplicate"; providerMessageId: null }
  > {
    if (!await this.ledger.claim(message.dedupeKey)) return { status: "duplicate", providerMessageId: null };
    try {
      const result = await this.transport.send(message);
      if (result.status === "accepted") {
        await this.ledger.complete(message.dedupeKey, result.providerMessageId);
      } else {
        await this.ledger.release(message.dedupeKey, "disabled");
      }
      return result;
    } catch (error) {
      await this.ledger.release(message.dedupeKey, "failed");
      throw error;
    }
  }
}
