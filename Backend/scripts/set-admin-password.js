/**
 * Creates the gym owner's admin account, or resets its password.
 *
 * There is deliberately no way to register as an admin through the API — the
 * role is never taken from anything a browser sends, which is what stops a
 * stranger signing up with the keys to the business. That leaves no supported
 * way to make the first admin, or to get back in after a forgotten password,
 * which is what this is for. It runs against the database directly and so
 * needs shell access to the server, which is the point.
 *
 *   node scripts/set-admin-password.js                        # random password
 *   node scripts/set-admin-password.js admin@yourgym.com      # random password
 *   node scripts/set-admin-password.js admin@yourgym.com 'S3cret!'
 *
 * Idempotent: run it against an existing admin and only the password changes.
 * Also clears the failed-login lockout, since being locked out is one of the
 * reasons to reach for this.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const DEFAULT_EMAIL = 'admin@primex.eg';

// Matches the cost factor auth.service.ts hashes with. A different one here
// still verifies — bcrypt stores the cost in the hash — but keeping them equal
// means every account in the collection is equally expensive to attack.
const BCRYPT_ROUNDS = 10;

// Ambiguous characters left out: this gets read off a screen and typed into a
// login form, often by somebody who did not generate it.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function generatePassword(length = 20) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, byte => ALPHABET[byte % ALPHABET.length]).join('');
}

(async () => {
  const email = (process.argv[2] || DEFAULT_EMAIL).trim().toLowerCase();
  const supplied = process.argv[3];
  const password = supplied || generatePassword();

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Put it in Backend/.env.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.db.collection('users');

  const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const existing = await users.findOne({ email });

  await users.updateOne(
    { email },
    {
      $set: {
        password: hashed,
        role: 'admin',
        // No mailbox is involved in making an admin this way, so there is no
        // verification mail to click. Login refuses an unverified account.
        isEmailVerified: true,
        loginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        firstName: 'PrimeX',
        lastName: 'Admin',
        authProvider: 'local',
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  console.log(existing ? '\nPassword reset for existing admin.' : '\nAdmin account created.');
  console.log(`\n  email     ${email}`);
  console.log(`  password  ${password}\n`);

  if (!supplied) {
    console.log('Randomly generated. Change it after logging in — Account → Settings.\n');
  }

  await mongoose.disconnect();
})().catch(err => {
  console.error(err.message);
  process.exit(1);
});
