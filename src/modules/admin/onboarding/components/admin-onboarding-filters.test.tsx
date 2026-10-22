import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

import type { AdminBusinessCatalog } from "../admin-onboarding.schema";
import { parseAdminOnboardingNavigation } from "../admin-onboarding.filters";
import { AdminOnboardingFilters } from "./admin-onboarding-filters";
import { AdminOnboardingNav } from "./admin-onboarding-nav";

const catalog: AdminBusinessCatalog = [
  {
    id: 1,
    name: "Alimentação",
    sortOrder: 10,
    isActive: true,
    version: 0,
    subcategories: [
      {
        id: 10,
        segmentId: 1,
        name: "Confeitaria",
        sortOrder: 10,
        isActive: true,
        version: 0,
      },
    ],
  },
  {
    id: 2,
    name: "Tecnologia",
    sortOrder: 20,
    isActive: true,
    version: 0,
    subcategories: [],
  },
];

describe("admin onboarding navigation and filters", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses real URLs for all sections", () => {
    render(<AdminOnboardingNav activeTab="contacts" />);
    expect(screen.getByRole("link", { name: "Visão geral" })).toHaveAttribute(
      "href",
      "/admin/onboarding",
    );
    expect(screen.getByRole("link", { name: "Contatos" })).toHaveAttribute(
      "href",
      "/admin/onboarding?tab=contacts",
    );
    expect(screen.getByRole("link", { name: "Catálogo" })).toHaveAttribute(
      "href",
      "/admin/onboarding?tab=catalog",
    );
  });

  it("submits keyboard-accessible bounded fields and clears dependent URL state", async () => {
    const user = userEvent.setup();
    const navigation = parseAdminOnboardingNavigation({
      tab: "contacts",
      q: "Ana",
      segmentId: "1",
      subcategoryId: "10",
      consent: "granted",
      from: "2026-10-01",
      to: "2026-11-01",
      page: "3",
    });
    render(
      <AdminOnboardingFilters navigation={navigation} catalog={catalog} />,
    );

    expect(
      screen.getByRole("searchbox", { name: "Buscar contato" }),
    ).toHaveAttribute("maxlength", "120");
    expect(screen.getByLabelText("De")).toHaveAttribute("maxlength", "10");
    expect(screen.getByLabelText("Até")).toHaveAttribute("maxlength", "10");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Segmento" }),
      "2",
    );
    screen.getByRole("button", { name: "Filtrar" }).focus();
    await user.keyboard("{Enter}");

    expect(replace).toHaveBeenCalledWith(
      expect.stringMatching(/tab=contacts.*segmentId=2/),
      { scroll: false },
    );
    const href = replace.mock.calls.at(-1)?.[0] as string;
    expect(href).not.toContain("subcategoryId");
    expect(href).not.toContain("page=");
  });

  it("removes an active filter without a document reload", async () => {
    const user = userEvent.setup();
    render(
      <AdminOnboardingFilters
        navigation={parseAdminOnboardingNavigation({
          tab: "contacts",
          q: "Ana",
        })}
        catalog={catalog}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remover busca Ana" }));
    expect(replace).toHaveBeenCalledWith("/admin/onboarding?tab=contacts", {
      scroll: false,
    });
  });

  it("keeps the overview filter action compact on the trailing edge", () => {
    render(
      <AdminOnboardingFilters
        navigation={parseAdminOnboardingNavigation({ tab: "overview" })}
        catalog={catalog}
        variant="overview"
      />,
    );

    expect(screen.getByRole("button", { name: "Filtrar" })).toHaveClass(
      "sm:w-fit",
      "sm:justify-self-end",
    );
  });

  it("allows long active-filter labels to shrink on narrow screens", () => {
    const longSegmentName =
      "Alimentação artesanal e experiências gastronômicas personalizadas";
    render(
      <AdminOnboardingFilters
        navigation={parseAdminOnboardingNavigation({
          tab: "contacts",
          segmentId: "1",
        })}
        catalog={[{ ...catalog[0], name: longSegmentName }]}
      />,
    );

    const removeButton = screen.getByRole("button", {
      name: `Remover segmento ${longSegmentName}`,
    });
    expect(removeButton).toHaveClass("max-w-full", "min-w-0");
    expect(removeButton.querySelector("span")).toHaveClass("truncate");
  });
});
