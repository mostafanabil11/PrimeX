export type ProductSize = "S" | "M" | "L" | "XL" | "2XL";

export interface ProductSizeStock {
  size: ProductSize;
  stock: number;
}

export interface ProductCategoryRef {
  _id: string;
  name: string;
  slug: string;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  styleGroup: string | null;
  category: ProductCategoryRef | string;
  price: number;
  discountPrice: number | null;
  images: string[];
  sizes: ProductSizeStock[];
  isBestSeller: boolean;
  isActive: boolean;
  averageRating: number;
  reviewCount: number;
}

export interface RelatedColorProduct {
  _id: string;
  name: string;
  slug: string;
  color: string;
  images: string[];
}

export interface RelatedProduct {
  _id: string;
  name: string;
  slug: string;
  color: string;
  images: string[];
  price: number;
  discountPrice: number | null;
}

export interface ProductDetail extends Product {
  relatedColors: RelatedColorProduct[];
  relatedProducts: RelatedProduct[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ProductListParams {
  category?: string;
  size?: ProductSize;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  onSale?: boolean;
  sort?: "newest" | "price_asc" | "price_desc";
  q?: string;
  page?: number;
  limit?: number;
}
