import 'dotenv/config';
import mongoose, { Types } from 'mongoose';
import { Category, CategorySchema } from '../../categories/schemas/category.schema';
import { slugify } from '../../common/utils/slugify.util';

const MEN_CHILDREN = [
  'Long Sleeve Shirts',
  'Short Sleeve Shirts',
  'T-Shirts',
  'Pants',
  'Pullovers',
  'Hoodies',
  'Jackets',
];

const WOMEN_CHILDREN = ['Tops', 'Pants', 'Jackets'];

// Default homepage "Shop by Category" picks. Adjust anytime via
// PATCH /categories/:id { isFeaturedOnHome } instead of re-running this seed.
const FEATURED_TOP_LEVEL = ['Men', 'Women'];
const FEATURED_MEN_CHILDREN = ['Hoodies', 'T-Shirts'];

async function upsertCategory(
  model: mongoose.Model<Category>,
  name: string,
  parent: Types.ObjectId | null,
  displayOrder: number,
  isFeaturedOnHome: boolean
) {
  const slug = slugify(name);
  const existing = await model.findOne({ parent, slug });
  if (existing) {
    console.log(`- Skipping "${name}" (already exists)`);
    return existing;
  }

  const created = await model.create({ name, slug, parent, displayOrder, isFeaturedOnHome });
  console.log(`+ Created "${name}"`);
  return created;
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set in .env');
  }

  await mongoose.connect(uri);
  const CategoryModel = mongoose.model(Category.name, CategorySchema);

  const men = await upsertCategory(
    CategoryModel,
    'Men',
    null,
    1,
    FEATURED_TOP_LEVEL.includes('Men')
  );
  const women = await upsertCategory(
    CategoryModel,
    'Women',
    null,
    2,
    FEATURED_TOP_LEVEL.includes('Women')
  );

  for (let i = 0; i < MEN_CHILDREN.length; i++) {
    const name = MEN_CHILDREN[i];
    await upsertCategory(
      CategoryModel,
      name,
      men._id as Types.ObjectId,
      i,
      FEATURED_MEN_CHILDREN.includes(name)
    );
  }

  for (let i = 0; i < WOMEN_CHILDREN.length; i++) {
    await upsertCategory(CategoryModel, WOMEN_CHILDREN[i], women._id as Types.ObjectId, i, false);
  }

  console.log('\n✓ Category seeding complete');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('✗ Category seeding failed:', err);
  process.exit(1);
});
