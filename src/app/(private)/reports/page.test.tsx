import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { decodeReportsCursor, listOwnedReports, requireUser } = vi.hoisted(
  () => ({
    decodeReportsCursor: vi.fn(),
    listOwnedReports: vi.fn(),
    requireUser: vi.fn(),
  }),
);

vi.mock("@/modules/auth/services/require-user", () => ({ requireUser }));
vi.mock("@/modules/reports/services/list-reports.service", () => ({
  decodeReportsCursor,
  listOwnedReports,
}));
vi.mock("@/modules/reports/components/report-list-card", () => ({
  ReportListCard: ({ report }: { report: { id: number } }) => (
    <article>Relatório {report.id}</article>
  ),
}));
vi.mock("@/modules/reports/components/reports-empty-state", () => ({
  ReportsEmptyState: () => <div>Biblioteca vazia</div>,
}));

import ReportsPage from "./page";

const report = {
  id: 42,
  businessCategory: "service",
  scenario: "hour",
  createdAt: "2026-08-28T22:30:00.000Z",
  currentPriceCents: 8_000,
  realMarginBasisPoints: 1_700,
  unitProfitCents: 1_360,
  verdict: "adequate_margin",
  priority: "volume",
  unit: "hour",
};

describe("ReportsPage", () => {
  const supabase = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ userId: "trusted-user", supabase });
    decodeReportsCursor.mockImplementation((cursor: string) =>
      cursor === "valid-cursor"
        ? { createdAt: "2026-08-28T22:30:00.000Z", id: 42 }
        : null,
    );
    listOwnedReports.mockResolvedValue({
      status: "success",
      reports: [report],
      nextCursor: null,
    });
  });

  async function renderPage(searchParams: { cursor?: string | string[] } = {}) {
    render(await ReportsPage({ searchParams: Promise.resolve(searchParams) }));
  }

  it("renders the owned SSR library and new-diagnosis action", async () => {
    await renderPage();

    expect(
      screen.getByRole("heading", { name: "Seus diagnósticos" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Relatório 42")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Novo diagnóstico" }),
    ).toHaveAttribute("href", "/quick-diagnosis");
    expect(listOwnedReports).toHaveBeenCalledWith({
      supabase,
      userId: "trusted-user",
      cursor: undefined,
    });
  });

  it("renders the empty state when the user has no saved report", async () => {
    listOwnedReports.mockResolvedValue({
      status: "success",
      reports: [],
      nextCursor: null,
    });

    await renderPage();

    expect(screen.getByText("Biblioteca vazia")).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Diagnósticos salvos" }),
    ).not.toBeInTheDocument();
  });

  it("accepts a valid cursor and links to the next opaque page", async () => {
    listOwnedReports.mockResolvedValue({
      status: "success",
      reports: [report],
      nextCursor: "next-opaque-cursor",
    });

    await renderPage({ cursor: "valid-cursor" });

    expect(listOwnedReports).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: "valid-cursor" }),
    );
    expect(
      screen.getByRole("link", { name: "Ver diagnósticos anteriores" }),
    ).toHaveAttribute("href", "/reports?cursor=next-opaque-cursor");
  });

  it.each([{ cursor: "malformed" }, { cursor: ["valid-cursor", "another"] }])(
    "falls back to the first page for invalid search params",
    async (searchParams) => {
      await renderPage(searchParams);

      expect(listOwnedReports).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: undefined }),
      );
    },
  );

  it("throws a safe route error for a transient list failure", async () => {
    listOwnedReports.mockResolvedValue({ status: "read_failed" });

    await expect(
      ReportsPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("reports_read_failed");
  });
});
