/**
 * Shared class strings for form fields.
 *
 * The companion to form-styles.css, in the same split action-button.tsx uses:
 * the .css file owns the control's surface (border, well, focus ring), and
 * these strings own the parts that are Tailwind's job — width, type scale,
 * placeholder colour. Importing a string rather than copying one is what stops
 * the phone field on one form drifting a pixel from the phone field on
 * another.
 *
 * The values are the membership reserve form's, which is where the look was
 * agreed. Note the 0.06em label tracking: the personal-training form had
 * 0.12em, and side by side the wider one read as a different design.
 */

export const fieldLabel =
  "font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase";

/** The optional-field suffix, e.g. Email (optional). */
export const fieldOptional = "normal-case opacity-70";

/** The control without a width or a type scale, for the places that set their
 *  own: a field sharing a flex row with a button (newsletter, back-in-stock)
 *  cannot take w-full, and the one-time-code box wants text-lg centred. Both
 *  would otherwise collide with the defaults below — two Tailwind type
 *  utilities on one element resolve by stylesheet order, not by the order they
 *  appear in the string, so "text-base text-lg" is a coin toss. */
export const fieldInputBase = "ui-input text-foreground placeholder:text-muted-foreground";

export const fieldInput = `${fieldInputBase} w-full text-base`;

/** A textarea is the same control with room to grow. */
export const fieldTextarea = `${fieldInput} resize-y leading-relaxed`;

/** Explanatory copy under a field. */
export const fieldHint = "text-[12px] text-muted-foreground";

/** Validation and submission failures. */
export const fieldError = "text-[13px] text-destructive";

/** One label + control + hint stack. */
export const fieldGroup = "flex flex-col gap-2";

/** The consent row: a 20px box with the whole sentence as its hit area. */
export const consentRow =
  "flex cursor-pointer items-start gap-3 py-2 text-[13px] leading-relaxed text-muted-foreground";

export const consentBox = "ui-check mt-0.5 size-5 shrink-0 accent-primary";
