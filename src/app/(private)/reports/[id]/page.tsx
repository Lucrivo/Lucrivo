import Link from "next/link";
import { notFound } from "next/navigation";
import { FileWarningIcon, PlusIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireUser } from "@/modules/auth/services/require-user";
import { getBillingOverview } from "@/modules/billing/services/get-billing-overview.service";
import { DetailedReportDetail } from "@/modules/reports/components/detailed-report-detail";
import { ReportDetail } from "@/modules/reports/components/report-detail";
import { ReportManagement } from "@/modules/reports/components/report-management";
import { toEditableReportDraft } from "@/modules/reports/editor/report-editor.adapters";
import { toReportViewModel } from "@/modules/reports/presenters/to-report-view-model";
import { isDetailedReportSnapshot } from "@/modules/reports/schemas/report-snapshot.schema";
import {
  getOwnedReport,
  parseDiagnosisId,
} from "@/modules/reports/services/get-report.service";

function UnavailableReport() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center py-10">
      <Card className="border-warning/30 bg-warning/5 w-full shadow-md">
        <CardHeader className="items-center gap-4 text-center">
          <span className="bg-warning/15 text-warning-foreground flex size-12 items-center justify-center rounded-2xl">
            <FileWarningIcon aria-hidden="true" />
          </span>
          <div className="grid gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Relatório indisponível
            </h1>
            <p className="text-muted-foreground max-w-lg leading-6">
              Este diagnóstico foi encontrado, mas sua versão não pode ser
              aberta com segurança. Os dados salvos não foram alterados.
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/reports"
            className={buttonVariants({ variant: "outline" })}
          >
            Ver relatórios
          </Link>
          <Link
            href="/quick-diagnosis"
            className={buttonVariants({ variant: "default" })}
          >
            <PlusIcon aria-hidden="true" />
            Novo diagnóstico
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (parseDiagnosisId(id) === null) notFound();

  const { userId, supabase } = await requireUser();
  const result = await getOwnedReport({
    supabase,
    userId,
    diagnosisId: id,
  });

  if (result.status === "not_found") notFound();
  if (result.status === "read_failed") throw new Error("report_read_failed");
  if (result.status === "unavailable") return <UnavailableReport />;

  const billing = await getBillingOverview({ supabase, userId });
  const canEdit =
    billing.status === "success" && billing.overview.tier === "paid";
  const draft = toEditableReportDraft(result.report.snapshot);
  const management = (
    <ReportManagement
      diagnosisId={result.report.id}
      version={result.report.version}
      snapshot={result.report.snapshot}
      draft={draft}
      canEdit={canEdit}
    />
  );

  if (isDetailedReportSnapshot(result.report.snapshot))
    return (
      <DetailedReportDetail
        id={result.report.id}
        createdAt={result.report.createdAt}
        snapshot={result.report.snapshot}
        management={management}
      />
    );

  const viewModel = toReportViewModel(result.report);
  return <ReportDetail viewModel={viewModel} management={management} />;
}
