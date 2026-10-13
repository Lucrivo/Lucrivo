import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteReport, replace, refresh } = vi.hoisted(() => ({
  deleteReport: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));
vi.mock("../actions/delete-report.action", () => ({ deleteReport }));
vi.mock("./report-editor", () => ({
  ReportEditor: () => <div>Editor aberto</div>,
}));

import { ReportManagement } from "./report-management";

const snapshot = {
  category: "product",
  results: {},
} as never;
const draft = { kind: "product", values: {} } as never;

describe("ReportManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteReport.mockResolvedValue({ status: "success" });
  });

  it("asks for an upgrade when a client without paid access tries to edit", async () => {
    const user = userEvent.setup();
    render(
      <ReportManagement
        diagnosisId={41}
        version={2}
        snapshot={snapshot}
        draft={draft}
        canEdit={false}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Editar diagnóstico" }),
    );
    expect(
      screen.getByRole("heading", {
        name: "Assine para editar seus diagnósticos",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Conhecer os planos" }),
    ).toHaveAttribute("href", "/billing");
  });

  it("opens the inline editor for a paid client", async () => {
    const user = userEvent.setup();
    render(
      <ReportManagement
        diagnosisId={41}
        version={2}
        snapshot={snapshot}
        draft={draft}
        canEdit
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Editar diagnóstico" }),
    );
    expect(screen.getByText("Editor aberto")).toBeVisible();
  });

  it("explains an unsupported snapshot and keeps editing unavailable", () => {
    render(
      <ReportManagement
        diagnosisId={41}
        version={2}
        snapshot={snapshot}
        draft={null}
        canEdit={false}
      />,
    );

    expect(
      screen.getByText(
        "Esta versão continua disponível para consulta, mas não pode ser editada.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Editar diagnóstico" }),
    ).toBeDisabled();
  });

  it("cancels deletion and restores focus to its trigger", async () => {
    const user = userEvent.setup();
    render(
      <ReportManagement
        diagnosisId={41}
        version={2}
        snapshot={snapshot}
        draft={draft}
        canEdit
      />,
    );

    const trigger = screen.getByRole("button", { name: "Excluir relatório" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(deleteReport).not.toHaveBeenCalled();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("deletes with optimistic concurrency and returns to the library", async () => {
    const user = userEvent.setup();
    render(
      <ReportManagement
        diagnosisId={41}
        version={2}
        snapshot={snapshot}
        draft={draft}
        canEdit
      />,
    );

    await user.click(
      screen.getAllByRole("button", { name: "Excluir relatório" }).at(-1)!,
    );
    await user.click(
      screen.getAllByRole("button", { name: "Excluir relatório" }).at(-1)!,
    );

    await waitFor(() =>
      expect(deleteReport).toHaveBeenCalledWith({
        diagnosisId: 41,
        expectedVersion: 2,
      }),
    );
    expect(replace).toHaveBeenCalledWith("/reports?deleted=1");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("keeps the confirmation open and explains a version conflict", async () => {
    const user = userEvent.setup();
    deleteReport.mockResolvedValue({ status: "conflict" });
    render(
      <ReportManagement
        diagnosisId={41}
        version={2}
        snapshot={snapshot}
        draft={draft}
        canEdit
      />,
    );

    await user.click(
      screen.getAllByRole("button", { name: "Excluir relatório" }).at(-1)!,
    );
    await user.click(
      screen.getAllByRole("button", { name: "Excluir relatório" }).at(-1)!,
    );

    expect(
      await screen.findByText(
        "O relatório mudou em outra sessão. Atualize a página antes de excluir.",
      ),
    ).toBeVisible();
    expect(replace).not.toHaveBeenCalled();
  });
});
