import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { createProductDiagnosis, createServiceDiagnosis, QuickDiagnosisWizard } =
  vi.hoisted(() => ({
    createProductDiagnosis: vi.fn(),
    createServiceDiagnosis: vi.fn(),
    QuickDiagnosisWizard: vi.fn(() => <div>Wizard do diagnóstico</div>),
  }));

vi.mock(
  "@/modules/quick-diagnosis/actions/create-product-diagnosis.action",
  () => ({ createProductDiagnosis }),
);
vi.mock(
  "@/modules/quick-diagnosis/actions/create-service-diagnosis.action",
  () => ({ createServiceDiagnosis }),
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
      { createServiceDiagnosis, createProductDiagnosis },
      undefined,
    );
  });
});
