/**
 * Prepares the database for membership tracking: members who have a phone
 * number but no email, and subscriptions carrying a reference code.
 *
 * MUST RUN BEFORE the matching code ships. The reason is subtle and silent:
 * `email` used to be a plain `unique: true`, and Mongoose will not replace an
 * existing index. autoIndex only ever *creates*, and creating email_1 again
 * with a partialFilterExpression raises IndexOptionsConflict — which Mongoose
 * routes to the connection's error event rather than throwing anywhere you
 * would notice. The app boots, looks healthy, and the old index quietly keeps
 * enforcing "at most one user without an email". The first two front-desk
 * members collide and nobody knows why.
 *
 * What it does, in order:
 *   1. Refuses to continue if anything would make the new indexes impossible.
 *   2. Drops email_1 and rebuilds it as partial-unique.
 *   3. Backfills phoneNormalized, reporting collisions rather than guessing.
 *   4. Backfills referenceCode on existing subscriptions.
 *   5. Creates the ctaclicks indexes, including the TTL.
 *
 * Idempotent: a second run reports zero changes and exits cleanly.
 *
 *   node scripts/migrate-membership-tracking.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');

// Mirrors Backend/src/common/utils/phone.util.ts. Duplicated deliberately:
// this script runs against the raw driver without the Nest app booted, and a
// migration that imports application code is a migration that stops working
// the moment that code moves.
const EGYPT_COUNTRY_CODE = '20';
const MIN_DIGITS = 8;

function normalizePhone(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = `${EGYPT_COUNTRY_CODE}${digits.slice(1)}`;
  } else if (digits.startsWith('1') && digits.length >= 10) {
    digits = `${EGYPT_COUNTRY_CODE}${digits}`;
  }
  return digits.length < MIN_DIGITS ? null : digits;
}

// Same alphabet as the application: no O/0 and no I/1, because this gets read
// aloud in a WhatsApp thread and typed back by someone else.
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const REF_LENGTH = 6;

function generateReference() {
  const bytes = crypto.randomBytes(REF_LENGTH);
  return Array.from(bytes, b => REF_ALPHABET[b % REF_ALPHABET.length]).join('');
}

async function dropIndexIfExists(collection, name) {
  try {
    await collection.dropIndex(name);
    return true;
  } catch (err) {
    // 27 / IndexNotFound — already gone, which is the idempotent path.
    if (err.codeName === 'IndexNotFound' || err.code === 27) return false;
    throw err;
  }
}

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Put it in Backend/.env.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const users = db.collection('users');
  const subscriptions = db.collection('subscriptions');

  console.log('\n=== Pre-flight ===');

  // A duplicate here would make the unique index impossible to build, and the
  // failure would land halfway through. Better to find out now and let a human
  // decide which record is the real one.
  const dupeEmails = await users
    .aggregate([
      { $match: { email: { $type: 'string' } } },
      { $group: { _id: '$email', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  if (dupeEmails.length > 0) {
    console.error('\nAborting: duplicate emails exist and must be resolved by hand first.');
    dupeEmails.forEach(d => console.error(`  ${d._id} — ${d.count} accounts`));
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log('  emails: no duplicates');

  // Collisions after normalization are the interesting case: two accounts that
  // look different but are the same person, e.g. "01020598691" and
  // "+20 102 059 8691". The script will not merge them — that is a judgement
  // about which name, which history and which membership survives.
  const withPhones = await users
    .find({ phone: { $type: 'string' } }, { projection: { phone: 1, email: 1 } })
    .toArray();

  const seen = new Map();
  const collisions = [];
  for (const user of withPhones) {
    const normalized = normalizePhone(user.phone);
    if (!normalized) continue;
    if (seen.has(normalized)) {
      collisions.push({ normalized, a: seen.get(normalized), b: user });
    } else {
      seen.set(normalized, user);
    }
  }

  if (collisions.length > 0) {
    console.error('\nAborting: these accounts share a phone number once normalized.');
    console.error('Merge or correct them by hand, then re-run.\n');
    collisions.forEach(c => {
      console.error(`  ${c.normalized}`);
      console.error(`    ${c.a._id}  ${c.a.email ?? '(no email)'}  "${c.a.phone}"`);
      console.error(`    ${c.b._id}  ${c.b.email ?? '(no email)'}  "${c.b.phone}"`);
    });
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`  phones: ${withPhones.length} to normalize, no collisions`);

  console.log('\n=== Indexes: users.email ===');
  // Inspect before touching it. Rebuilding an already-correct unique index
  // would leave a window on a large collection where uniqueness is not
  // enforced, for no gain — and re-running this script should be free.
  const userIndexes = await users.indexes();
  const existingEmail = userIndexes.find(i => i.name === 'email_1');

  if (existingEmail && existingEmail.partialFilterExpression) {
    console.log('  already partial-unique, left alone');
  } else {
    const dropped = await dropIndexIfExists(users, 'email_1');
    console.log(dropped ? '  dropped the old plain-unique email_1' : '  email_1 absent');
    await users.createIndex(
      { email: 1 },
      { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
    );
    console.log('  created partial-unique email index');
  }

  console.log('\n=== Backfill: users.phoneNormalized ===');
  let phoneUpdated = 0;
  for (const [normalized, user] of seen.entries()) {
    const result = await users.updateOne(
      { _id: user._id, phoneNormalized: { $ne: normalized } },
      { $set: { phoneNormalized: normalized } }
    );
    phoneUpdated += result.modifiedCount;
  }
  console.log(`  set on ${phoneUpdated} user(s)`);
  await users.createIndex(
    { phoneNormalized: 1 },
    { unique: true, partialFilterExpression: { phoneNormalized: { $type: 'string' } } }
  );
  console.log('  created partial-unique phoneNormalized index');

  console.log('\n=== Backfill: subscriptions.referenceCode ===');
  const needRef = await subscriptions
    .find({ referenceCode: { $in: [null, undefined] } }, { projection: { _id: 1 } })
    .toArray();

  let refUpdated = 0;
  for (const sub of needRef) {
    // Retry rather than assume: six characters from a 32-symbol alphabet is
    // roughly a billion, so a clash is rare — but "rare" over a whole member
    // base is not "never", and the index would reject it.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await subscriptions.updateOne(
          { _id: sub._id },
          { $set: { referenceCode: generateReference() } }
        );
        refUpdated += 1;
        break;
      } catch (err) {
        if (err.code !== 11000 || attempt === 4) throw err;
      }
    }
  }
  console.log(`  set on ${refUpdated} subscription(s)`);

  await subscriptions.createIndex(
    { referenceCode: 1 },
    { unique: true, partialFilterExpression: { referenceCode: { $type: 'string' } } }
  );
  await subscriptions.createIndex({ origin: 1, createdAt: -1 });
  console.log('  created referenceCode and origin indexes');

  console.log('\n=== Indexes: ctaclicks ===');
  const ctaClicks = db.collection('ctaclicks');
  await ctaClicks.createIndex(
    { dedupeKey: 1 },
    { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } }
  );
  await ctaClicks.createIndex({ kind: 1, createdAt: -1 });
  await ctaClicks.createIndex({ createdAt: 1 }, { expireAfterSeconds: 400 * 24 * 60 * 60 });
  console.log('  created dedupe, kind and TTL indexes');

  console.log('\nDone.\n');
  await mongoose.disconnect();
})().catch(err => {
  console.error(`\n${err.message}\n`);
  process.exit(1);
});
