import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "border-input bg-card transition-interactive file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/20 disabled:bg-muted aria-invalid:border-destructive aria-invalid:ring-destructive/15 h-10 w-full min-w-0 rounded-lg border px-3 py-2 text-base shadow-xs outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:ring-3 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
