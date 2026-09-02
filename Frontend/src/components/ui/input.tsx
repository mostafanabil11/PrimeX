import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // h-11, not the stock h-8 — see the note on button size variants. A
        // 32px field is a 32px tap target, and it is also visually shorter
        // than every hand-written field elsewhere in this app.
        //
        // `text-base md:text-sm` was already right and is left alone: 16px on
        // phones is what stops iOS Safari zooming the page on focus, and the
        // hand-rolled forms have now been brought in line with it rather than
        // the other way around.
        //
        // dark:bg-input/30 is a translucent wash of the border token. That
        // token was recently split — --input is now a mid grey chosen for
        // visible field boundaries rather than the near-black divider it used
        // to be — so this is pinned to the surface colour it was actually
        // meant to be instead of following the border brighter.
        "h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-surface-2/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-surface-2/30 dark:disabled:bg-surface-2/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
