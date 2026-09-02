import { BRAND } from "@/lib/brand";

// The half of the auth screens that is not the form.
//
// It used to be a photograph of a coat. Rather than swap in a stock gym
// picture — which every source in the research says reads as fake — this is
// typographic: the wordmark set large against the dark ground, with the
// tagline under it. It costs no asset, never looks like a stock library, and
// can be replaced the day there are real photographs of the actual floor.
export function AuthPanel({ caption }: { caption?: string }) {
  return (
    <div className="relative hidden overflow-hidden border-e border-border bg-surface-1 md:flex md:flex-col md:justify-between md:p-10">
      {/* A faint diagonal rule, echoing the intensity bars used elsewhere.
          aria-hidden because it carries no meaning. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, var(--primary) 0 2px, transparent 2px 14px)",
        }}
      />

      <p className="relative font-mono text-[11px] font-semibold tracking-[0.16em] text-primary-soft uppercase">
        {BRAND.name}
      </p>

      <div className="relative flex flex-col gap-4">
        <p className="font-display text-6xl leading-[0.88] tracking-[-0.02em] text-balance text-foreground uppercase lg:text-7xl">
          {BRAND.tagline}
        </p>
        {caption && <p className="max-w-sm text-body-md text-muted-foreground">{caption}</p>}
      </div>

      <p className="relative font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
        Fayoum · Est. 2024
      </p>
    </div>
  );
}
