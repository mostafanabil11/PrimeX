import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "ui-action group/button inline-flex shrink-0 items-center justify-center text-sm font-medium whitespace-nowrap select-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "ui-action--primary",
        // border-input, and the fills come off the surface ramp rather than
        // off the border token. --input was split away from --border so that
        // field edges could be bright enough to see (3.1:1 rather than 1.5:1);
        // an outline button wants that same visible edge, but it does NOT want
        // a translucent wash of it as its background, which is what
        // `bg-input/30` quietly became the moment the token moved.
        outline:
          "ui-action--outline",
        secondary:
          "ui-action--secondary",
        ghost:
          "ui-action--ghost",
        destructive:
          "ui-action--danger",
        link: "ui-action--link",
      },
      // ---------------------------------------------------------------------
      // RETUNED FOR TOUCH. These were the library's stock values, and the
      // library's stock values are for a dense desktop admin: `default` was
      // 32px tall and `icon` was 32 square, both well under the ~44px an adult
      // fingertip actually covers. Every button in this app that was written
      // by hand already clears that; the gap was only ever where the primitive
      // was dropped in as shipped — which happened to include the menu button
      // and the drawer's close button, i.e. the two controls a phone visitor
      // meets first.
      //
      // 44px is the floor for anything a finger has to find. The small steps
      // survive for genuinely dense, mouse-only contexts inside /admin — they
      // are `xs` and `sm` precisely so that reaching for one is a decision
      // rather than a default.
      size: {
        default:
          "h-11 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[min(var(--radius-md),12px)] px-3 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-1.5 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "ui-action--icon size-11",
        "icon-xs":
          "ui-action--icon size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "ui-action--icon size-8",
        "icon-lg": "ui-action--icon size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
