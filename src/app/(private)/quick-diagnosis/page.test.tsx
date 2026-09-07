import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const {
  createProductDiagnosis,
  createProductionDiagnosis,
  QuickDiagnosisWizard,
} = vi.hoisted(() => ({
  createProductDiagnosis: vi.fn(),
  createProductionDiagnosis: vi.fn(),
  QuickDiagnosisWizard: vi.fn(() => <div>Wizard do diagnóstico</div>),
}));

vi.mock(
  "@/modules/quick-diagnosis/actions/create-product-diagnosis.action",
  () => ({ createProductDiagnosis }),
);
vi.mock(
  "@/modules/quick-diagnosis/actions/create-production-diagnosis.action",
  () => ({ createProductionDiagnosis }),
);
vi.mock("@/modules/quick-diagnosis/components/quick-diagnosis-wizard", () => ({
  QuickDiagnosisWizard,
}));

import QuickDiagnosisPage from "./page";

describe("QuickDiagnosisPage", () => {
  it("composes the diagnosis wizard with the server action", () => {
    render(<QuickDiagnosisPage />);

    expect(
      screen.getByRole("heading", { name: "Diagnóstico rápido", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Wizard do diagnóstico")).toBeInTheDocument();
    expect(QuickDiagnosisWizard).toHaveBeenCalledWith(
      {
        createProductDiagnosis,
        createProductionDiagnosis,
      },
      undefined,
    );
  });
});
