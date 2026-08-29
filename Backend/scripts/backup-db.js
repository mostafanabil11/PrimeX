/**
 * Takes a complete, restorable snapshot of the database to a single file.
 *
 *   node scripts/backup-db.js                    # -> Backend/backups/
 *   node scripts/backup-db.js /path/to/folder    # somewhere else
 *
 * Run it before every migration or risky deploy. That is the single highest
 * value habit here: the most likely way this gym loses data is not a hacker or
 * a datacentre fire, it is a script doing exactly what it was told to.
 *
 * WHY NOT mongodump
 *
 * mongodump is the official tool and produces smaller files, but it is a
 * separate binary that has to be installed on whatever machine runs it. This
 * script needs nothing that `npm install` has not already put in node_modules,
 * so the same command works on a laptop, on Render, and inside a CI runner
 * without anyone installing MongoDB tooling. At this database's size that
 * trade is worth it. If the data ever grows into the many-gigabyte range,
 * revisit — mongodump streams and this does not.
 *
 * WHAT IS CAPTURED
 *
 * Every document in every collection, as Extended JSON so that ObjectIds and
 * Dates survive the round trip as their real types rather than degrading into
 * strings — a plain JSON.stringify would quietly corrupt every _id and every
 * date in the backup, and you would not find out until you tried to restore.
 *
 * Index definitions are captured too, and this matters more than it looks:
 * several indexes here are partial-unique (email, phoneNormalized,
 * referenceCode). A restore that recreated the documents but not those indexes
 * would come back subtly broken — duplicate members would become possible and
 * nothing would complain until two people shared a phone number.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { MongoClient } = require('mongodb');
const { EJSON } = require('bson');

// Collections that are pure cache or telemetry: cheap to lose, noisy to keep,
// and in one case self-expiring anyway. Skipped to keep backups small and
// restores fast. Nothing here is a business record.
const SKIP_COLLECTIONS = new Set(['ctaclicks', 'sessions']);

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Put it in Backend/.env.');
    process.exit(1);
  }

  const outDir = process.argv[2] || path.join(__dirname, '..', 'backups');
  fs.mkdirSync(outDir, { recursive: true });

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  console.log(`\nBacking up "${db.databaseName}"\n`);

  const collections = await db.listCollections().toArray();
  const dump = {
    // Metadata travels with the data so a file found in six months can still
    // explain itself: which database, when, and from which schema shape.
    meta: {
      database: db.databaseName,
      takenAt: new Date().toISOString(),
      collections: {},
    },
    data: {},
    indexes: {},
  };

  let totalDocs = 0;

  for (const info of collections) {
    const name = info.name;
    if (name.startsWith('system.') || SKIP_COLLECTIONS.has(name)) {
      console.log(`  ${name.padEnd(24)} skipped`);
      continue;
    }

    const collection = db.collection(name);
    const docs = await collection.find({}).toArray();

    // Only the indexes this app declared. _id_ is created automatically on
    // every collection, so restoring it would just make MongoDB complain.
    const indexes = (await collection.indexes()).filter(i => i.name !== '_id_');

    dump.data[name] = docs;
    dump.indexes[name] = indexes;
    dump.meta.collections[name] = { documents: docs.length, indexes: indexes.length };
    totalDocs += docs.length;

    console.log(`  ${name.padEnd(24)} ${String(docs.length).padStart(6)} docs, ${indexes.length} index(es)`);
  }

  await client.close();

  // EJSON.stringify, not JSON.stringify — see the note at the top about types.
  const serialised = EJSON.stringify(dump, null, 0, { relaxed: false });
  const gzipped = zlib.gzipSync(Buffer.from(serialised, 'utf8'), { level: 9 });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const file = path.join(outDir, `${db.databaseName}-${stamp}.json.gz`);
  fs.writeFileSync(file, gzipped);

  console.log(`\n  ${totalDocs} documents across ${Object.keys(dump.data).length} collections`);
  console.log(`  ${formatBytes(gzipped.length)} written to`);
  console.log(`  ${file}\n`);
  console.log('  Restore with: node scripts/restore-db.js "<file>"\n');
})().catch(err => {
  console.error(`\nBackup FAILED: ${err.message}\n`);
  // Non-zero so a scheduled run is reported as failed rather than silently
  // producing nothing. A backup job that fails quietly is worse than none.
  process.exit(1);
});
