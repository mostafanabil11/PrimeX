/**
 * Assigns front-desk member numbers to users who do not have one, and lifts
 * the shared counter clear of the highest number already in use.
 *
 * Two situations this handles:
 *
 *   1. This project's existing users, who predate the memberNumber field.
 *      They get numbers in signup order, so the earliest member is 1001.
 *
 *   2. A real gym adopting this system, whose members already carry numbers
 *      printed on cards. Import those numbers as-is FIRST (they must be
 *      preserved — renumbering invalidates every card in a wallet), then run
 *      this. It only fills the gaps, and crucially bumps the counter above
 *      the highest imported number so the next new member cannot be handed
 *      one that is already taken.
 *
 * Idempotent: a second run finds nobody without a number and changes nothing.
 *
 *   node scripts/backfill-member-numbers.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const COUNTER_KEY = 'member-number';
const START = 1001;

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const users = db.collection('users');
  const counters = db.collection('counters');

  // The highest number already in use, whether this script assigned it or it
  // arrived with an import. Everything new counts up from here.
  const [highest] = await users
    .find({ memberNumber: { $type: 'number' } })
    .sort({ memberNumber: -1 })
    .limit(1)
    .toArray();

  let next = Math.max(highest?.memberNumber ?? 0, START - 1) + 1;

  // Oldest first, so the longest-standing member gets the lowest number.
  const missing = await users
    .find({ $or: [{ memberNumber: null }, { memberNumber: { $exists: false } }] })
    .sort({ createdAt: 1 })
    .toArray();

  console.log(`users without a member number: ${missing.length}`);

  for (const user of missing) {
    await users.updateOne({ _id: user._id }, { $set: { memberNumber: next } });
    console.log(`  ${String(next).padStart(4)}  ${user.email}`);
    next++;
  }

  // The counter stores the last number handed out, so it is one below the
  // next available. Written unconditionally rather than only when higher:
  // this is the single source of truth for new registrations, and leaving it
  // behind an imported range is exactly how duplicates happen.
  const lastUsed = next - 1;
  await counters.updateOne(
    { key: COUNTER_KEY },
    { $set: { seq: lastUsed } },
    { upsert: true }
  );

  console.log(`\ncounter '${COUNTER_KEY}' set to ${lastUsed} — next member will be ${lastUsed + 1}`);

  const total = await users.countDocuments({ memberNumber: { $type: 'number' } });
  console.log(`users with a member number: ${total}`);

  await mongoose.disconnect();
})().catch(err => {
  console.error(err.message);
  process.exit(1);
});
