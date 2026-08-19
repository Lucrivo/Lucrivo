import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input bg-card transition-interactive placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/20 disabled:bg-muted aria-invalid:border-destructive aria-invalid:ring-destructive/15 flex field-sizing-content min-h-24 w-full rounded-lg border px-3 py-2.5 text-base shadow-xs outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:ring-3 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
