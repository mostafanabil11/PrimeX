"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { getReviewsForModeration, moderateReview, deleteReview } from "@/lib/api/reviews";
import { StarRating } from "@/components/products/star-rating";
import { AdminPageHeader } from "@/components/admin/resource-list";
import type { ReviewStatus } from "@/types/review";
import { apiErrorMessage } from "@/lib/api-error";

const TABS: { label: string; value: ReviewStatus | "" }[] = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "All", value: "" },
];

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ReviewStatus | "">("pending");

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin", "reviews", tab],
    queryFn: () => getReviewsForModeration(tab || undefined),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });

  const moderateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) => moderateReview(id, status),
    onSuccess: invalidate,
    onError: (err) => toast.error(apiErrorMessage(err, "Could not update review")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReview(id),
    onSuccess: invalidate,
    onError: (err) => toast.error(apiErrorMessage(err, "Could not delete review")),
  });

  return (
    <div>
      <AdminPageHeader title="Reviews" count={reviews?.length} />

      <div className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`px-4 py-2.5 font-mono text-[12px] font-medium tracking-[0.05em] uppercase transition-colors ${
              tab === t.value ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading || !reviews ? (
        <div className="h-64 animate-pulse bg-muted" />
      ) : reviews.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No reviews here.</p>
      ) : (
        <div className="divide-y divide-border border-t border-b border-border">
          {reviews.map((review) => {
            const classType = typeof review.classType === "object" ? review.classType : null;
            return (
              <div key={review._id} className="py-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{classType?.name ?? "Unknown class"}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {review.user ? `${review.user.firstName} ${review.user.lastName}` : "Unknown"} ·{" "}
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StarRating value={review.rating} />
                </div>
                <p className="mb-1 text-[14px] font-medium text-foreground">{review.title}</p>
                <p className="mb-3 text-[13px] text-muted-foreground">{review.body}</p>
                <div className="flex items-center gap-3">
                  {review.status !== "approved" && (
                    <button
                      type="button"
                      onClick={() => moderateMutation.mutate({ id: review._id, status: "approved" })}
                      className="border border-foreground px-4 py-1.5 font-mono text-[11px] font-medium tracking-[0.05em] text-foreground uppercase hover:border-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      Approve
                    </button>
                  )}
                  {review.status !== "rejected" && (
                    <button
                      type="button"
                      onClick={() => moderateMutation.mutate({ id: review._id, status: "rejected" })}
                      className="border border-border px-4 py-1.5 font-mono text-[11px] font-medium tracking-[0.05em] text-muted-foreground uppercase hover:bg-muted"
                    >
                      Reject
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Delete this review permanently?")) deleteMutation.mutate(review._id);
                    }}
                    className="p-1.5 text-muted-foreground hover:text-destructive"
                    aria-label="Delete review"
                  >
                    <Trash2 className="size-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
