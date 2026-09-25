"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { SaveIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { saveReportEdit } from "../actions/save-report-edit.action";
import { useReportPreview } from "../editor/use-report-preview";
import type { EditableReportDraft } from "../editor/report-editor.types";
import { isDetailedReportSnapshot } from "../schemas/report-snapshot.schema";
import type { ReportSnapshot } from "../types";
import { DetailedReportEditorFields } from "./detailed-report-editor-fields";
import { QuickReportEditorFields } from "./quick-report-editor-fields";
import { ReportPreview } from "./report-preview";

function ReportEditor({
  diagnosisId,
  version,
  initialDraft,
  initialSnapshot,
  onCancel,
  onPlanRequired,
}: {
  diagnosisId: number;
  version: number;
  initialDraft: EditableReportDraft;
  initialSnapshot: ReportSnapshot;
  onCancel: () => void;
  onPlanRequired: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [message, setMessage] = useState<string | null>(null);
  const [revealErrorsSignal, setRevealErrorsSignal] = useState(0);
  const [pending, startTransition] = useTransition();
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const preview = useReportPreview(draft, initialSnapshot);

  function submit(mode: "replace" | "copy") {
    setMessage(null);
    if (preview.status === "invalid") {
      setMessage("Revise os campos destacados antes de salvar.");
      if (draft.kind === "detailed") {
        setRevealErrorsSignal((signal) => signal + 1);
      }
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    startTransition(async () => {
      const result = await saveReportEdit({
        diagnosisId,
        expectedVersion: version,
        mode,
        draft,
      });

      if (result.status === "success") {
        if (mode === "copy") {
          router.push(`/reports/${result.diagnosisId}`);
          return;
        }
        onCancel();
        router.refresh();
        return;
      }
      if (result.status === "plan_required") {
        onPlanRequired();
        return;
      }
      if (result.status === "conflict") {
        setMessage(
          "Este relatório foi alterado em outra sessão. Atualize a página e tente novamente.",
        );
        return;
      }
      if (result.status === "invalid") {
        setMessage("Revise os campos destacados antes de salvar.");
        return;
      }
      setMessage("Não foi possível salvar agora. Tente novamente.");
    });
  }

  return (
    <Card className="border-primary/25 shadow-md">
      <CardHeader className="gap-2">
        <div className="flex items-center gap-2">
          <SaveIcon aria-hidden="true" className="text-primary size-5" />
          <h2 className="text-xl font-semibold">Editar diagnóstico</h2>
        </div>
        <p className="text-muted-foreground max-w-3xl text-sm leading-6">
          Ajuste os dados abaixo. A simulação usa as mesmas regras do relatório
          salvo e muda enquanto você digita.
        </p>
      </CardHeader>
      <CardContent className="grid gap-6">
        {message ? (
          <div
            ref={errorSummaryRef}
            tabIndex={-1}
            role="alert"
            className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm outline-none"
          >
            {message}
          </div>
        ) : null}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
          <div className="min-w-0">
            {draft.kind === "detailed" ? (
              isDetailedReportSnapshot(preview.snapshot) ? (
                <DetailedReportEditorFields
                  draft={draft}
                  errors={preview.fieldErrors}
                  previewSnapshot={preview.snapshot}
                  revealErrorsSignal={revealErrorsSignal}
                  onChange={setDraft}
                />
              ) : null
            ) : (
              <QuickReportEditorFields
                draft={draft}
                errors={preview.fieldErrors}
                onChange={setDraft}
              />
            )}
          </div>
          <aside className="min-w-0 lg:sticky lg:top-6">
            <ReportPreview
              snapshot={preview.snapshot}
              invalid={preview.status === "invalid"}
            />
          </aside>
        </div>

        <div className="border-border flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => submit("copy")}
          >
            Salvar como novo relatório
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => submit("replace")}
          >
            {pending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export { ReportEditor };
