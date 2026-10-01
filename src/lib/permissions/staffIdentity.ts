/**
 * Staff log in with a username, not an email. Supabase auth only signs in by
 * email (phone needs an SMS provider this project doesn't have), so each staff
 * username maps to a hidden, never-delivered auth email. Staff never see it.
 *
 * Username = "<store_slug>.<name>", e.g. "pawfectbd.rahim" — the store slug
 * makes it unique across every Shei Hoise store.
 */

export const STAFF_EMAIL_DOMAIN = "staff.sheihoise.internal";

/** The part the owner types: letters, numbers, underscore, 3–30 chars. */
export const STAFF_NAME_PATTERN = /^[a-z0-9_]{3,30}$/;

export const STAFF_MIN_PASSWORD_LENGTH = 8;

/** Failed passwords in a row before the username is locked for a while. */
export const STAFF_MAX_FAILED_LOGINS = 5;
export const STAFF_LOCK_MINUTES = 15;

export function buildStaffUsername(storeSlug: string, name: string): string {
  return `${storeSlug.trim().toLowerCase()}.${name.trim().toLowerCase()}`;
}

export function staffEmailFor(username: string): string {
  return `${username.trim().toLowerCase()}@${STAFF_EMAIL_DOMAIN}`;
}

/** Login field rule: anything without "@" is treated as a staff username. */
export function isStaffLoginValue(value: string): boolean {
  return value.trim().length > 0 && !value.includes("@");
}
