/**
 * Copies every collection from one MongoDB deployment to another — used to
 * lift the local development database into Atlas so a deployed API can reach
 * it. A cloud-hosted backend cannot see a database on your laptop, which is
 * the whole reason this exists.
 *
 * Connection strings come from the environment and are never written to disk,
 * since they carry the database password.
 *
 *   SOURCE_URI="mongodb://localhost:27017/primex" \
 *   TARGET_URI="mongodb+srv://user:pass@cluster.mongodb.net/primex" \
 *   node scripts/migrate-database.js
 *
 * Safe to re-run: documents are matched on _id and replaced, so a second run
 * updates rather than duplicates. Pass --drop to empty each target collection
 * first, which is what you want if the source is authoritative and the target
 * has drifted.
 *
 * Indexes are deliberately NOT copied. The application builds them from its
 * Mongoose schemas on first boot, and those definitions are the source of
 * truth — copying them risks carrying over a stale index that no longer
 * matches the schema.
 */
const { MongoClient } = require('mongodb');

const SOURCE_URI = process.env.SOURCE_URI;
const TARGET_URI = process.env.TARGET_URI;
const DROP_FIRST = process.argv.includes('--drop');

// Mongo's own bookkeeping, not application data.
const SKIP_DATABASES = new Set(['admin', 'local', 'config']);

function requireUri(value, name) {
  if (!value) {
    console.error(`Missing ${name}. See the usage comment at the top of this file.`);
    process.exit(1);
  }
  return value;
}

// Never print the credentials that are inevitably in these strings.
function describe(uri) {
  try {
    const parsed = new URL(uri);
    const db = parsed.pathname.replace(/^\//, '');
    return `${parsed.protocol}//${parsed.hostname}${db ? `/${db}` : ''}`;
  } catch {
    return '(unparseable connection string)';
  }
}

function databaseNameFrom(uri, fallback) {
  try {
    const name = new URL(uri).pathname.replace(/^\//, '');
    return name || fallback;
  } catch {
    return fallback;
  }
}

async function main() {
  requireUri(SOURCE_URI, 'SOURCE_URI');
  requireUri(TARGET_URI, 'TARGET_URI');

  const sourceDbName = databaseNameFrom(SOURCE_URI, 'primex');
  const targetDbName = databaseNameFrom(TARGET_URI, sourceDbName);

  console.log(`Source: ${describe(SOURCE_URI)}`);
  console.log(`Target: ${describe(TARGET_URI)}`);
  console.log(`Mode:   ${DROP_FIRST ? 'replace (--drop)' : 'upsert by _id'}\n`);

  if (SKIP_DATABASES.has(targetDbName)) {
    console.error(`Refusing to write into the system database "${targetDbName}".`);
    process.exit(1);
  }

  const source = await MongoClient.connect(SOURCE_URI);
  const target = await MongoClient.connect(TARGET_URI);

  try {
    const sourceDb = source.db(sourceDbName);
    const targetDb = target.db(targetDbName);

    const collections = (await sourceDb.listCollections().toArray())
      .filter((c) => c.type !== 'view')
      .map((c) => c.name)
      .sort();

    if (collections.length === 0) {
      console.log('Source database has no collections — nothing to do.');
      return;
    }

    let totalCopied = 0;

    for (const name of collections) {
      const docs = await sourceDb.collection(name).find({}).toArray();

      if (DROP_FIRST) {
        await targetDb.collection(name).deleteMany({});
      }

      if (docs.length === 0) {
        console.log(`  ${name.padEnd(24)} 0 documents (empty)`);
        continue;
      }

      // One bulk round trip rather than a write per document, and replaceOne
      // with upsert so re-running converges instead of erroring on duplicate
      // _id values.
      const result = await targetDb.collection(name).bulkWrite(
        docs.map((doc) => ({
          replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
        })),
        { ordered: false },
      );

      const written = result.upsertedCount + result.modifiedCount + result.matchedCount;
      totalCopied += docs.length;
      console.log(
        `  ${name.padEnd(24)} ${String(docs.length).padStart(5)} documents ` +
          `(${result.upsertedCount} new, ${written - result.upsertedCount} existing)`,
      );
    }

    console.log(`\nCopied ${totalCopied} documents across ${collections.length} collections.`);
    console.log('Indexes will be created by the application on its next start.');
  } finally {
    await source.close();
    await target.close();
  }
}

main().catch((err) => {
  console.error(`\nMigration failed: ${err.message}`);
  process.exit(1);
});
