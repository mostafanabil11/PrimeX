/**
 * Restores a database from a file made by backup-db.js.
 *
 *   node scripts/restore-db.js backups/gym1-2026-08-28T12-00-00.json.gz
 *          ^ dry run: says exactly what it would do, changes nothing
 *
 *   node scripts/restore-db.js <file> --confirm
 *          ^ restores into empty collections only, refuses to overwrite
 *
 *   node scripts/restore-db.js <file> --confirm --drop
 *          ^ replaces existing collections. Destructive. Read the warning.
 *
 * DESIGN NOTE — WHY IT IS AWKWARD ON PURPOSE
 *
 * This script exists to be run on the worst day of the year, by someone under
 * pressure, possibly not the person who wrote it. So it defaults to doing
 * nothing, requires a flag to act, requires a second flag to overwrite, and
 * prints what it is about to do before doing it.
 *
 * The failure mode being designed against is real and common: someone reaches
 * for the restore script to recover one deleted member, runs it against the
 * live database, and overwrites a week of good data with an old snapshot. The
 * dry run being the default is what stops that.
 *
 * TEST THIS BEFORE YOU NEED IT. Restore into a scratch database at least once
 * — an untested backup is a guess. See docs/BACKUPS.md.
 */
require('dotenv').config();
const fs = require('fs');
const zlib = require('zlib');
const { MongoClient } = require('mongodb');
const { EJSON } = require('bson');

(async () => {
  const file = process.argv[2];
  const confirm = process.argv.includes('--confirm');
  const drop = process.argv.includes('--drop');

  if (!file) {
    console.error('\nUsage: node scripts/restore-db.js <backup-file> [--confirm] [--drop]\n');
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error(`\nNo such file: ${file}\n`);
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Put it in Backend/.env.');
    process.exit(1);
  }

  const dump = EJSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8'));

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  console.log(`\n  Backup taken : ${dump.meta.takenAt}`);
  console.log(`  Backup of    : ${dump.meta.database}`);
  console.log(`  Restoring to : ${db.databaseName}`);

  // Restoring a backup of one database into a differently-named one is
  // occasionally deliberate (a scratch copy for testing) and occasionally a
  // disaster (production). Said out loud either way.
  if (dump.meta.database !== db.databaseName) {
    console.log(`\n  NOTE: names differ. MONGODB_URI points at "${db.databaseName}".`);
  }

  console.log('');

  const plan = [];
  for (const [name, docs] of Object.entries(dump.data)) {
    const existing = await db.collection(name).countDocuments();
    plan.push({ name, incoming: docs.length, existing });
  }

  const blocked = plan.filter(p => p.existing > 0 && !drop);
  const width = Math.max(...plan.map(p => p.name.length), 10);

  for (const p of plan) {
    const status =
      p.existing === 0 ? 'empty, will restore' : drop ? `WILL REPLACE ${p.existing} existing` : `SKIP — has ${p.existing}`;
    console.log(`  ${p.name.padEnd(width)}  ${String(p.incoming).padStart(6)} docs   ${status}`);
  }

  if (!confirm) {
    console.log('\n  DRY RUN — nothing was changed.');
    console.log('  Add --confirm to restore.');
    if (blocked.length > 0) {
      console.log(`  ${blocked.length} collection(s) already hold data; add --drop to replace them.`);
    }
    console.log('');
    await client.close();
    return;
  }

  if (blocked.length > 0) {
    console.log(
      `\n  Refusing to run: ${blocked.length} collection(s) already contain data.` +
        `\n  Restoring over live data needs --drop, said explicitly.\n`
    );
    await client.close();
    process.exit(1);
  }

  console.log('\n  Restoring...\n');
  let restored = 0;

  for (const [name, docs] of Object.entries(dump.data)) {
    if (drop) {
      await db.collection(name).deleteMany({});
    }

    if (docs.length > 0) {
      // Chunked: one insertMany of a very large collection can exceed the
      // 16MB command limit and fail the whole restore partway through.
      const CHUNK = 500;
      for (let i = 0; i < docs.length; i += CHUNK) {
        await db.collection(name).insertMany(docs.slice(i, i + CHUNK), { ordered: false });
      }
    }

    // Indexes after the documents: building them first means every insert
    // pays to maintain them, and a unique index could reject a legitimate
    // document that a later one would have made room for.
    for (const index of dump.indexes[name] ?? []) {
      const { key, name: indexName, v, ...options } = index;
      try {
        await db.collection(name).createIndex(key, { ...options, name: indexName });
      } catch (err) {
        // Reported, not fatal — a missing index is recoverable by rerunning
        // the app, whereas aborting here would leave a half-restored database.
        console.log(`    ! index ${indexName} on ${name}: ${err.message}`);
      }
    }

    restored += docs.length;
    console.log(`  ${name.padEnd(width)}  ${String(docs.length).padStart(6)} docs restored`);
  }

  await client.close();
  console.log(`\n  Done — ${restored} documents restored into "${db.databaseName}".\n`);
})().catch(err => {
  console.error(`\nRestore FAILED: ${err.message}\n`);
  process.exit(1);
});
