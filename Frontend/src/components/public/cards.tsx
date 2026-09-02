import { Link } from "@/i18n/navigation";
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

/**
 * `preview` is what a card looks like inside a homepage rail.
 *
 * It is not a different card — same frame, same crop rules, same border. It
 * drops the two or three lines that only earn their place on an index page,
 * where the card is the destination rather than a taste of one, and tightens
 * the padding to match. A full class card runs to 379px, which in a
 * side-scrolling strip is most of a phone screen tall for one of four items.
 *
 * The trimming is done with responsive classes rather than by rendering
 * different markup, and it stops at lg — that is where the rail becomes a grid
 * and there is room for the full card again, so the desktop homepage keeps
 * exactly the cards it always had.
 */
export function TrainerCard({ trainer, preview = false }: { trainer: Trainer; preview?: boolean }) {
  const branches = trainerBranchNames(trainer);

  return (
    <Link
      href={`/trainers/${trainer.slug}`}
      className="press group flex h-full flex-col border border-border bg-surface-1 transition-all hover:border-foreground"
    >
      {/* 4:5 with the crop biased upward, not a centred square.
          The photography is shot portrait. A square frame with object-cover and
          default centring takes the MIDDLE of a tall image, which on these
          particular files meant a torso with the head above the crop line — the
          homepage's lead trainer card was a chest and a pair of arms. These are
          the faces that make the gym feel staffed by people, so the frame is
          now portrait too, and object-top-ish (25% down) keeps the head in
          shot whatever the source height happens to be. */}
      {trainer.photo && (
        <div className="relative aspect-[4/5] w-full overflow-hidden border-b border-border bg-surface-2">
          {/* quality 90, not 100. next.config.ts permits [75, 90], so 100 was
              being coerced to the nearest allowed value anyway — it bought
              nothing and logged a warning on every render. 90 is the step the
              heroes use, and a face is worth it. */}
          <Photo
            src={trainer.photo}
            alt={trainer.name}
            fill
            quality={90}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover object-[center_25%] group-hover:scale-105"
          />
        </div>
      )}
      <div
        className={`flex flex-1 flex-col gap-3 ${preview ? "px-3.5 py-3 lg:p-6" : "p-6"}`}
      >
        <div>
          <h3
            className={`font-display tracking-[-0.02em] text-foreground uppercase ${
              preview ? "text-base lg:text-xl" : "text-xl"
            }`}
          >
            {trainer.name}
          </h3>
          {trainer.headline && (
            <p className="mt-0.5 font-mono text-[12px] font-semibold tracking-[0.08em] text-primary-soft uppercase">
              {trainer.headline}
            </p>
          )}
        </div>

        {trainer.specialties.length > 0 && (
          <p className={`text-[13px] text-muted-foreground ${preview ? "hidden lg:block" : ""}`}>
            {trainer.specialties.join(" · ")}
          </p>
        )}

        <div
          className={`mt-auto flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground ${
            preview ? "hidden lg:flex" : ""
          }`}
        >
          {trainer.yearsOfExperience > 0 && <span>{`${trainer.yearsOfExperience} years`}</span>}
          {branches.length > 0 && <span>{branches.join(", ")}</span>}
        </div>
      </div>
    </Link>
  );
}

/** See the note on TrainerCard for what `preview` does and why. */
export function ClassTypeCard({
  classType,
  preview = false,
}: {
  classType: ClassType;
  preview?: boolean;
}) {
  return (
    <Link
      href={`/classes/${classType.slug}`}
      className="press group flex h-full w-full flex-col border border-border bg-surface-1 transition-all hover:border-foreground"
    >
      {classType.image && (
        <div
          className={`relative w-full overflow-hidden border-b border-border bg-surface-2 ${
            preview ? "aspect-[4/3] lg:aspect-[16/9]" : "aspect-[4/3] sm:aspect-[16/9]"
          }`}
        >
          <Photo
            src={classType.image}
            alt={classType.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover group-hover:scale-105"
          />

          {/* The duration, moved onto the photograph in a preview.
              In the meta row below it is one of three items competing for a
              line the compact card no longer has; sitting on the image it
              costs nothing, and it is the first thing anyone wants to know
              about a class after its name. Squared into the bottom-left corner
              rather than floated, so it reads as part of the frame. */}
          {preview && (
            <span className="absolute bottom-0 left-0 bg-background px-2.5 py-1 font-mono text-[12px] font-bold tracking-[0.08em] text-foreground uppercase lg:hidden">
              {`${classType.durationMinutes} min`}
            </span>
          )}
        </div>
      )}

      <div className={`flex flex-1 flex-col gap-3 ${preview ? "p-3.5 lg:p-6" : "p-6"}`}>
        <h3
          className={`font-display tracking-[-0.02em] text-foreground uppercase ${
            preview ? "text-lg lg:text-xl" : "text-xl"
          }`}
        >
          {classType.name}
        </h3>

        {classType.description && (
          <p
            className={`line-clamp-3 text-[13px] text-muted-foreground ${
              preview ? "hidden lg:block" : ""
            }`}
          >
            {classType.description}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
          <span
            className={`flex items-center gap-1.5 ${preview ? "hidden lg:flex" : "flex"}`}
          >
            <Clock className="size-3.5" strokeWidth={1.5} />
            {`${classType.durationMinutes} min`}
          </span>
          {/* The capacity keeps its icon on an index card and becomes "Cap 16"
              in a preview — at 172–232px wide the icon plus a bare number
              reads as a stray figure, and the word is narrower than the space
              the icon was taking anyway. */}
          <span className={`items-center gap-1.5 ${preview ? "hidden lg:flex" : "flex"}`}>
            <Users className="size-3.5" strokeWidth={1.5} />
            {classType.defaultCapacity}
          </span>
          <IntensityBar intensity={classType.intensity} />
          {preview && (
            <span className="font-mono text-[12px] tracking-[0.06em] text-muted-foreground uppercase lg:hidden">
              {`Cap ${classType.defaultCapacity}`}
            </span>
          )}
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
      <span className="sr-only">{`Intensity: ${INTENSITY_LABELS[intensity] ?? intensity}`}</span>
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

// Today's row is marked with --primary-soft, not --primary.
//
// #d12028 measures 3.48:1 against the page ground. That clears the 3:1 bar for
// large text and for UI shapes — which is why the buttons and the big stat
// numbers are fine in red — but not the 4.5:1 that 13px body text needs. And
// this is not incidental 13px text: today's opening hours is the single most
// read line on a gym's website, so it was the worst possible place to spend
// the one colour in the palette that fails as small type.
//
// --primary-soft (#ffb4a8) is 10.87:1, already in the palette, and already the
// accent used for eyebrows and links — so this introduces nothing new and the
// row still reads as picked out.
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
                  isToday ? "text-primary-soft" : "text-foreground"
                }`}
              >
                {DAY_SHORT[h.day]}
                {isToday && <span className="sr-only"> (today)</span>}
              </th>
              <td
                className={`py-2.5 text-right tabular-nums ${
                  h.isClosed ? "text-muted-foreground" : isToday ? "text-primary-soft" : "text-foreground"
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
