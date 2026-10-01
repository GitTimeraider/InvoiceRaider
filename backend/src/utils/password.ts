import { compareSync, hashSync } from "bcrypt";

// The async hash()/compare() of deno.land/x/bcrypt spawn a brand-new Web
// Worker (a full V8 isolate) for every call. That memory is not handed back
// to the OS after the worker exits, so each login permanently grew the
// backend by ~15-20 MB. The sync variants run on the main thread instead
// (~100 ms per call at the default cost), which is fine for the rare login
// and password-change requests.

/**
 * Hash a plaintext password using bcrypt.
 * Returns the bcrypt hash string.
 */
export function hashPassword(plaintext: string): Promise<string> {
  return Promise.resolve(hashSync(plaintext));
}

/**
 * Verify a plaintext password against a bcrypt hash.
 * Returns true if the password matches.
 */
export function verifyPassword(
  plaintext: string,
  hashedPassword: string,
): Promise<boolean> {
  return Promise.resolve(compareSync(plaintext, hashedPassword));
}
