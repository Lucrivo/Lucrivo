"use client";

import { useState } from "react";
import { Trash2Icon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ConfirmRemovalButtonProps = {
  ariaLabel: string;
  tooltip: string;
  disabled?: boolean;
  disabledReason?: string;
  title: string;
  description: string;
  confirmLabel: "Remover item" | "Remover ingrediente";
  onConfirm: () => void;
};

const removalButtonClassName =
  "text-muted-foreground hover:bg-destructive hover:text-destructive-foreground focus-visible:border-destructive focus-visible:ring-destructive/25 active:bg-destructive/90 active:text-destructive-foreground";

function ConfirmRemovalButton({
  ariaLabel,
  tooltip,
  disabled = false,
  disabledReason,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ConfirmRemovalButtonProps) {
  const [open, setOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  if (disabled) {
    const reason = disabledReason ?? tooltip;
    return (
      <TooltipProvider>
        <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
          <TooltipTrigger
            render={
              <span
                role="group"
                tabIndex={0}
                aria-label={`${ariaLabel}. ${reason}`}
                className="inline-flex rounded-lg"
                onMouseEnter={() => setTooltipOpen(true)}
                onMouseLeave={() => setTooltipOpen(false)}
                onFocus={() => setTooltipOpen(true)}
                onBlur={() => setTooltipOpen(false)}
              />
            }
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label={ariaLabel}
              disabled
              tabIndex={-1}
              className={removalButtonClassName}
            >
              <Trash2Icon aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent role="tooltip">{reason}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger
            render={
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    aria-label={ariaLabel}
                    className={removalButtonClassName}
                  />
                }
              />
            }
          >
            <Trash2Icon aria-hidden="true" />
          </AlertDialogTrigger>
          <TooltipContent role="tooltip">{tooltip}</TooltipContent>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription>{description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                type="button"
                variant="destructive"
                onClick={() => {
                  onConfirm();
                  setOpen(false);
                }}
              >
                {confirmLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Tooltip>
    </TooltipProvider>
  );
}

export {
  ConfirmRemovalButton,
  removalButtonClassName,
  type ConfirmRemovalButtonProps,
};
