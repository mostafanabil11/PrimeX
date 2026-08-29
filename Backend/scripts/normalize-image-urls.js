/**
 * Rewrites absolute image URLs in the database to root-relative paths.
 *
 * Images are served by the storefront itself out of Frontend/public, so a
 * stored URL like
 *
 *   http://localhost:3001/images/products/navy-knitted-polo/image1.jpg
 *
 * pins the data to one environment. Deployed, that address points at the
 * visitor's own machine and every product image breaks. The path alone
 *
 *   /images/products/navy-knitted-polo/image1.jpg
 *
 * resolves against whatever origin is serving the page, so the same row works
 * in development, in a preview deployment, and in production.
 *
 *   MONGODB_URI="mongodb+srv://..." node scripts/normalize-image-urls.js
 *
 * Add --dry-run to see what would change without writing. Safe to re-run:
 * rows already holding relative paths are not matched.
 */
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DRY_RUN = process.argv.includes('--dry-run');

// Only rewrites hosts that serve this app's own images. An image genuinely
// hosted elsewhere — a CDN, a supplier's URL — must keep its absolute form,
// so those are left alone.
const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

function toRelative(url) {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    return url;
  }
  try {
    const parsed = new URL(url);
    if (!LOCAL_HOSTS.includes(parsed.hostname)) {
      return url;
    }
    return parsed.pathname;
  } catch {
    return url;
  }
}

async function main() {
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI.');
    process.exit(1);
  }

  const client = await MongoClient.connect(MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
  console.log(DRY_RUN ? 'DRY RUN — no writes\n' : 'Rewriting absolute image URLs\n');

  try {
    const db = client.db();
    let changed = 0;

    // products.images is an array of strings.
    for (const product of await db.collection('products').find({}).toArray()) {
      if (!Array.isArray(product.images)) continue;
      const next = product.images.map(toRelative);
      if (JSON.stringify(next) === JSON.stringify(product.images)) continue;

      console.log(`  product  ${product.slug}`);
      console.log(`    ${product.images[0]}\n      -> ${next[0]}`);
      changed++;
      if (!DRY_RUN) {
        await db.collection('products').updateOne({ _id: product._id }, { $set: { images: next } });
      }
    }

    // categories.image is a single string.
    for (const category of await db.collection('categories').find({}).toArray()) {
      const next = toRelative(category.image);
      if (next === category.image) continue;

      console.log(`  category ${category.slug}`);
      console.log(`    ${category.image}\n      -> ${next}`);
      changed++;
      if (!DRY_RUN) {
        await db.collection('categories').updateOne({ _id: category._id }, { $set: { image: next } });
      }
    }

    console.log(`\n${DRY_RUN ? 'Would update' : 'Updated'} ${changed} document(s).`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(`\nFailed: ${err.message}`);
  process.exit(1);
});
