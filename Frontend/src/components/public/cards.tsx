import Link from "next/link";
import { Photo } from "./photo";
import { Clock, Users } from "lucide-react";
import {
  orderedHours,
  formatHoursRange,
  DAY_SHORT,
  INTENSITY_LABELS,
  trainerBranchNames,
} from "@/lib/gym-format";
import type { Branch, Trainer, ClassType, Testimonial } from "@/types/gym";

// Every card root carries h-full. These sit in grids where the row height is
// set by the tallest card, and a card that only sizes to its own content ends
// with its border stopping short of its neighbours. Declaring it on the card
// rather than relying on being a direct grid child means a wrapper — a reveal
// animation, say — cannot quietly break the alignment.
//
// Cards reused between the previews on the homepage and the full index pages,
// so a branch or a trainer looks the same wherever it appears. Plans are not
// here: they are a two-axis grid with live offer pricing, which PricingGrid
// owns so there is only one place that can get a price wrong.

export function TrainerCard({ trainer }: { trainer: Trainer }) {
  const branches = trainerBranchNames(trainer);

  return (
    <Link
      href={`/trainers/${trainer.slug}`}
      className="press group flex h-full flex-col border border-border bg-surface-1 transition-all hover:border-foreground"
    >
      {trainer.photo && (
        <div className="relative aspect-square w-full overflow-hidden border-b border-border bg-surface-2">
          <Photo
            src={trainer.photo}
            alt={trainer.name}
            fill
            quality={100}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover group-hover:scale-105"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div>
          <h3 className="font-display text-xl tracking-[-0.02em] text-foreground uppercase">
            {trainer.name}
          </h3>
          {trainer.headline && (
            <p className="mt-0.5 font-mono text-[12px] font-semibold tracking-[0.08em] text-primary-soft uppercase">
              {trainer.headline}
            </p>
          )}
        </div>

        {trainer.specialties.length > 0 && (
          <p className="text-[13px] text-muted-foreground">{trainer.specialties.join(" · ")}</p>
        )}

        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
          {trainer.yearsOfExperience > 0 && <span>{trainer.yearsOfExperience} years</span>}
          {branches.length > 0 && <span>{branches.join(", ")}</span>}
        </div>
      </div>
    </Link>
  );
}

export function ClassTypeCard({ classType }: { classType: ClassType }) {
  return (
    <Link
      href={`/classes/${classType.slug}`}
      className="press group flex h-full flex-col border border-border bg-surface-1 transition-all hover:border-foreground"
    >
      {classType.image && (
        <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-border bg-surface-2 sm:aspect-[16/9]">
          <Photo
            src={classType.image}
            alt={classType.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover group-hover:scale-105"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-6">
        <h3 className="font-display text-xl tracking-[-0.02em] text-foreground uppercase">
          {classType.name}
        </h3>

        {classType.description && (
          <p className="line-clamp-3 text-[13px] text-muted-foreground">{classType.description}</p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" strokeWidth={1.5} />
            {classType.durationMinutes} min
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="size-3.5" strokeWidth={1.5} />
            {classType.defaultCapacity}
          </span>
          <IntensityBar intensity={classType.intensity} />
        </div>
      </div>
    </Link>
  );
}

// Five bars rather than a number: intensity is a comparison, and a filled-bar
// scale is read at a glance where "4" has to be reasoned about.
export function IntensityBar({ intensity }: { intensity: number }) {
  return (
    <span
      className="flex items-center gap-1"
      title={`Intensity: ${INTENSITY_LABELS[intensity] ?? intensity}`}
    >
      <span className="sr-only">Intensity: {INTENSITY_LABELS[intensity] ?? intensity}</span>
      {[1, 2, 3, 4, 5].map((level) => (
        <span
          key={level}
          aria-hidden
          className={`h-2.5 w-1 ${level <= intensity ? "bg-primary" : "bg-surface-3"}`}
        />
      ))}
    </span>
  );
}

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <figure className="flex h-full flex-col gap-4 border border-border bg-surface-1 p-6">
      <blockquote className="text-body-md text-foreground">“{testimonial.quote}”</blockquote>
      <figcaption className="mt-auto">
        <p className="text-[13px] font-semibold text-foreground">{testimonial.name}</p>
        {testimonial.attribution && (
          <p className="text-[12px] text-muted-foreground">{testimonial.attribution}</p>
        )}
      </figcaption>
    </figure>
  );
}

export function HoursTable({ branch }: { branch: Branch }) {
  const hours = orderedHours(branch.openingHours);
  const todayIndex = new Date().getDay();
  const todayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][
    todayIndex
  ];

  return (
    <table className="w-full text-[13px]">
      <tbody>
        {hours.map((h) => {
          const isToday = h.day === todayName;
          return (
            <tr key={h.day} className="border-b border-border last:border-0">
              <th
                scope="row"
                className={`py-2.5 text-left font-medium ${
                  isToday ? "text-primary" : "text-foreground"
                }`}
              >
                {DAY_SHORT[h.day]}
                {isToday && <span className="sr-only"> (today)</span>}
              </th>
              <td
                className={`py-2.5 text-right tabular-nums ${
                  h.isClosed ? "text-muted-foreground" : isToday ? "text-primary" : "text-foreground"
                }`}
              >
                {formatHoursRange(h)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
