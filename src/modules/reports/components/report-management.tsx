"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CopyIcon, PencilIcon, Trash2Icon } from "lucide-react";

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
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { deleteReport } from "../actions/delete-report.action";
import type { EditableReportDraft } from "../editor/report-editor.types";
import type { ReportSnapshot } from "../types";
import { ReportEditor } from "./report-editor";

function ReportManagement({
  diagnosisId,
  version,
  snapshot,
  draft,
  canEdit,
}: {
  diagnosisId: number;
  version: number;
  snapshot: ReportSnapshot;
  draft: EditableReportDraft | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function requestEdit() {
    if (!canEdit) {
      setUpgradeOpen(true);
      return;
    }
    if (draft) setEditing(true);
  }

  function confirmDelete() {
    setDeleteMessage(null);
    startTransition(async () => {
      const result = await deleteReport({
        diagnosisId,
        expectedVersion: version,
      });
      if (result.status === "success") {
        router.replace("/reports?deleted=1");
        router.refresh();
        return;
      }
      setDeleteMessage(
        result.status === "conflict"
          ? "O relatório mudou em outra sessão. Atualize a página antes de excluir."
          : "Não foi possível excluir o relatório agora.",
      );
    });
  }

  return (
    <section aria-label="Ações do relatório" className="grid gap-4">
      <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold">Gerenciar relatório</h2>
          <p className="text-muted-foreground text-sm">
            {draft
              ? "Edite os dados, salve uma cópia ou exclua este relatório."
              : "Esta versão continua disponível para consulta, mas não pode ser editada."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!draft}
            onClick={requestEdit}
          >
            <PencilIcon aria-hidden="true" />
            Editar diagnóstico
          </Button>
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogTrigger
              render={<Button type="button" variant="ghost" />}
            >
              <Trash2Icon aria-hidden="true" />
              Excluir relatório
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir este relatório?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ele sairá da sua lista de relatórios. A exclusão não libera um
                  novo diagnóstico gratuito.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {deleteMessage ? (
                <p role="alert" className="text-destructive text-sm">
                  {deleteMessage}
                </p>
              ) : null}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={pending}
                  onClick={(event) => {
                    event.preventDefault();
                    confirmDelete();
                  }}
                >
                  {pending ? "Excluindo…" : "Excluir relatório"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {editing && draft ? (
        <ReportEditor
          diagnosisId={diagnosisId}
          version={version}
          initialDraft={draft}
          initialSnapshot={snapshot}
          onCancel={() => setEditing(false)}
          onPlanRequired={() => setUpgradeOpen(true)}
        />
      ) : null}

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Assine para editar seus diagnósticos</DialogTitle>
            <DialogDescription>
              Seu relatório continua disponível para consulta. Um plano ativo
              permite alterar os dados, substituir este relatório ou salvar uma
              nova versão.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setUpgradeOpen(false)}
            >
              Agora não
            </Button>
            <Link href="/billing" className={buttonVariants()}>
              <CopyIcon aria-hidden="true" />
              Conhecer os planos
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export { ReportManagement };
