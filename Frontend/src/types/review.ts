export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Review {
  _id: string;
  classType: string | { _id: string; name: string; slug: string };
  user: { _id: string; firstName: string; lastName: string } | null;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  createdAt: string;
}
