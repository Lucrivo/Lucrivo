"use client";

import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { saveDetailedDiagnosisIntent } from "../services/detailed-diagnosis-intent";
import type { DetailedDiagnosisCategory } from "../types";

type DetailedDiagnosisUpgradeDialogProps = {
  open: boolean;
  userId: string;
  category: DetailedDiagnosisCategory | null;
  onOpenChange: (open: boolean) => void;
  onContinueQuick: () => void;
};

function DetailedDiagnosisUpgradeDialog({
  open,
  userId,
  category,
  onOpenChange,
  onContinueQuick,
}: DetailedDiagnosisUpgradeDialogProps) {
  function saveIntent() {
    if (category === null) return;
    saveDetailedDiagnosisIntent(window.sessionStorage, { userId, category });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg leading-snug font-semibold tracking-tight text-balance">
            Diagnóstico detalhado faz parte dos planos
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-pretty">
            Os planos permitem analisar vários itens no mesmo diagnóstico. O
            diagnóstico rápido gratuito continua disponível.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onContinueQuick}>
            Continuar no diagnóstico rápido
          </Button>
          <Link
            href="/billing"
            className={buttonVariants()}
            onClick={saveIntent}
          >
            Conhecer os planos
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export {
  DetailedDiagnosisUpgradeDialog,
  type DetailedDiagnosisUpgradeDialogProps,
};
