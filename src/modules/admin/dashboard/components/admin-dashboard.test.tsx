import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AdminDashboardViewModel } from "../admin-dashboard.types";
import { AdminDashboard } from "./admin-dashboard";

const dashboardFixture: AdminDashboardViewModel = {
  generatedAtLabel: "16/09/2026, 15:30",
  metrics: {
    newUsers: { today: 2, week: 8, month: 21 },
    activeUsers: 45,
    freeDiagnoses: 19,
    activeSubscriptions: 12,
    canceledSubscriptions: 1,
    monthlyRevenueCents: 289_900,
    cancellationOpeningBase: 20,
    cancellationRateBasisPoints: 500,
  },
  revenueHistory: [
    "out.",
    "nov.",
    "dez.",
    "jan.",
    "fev.",
    "mar.",
    "abr.",
    "mai.",
    "jun.",
    "jul.",
    "ago.",
    "set.",
  ].map((label, index) => ({
    period: `${index < 3 ? 2025 : 2026}-${String(((index + 9) % 12) + 1).padStart(2, "0")}-01`,
    label,
    valueCents: index * 25_000,
  })),
  userGrowth: ["abr.", "mai.", "jun.", "jul.", "ago.", "set."].map(
    (label, index) => ({
      period: `2026-${String(index + 4).padStart(2, "0")}-01`,
      label,
      value: index + 3,
    }),
  ),
  recentSubscriptions: [
    {
      id: "95000000-0000-4000-8000-000000000001",
      email: "cliente@example.com",
      billingModeLabel: "Mensal",
      createdAtLabel: "16 set. 2026",
      status: { label: "Ativa", tone: "success" },
    },
    {
      id: "95000000-0000-4000-8000-000000000002",
      email: "E-mail indisponível",
      billingModeLabel: "Anual",
      createdAtLabel: "15 set. 2026",
      status: { label: "Cancelamento agendado", tone: "warning" },
    },
  ],
};

describe("AdminDashboard", () => {
  it("renders operational KPIs, analysis, and subscriptions without fake actions", () => {
    render(<AdminDashboard dashboard={dashboardFixture} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Visão geral" }),
    ).toBeVisible();
    expect(screen.getByText("Novos usuários")).toBeVisible();
    expect(screen.getByText("Usuários ativos")).toBeVisible();
    expect(screen.getByText("Diagnósticos gratuitos")).toBeVisible();
    expect(screen.getByText("Assinaturas ativas")).toBeVisible();
    expect(screen.getByText("Assinaturas canceladas")).toBeVisible();
    expect(screen.getByText("Receita mensal")).toBeVisible();

    expect(
      screen.getByRole("heading", {
        name: "Receita dos últimos 12 meses",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Taxa de cancelamento" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Novos usuários nos últimos 6 meses",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Assinaturas recentes" }),
    ).toBeVisible();

    expect(screen.getAllByText("1 cancelamento este mês")).toHaveLength(1);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByText("Novo diagnóstico")).not.toBeInTheDocument();
  });

  it("provides accessible chart labels and current-period summaries", () => {
    render(<AdminDashboard dashboard={dashboardFixture} />);

    expect(
      screen.getByRole("img", {
        name: "Evolução mensal da receita nos últimos 12 meses",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", {
        name: "Novos usuários por mês nos últimos 6 meses",
      }),
    ).toBeVisible();
    expect(screen.getByText(/Setembro: R\$.*2\.750,00/)).toBeVisible();
    expect(screen.getByText(/Setembro: 8 cadastros/)).toBeVisible();
  });

  it("explains an unavailable cancellation rate", () => {
    render(
      <AdminDashboard
        dashboard={{
          ...dashboardFixture,
          metrics: {
            ...dashboardFixture.metrics,
            cancellationOpeningBase: 0,
            cancellationRateBasisPoints: null,
          },
        }}
      />,
    );

    expect(screen.getByText("Sem base suficiente")).toBeVisible();
    expect(
      screen.getByText(/não havia assinaturas ativas no início do mês/i),
    ).toBeVisible();
  });

  it("renders truthful chart and subscription empty states", () => {
    render(
      <AdminDashboard
        dashboard={{
          ...dashboardFixture,
          revenueHistory: dashboardFixture.revenueHistory.map((point) => ({
            ...point,
            valueCents: 0,
          })),
          userGrowth: dashboardFixture.userGrowth.map((point) => ({
            ...point,
            value: 0,
          })),
          recentSubscriptions: [],
        }}
      />,
    );

    expect(
      screen.getAllByText("Ainda não há dados para este período."),
    ).toHaveLength(2);
    expect(
      screen.getByText("Nenhuma assinatura registrada até agora."),
    ).toBeVisible();
  });

  it("presents real subscription fields in Portuguese", () => {
    render(<AdminDashboard dashboard={dashboardFixture} />);

    const table = screen.getByRole("table", { name: "Assinaturas recentes" });
    expect(within(table).getByText("cliente@example.com")).toBeVisible();
    expect(within(table).getByText("Mensal")).toBeVisible();
    expect(within(table).getByText("Ativa")).toBeVisible();
    expect(within(table).getByText("E-mail indisponível")).toBeVisible();
    expect(within(table).getByText("Cancelamento agendado")).toBeVisible();
  });
});
