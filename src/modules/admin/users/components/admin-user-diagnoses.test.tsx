import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AdminUserDiagnosis } from "../admin-users.schema";
import { AdminUserDiagnoses } from "./admin-user-diagnoses";

const diagnosis: AdminUserDiagnosis = {
  id: "42",
  createdAt: "2026-09-16T12:00:00+00:00",
  updatedAt: "2026-09-16T12:05:00+00:00",
  deletedAt: null,
  version: 3,
  category: "product",
  scenario: "resale",
  analysisMode: "detailed",
  isFreeReport: false,
  currentPriceCents: null,
  realMarginBasisPoints: null,
  unitProfitCents: null,
  monthlyGrossRevenueCents: 100_000,
  monthlyResultCents: 25_000,
  itemCount: 12,
  isPartial: false,
  verdict: "positive_result",
  priority: "margin",
  aiUsage: {
    completedTurns: 2,
    failedTurns: 1,
    inputTokens: 1_650,
    cachedInputTokens: 200,
    outputTokens: 350,
    lastUsedAt: "2026-09-16T12:04:00+00:00",
    models: [
      {
        model: "gpt-6-luna",
        inputTokens: 1_650,
        cachedInputTokens: 200,
        outputTokens: 350,
      },
    ],
  },
};

describe("AdminUserDiagnoses", () => {
  it("presents translated report facts and an explicitly labelled AI estimate", () => {
    render(
      <AdminUserDiagnoses
        page={{ items: [diagnosis], nextCursor: null }}
        nextHref={null}
      />,
    );

    expect(screen.getByText("Diagnóstico de Produto")).toBeVisible();
    expect(screen.getByText("Revenda · Detalhado")).toBeVisible();
    expect(screen.getByText("Resultado positivo")).toBeVisible();
    expect(screen.getByText("Avaliar margem")).toBeVisible();
    expect(screen.getByText(/1\.650 tokens de entrada/)).toBeVisible();
    expect(
      screen.getByText(/Estimativa pelos preços de 21\/10\/2026/),
    ).toBeVisible();
  });
});
