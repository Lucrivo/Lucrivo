import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductDiagnosisCommand } from "@/modules/quick-diagnosis/types";

import { buildProductReportSnapshot } from "../domain/build-product-report-snapshot";
import { calculateProductReport } from "../domain/calculate-product-report";
import { toEditableReportDraft } from "../editor/report-editor.adapters";
import {
  snapshots as allEditableSnapshots,
  submissionId,
} from "../editor/report-editor.adapters.test";

const { push, refresh, saveReportEdit } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  saveReportEdit: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));
vi.mock("../actions/save-report-edit.action", () => ({ saveReportEdit }));

import { ReportEditor } from "./report-editor";

const command: ProductDiagnosisCommand = {
  submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  productKind: "resale",
  purchaseUnitCostCents: 1250,
  unitSalePriceCents: 3000,
  fixedMonthlyExpensesCents: 80000,
  monthlySalesVolume: 40,
  proLaboreIncluded: true,
  proLaboreCents: 150000,
  taxRateBasisPoints: 600,
  cardFeeRateBasisPoints: 350,
};
const snapshot = buildProductReportSnapshot(
  command,
  calculateProductReport(command),
);
const draft = toEditableReportDraft(
  snapshot,
  () => "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
)!;

describe("ReportEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveReportEdit.mockResolvedValue({
      status: "success",
      diagnosisId: 41,
      version: 3,
    });
  });

  it("updates the preview and replaces the same report", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ReportEditor
        diagnosisId={41}
        version={2}
        initialDraft={draft}
        initialSnapshot={snapshot}
        onCancel={onCancel}
        onPlanRequired={vi.fn()}
      />,
    );

    const price = screen.getByLabelText("Preço de venda (R$)");
    await user.clear(price);
    await user.type(price, "45.00");
    expect(screen.getByText("R$ 45,00")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() =>
      expect(saveReportEdit).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "replace",
          diagnosisId: 41,
          expectedVersion: 2,
          draft: expect.objectContaining({ kind: "product" }),
        }),
      ),
    );
    expect(onCancel).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("keeps the draft and opens the plan flow if paid access is lost", async () => {
    const user = userEvent.setup();
    const onPlanRequired = vi.fn();
    saveReportEdit.mockResolvedValue({ status: "plan_required" });
    render(
      <ReportEditor
        diagnosisId={41}
        version={2}
        initialDraft={draft}
        initialSnapshot={snapshot}
        onCancel={vi.fn()}
        onPlanRequired={onPlanRequired}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Salvar como novo relatório" }),
    );
    await waitFor(() => expect(onPlanRequired).toHaveBeenCalledOnce());
    expect(screen.getByLabelText("Preço de venda (R$)")).toHaveValue("30");
  });

  it.each([
    ["service", 0, "Preço cobrado hoje (R$)", "120.00"],
    ["production", 2, "Preço de venda (R$)", "45.00"],
    ["detailed", 3, "Preço de venda (R$)", "45.00"],
  ] as const)(
    "edits and submits a valid %s draft",
    async (kind, snapshotIndex, fieldLabel, value) => {
      const user = userEvent.setup();
      const editableSnapshot = allEditableSnapshots()[snapshotIndex]!;
      const editableDraft = toEditableReportDraft(
        editableSnapshot,
        () => submissionId,
      )!;
      render(
        <ReportEditor
          diagnosisId={41}
          version={2}
          initialDraft={editableDraft}
          initialSnapshot={editableSnapshot}
          onCancel={vi.fn()}
          onPlanRequired={vi.fn()}
        />,
      );

      if (kind === "detailed") {
        expect(screen.queryByLabelText(fieldLabel)).not.toBeInTheDocument();
        const trigger = screen.getByRole("button", {
          name: /Abrir Produto A/i,
        });
        expect(trigger).toHaveAttribute("aria-expanded", "false");
        await user.click(trigger);
      }
      const field = screen.getByLabelText(fieldLabel);
      await user.clear(field);
      await user.type(field, value);
      await user.click(
        screen.getByRole("button", { name: "Salvar alterações" }),
      );

      await waitFor(() =>
        expect(saveReportEdit).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: "replace",
            draft: expect.objectContaining({ kind }),
          }),
        ),
      );
    },
  );

  it("keeps the last preview and blocks an invalid submission", async () => {
    const user = userEvent.setup();
    render(
      <ReportEditor
        diagnosisId={41}
        version={2}
        initialDraft={draft}
        initialSnapshot={snapshot}
        onCancel={vi.fn()}
        onPlanRequired={vi.fn()}
      />,
    );

    await user.clear(screen.getByLabelText("Preço de venda (R$)"));
    expect(
      screen.getByText(
        "Revise os campos destacados para atualizar esta simulação.",
      ),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(
      screen.getByText("Revise os campos destacados antes de salvar."),
    ).toBeVisible();
    expect(saveReportEdit).not.toHaveBeenCalled();
  });

  it("navigates to the new report after saving a copy", async () => {
    const user = userEvent.setup();
    saveReportEdit.mockResolvedValue({
      status: "success",
      diagnosisId: 99,
      version: 0,
    });
    render(
      <ReportEditor
        diagnosisId={41}
        version={2}
        initialDraft={draft}
        initialSnapshot={snapshot}
        onCancel={vi.fn()}
        onPlanRequired={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Salvar como novo relatório" }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/reports/99"));
  });

  it("keeps the draft and explains an optimistic concurrency conflict", async () => {
    const user = userEvent.setup();
    saveReportEdit.mockResolvedValue({ status: "conflict" });
    render(
      <ReportEditor
        diagnosisId={41}
        version={2}
        initialDraft={draft}
        initialSnapshot={snapshot}
        onCancel={vi.fn()}
        onPlanRequired={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(
      await screen.findByText(
        "Este relatório foi alterado em outra sessão. Atualize a página e tente novamente.",
      ),
    ).toBeVisible();
    expect(screen.getByLabelText("Preço de venda (R$)")).toHaveValue("30");
  });
});
