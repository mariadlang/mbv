const LOCAL_KEY_PREFIX = "mbv-return-experience-v1:";
const SESSION_KEY_PREFIX = "mbv-return-session-v1:";
const DAY_MS = 86_400_000;
export const RETURN_EXPERIENCE_MIN_DAYS_AWAY = 3;
export const RETURN_EXPERIENCE_UPDATED_EVENT = "mbv:return-experience-updated";

interface ReturnLocalState {
  lastSeenAt: string;
  dismissedAt?: string;
}

interface ReturnSessionState {
  detectedAt: string;
  daysAway: number;
}

export interface ReturnExperienceVisit {
  visible: boolean;
  detectedAt: string | null;
  daysAway: number | null;
}

const hiddenVisit = (): ReturnExperienceVisit => ({ visible: false, detectedAt: null, daysAway: null });

function key(prefix: string, accountId: string) {
  return `${prefix}${encodeURIComponent(accountId)}`;
}

function readJson<T>(storage: Storage, storageKey: string): T | null {
  try {
    const parsed = JSON.parse(storage.getItem(storageKey) ?? "null") as T | null;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeJson(storage: Storage, storageKey: string, value: unknown) {
  try {
    storage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // La experiencia de retorno nunca bloquea el uso de la aplicación.
  }
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(new Date(value).getTime());
}

export function readReturnExperience(
  accountId: string,
  sessionStorage: Storage = window.sessionStorage,
): ReturnExperienceVisit {
  const currentSession = readJson<Partial<ReturnSessionState>>(sessionStorage, key(SESSION_KEY_PREFIX, accountId));
  if (!validDate(currentSession?.detectedAt) || !Number.isInteger(currentSession?.daysAway) || Number(currentSession.daysAway) < RETURN_EXPERIENCE_MIN_DAYS_AWAY) return hiddenVisit();
  return { visible: true, detectedAt: currentSession.detectedAt, daysAway: Number(currentSession.daysAway) };
}

export function registerReturnActivity(
  accountId: string,
  now = new Date(),
  localStorage: Storage = window.localStorage,
  sessionStorage: Storage = window.sessionStorage,
): ReturnExperienceVisit {
  const localKey = key(LOCAL_KEY_PREFIX, accountId);
  const sessionKey = key(SESSION_KEY_PREFIX, accountId);
  const currentIso = now.toISOString();
  const currentSession = readReturnExperience(accountId, sessionStorage);
  const previous = readJson<Partial<ReturnLocalState>>(localStorage, localKey);

  writeJson(localStorage, localKey, {
    lastSeenAt: currentIso,
    ...(validDate(previous?.dismissedAt) ? { dismissedAt: previous.dismissedAt } : {}),
  } satisfies ReturnLocalState);

  if (currentSession.visible) return currentSession;

  if (!validDate(previous?.lastSeenAt)) return hiddenVisit();
  const daysAway = Math.floor((now.getTime() - new Date(previous.lastSeenAt).getTime()) / DAY_MS);
  if (daysAway < RETURN_EXPERIENCE_MIN_DAYS_AWAY) return hiddenVisit();

  const detected = { detectedAt: currentIso, daysAway } satisfies ReturnSessionState;
  writeJson(sessionStorage, sessionKey, detected);
  return { visible: true, ...detected };
}

export function touchReturnActivity(
  accountId: string,
  now = new Date(),
  localStorage: Storage = window.localStorage,
) {
  const localKey = key(LOCAL_KEY_PREFIX, accountId);
  const previous = readJson<Partial<ReturnLocalState>>(localStorage, localKey);
  writeJson(localStorage, localKey, {
    lastSeenAt: now.toISOString(),
    ...(validDate(previous?.dismissedAt) ? { dismissedAt: previous.dismissedAt } : {}),
  } satisfies ReturnLocalState);
}

/** @deprecated Prefer registerReturnActivity from the authenticated app boundary. */
export const registerReturnVisit = registerReturnActivity;

export function dismissReturnExperience(
  accountId: string,
  now = new Date(),
  localStorage: Storage = window.localStorage,
  sessionStorage: Storage = window.sessionStorage,
) {
  const localKey = key(LOCAL_KEY_PREFIX, accountId);
  const currentIso = now.toISOString();
  writeJson(localStorage, localKey, { lastSeenAt: currentIso, dismissedAt: currentIso } satisfies ReturnLocalState);
  try {
    sessionStorage.removeItem(key(SESSION_KEY_PREFIX, accountId));
  } catch {
    // Sin impacto funcional si el navegador bloquea el almacenamiento de sesión.
  }
}
