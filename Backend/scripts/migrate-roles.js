/**
 * Renames the 'user' role to 'member'.
 *
 * The clothing storefront had two roles, 'user' and 'admin'. The gym has four
 * — member, trainer, staff, admin — and 'user' becomes 'member'. The User
 * schema now declares an enum, so any document still carrying the old value
 * would fail validation on its next save.
 *
 *   MONGODB_URI="mongodb://localhost:27017/primex" node scripts/migrate-roles.js
 *
 * Reads MONGODB_URI from .env when it is not passed explicitly. Safe to
 * re-run: the second run matches nothing and reports zero changes.
 *
 * Pass --dry-run to see what would change without writing.
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const DRY_RUN = process.argv.includes('--dry-run');
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('MONGODB_URI is not set. Put it in Backend/.env or pass it inline.');
  process.exit(1);
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();

  try {
    const users = client.db().collection('users');

    // Anything outside the new enum, not just 'user' — a stray value would be
    // just as broken, and silently leaving it would defeat the point.
    const VALID = ['member', 'trainer', 'staff', 'admin'];
    const stale = await users.countDocuments({ role: { $nin: VALID } });
    const legacy = await users.countDocuments({ role: 'user' });
    const missing = await users.countDocuments({ role: { $exists: false } });

    console.log(`users with role 'user'        : ${legacy}`);
    console.log(`users with no role at all     : ${missing}`);
    console.log(`users with any invalid role   : ${stale}`);

    if (stale === 0 && missing === 0) {
      console.log('\nNothing to migrate.');
      return;
    }

    if (DRY_RUN) {
      const sample = await users
        .find({ $or: [{ role: { $nin: VALID } }, { role: { $exists: false } }] })
        .project({ email: 1, role: 1 })
        .limit(20)
        .toArray();
      console.log('\n--dry-run, no writes. Would update:');
      sample.forEach(u => console.log(`  ${u.email}  role=${u.role ?? '(absent)'} -> member`));
      return;
    }

    const result = await users.updateMany(
      { $or: [{ role: { $nin: VALID } }, { role: { $exists: false } }] },
      { $set: { role: 'member' } }
    );

    console.log(`\nUpdated ${result.modifiedCount} user(s) to role 'member'.`);
  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
