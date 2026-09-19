import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const { deleteReport, push, refresh } = vi.hoisted(() => ({
  deleteReport: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
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
});
