import { createServiceDiagnosis } from "@/modules/quick-diagnosis/actions/create-service-diagnosis.action";
import { QuickDiagnosisWizard } from "@/modules/quick-diagnosis/components/quick-diagnosis-wizard";

export default function QuickDiagnosisPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col">
      <h1 className="sr-only">Diagnóstico rápido</h1>
      <QuickDiagnosisWizard createDiagnosis={createServiceDiagnosis} />
    </main>
  );
}
