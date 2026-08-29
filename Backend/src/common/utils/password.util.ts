import { randomBytes } from 'crypto';

// No O/0 and no I/l/1. This gets read off a screen by one person and typed by
// another, usually once, standing at a desk — the ambiguous glyphs are where
// that goes wrong. Same alphabet as scripts/set-admin-password.js.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/**
 * A password for an account someone else is creating.
 *
 * Generated rather than chosen: the alternative is an admin inventing one for
 * their colleague, and the passwords people invent for other people are the
 * worst passwords there are. Shown once, never stored in the clear, and the
 * holder is told to change it.
 */
export function generatePassword(length = 14): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, byte => ALPHABET[byte % ALPHABET.length]).join('');
}
