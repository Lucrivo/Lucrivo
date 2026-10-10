import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AdminOnboardingOverview as Overview } from "../admin-onboarding.schema";
import { AdminOnboardingOverview } from "./admin-onboarding-overview";

const overview: Overview = {
  generatedAt: "2026-10-09T12:00:00+00:00",
  metrics: {
    accountCount: 4,
    completedCount: 3,
    completionRateBasisPoints: 7500,
    activeConsentCount: 2,
    consentRateBasisPoints: 6667,
  },
  segments: [
    { id: 1, name: "Alimentação", count: 2 },
    { id: 2, name: "Tecnologia", count: 1 },
  ],
  subcategories: [{ id: null, name: "Outro", count: 1 }],
};

describe("AdminOnboardingOverview", () => {
  it("renders all cohort indicators and text equivalents for charts", () => {
    render(<AdminOnboardingOverview overview={overview} />);

    for (const label of [
      "Contas na coorte",
      "Perfis concluídos",
      "Taxa de preenchimento",
      "Consentimentos ativos",
      "Taxa de consentimento",
    ]) {
      expect(screen.getByText(label)).toBeVisible();
    }
    expect(screen.getByText("75,00%")).toBeVisible();
    expect(screen.getByText("66,67%")).toBeVisible();

    const segmentList = screen.getByRole("list", {
      name: "Distribuição por segmento",
    });
    expect(within(segmentList).getByText("Alimentação")).toBeVisible();
    expect(within(segmentList).getByText("2")).toBeVisible();
    expect(
      screen.getByRole("img", { name: "Perfis concluídos por segmento" }),
    ).toBeVisible();
  });

  it("uses truthful empty values and empty-state copy", () => {
    render(
      <AdminOnboardingOverview
        overview={{
          ...overview,
          metrics: {
            ...overview.metrics,
            completionRateBasisPoints: null,
            consentRateBasisPoints: null,
          },
          segments: [],
          subcategories: [],
        }}
      />,
    );

    expect(screen.getAllByText("Ainda sem dados")).toHaveLength(2);
    expect(
      screen.getAllByText("Ainda não há perfis concluídos neste período."),
    ).toHaveLength(2);
  });
});
