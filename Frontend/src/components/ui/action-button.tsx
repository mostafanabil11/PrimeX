import { Link } from "@/i18n/navigation";

/** Shared semantic button API; all visual styling lives in button-styles.css. */
export type ActionVariant = "primary" | "outline" | "ghost" | "danger" | "whatsapp";
export type ActionSize = "sm" | "md" | "lg";

const SKIN: Record<ActionVariant, string> = {
  primary: "ui-action--primary",
  outline: "ui-action--outline",
  ghost: "ui-action--ghost",
  danger: "ui-action--danger",
  whatsapp: "ui-action--whatsapp",
};
const SIZES: Record<ActionSize, string> = {
  sm: "ui-action--sm h-11",
  md: "h-13",
  lg: "h-14",
};
const CHASSIS =
  "ui-action inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-mono text-[13px] font-bold tracking-[0.1em] uppercase";

export function actionButtonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
}: {
  variant?: ActionVariant;
  size?: ActionSize;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  return [CHASSIS, SIZES[size], SKIN[variant], fullWidth ? "w-full" : "", className]
    .filter(Boolean)
    .join(" ");
}

type CommonProps = {
  variant?: ActionVariant;
  size?: ActionSize;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
};

type AsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
    /** Swaps the label for `loadingLabel` and blocks input. Announced with aria-busy. */
    loading?: boolean;
    loadingLabel?: React.ReactNode;
  };

type AsLink = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children" | "href"> & {
    /** Internal paths are localised (/about becomes /ar/about in Arabic). */
    href: string;
  };

export function ActionButton(props: AsButton | AsLink) {
  if (props.href !== undefined) {
    const { href, variant, size, fullWidth, className, children, ...rest } = props;
    const classes = actionButtonClasses({ variant, size, fullWidth, className });

    // Anything that is not an in-app path — mailto:, tel:, wa.me, an absolute
    // URL — goes out through a plain anchor. Routing it through the localised
    // Link would prepend /ar to a WhatsApp deep link.
    if (!href.startsWith("/") || href.startsWith("//")) {
      return (
        <a href={href} className={classes} {...rest}>
          {children}
        </a>
      );
    }

    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  const {
    loading = false,
    loadingLabel,
    disabled,
    type = "button",
    variant,
    size,
    fullWidth,
    className,
    children,
    ...rest
  } = props;

  return (
    <button
      type={type}
      className={actionButtonClasses({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}

export default ActionButton;
