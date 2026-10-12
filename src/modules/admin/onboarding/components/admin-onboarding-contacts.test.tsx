import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  const fetchMock = vi.fn();
  const createObjectURL = vi.fn(() => "blob:authorized-contacts");
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
  });

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

  it("downloads the authorized CSV with only supported current filters", async () => {
    const user = userEvent.setup();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    fetchMock.mockResolvedValue(
      new Response("csv", {
        status: 200,
        headers: {
          "Content-Disposition":
            'attachment; filename="lucrivo-contatos-autorizados-2026-10-10.csv"',
        },
      }),
    );

    render(
      <AdminOnboardingContacts
        data={data}
        navigation={parseAdminOnboardingNavigation({
          tab: "contacts",
          q: "ana",
          segmentId: "2",
          subcategoryId: "7",
          consent: "declined",
          from: "2026-10-01",
          to: "2026-11-01",
          cursor: "invalid",
        })}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Exportar contatos autorizados" }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/onboarding/export?segmentId=2&subcategoryId=7&from=2026-10-01&to=2026-11-01",
      { credentials: "same-origin" },
    );
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:authorized-contacts");
  });

  it.each([
    [204, "Nenhum contato autorizado corresponde aos filtros."],
    [
      422,
      "Reduza o período ou escolha filtros mais específicos para exportar até 5.000 contatos.",
    ],
    [503, "Não foi possível exportar os contatos. Tente novamente."],
  ] as const)("handles export response %s", async (status, message) => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(new Response(null, { status }));

    render(
      <AdminOnboardingContacts
        data={data}
        navigation={parseAdminOnboardingNavigation({ tab: "contacts" })}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Exportar contatos autorizados" }),
    );

    expect(await screen.findByText(message)).toBeVisible();
  });

  it("shows a retryable error when the download request fails", async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValue(new Error("network"));

    render(
      <AdminOnboardingContacts
        data={data}
        navigation={parseAdminOnboardingNavigation({ tab: "contacts" })}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Exportar contatos autorizados" }),
    );

    expect(
      await screen.findByText(
        "Não foi possível exportar os contatos. Tente novamente.",
      ),
    ).toBeVisible();
  });

  it("prevents a second export while the first request is pending", async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));

    render(
      <AdminOnboardingContacts
        data={data}
        navigation={parseAdminOnboardingNavigation({ tab: "contacts" })}
      />,
    );
    const button = screen.getByRole("button", {
      name: "Exportar contatos autorizados",
    });

    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(button).toBeDisabled());
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("explains the mandatory active-authorization rule", () => {
    render(
      <AdminOnboardingContacts
        data={data}
        navigation={parseAdminOnboardingNavigation({ tab: "contacts" })}
      />,
    );

    expect(
      screen.getByText(
        "Somente contatos com autorização ativa no momento da exportação são incluídos.",
      ),
    ).toBeVisible();
  });
});
