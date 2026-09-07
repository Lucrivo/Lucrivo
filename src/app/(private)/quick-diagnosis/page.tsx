import { createProductDiagnosis } from "@/modules/quick-diagnosis/actions/create-product-diagnosis.action";
import { createProductionDiagnosis } from "@/modules/quick-diagnosis/actions/create-production-diagnosis.action";
import { QuickDiagnosisWizard } from "@/modules/quick-diagnosis/components/quick-diagnosis-wizard";

export default function QuickDiagnosisPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col">
      <h1 className="sr-only">Diagnóstico rápido</h1>
      <QuickDiagnosisWizard
        createProductDiagnosis={createProductDiagnosis}
        createProductionDiagnosis={createProductionDiagnosis}
      />
    </main>
  );
}
