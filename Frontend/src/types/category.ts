export interface Category {
  _id: string;
  name: string;
  slug: string;
  parent: string | null;
  image: string | null;
  description: string | null;
  displayOrder: number;
  isFeaturedOnHome: boolean;
  isActive: boolean;
  children?: Category[];
}
