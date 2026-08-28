import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QuickDiagnosisWizard } from "./quick-diagnosis-wizard";

describe("QuickDiagnosisWizard", () => {
  it("renders one focused step with deterministic progress", () => {
    const createDiagnosis = vi.fn();
    const createSubmissionId = vi.fn(
      () => "550e8400-e29b-41d4-a716-446655440000",
    );

    render(
      <QuickDiagnosisWizard
        createDiagnosis={createDiagnosis}
        createSubmissionId={createSubmissionId}
      />,
    );

    expect(screen.getByText("1 de 7")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuemax",
      "7",
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveFocus();
    expect(screen.getAllByTestId("wizard-step")).toHaveLength(1);
    expect(createSubmissionId).toHaveBeenCalledOnce();
    expect(createDiagnosis).not.toHaveBeenCalled();
  });

  it("moves forward and back while keeping one focused section", async () => {
    const user = userEvent.setup();
    const createDiagnosis = vi.fn();
    const createSubmissionId = vi.fn(
      () => "550e8400-e29b-41d4-a716-446655440000",
    );

    render(
      <QuickDiagnosisWizard
        createDiagnosis={createDiagnosis}
        createSubmissionId={createSubmissionId}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("2 de 7")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Qual é sua meta mensal?",
      }),
    ).toHaveFocus();
    expect(screen.getAllByTestId("wizard-step")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Voltar" }));

    expect(screen.getByText("1 de 7")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Como você cobra hoje?",
      }),
    ).toHaveFocus();
    expect(screen.getAllByTestId("wizard-step")).toHaveLength(1);
    expect(createSubmissionId).toHaveBeenCalledOnce();
    expect(createDiagnosis).not.toHaveBeenCalled();
  });
});
