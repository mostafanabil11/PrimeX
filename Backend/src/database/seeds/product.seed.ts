import 'dotenv/config';
import mongoose, { Types } from 'mongoose';
import { Category, CategorySchema } from '../../categories/schemas/category.schema';
import { Product, ProductSchema } from '../../products/schemas/product.schema';
import { slugify } from '../../common/utils/slugify.util';

// Image paths are stored root-relative, deliberately. The storefront serves
// these out of its own public/ directory, so a path resolves against whatever
// origin is serving the page — the same row works in development, in a preview
// deployment, and in production. Prefixing a host here would pin the data to
// one environment: seeded locally and deployed, every image URL would point at
// the visitor's own machine.

interface SeedSize {
  size: 'S' | 'M' | 'L' | 'XL' | '2XL';
  stock: number;
}

interface SeedProduct {
  name: string;
  color: string;
  styleGroup: string | null;
  parentSlug: 'men' | 'women';
  childSlug: string;
  /** EGP, whole units — converted to minor units (piastres) below at insertion. */
  price: number;
  discountPrice?: number;
  imageCount: 1 | 2;
  sizes: SeedSize[];
  isBestSeller?: boolean;
}

const PRODUCTS: SeedProduct[] = [
  // Men
  {
    name: 'Navy Knitted Polo',
    color: 'Navy',
    styleGroup: 'Knitted Polo',
    parentSlug: 'men',
    childSlug: 't-shirts',
    price: 949,
    imageCount: 2,
    sizes: [
      { size: 'S', stock: 8 },
      { size: 'M', stock: 12 },
      { size: 'L', stock: 10 },
      { size: 'XL', stock: 6 },
      { size: '2XL', stock: 3 },
    ],
    isBestSeller: true,
  },
  {
    name: 'White Knitted Polo',
    color: 'White',
    styleGroup: 'Knitted Polo',
    parentSlug: 'men',
    childSlug: 't-shirts',
    price: 949,
    imageCount: 1,
    sizes: [
      { size: 'S', stock: 6 },
      { size: 'M', stock: 10 },
      { size: 'L', stock: 8 },
      { size: 'XL', stock: 5 },
      { size: '2XL', stock: 0 },
    ],
  },
  {
    name: 'White Long Sleeve Linen Shirt',
    color: 'White',
    styleGroup: 'Linen Shirt',
    parentSlug: 'men',
    childSlug: 'long-sleeve-shirts',
    price: 1199,
    imageCount: 2,
    sizes: [
      { size: 'S', stock: 5 },
      { size: 'M', stock: 9 },
      { size: 'L', stock: 9 },
      { size: 'XL', stock: 5 },
      { size: '2XL', stock: 2 },
    ],
    isBestSeller: true,
  },
  {
    name: 'Beige Long Sleeve Linen Shirt',
    color: 'Beige',
    styleGroup: 'Linen Shirt',
    parentSlug: 'men',
    childSlug: 'long-sleeve-shirts',
    price: 1199,
    imageCount: 2,
    sizes: [
      { size: 'S', stock: 4 },
      { size: 'M', stock: 7 },
      { size: 'L', stock: 8 },
      { size: 'XL', stock: 4 },
      { size: '2XL', stock: 1 },
    ],
  },
  {
    name: 'Burgundy Quarter-Zip Pullover',
    color: 'Burgundy',
    styleGroup: 'Quarter-Zip Pullover',
    parentSlug: 'men',
    childSlug: 'pullovers',
    price: 1299,
    imageCount: 1,
    sizes: [
      { size: 'S', stock: 3 },
      { size: 'M', stock: 8 },
      { size: 'L', stock: 7 },
      { size: 'XL', stock: 4 },
      { size: '2XL', stock: 2 },
    ],
  },
  {
    name: 'Black Quarter-Zip Pullover',
    color: 'Black',
    styleGroup: 'Quarter-Zip Pullover',
    parentSlug: 'men',
    childSlug: 'pullovers',
    price: 1299,
    imageCount: 1,
    sizes: [
      { size: 'S', stock: 6 },
      { size: 'M', stock: 10 },
      { size: 'L', stock: 9 },
      { size: 'XL', stock: 5 },
      { size: '2XL', stock: 3 },
    ],
    isBestSeller: true,
  },
  {
    name: 'Navy Wide-Leg Jeans',
    color: 'Navy',
    styleGroup: "Men's Wide-Leg Jeans",
    parentSlug: 'men',
    childSlug: 'pants',
    price: 1399,
    imageCount: 1,
    sizes: [
      { size: 'S', stock: 4 },
      { size: 'M', stock: 9 },
      { size: 'L', stock: 8 },
      { size: 'XL', stock: 5 },
      { size: '2XL', stock: 2 },
    ],
  },
  {
    name: 'Black Wide-Leg Jeans',
    color: 'Black',
    styleGroup: "Men's Wide-Leg Jeans",
    parentSlug: 'men',
    childSlug: 'pants',
    price: 1399,
    imageCount: 1,
    sizes: [
      { size: 'S', stock: 5 },
      { size: 'M', stock: 11 },
      { size: 'L', stock: 10 },
      { size: 'XL', stock: 6 },
      { size: '2XL', stock: 3 },
    ],
    isBestSeller: true,
  },
  {
    name: 'Brown Leather Biker Jacket',
    color: 'Brown',
    styleGroup: 'Leather Biker Jacket',
    parentSlug: 'men',
    childSlug: 'jackets',
    price: 299,
    imageCount: 1,
    sizes: [
      { size: 'S', stock: 2 },
      { size: 'M', stock: 5 },
      { size: 'L', stock: 5 },
      { size: 'XL', stock: 3 },
      { size: '2XL', stock: 1 },
    ],
  },
  {
    name: 'Black Leather Biker Jacket',
    color: 'Black',
    styleGroup: 'Leather Biker Jacket',
    parentSlug: 'men',
    childSlug: 'jackets',
    price: 299,
    discountPrice: 249,
    imageCount: 1,
    sizes: [
      { size: 'S', stock: 3 },
      { size: 'M', stock: 6 },
      { size: 'L', stock: 6 },
      { size: 'XL', stock: 4 },
      { size: '2XL', stock: 2 },
    ],
    isBestSeller: true,
  },
  // Women
  {
    name: 'Black Ribbed Tee',
    color: 'Black',
    styleGroup: null,
    parentSlug: 'women',
    childSlug: 'tops',
    price: 399,
    imageCount: 1,
    sizes: [
      { size: 'S', stock: 8 },
      { size: 'M', stock: 12 },
      { size: 'L', stock: 9 },
      { size: 'XL', stock: 5 },
    ],
    isBestSeller: true,
  },
  {
    name: 'Ivory Ribbed Mock Neck',
    color: 'Ivory',
    styleGroup: null,
    parentSlug: 'women',
    childSlug: 'tops',
    price: 499,
    imageCount: 1,
    sizes: [
      { size: 'S', stock: 6 },
      { size: 'M', stock: 10 },
      { size: 'L', stock: 8 },
      { size: 'XL', stock: 4 },
    ],
  },
  {
    name: 'Pink Ribbed Crewneck',
    color: 'Pink',
    styleGroup: null,
    parentSlug: 'women',
    childSlug: 'tops',
    price: 449,
    imageCount: 1,
    sizes: [
      { size: 'S', stock: 7 },
      { size: 'M', stock: 9 },
      { size: 'L', stock: 6 },
      { size: 'XL', stock: 3 },
    ],
  },
  {
    name: 'Grey Ribbed Stripe Tee',
    color: 'Grey',
    styleGroup: null,
    parentSlug: 'women',
    childSlug: 'tops',
    price: 399,
    imageCount: 1,
    sizes: [
      { size: 'S', stock: 5 },
      { size: 'M', stock: 8 },
      { size: 'L', stock: 7 },
      { size: 'XL', stock: 4 },
    ],
  },
  {
    name: 'Mauve Tailored Trousers',
    color: 'Mauve',
    styleGroup: 'Tailored Trousers',
    parentSlug: 'women',
    childSlug: 'pants',
    price: 1299,
    imageCount: 1,
    sizes: [
      { size: 'S', stock: 4 },
      { size: 'M', stock: 8 },
      { size: 'L', stock: 7 },
      { size: 'XL', stock: 3 },
    ],
  },
  {
    name: 'Black Tailored Trousers',
    color: 'Black',
    styleGroup: 'Tailored Trousers',
    parentSlug: 'women',
    childSlug: 'pants',
    price: 1299,
    imageCount: 1,
    sizes: [
      { size: 'S', stock: 6 },
      { size: 'M', stock: 10 },
      { size: 'L', stock: 8 },
      { size: 'XL', stock: 4 },
    ],
    isBestSeller: true,
  },
  {
    name: 'Dark Wash Wide-Leg Jeans',
    color: 'Dark Wash',
    styleGroup: "Women's Wide-Leg Jeans",
    parentSlug: 'women',
    childSlug: 'pants',
    price: 1199,
    imageCount: 1,
    sizes: [
      { size: 'S', stock: 5 },
      { size: 'M', stock: 9 },
      { size: 'L', stock: 7 },
      { size: 'XL', stock: 3 },
    ],
    isBestSeller: true,
  },
  {
    name: 'Light Wash Wide-Leg Jeans',
    color: 'Light Wash',
    styleGroup: "Women's Wide-Leg Jeans",
    parentSlug: 'women',
    childSlug: 'pants',
    price: 1199,
    imageCount: 1,
    sizes: [
      { size: 'S', stock: 4 },
      { size: 'M', stock: 7 },
      { size: 'L', stock: 6 },
      { size: 'XL', stock: 2 },
    ],
  },
];

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set in .env');
  }

  await mongoose.connect(uri);
  const CategoryModel = mongoose.model(Category.name, CategorySchema);
  const ProductModel = mongoose.model(Product.name, ProductSchema);

  const categoryCache = new Map<string, Types.ObjectId>();

  for (const item of PRODUCTS) {
    const cacheKey = `${item.parentSlug}/${item.childSlug}`;
    let categoryId = categoryCache.get(cacheKey);

    if (!categoryId) {
      const parent = await CategoryModel.findOne({ slug: item.parentSlug, parent: null });
      if (!parent) {
        console.log(`✗ Parent category "${item.parentSlug}" not found — skipping "${item.name}"`);
        continue;
      }
      const child = await CategoryModel.findOne({ slug: item.childSlug, parent: parent._id });
      if (!child) {
        console.log(
          `✗ Category "${item.parentSlug}/${item.childSlug}" not found — skipping "${item.name}"`
        );
        continue;
      }
      categoryId = child._id as Types.ObjectId;
      categoryCache.set(cacheKey, categoryId);
    }

    const slug = slugify(item.name);
    const existing = await ProductModel.findOne({ slug });
    if (existing) {
      console.log(`- Skipping "${item.name}" (already exists)`);
      continue;
    }

    const productSlug = slug;
    const images = Array.from(
      { length: item.imageCount },
      (_, i) => `/images/products/${productSlug}/image${i + 1}.jpg`
    );

    await ProductModel.create({
      name: item.name,
      slug,
      color: item.color,
      styleGroup: item.styleGroup ? slugify(item.styleGroup) : null,
      category: categoryId,
      price: item.price * 100,
      discountPrice: item.discountPrice ? item.discountPrice * 100 : null,
      images,
      sizes: item.sizes,
      isBestSeller: item.isBestSeller ?? false,
    });
    console.log(`+ Created "${item.name}"`);
  }

  console.log('\n✓ Product seeding complete');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('✗ Product seeding failed:', err);
  process.exit(1);
});
