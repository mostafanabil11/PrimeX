"use client";

import { useId } from "react";
import { Plus, X } from "lucide-react";

// Shared field primitives for the admin forms. Five entities need the same
// label/hint/error scaffolding, and repeating it per form is how the paddings
// drift apart.
//
// Uncontrolled-looking but controlled: every field takes value + onChange, so
// a parent form holds one state object and posts exactly the keys it changed.
// That matters more than usual here — the API treats an absent key as "leave
// alone" and a present one as "$set", so sending a whole object back would
// overwrite fields the admin never touched.

const inputBase =
  "w-full border border-input bg-surface-2 px-3 py-2 text-base md:text-[13px] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (id: string) => React.ReactNode;
}

export function Field({ label, hint, error, required, children }: FieldProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase"
      >
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>
      {children(id)}
      {hint && !error && <p className="text-[12px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[12px] text-destructive">{error}</p>}
    </div>
  );
}

export function TextInput({
  label,
  hint,
  error,
  required,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {(id) => (
        <input
          id={id}
          type={type}
          className={inputBase}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}

export function TextArea({
  label,
  hint,
  error,
  required,
  value,
  onChange,
  rows = 4,
  maxLength,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <Field
      label={label}
      hint={maxLength ? `${hint ? `${hint} · ` : ""}${value.length}/${maxLength}` : hint}
      error={error}
      required={required}
    >
      {(id) => (
        <textarea
          id={id}
          rows={rows}
          maxLength={maxLength}
          className={`${inputBase} resize-y leading-relaxed`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}

export function NumberInput({
  label,
  hint,
  error,
  required,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {(id) => (
        <input
          id={id}
          type="number"
          className={inputBase}
          value={value ?? ""}
          min={min}
          max={max}
          step={step}
          // An empty box means "no value", which for a nullable field is
          // meaningfully different from zero — a plan with a null joining fee
          // inherits the gym-wide one, a plan with 0 waives it.
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      )}
    </Field>
  );
}

// Money is stored in minor units everywhere. This field shows and accepts
// major units so nobody has to type 150000 to mean 1,500 EGP, and converts at
// the edge — the same boundary formatPrice sits on.
export function MoneyInput({
  label,
  hint,
  error,
  required,
  minorUnits,
  onChange,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  minorUnits: number | null;
  onChange: (minorUnits: number | null) => void;
}) {
  return (
    <Field
      label={`${label} (EGP)`}
      hint={hint}
      error={error}
      required={required}
    >
      {(id) => (
        <input
          id={id}
          type="number"
          min={0}
          step="0.01"
          className={inputBase}
          value={minorUnits === null ? "" : minorUnits / 100}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Math.round(Number(e.target.value) * 100))
          }
        />
      )}
    </Field>
  );
}

export function Select<T extends string>({
  label,
  hint,
  error,
  required,
  value,
  onChange,
  options,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
}) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {(id) => (
        <select
          id={id}
          className={inputBase}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();

  return (
    <div className="flex items-start gap-3 py-1">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-primary"
      />
      <div className="min-w-0">
        <label htmlFor={id} className="block text-[13px] font-medium text-foreground">
          {label}
        </label>
        {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

// A repeatable list of short strings — facilities, benefits, specialties,
// equipment. One row per entry rather than a comma-separated box, because
// commas appear inside real entries ("Coach, Women's Programme").
export function StringList({
  label,
  hint,
  items,
  onChange,
  placeholder,
  maxItems = 40,
}: {
  label: string;
  hint?: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  maxItems?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        {label}
      </span>
      {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}

      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className={inputBase}
              value={item}
              placeholder={placeholder}
              aria-label={`${label} ${i + 1}`}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
            <button
              type="button"
              aria-label={`Remove ${label} ${i + 1}`}
              className="ui-action ui-action--icon ui-action--ghost ui-action--sm inline-flex -m-1 shrink-0 p-1 text-muted-foreground hover:text-destructive"
              onClick={() => onChange(items.filter((_, index) => index !== i))}
            >
              <X className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>

      {items.length < maxItems && (
        <button
          type="button"
          className="ui-action ui-action--ghost ui-action--sm mt-1 flex w-fit items-center gap-1.5 text-[12px] font-medium text-primary-soft hover:underline"
          onClick={() => onChange([...items, ""])}
        >
          <Plus className="size-3.5" strokeWidth={2} />
          Add
        </button>
      )}
    </div>
  );
}

/**
 * A list of countable extras — "10 Jacuzzi", "3 InBody".
 *
 * Labels are free text rather than a fixed set, because a gym adds an amenity
 * on a Tuesday and expects it on the website that afternoon. The pricing card
 * matches known labels to an icon and falls back to a neutral mark, so a new
 * one renders sensibly without any code change.
 */
export function PerkList({
  label,
  hint,
  items,
  onChange,
  maxItems = 20,
}: {
  label: string;
  hint?: string;
  items: { label: string; value: number }[];
  onChange: (items: { label: string; value: number }[]) => void;
  maxItems?: number;
}) {
  const update = (i: number, patch: Partial<{ label: string; value: number }>) => {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        {label}
      </span>
      {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}

      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={1000}
              className={`${inputBase} w-24 shrink-0`}
              value={Number.isFinite(item.value) ? item.value : 0}
              aria-label={`${label} ${i + 1} quantity`}
              onChange={(e) => update(i, { value: Number(e.target.value) })}
            />
            <input
              className={inputBase}
              value={item.label}
              placeholder="Jacuzzi"
              aria-label={`${label} ${i + 1} name`}
              onChange={(e) => update(i, { label: e.target.value })}
            />
            <button
              type="button"
              aria-label={`Remove ${label} ${i + 1}`}
              className="ui-action ui-action--icon ui-action--ghost ui-action--sm inline-flex -m-1 shrink-0 p-1 text-muted-foreground hover:text-destructive"
              onClick={() => onChange(items.filter((_, index) => index !== i))}
            >
              <X className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>

      {items.length < maxItems && (
        <button
          type="button"
          className="ui-action ui-action--ghost ui-action--sm mt-1 flex w-fit items-center gap-1.5 text-[12px] font-medium text-primary-soft hover:underline"
          onClick={() => onChange([...items, { label: "", value: 1 }])}
        >
          <Plus className="size-3.5" strokeWidth={2} />
          Add
        </button>
      )}
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-6">
      <div>
        <h2 className="font-display text-lg tracking-[-0.02em] text-foreground uppercase">{title}</h2>
        {description && <p className="mt-1 text-[12px] text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function FormActions({
  isSaving,
  saveLabel = "Save",
  onCancel,
  destructive,
}: {
  isSaving: boolean;
  saveLabel?: string;
  onCancel: () => void;
  destructive?: { label: string; onClick: () => void };
}) {
  return (
    <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-border bg-background py-4">
      <button
        type="submit"
        disabled={isSaving}
        className="ui-action ui-action--sm inline-flex bg-primary px-6 py-2.5 text-[12px] font-semibold tracking-[0.06em] text-primary-foreground uppercase transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {isSaving ? "Saving…" : saveLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="ui-action ui-action--ghost ui-action--sm inline-flex px-4 py-2.5 text-[12px] font-semibold tracking-[0.06em] text-muted-foreground uppercase hover:text-foreground"
      >
        Cancel
      </button>
      {destructive && (
        <button
          type="button"
          onClick={destructive.onClick}
          className="ui-action ui-action--sm inline-flex ms-auto px-4 py-2.5 text-[12px] font-semibold tracking-[0.06em] text-destructive uppercase hover:underline"
        >
          {destructive.label}
        </button>
      )}
    </div>
  );
}

// Re-exported so the admin forms can import their field primitives and this
// helper from one place. The implementation lives in lib/api-error.
export { apiErrorMessage } from "@/lib/api-error";
