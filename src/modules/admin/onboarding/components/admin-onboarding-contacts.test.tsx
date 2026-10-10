import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AdminOnboardingContacts as Contacts } from "../admin-onboarding.schema";
import { parseAdminOnboardingNavigation } from "../admin-onboarding.filters";
import { AdminOnboardingContacts } from "./admin-onboarding-contacts";

const data: Contacts = {
  items: [
    {
      userId: "97000000-0000-4000-8000-000000000002",
      fullName: "Ana Ferreira",
      whatsappE164: "+5511999999999",
      segment: { id: 1, name: "Alimentação" },
      subcategory: { id: null, name: "Outro" },
      customSubcategory: "Bolos artesanais",
      consent: true,
      consentedAt: "2026-10-08T13:00:00+00:00",
      completedAt: "2026-10-09T12:00:00+00:00",
    },
  ],
  nextCursor: {
    completedAt: "2026-10-09T12:00:00+00:00",
    userId: "97000000-0000-4000-8000-000000000002",
  },
};

describe("AdminOnboardingContacts", () => {
  it("renders responsive table and cards with only operational fields", () => {
    render(
      <AdminOnboardingContacts
        data={data}
        navigation={parseAdminOnboardingNavigation({ tab: "contacts" })}
      />,
    );

    expect(
      screen.getByRole("table", { name: "Contatos do onboarding" }),
    ).toBeVisible();
    expect(screen.getAllByText("Ana Ferreira")).toHaveLength(2);
    expect(screen.getAllByText("+5511999999999")).toHaveLength(2);
    expect(screen.getAllByText("Autorizado")).toHaveLength(2);
    expect(screen.getAllByText("Outro · Bolos artesanais")).toHaveLength(2);
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/receita|faturamento|cobrança/i),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Próxima" })).toHaveAttribute(
      "href",
      expect.stringContaining("cursor="),
    );
  });

  it("renders the required empty state", () => {
    render(
      <AdminOnboardingContacts
        data={{ items: [], nextCursor: null }}
        navigation={parseAdminOnboardingNavigation({ tab: "contacts" })}
      />,
    );
    expect(
      screen.getByText("Ainda não há perfis concluídos neste período."),
    ).toBeVisible();
  });
});
