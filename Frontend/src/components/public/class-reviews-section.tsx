"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getReviewsForClassType, createReview } from "@/lib/api/reviews";
import { StarRating } from "@/components/products/star-rating";
import { apiErrorMessage } from "@/lib/api-error";

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className="p-0.5"
        >
          <Star
            className={`size-6 ${n <= value ? "fill-primary text-primary" : "fill-none text-border"}`}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

const inputBase =
  "w-full border border-border bg-surface-2 px-3.5 py-3 text-[14px] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring";
const labelBase = "font-mono text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase";

export function ClassReviewsSection({
  classTypeId,
  averageRating,
  reviewCount,
}: {
  classTypeId: string;
  averageRating: number;
  reviewCount: number;
}) {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["reviews", "class", classTypeId],
    queryFn: () => getReviewsForClassType(classTypeId),
  });

  const mutation = useMutation({
    mutationFn: () => createReview({ classTypeId, rating, title, body }),
    onSuccess: () => {
      toast.success("Thanks — your review is awaiting approval");
      setShowForm(false);
      setTitle("");
      setBody("");
      setRating(5);
      queryClient.invalidateQueries({ queryKey: ["reviews", "class", classTypeId] });
    },
    onError: (err: unknown) => {
      toast.error(apiErrorMessage(err, "Could not submit review — you can only review a class you have attended"));
    },
  });

  return (
    <section className="mx-auto w-full max-w-(--spacing-container-max) border-t border-border px-margin-mobile py-stack-lg md:px-margin-desktop">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="mb-2 font-display text-2xl tracking-[-0.02em] text-foreground uppercase">
            Reviews
          </h2>
          {reviewCount > 0 ? (
            <div className="flex items-center gap-2">
              <StarRating value={averageRating} />
              <span className="text-[13px] text-muted-foreground">
                {averageRating.toFixed(1)} out of 5 ({reviewCount} review{reviewCount === 1 ? "" : "s"})
              </span>
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">No reviews yet</p>
          )}
        </div>
        {user && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="border border-border px-6 py-2.5 font-mono text-[12px] font-semibold tracking-[0.06em] text-foreground uppercase hover:border-foreground"
          >
            Write a review
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="mb-10 flex max-w-lg flex-col gap-4 border border-border bg-surface-1 p-6"
        >
          <p className="text-[12px] text-muted-foreground">
            Only members who have attended this class can leave a review.
          </p>
          <div className="flex flex-col gap-2">
            <label className={labelBase}>Rating</label>
            <StarInput value={rating} onChange={setRating} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="review-title" className={labelBase}>
              Title
            </label>
            <input
              id="review-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputBase}
              maxLength={120}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="review-body" className={labelBase}>
              Review
            </label>
            <textarea
              id="review-body"
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className={`${inputBase} resize-y leading-relaxed`}
              maxLength={2000}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="bg-primary px-6 py-2.5 font-mono text-[12px] font-semibold tracking-[0.06em] text-primary-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {mutation.isPending ? "Submitting…" : "Submit review"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 font-mono text-[12px] font-semibold tracking-[0.06em] text-muted-foreground uppercase hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="h-32 max-w-2xl animate-pulse bg-muted" />
      ) : !reviews || reviews.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Be the first to review this class.</p>
      ) : (
        <div className="max-w-2xl divide-y divide-border border-t border-b border-border">
          {reviews.map((review) => (
            <div key={review._id} className="py-5">
              <div className="mb-2 flex items-center justify-between gap-4">
                <StarRating value={review.rating} />
                <span className="text-[12px] text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString("en-GB", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <p className="mb-1 text-[14px] font-medium text-foreground">{review.title}</p>
              <p className="mb-2 text-[13px] text-muted-foreground">{review.body}</p>
              {review.user && (
                <p className="text-[12px] text-muted-foreground">
                  — {review.user.firstName} {review.user.lastName.charAt(0)}.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
