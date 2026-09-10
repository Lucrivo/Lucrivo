import { DiagnosisLimitCard } from "@/modules/billing/components/diagnosis-limit-card";
import { getBillingOverview } from "@/modules/billing/services/get-billing-overview.service";
import { requireUser } from "@/modules/auth/services/require-user";
import { createProductDiagnosis } from "@/modules/quick-diagnosis/actions/create-product-diagnosis.action";
import { createProductionDiagnosis } from "@/modules/quick-diagnosis/actions/create-production-diagnosis.action";
import { createServiceDiagnosis } from "@/modules/quick-diagnosis/actions/create-service-diagnosis.action";
import { QuickDiagnosisWizard } from "@/modules/quick-diagnosis/components/quick-diagnosis-wizard";

export default async function QuickDiagnosisPage() {
  const { supabase, userId } = await requireUser();
  const result = await getBillingOverview({ supabase, userId });

  if (result.status === "read_failed") {
    throw new Error("billing_overview_read_failed");
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col">
      <h1 className="sr-only">Diagnóstico rápido</h1>
      {result.overview.canCreateDiagnosis ? (
        <QuickDiagnosisWizard
          createServiceDiagnosis={createServiceDiagnosis}
          createProductDiagnosis={createProductDiagnosis}
          createProductionDiagnosis={createProductionDiagnosis}
        />
      ) : (
        <DiagnosisLimitCard />
      )}
    </main>
  );
}
