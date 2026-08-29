/**
 * Creates a front-desk staff account, or resets its password.
 *
 * Staff can sign in to /admin and do front-desk work: see the dashboard, take
 * cash and InstaPay payments, record a walk-in membership, work the enquiry
 * inbox, and edit class types and trainers. They cannot change prices, run
 * offers, cancel a membership, see the member list, or read the audit log —
 * those stay with the owner's admin account.
 *
 * Like the admin script, there is no API route that grants this role: it is
 * never taken from anything a browser sends. That leaves the shell as the only
 * way in, which is the point.
 *
 * ONE ACCOUNT PER PERSON, not one shared "front desk" login. Every payment
 * records receivedBy, and every mutation is written to the audit log — a
 * shared account throws both away, and the question those answer ("who took
 * that money on Saturday?") is the one you will eventually need.
 *
 *   node scripts/create-staff-account.js sara@yourgym.com "Sara Ahmed"
 *   node scripts/create-staff-account.js sara@yourgym.com "Sara Ahmed" 'S3cret!'
 *
 * Idempotent: run it against an existing account and only the password and
 * role change. Also clears the failed-login lockout.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Matches the cost factor auth.service.ts hashes with, so every account in the
// collection is equally expensive to attack.
const BCRYPT_ROUNDS = 10;

// No O/0 or I/l/1 — this gets read off a screen and typed by someone else.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function generatePassword(length = 16) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, byte => ALPHABET[byte % ALPHABET.length]).join('');
}

(async () => {
  const email = (process.argv[2] || '').trim().toLowerCase();
  const fullName = (process.argv[3] || '').trim();
  const supplied = process.argv[4];

  if (!email || !fullName) {
    console.error('\nUsage: node scripts/create-staff-account.js <email> "<full name>" [password]\n');
    process.exit(1);
  }

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Put it in Backend/.env.');
    process.exit(1);
  }

  // Split on the first space only: "Sara Ahmed Mahmoud" is Sara / Ahmed
  // Mahmoud. lastName is required by the schema and Mongoose rejects an empty
  // string, so a single-word name gets a placeholder rather than failing.
  const spaceAt = fullName.indexOf(' ');
  const firstName = spaceAt === -1 ? fullName : fullName.slice(0, spaceAt);
  const lastName = spaceAt === -1 ? '—' : fullName.slice(spaceAt + 1);

  const password = supplied || generatePassword();

  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.db.collection('users');

  const existing = await users.findOne({ email });

  if (existing && existing.role === 'admin') {
    console.error(
      `\n${email} is an admin account. Refusing to downgrade it to staff — ` +
        `that would silently remove access to pricing and settings.\n`
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await users.updateOne(
    { email },
    {
      $set: {
        password: hashed,
        role: 'staff',
        // No mailbox is involved in making an account this way, so there is no
        // verification mail to click, and login refuses unverified accounts.
        isEmailVerified: true,
        loginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        firstName,
        lastName,
        authProvider: 'local',
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  console.log(existing ? '\nPassword reset for existing staff account.' : '\nStaff account created.');
  console.log(`\n  name      ${firstName} ${lastName}`);
  console.log(`  email     ${email}`);
  console.log(`  password  ${password}`);
  console.log(`\n  Sign in at /login, then go to /admin\n`);

  if (!supplied) {
    console.log('Randomly generated. Have them change it after signing in.\n');
  }

  await mongoose.disconnect();
})().catch(err => {
  console.error(`\n${err.message}\n`);
  process.exit(1);
});
