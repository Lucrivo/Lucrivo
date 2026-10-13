import { describe, expect, it } from "vitest";

import { reportPriorities, reportVerdicts } from "@/modules/reports/types";

import { parseClientDashboardFilters } from "./client-dashboard.filters";
import {
  presentAnalysisMode,
  presentCategory,
  presentPriority,
  presentVerdict,
  toClientDashboardViewModel,
} from "./client-dashboard.formatters";
import type { ClientDashboardSnapshot } from "./client-dashboard.schema";

const snapshot: ClientDashboardSnapshot = {
  generatedAt: "2026-10-01T12:00:00.000Z",
  filters: {
    from: null,
    to: null,
    categories: [],
    modes: [],
    scenarios: [],
    verdicts: [],
    priorities: [],
    dataState: "all",
  },
  hasAnyReports: true,
  focusReportId: 42,
  metrics: {
    totalReports: 2,
    positiveResultReports: 1,
    lossReports: 0,
    pendingDataReports: 1,
  },
  verdictCounts: reportVerdicts.map((verdict) => ({
    verdict,
    count: verdict === "positive_result" ? 1 : 0,
  })),
  priorityCounts: reportPriorities.map((priority) => ({
    priority,
    count: priority === "margin" ? 1 : 0,
  })),
  recentReports: [
    {
      id: 42,
      businessCategory: "product",
      scenario: "resale",
      analysisMode: "quick",
      createdAt: "2026-09-30T18:30:00.000Z",
      updatedAt: "2026-09-30T18:30:00.000Z",
      verdict: "positive_result",
      priority: "margin",
      hasPendingData: false,
      itemCount: null,
      realMarginBasisPoints: 2_500,
      monthlyResultCents: 125_000,
      schemaVersion: 3,
      calculationVersion: 3,
      contentVersion: 5,
    },
    {
      id: 41,
      businessCategory: "production",
      scenario: "manufacturing",
      analysisMode: "detailed",
      createdAt: "2026-09-29T18:30:00.000Z",
      updatedAt: "2026-09-29T18:30:00.000Z",
      verdict: "incomplete_volume",
      priority: "data",
      hasPendingData: true,
      itemCount: 2,
      realMarginBasisPoints: null,
      monthlyResultCents: null,
      schemaVersion: 1,
      calculationVersion: 1,
      contentVersion: 2,
    },
  ],
};

describe("client dashboard presentations", () => {
  it("presents every verdict with stable Portuguese copy and semantic tone", () => {
    expect(
      reportVerdicts.map((verdict) => presentVerdict(verdict).label),
    ).toEqual([
      "Preço não informado",
      "Perda por venda",
      "Equilíbrio como referência",
      "Prejuízo no cenário informado",
      "Mês sem vendas",
      "Zero a zero",
      "Resultado positivo",
    ]);
    expect(
      reportVerdicts.map((verdict) => presentVerdict(verdict).tone),
    ).toEqual([
      "info",
      "danger",
      "info",
      "danger",
      "info",
      "warning",
      "success",
    ]);
  });

  it("presents every priority as an action rather than severity", () => {
    expect(
      reportPriorities.map((priority) => presentPriority(priority)),
    ).toEqual([
      "Revisar custos",
      "Completar dados",
      "Revisar preço",
      "Avaliar margem",
      "Avaliar volume",
    ]);
  });

  it("presents all categories and analysis modes", () => {
    expect(
      (["service", "product", "production"] as const).map(presentCategory),
    ).toEqual(["Serviço", "Produto", "Produção"]);
    expect((["quick", "detailed"] as const).map(presentAnalysisMode)).toEqual([
      "Rápido",
      "Detalhado",
    ]);
  });
});

describe("toClientDashboardViewModel", () => {
  it("maps persisted summaries through existing financial formatters", () => {
    const model = toClientDashboardViewModel(
      snapshot,
      parseClientDashboardFilters({}),
    );

    expect(model.metrics).toEqual(snapshot.metrics);
    expect(model.recentReports[0]).toMatchObject({
      id: 42,
      title: "Diagnóstico de Produto",
      categoryLabel: "Produto",
      scenarioLabel: "Revenda",
      modeLabel: "Rápido",
      verdict: { label: "Resultado positivo", tone: "success" },
      priorityLabel: "Avaliar margem",
      dataStateLabel: "Dados completos",
      itemCountLabel: null,
      monthlyResultLabel: "R$ 1.250,00",
      realMarginLabel: "25%",
      openHref: "/reports/42",
    });
  });

  it("omits unavailable recent financial facts instead of formatting zero", () => {
    const model = toClientDashboardViewModel(
      snapshot,
      parseClientDashboardFilters({}),
    );

    expect(model.recentReports[1]).toMatchObject({
      dataStateLabel: "Dados pendentes",
      itemCountLabel: "2 itens",
      monthlyResultLabel: null,
      realMarginLabel: null,
    });
  });
});
