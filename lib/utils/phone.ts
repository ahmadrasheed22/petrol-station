/**
 * Petrol Station - Worker Phone Authentication Utilities
 *
 * Workers in rural settings often do not have or use email addresses.
 * Supabase Auth requires an email format, so we programmatically append a dummy
 * domain (@pump.worker) strictly under the hood during worker provisioning and login.
 * The frontend UI only exposes and interacts with Phone Numbers.
 */

export const WORKER_EMAIL_DOMAIN = "@pump.worker";

/**
 * Strips non-digit characters from the input string.
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "");
}

/**
 * Converts a phone number into the internal Supabase dummy email format.
 * E.g., "0300 1234567" -> "03001234567@pump.worker"
 */
export function phoneToWorkerEmail(phone: string): string {
  const cleaned = cleanPhoneNumber(phone);
  return `${cleaned}${WORKER_EMAIL_DOMAIN}`;
}

/**
 * Checks whether an email address is an internal worker dummy email.
 */
export function isWorkerEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(WORKER_EMAIL_DOMAIN.toLowerCase());
}

/**
 * Reverses an internal worker dummy email back to the phone number.
 * E.g., "03001234567@pump.worker" -> "03001234567"
 */
export function workerEmailToPhone(email?: string | null): string {
  if (!email) return "";
  if (isWorkerEmail(email)) {
    return email.slice(0, email.length - WORKER_EMAIL_DOMAIN.length);
  }
  return email;
}

/**
 * Formats a phone number for clean UI presentation.
 * Formats 11-digit Pakistani mobile numbers (e.g., 03001234567 -> 0300 1234567).
 */
export function formatPhoneDisplay(phoneOrEmail?: string | null): string {
  if (!phoneOrEmail) return "";
  const phone = isWorkerEmail(phoneOrEmail)
    ? workerEmailToPhone(phoneOrEmail)
    : cleanPhoneNumber(phoneOrEmail);

  if (phone.length === 11 && phone.startsWith("03")) {
    return `${phone.slice(0, 4)} ${phone.slice(4)}`;
  }
  if (phone.length === 12 && phone.startsWith("923")) {
    return `+${phone.slice(0, 2)} ${phone.slice(2, 5)} ${phone.slice(5)}`;
  }
  return phone || phoneOrEmail;
}

/**
 * Safely extracts the user identifier for display in headers and badges.
 * Never leaks the internal @pump.worker dummy domain to the user.
 */
export function getUserIdentifier(
  target?: { email?: string | null } | string | null
): string {
  if (!target) return "";
  const email = typeof target === "string" ? target : target.email;
  if (!email) return "";

  if (isWorkerEmail(email)) {
    return formatPhoneDisplay(email);
  }
  return email;
}
