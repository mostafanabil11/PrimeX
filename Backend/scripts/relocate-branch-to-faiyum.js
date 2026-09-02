/**
 * Moves the gym's one branch record off the invented Maadi address and onto
 * the real one in Faiyum, and scrubs the branch names that were seeded into
 * the testimonials.
 *
 * WHY THIS EDITS IN PLACE RATHER THAN REPLACING THE DOCUMENT
 *
 * Every trainer, subscription, enquiry, booking and class session in this
 * database points at that branch by _id. Inserting a Faiyum branch and
 * deleting the Maadi one would break all of them at once — which is exactly
 * what consolidate-to-single-branch.js exists to repair, and there is no
 * reason to create the damage in order to repair it. Renaming a record is not
 * the same operation as replacing it: the gym did not move, the data about it
 * was simply wrong. So the _id is untouched, every reference stays valid, and
 * there is nothing to repoint.
 *
 * The seed (src/database/seeds/gym.seed.ts) now carries the same values under
 * slug "faiyum", so a later `npm run seed:gym` matches this record and updates
 * it rather than inserting a second one.
 *
 *   node scripts/relocate-branch-to-faiyum.js
 *
 * Idempotent: a second run finds the branch already relocated, no testimonial
 * still naming a branch, and reports that it changed nothing. Back up first —
 * `npm run backup` — as with every script in here.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const OLD_SLUG = 'maadi';

// Matches the BRANCHES entry in src/database/seeds/gym.seed.ts. If you correct
// one, correct the other, or the next seed run will quietly undo this.
//
// Coordinates are cleared rather than replaced: the gym's own Maps listing is
// a better answer than a pin guessed from a city name, and mapsUrl() prefers
// googleMapsUrl over coordinates anyway. The listing is searched by the name
// Google still knows the place by — it traded as H2 before it was PrimeX.
const RELOCATED = {
  slug: 'faiyum',
  name: 'Faiyum',
  addressLine: 'Gamal Abd El-Nasir Street',
  city: 'First Al Faiyum',
  governorate: 'Faiyum Governorate 63511',
  googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=H2+Gym+Fayoum',
  latitude: null,
  longitude: null,
  phone: '+20 10 2059 8691',
  whatsappNumber: '+20 10 2059 8691',
  email: 'faiyum@primex.eg',
  // Renamed alongside this: Frontend/public/images/branch-maadi-hero.jpg is
  // now branch-hero.jpg. Nothing on the site renders branch images today, but
  // the path was the last place the old city name survived in the database.
  images: ['/images/branch-hero.jpg'],
};

// "Member since 2023 · Maadi" -> "Member since 2023". These were seeded, not
// written by members, and they named three branches this gym never had.
const ATTRIBUTION_SUFFIX = /\s*·\s*(maadi|new cairo|sheikh zayed|all branches)\s*$/i;

const OLD_QUOTE =
  'I travel for work and train at all three branches. Same standard every time, which is rarer than it should be.';
const NEW_QUOTE =
  'I travel for work and train wherever I land. I have not found anywhere that holds this standard, which is rarer than it should be.';

// Anything still carrying one of these after the run is a miss, and the script
// says so rather than reporting success.
const STALE = /maadi|road 9|new cairo|sheikh zayed|all branches/i;

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Put it in Backend/.env.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // --- the branch -------------------------------------------------------
  const branch = await db.collection('branches').findOne({ slug: OLD_SLUG });

  if (branch) {
    console.log(`Relocating : ${branch.name} — ${branch.addressLine}, ${branch.city}`);
    console.log(`         -> ${RELOCATED.name} — ${RELOCATED.addressLine}, ${RELOCATED.city}`);
    console.log(`  _id kept : ${branch._id} (no reference anywhere has to change)\n`);
    await db.collection('branches').updateOne({ _id: branch._id }, { $set: RELOCATED });
  } else {
    const already = await db.collection('branches').findOne({ slug: RELOCATED.slug });
    console.log(
      already
        ? `Branch already relocated: ${already.name} — ${already.addressLine}, ${already.city}\n`
        : `No branch with slug "${OLD_SLUG}" and none with "${RELOCATED.slug}". Nothing changed.\n`
    );
  }

  // --- the testimonials -------------------------------------------------
  let attributionsFixed = 0;
  for (const t of await db.collection('testimonials').find({}).toArray()) {
    const update = {};
    if (typeof t.attribution === 'string' && ATTRIBUTION_SUFFIX.test(t.attribution)) {
      update.attribution = t.attribution.replace(ATTRIBUTION_SUFFIX, '').trim();
    }
    if (t.quote === OLD_QUOTE) {
      update.quote = NEW_QUOTE;
    }
    if (Object.keys(update).length > 0) {
      await db.collection('testimonials').updateOne({ _id: t._id }, { $set: update });
      attributionsFixed += 1;
    }
  }
  console.log(`  testimonials updated: ${attributionsFixed}`);

  // --- prove it ---------------------------------------------------------
  // Reads every collection back and fails loudly on anything still naming a
  // place this gym is not. Cheap at this database's size, and the whole point
  // of the run is that none of these strings survive it.
  let stale = 0;
  for (const { name } of await db.listCollections().toArray()) {
    for (const doc of await db.collection(name).find({}).limit(5000).toArray()) {
      for (const [key, value] of Object.entries(doc)) {
        if (typeof value === 'string' && STALE.test(value)) {
          console.error(`  STALE  ${name}.${key} (${doc._id}): ${value}`);
          stale += 1;
        }
      }
    }
  }

  if (stale > 0) {
    console.error(`\n${stale} field(s) still name an old location. Investigate before deploying.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('\nNo document names Maadi, Road 9, New Cairo, Sheikh Zayed or "all branches".');
  console.log('Done.');
  await mongoose.disconnect();
})().catch(err => {
  console.error(err.message);
  process.exit(1);
});
