/**
 * Cross-checks every image path stored in the database against the files that
 * actually ship in the frontend's public/ directory.
 *
 * This is the failure that produces missing images in production while
 * everything looks fine locally: the database is shared between environments,
 * the files are not — they ride along with whatever commit was deployed. A
 * path saved through the admin panel that never had a matching file committed
 * is a broken image the moment it is deployed.
 *
 * Run before deploying, and after any bulk content edit.
 *
 *   node scripts/check-image-refs.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'Frontend', 'public');

// collection -> field holding the path(s)
const REFS = [
  { collection: 'branches', field: 'images', many: true, label: 'name' },
  { collection: 'trainers', field: 'photo', many: false, label: 'name' },
  { collection: 'classtypes', field: 'image', many: false, label: 'name' },
  { collection: 'testimonials', field: 'photo', many: false, label: 'name' },
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  let checked = 0;
  const broken = [];
  const external = [];

  for (const ref of REFS) {
    const exists = await db.listCollections({ name: ref.collection }).hasNext();
    if (!exists) {
      console.log(`- ${ref.collection}: no such collection, skipping`);
      continue;
    }

    const docs = await db.collection(ref.collection).find({}).toArray();
    for (const doc of docs) {
      const raw = doc[ref.field];
      const paths = (ref.many ? raw || [] : raw ? [raw] : []).filter(Boolean);

      for (const p of paths) {
        checked++;
        const who = `${ref.collection}/${doc[ref.label] ?? doc._id}`;

        // An absolute URL is somebody else's server to keep alive, and needs a
        // remotePatterns entry before next/image will touch it.
        if (/^https?:\/\//i.test(p)) {
          external.push(`${who}: ${p}`);
          continue;
        }

        if (!fs.existsSync(path.join(PUBLIC_DIR, p.replace(/^\//, '')))) {
          broken.push(`${who}: ${p}`);
        }
      }
    }
  }

  console.log(`\nchecked ${checked} image reference(s) against ${PUBLIC_DIR}`);

  if (external.length) {
    console.log(`\nexternally hosted (${external.length}) — needs next.config remotePatterns:`);
    external.forEach((e) => console.log('  ' + e));
  }

  if (broken.length) {
    console.log(`\nBROKEN — path in database, no file committed (${broken.length}):`);
    broken.forEach((b) => console.log('  ' + b));
  } else {
    console.log('\nno broken references: every stored path has a file behind it.');
  }

  await mongoose.disconnect();
  process.exit(broken.length ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
