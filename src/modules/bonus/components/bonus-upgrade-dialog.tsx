"use client";

import Link from "next/link";
import { GiftIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BonusUpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function BonusUpgradeDialog({
  open,
  onOpenChange,
}: BonusUpgradeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-md">
        <span className="bg-primary/10 text-primary ring-primary/15 grid size-12 place-items-center rounded-xl ring-1">
          <GiftIcon aria-hidden="true" className="size-5" />
        </span>
        <DialogHeader>
          <DialogTitle className="text-xl leading-snug font-semibold tracking-tight text-balance">
            Desbloqueie seus bônus permanentes
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-pretty">
            O guia prático e a planilha de fluxo de caixa são liberados após a
            confirmação da sua assinatura. Depois disso, continuam disponíveis
            mesmo se você não renovar ou se o período do plano terminar.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Agora não
          </DialogClose>
          <Link href="/billing" className={buttonVariants()}>
            Conhecer os planos
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { BonusUpgradeDialog, type BonusUpgradeDialogProps };
