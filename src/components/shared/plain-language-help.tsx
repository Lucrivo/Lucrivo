"use client";

import { CircleHelpIcon } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type PlainLanguageHelpContent = {
  triggerLabel?: string;
  title: string;
  description: string;
  technicalTerm?: string;
};

type PlainLanguageHelpProps = PlainLanguageHelpContent & {
  className?: string;
};

function PlainLanguageHelp({
  triggerLabel = "Entenda este valor",
  title,
  description,
  technicalTerm,
  className,
}: PlainLanguageHelpProps) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "text-primary focus-visible:ring-ring/25 inline-flex min-h-8 w-fit items-center gap-1.5 rounded-md px-1 text-xs font-semibold underline-offset-4 outline-none hover:underline focus-visible:ring-3",
          className,
        )}
      >
        <CircleHelpIcon aria-hidden="true" className="size-3.5" />
        {triggerLabel}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[min(20rem,calc(100vw-2rem))] gap-3 p-4"
      >
        <PopoverHeader className="gap-1.5">
          <PopoverTitle>{title}</PopoverTitle>
          <PopoverDescription className="leading-6">
            {description}
          </PopoverDescription>
        </PopoverHeader>
        {technicalTerm ? (
          <p className="text-muted-foreground text-xs leading-5">
            Nome usado nos cálculos: {technicalTerm}.
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export {
  PlainLanguageHelp,
  type PlainLanguageHelpContent,
  type PlainLanguageHelpProps,
};
