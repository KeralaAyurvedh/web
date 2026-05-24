const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

type LoginAttempt = {
  count: number;
  lockedUntil?: number;
};

const attempts = new Map<string, LoginAttempt>();

function keyForLogin(phone: string, ip?: string) {
  return `${phone.trim().toLowerCase()}::${ip ?? "unknown"}`;
}

export function getLoginBlockMessage(phone: string, ip?: string) {
  const attempt = attempts.get(keyForLogin(phone, ip));
  if (!attempt?.lockedUntil) {
    return null;
  }

  if (attempt.lockedUntil <= Date.now()) {
    attempts.delete(keyForLogin(phone, ip));
    return null;
  }

  const remainingMinutes = Math.ceil((attempt.lockedUntil - Date.now()) / 60000);
  return `Too many failed login attempts. Try again in ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}.`;
}

export function recordFailedLogin(phone: string, ip?: string) {
  const key = keyForLogin(phone, ip);
  const current = attempts.get(key) ?? { count: 0 };
  const nextCount = current.count + 1;

  attempts.set(key, {
    count: nextCount,
    lockedUntil: nextCount >= MAX_FAILED_LOGIN_ATTEMPTS ? Date.now() + LOGIN_LOCK_MS : current.lockedUntil
  });
}

export function clearFailedLogins(phone: string, ip?: string) {
  attempts.delete(keyForLogin(phone, ip));
}
