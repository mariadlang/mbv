import { clientProductEventNames, sanitizeProductMetadata, type ClientProductEventName } from "@/src/domain/productAnalytics";

const QUEUE_KEY = "mbv-product-events-v2";
const SESSION_KEY = "mbv-product-session-v2";
const AUTH_INTENT_KEY = "mbv-auth-analytics-intent-v2";
const MAX_QUEUED_EVENTS = 80;
const MAX_QUEUE_AGE_MS = 30 * 86_400_000;
export const PRODUCT_SESSION_IDLE_MS = 30 * 60 * 1000;
let analyticsConsent = false;
let activeAnalyticsAccountId: string | null = null;

export interface AuthAnalyticsIntent {
  kind: "signup" | "login";
  source: "google" | "magic_link";
  startedAt: string;
}

export interface QueuedProductEvent {
  id: string;
  event: ClientProductEventName;
  properties: Record<string, string>;
  dedupeKey: string;
  occurredAt: string;
  sessionId: string | null;
  accountId: string | null;
}

const uniqueId = () => typeof crypto !== "undefined" && "randomUUID" in crypto
  ? crypto.randomUUID()
  : Date.now() + "-" + Math.random().toString(16).slice(2);

interface StoredProductSession { id: string; lastSeenAt: number }

function readProductSession(): StoredProductSession | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? "null") as Partial<StoredProductSession> | null;
    if (!stored || typeof stored.id !== "string" || typeof stored.lastSeenAt !== "number" || !Number.isFinite(stored.lastSeenAt)) return null;
    return { id: stored.id, lastSeenAt: stored.lastSeenAt };
  } catch {
    return null;
  }
}

function writeProductSession(session: StoredProductSession) {
  try { window.localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* La sesión puede continuar sólo en memoria. */ }
}

function isQueuedProductEvent(item: unknown): item is QueuedProductEvent {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Partial<QueuedProductEvent>;
  return typeof candidate.id === "string"
    && typeof candidate.event === "string"
    && clientProductEventNames.includes(candidate.event as ClientProductEventName)
    && Boolean(candidate.properties)
    && typeof candidate.properties === "object"
    && typeof candidate.dedupeKey === "string"
    && /^[A-Za-z0-9:._-]{6,180}$/.test(candidate.dedupeKey)
    && candidate.dedupeKey.startsWith(candidate.event + ":")
    && typeof candidate.occurredAt === "string"
    && (candidate.sessionId === undefined || candidate.sessionId === null || (typeof candidate.sessionId === "string" && /^[A-Za-z0-9:_-]{6,100}$/.test(candidate.sessionId)))
    && (candidate.accountId === undefined || candidate.accountId === null || typeof candidate.accountId === "string")
    && Number.isFinite(new Date(candidate.occurredAt).getTime());
}

export function resolveProductSession(now = Date.now()): string {
  const stored = readProductSession();
  const id = stored && now - stored.lastSeenAt <= PRODUCT_SESSION_IDLE_MS ? stored.id : uniqueId();
  if (typeof window !== "undefined") writeProductSession({ id, lastSeenAt: now });
  return id;
}

export interface ProductSessionHeartbeat {
  getSessionId(): string;
  refresh(): void;
  check(): void;
  stop(): void;
}

export function startProductSessionHeartbeat(onSessionStarted: (sessionId: string) => void): ProductSessionHeartbeat {
  if (typeof window === "undefined") {
    return { getSessionId: () => "", refresh: () => undefined, check: () => undefined, stop: () => undefined };
  }
  let stopped = false;
  let sessionId = resolveProductSession();

  const registerActivity = () => {
    if (stopped) return;
    const nextSessionId = resolveProductSession();
    const changed = nextSessionId !== sessionId;
    sessionId = nextSessionId;
    if (changed) onSessionStarted(sessionId);
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== SESSION_KEY) return;
    const stored = readProductSession();
    if (!stored) return;
    sessionId = stored.id;
  };
  const onVisible = () => { if (document.visibilityState === "visible") registerActivity(); };

  window.addEventListener("storage", onStorage);
  window.addEventListener("pointerdown", registerActivity);
  window.addEventListener("keydown", registerActivity);
  window.addEventListener("touchstart", registerActivity);
  window.addEventListener("focus", registerActivity);
  document.addEventListener("visibilitychange", onVisible);
  return {
    getSessionId: () => sessionId,
    refresh: registerActivity,
    check: registerActivity,
    stop: () => {
      stopped = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pointerdown", registerActivity);
      window.removeEventListener("keydown", registerActivity);
      window.removeEventListener("touchstart", registerActivity);
      window.removeEventListener("focus", registerActivity);
      document.removeEventListener("visibilitychange", onVisible);
    },
  };
}

export function readQueuedProductEvents(accountId?: string): QueuedProductEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(QUEUE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - MAX_QUEUE_AGE_MS;
    return parsed
      .filter(isQueuedProductEvent)
      .map((item) => ({ ...item, sessionId: item.sessionId ?? null, accountId: item.accountId ?? null }))
      .filter((item) => new Date(item.occurredAt).getTime() >= cutoff)
      .filter((item) => accountId === undefined || item.accountId === accountId)
      .slice(-MAX_QUEUED_EVENTS);
  } catch {
    return [];
  }
}

function writeQueuedProductEvents(events: QueuedProductEvent[]) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-MAX_QUEUED_EVENTS))); } catch { /* La aplicación sigue funcionando sin almacenamiento de telemetría. */ }
}

export function removeQueuedProductEvent(id: string) {
  writeQueuedProductEvents(readQueuedProductEvents().filter((item) => item.id !== id));
}

export function clearQueuedProductEvents() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(QUEUE_KEY); } catch { /* Sin impacto funcional. */ }
}

export function rememberAuthAnalyticsIntent(kind: AuthAnalyticsIntent["kind"], source: AuthAnalyticsIntent["source"]) {
  if (typeof window === "undefined" || !analyticsConsent) return;
  try { window.localStorage.setItem(AUTH_INTENT_KEY, JSON.stringify({ kind, source, startedAt: new Date().toISOString() } satisfies AuthAnalyticsIntent)); } catch { /* Sin impacto funcional. */ }
}

export function clearAuthAnalyticsIntent() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(AUTH_INTENT_KEY); } catch { /* Sin impacto funcional. */ }
}

export function consumeAuthAnalyticsIntent(): AuthAnalyticsIntent | null {
  if (typeof window === "undefined" || !analyticsConsent) return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(AUTH_INTENT_KEY) ?? "null") as Partial<AuthAnalyticsIntent> | null;
    window.localStorage.removeItem(AUTH_INTENT_KEY);
    if (!parsed || !["signup", "login"].includes(String(parsed.kind)) || !["google", "magic_link"].includes(String(parsed.source))) return null;
    const startedAt = new Date(String(parsed.startedAt));
    if (!Number.isFinite(startedAt.getTime()) || Date.now() - startedAt.getTime() > 24 * 60 * 60 * 1000) return null;
    return { kind: parsed.kind as AuthAnalyticsIntent["kind"], source: parsed.source as AuthAnalyticsIntent["source"], startedAt: startedAt.toISOString() };
  } catch {
    clearAuthAnalyticsIntent();
    return null;
  }
}

export function claimQueuedProductEvents(accountId: string) {
  activeAnalyticsAccountId = accountId;
  writeQueuedProductEvents(readQueuedProductEvents().map((item) => item.accountId ? item : { ...item, accountId }));
}

export function releaseAnalyticsAccount(accountId: string) {
  if (activeAnalyticsAccountId === accountId) activeAnalyticsAccountId = null;
}

export function setAnalyticsConsent(enabled: boolean) {
  analyticsConsent = enabled;
  if (!enabled) {
    clearQueuedProductEvents();
    clearAuthAnalyticsIntent();
  }
}

export function hasAnalyticsConsent() {
  return analyticsConsent;
}

export function isPermanentAnalyticsFailure(error: unknown) {
  if ((error as { name?: unknown })?.name === "ZodError" || Array.isArray((error as { issues?: unknown })?.issues)) return true;
  const status = Number((error as { status?: unknown })?.status);
  return status >= 400 && status < 500 && ![408, 425, 429].includes(status);
}

// Punto único de instrumentación. La cola sólo existe después del consentimiento,
// cruza pestañas para completar el funnel y nunca guarda contenido personal.
export const analyticsService = {
  track(event: ClientProductEventName, properties: Record<string, string | number | boolean> = {}, dedupeKey?: string, occurredAt?: string) {
    if (typeof window === "undefined" || !analyticsConsent) return;
    const resolvedDedupeKey = dedupeKey ?? event + ":" + uniqueId();
    const queued: QueuedProductEvent = {
      id: uniqueId(),
      event,
      properties: sanitizeProductMetadata(properties) as Record<string, string>,
      dedupeKey: resolvedDedupeKey.startsWith(event + ":") ? resolvedDedupeKey : event + ":" + resolvedDedupeKey,
      occurredAt: occurredAt && Number.isFinite(new Date(occurredAt).getTime()) ? new Date(occurredAt).toISOString() : new Date().toISOString(),
      sessionId: resolveProductSession(),
      accountId: activeAnalyticsAccountId,
    };
    const current = readQueuedProductEvents();
    if (current.some((item) => item.dedupeKey === queued.dedupeKey && item.accountId === queued.accountId)) return;
    writeQueuedProductEvents([...current, queued]);
    window.dispatchEvent(new CustomEvent("mbv:product-event", { detail: queued }));
  },
};
