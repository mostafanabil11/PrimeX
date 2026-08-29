/**
 * Attaches the New Cairo cover photo to the existing branch document.
 *
 * The seed already carries this path, but re-running the whole seed would
 * $set every other field too and discard anything edited in the admin since.
 * This touches one field on one document.
 *
 *   node scripts/set-branch-cover.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const COVERS = {
  'new-cairo': ['/images/branch-new-cairo-hero.jpg'],
};

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const branches = mongoose.connection.db.collection('branches');

  for (const [slug, images] of Object.entries(COVERS)) {
    const res = await branches.updateOne({ slug }, { $set: { images } });
    console.log(`${slug}: matched ${res.matchedCount}, modified ${res.modifiedCount}`);
  }

  const check = await branches
    .find({}, { projection: { slug: 1, images: 1, _id: 0 } })
    .toArray();
  console.log(JSON.stringify(check));

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
