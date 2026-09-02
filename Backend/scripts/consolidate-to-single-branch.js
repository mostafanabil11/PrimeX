/**
 * Collapses a multi-branch gym down to one site.
 *
 * The schema still models branches, and deliberately so — a gym with one
 * location still has an address, opening hours and a map, and that has to live
 * somewhere. What changes is that everything now points at the same branch, so
 * the site can stop asking people to choose one.
 *
 * Repoints before it deletes, in that order. Every trainer, session,
 * membership and enquiry in this database referenced a branch that is going
 * away; deleting first would leave each of them pointing at nothing, and a
 * membership whose branch cannot be resolved is worse than one at the wrong
 * address.
 *
 *   node scripts/consolidate-to-single-branch.js         # keeps faiyum
 *   node scripts/consolidate-to-single-branch.js other  # keeps that one
 *
 * Idempotent: a second run finds nothing to repoint and no branches to remove.
 */
require('dotenv').config();
const mongoose = require('mongoose');

// The surviving branch. Was 'maadi' until relocate-branch-to-faiyum.js renamed
// that record; a default naming a branch that no longer exists would make a
// bare run of a script that DELETES branches fail with a confusing error.
const DEFAULT_KEEP = 'faiyum';

(async () => {
  const keepSlug = (process.argv[2] || DEFAULT_KEEP).trim().toLowerCase();

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Put it in Backend/.env.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const keep = await db.collection('branches').findOne({ slug: keepSlug });
  if (!keep) {
    console.error(`No branch with slug "${keepSlug}". Nothing changed.`);
    process.exit(1);
  }

  const doomed = await db
    .collection('branches')
    .find({ _id: { $ne: keep._id } })
    .toArray();

  if (doomed.length === 0) {
    console.log(`Already a single branch: ${keep.name}. Nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  const doomedIds = doomed.map(b => b._id);
  console.log(`Keeping   : ${keep.name} (${keep.slug})`);
  console.log(`Removing  : ${doomed.map(b => b.name).join(', ')}\n`);

  // Single-ref collections. A membership bought against a branch that is
  // closing does not stop being a membership — it moves.
  for (const collection of ['classsessions', 'subscriptions', 'bookings', 'enquiries']) {
    const result = await db
      .collection(collection)
      .updateMany({ branch: { $in: doomedIds } }, { $set: { branch: keep._id } });
    console.log(`  ${collection.padEnd(15)} repointed ${result.modifiedCount}`);
  }

  // Trainers hold an array, because covering another site is routine. With one
  // site the array is always the same single entry — set rather than pulled,
  // so a trainer who only ever worked at a closing branch is not left with an
  // empty list and dropped off the site.
  const trainers = await db
    .collection('trainers')
    .updateMany({}, { $set: { branches: [keep._id] } });
  console.log(`  ${'trainers'.padEnd(15)} repointed ${trainers.modifiedCount}`);

  const removed = await db.collection('branches').deleteMany({ _id: { $in: doomedIds } });
  console.log(`\n  branches removed: ${removed.deletedCount}`);

  // Proves the repointing was complete rather than assuming it. Anything left
  // here would render as a missing branch on a page that no longer offers a
  // way to pick a different one.
  let dangling = 0;
  for (const collection of ['classsessions', 'subscriptions', 'bookings', 'enquiries']) {
    dangling += await db
      .collection(collection)
      .countDocuments({ branch: { $in: doomedIds } });
  }
  dangling += await db.collection('trainers').countDocuments({ branches: { $in: doomedIds } });

  console.log(`  dangling references: ${dangling}`);
  if (dangling > 0) {
    console.error('\nSomething still points at a removed branch. Investigate before deploying.');
    process.exit(1);
  }

  console.log('\nDone.');
  await mongoose.disconnect();
})().catch(err => {
  console.error(err.message);
  process.exit(1);
});
