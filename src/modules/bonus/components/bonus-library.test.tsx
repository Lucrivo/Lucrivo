import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { BonusMaterialView } from "../services/get-bonus-library.service";
import { BonusLibrary } from "./bonus-library";

const availableMaterials: BonusMaterialView[] = [
  {
    slug: "ebook",
    typeLabel: "E-book",
    title: "E-book de gestão financeira",
    description: "Descrição do e-book.",
    delivery: "new_tab",
    access: "available",
    availability: "ready",
  },
  {
    slug: "guide",
    typeLabel: "Guia",
    title: "Guia prático para organizar o negócio",
    description: "Descrição do guia.",
    delivery: "new_tab",
    access: "available",
    availability: "ready",
  },
  {
    slug: "cash-flow",
    typeLabel: "Planilha",
    title: "Planilha de controle de fluxo de caixa",
    description: "Descrição da planilha.",
    delivery: "download",
    access: "available",
    availability: "ready",
  },
];

const freeMaterials: BonusMaterialView[] = availableMaterials.map(
  (material) =>
    material.slug === "ebook"
      ? material
      : { ...material, access: "locked" as const },
);

describe("BonusLibrary", () => {
  it("shows every material and the free access summary", () => {
    render(
      <BonusLibrary
        materials={freeMaterials}
        unlockedCount={1}
        hasPermanentAccess={false}
        notice={null}
      />,
    );

    expect(screen.getByText("1 de 3 materiais liberados")).toBeVisible();
    for (const material of freeMaterials) {
      expect(
        screen.getByRole("heading", { name: material.title }),
      ).toBeVisible();
    }
    expect(
      screen.getByRole("link", {
        name: /ler e baixar.*abre em nova aba/i,
      }),
    ).toHaveAttribute("href", "/api/bonus/ebook");
    expect(
      screen.getByRole("link", {
        name: /ler e baixar.*abre em nova aba/i,
      }),
    ).toHaveAttribute("target", "_blank");
  });

  it("shows permanent access and downloads the entitled spreadsheet", () => {
    render(
      <BonusLibrary
        materials={availableMaterials}
        unlockedCount={3}
        hasPermanentAccess
        notice={null}
      />,
    );

    expect(screen.getByText("3 de 3 materiais liberados")).toBeVisible();
    expect(screen.getAllByText("Seu para sempre")).toHaveLength(2);
    const spreadsheet = screen
      .getByRole("heading", {
        name: "Planilha de controle de fluxo de caixa",
      })
      .closest("article");
    expect(spreadsheet).not.toBeNull();
    const download = within(spreadsheet!).getByRole("link", {
      name: "Baixar planilha",
    });
    expect(download).toHaveAttribute("href", "/api/bonus/cash-flow");
    expect(download).not.toHaveAttribute("target");
  });

  it("opens the upgrade dialog from a locked action", async () => {
    const user = userEvent.setup();
    render(
      <BonusLibrary
        materials={freeMaterials}
        unlockedCount={1}
        hasPermanentAccess={false}
        notice={null}
      />,
    );

    const lockedActions = screen.getAllByRole("button", {
      name: "Desbloquear bônus",
    });
    expect(lockedActions).toHaveLength(2);
    await user.click(lockedActions[0]);

    expect(
      screen.getByRole("heading", {
        name: "Desbloqueie seus bônus permanentes",
      }),
    ).toBeVisible();
  });

  it.each([
    ["preparing", "Material em preparação"],
    ["unavailable", "Tente novamente mais tarde"],
  ] as const)("disables actions for %s materials", (availability, label) => {
    render(
      <BonusLibrary
        materials={availableMaterials.map((material) => ({
          ...material,
          availability,
        }))}
        unlockedCount={3}
        hasPermanentAccess
        notice={null}
      />,
    );

    const actions = screen.getAllByRole("button", { name: label });
    expect(actions).toHaveLength(3);
    for (const action of actions) expect(action).toBeDisabled();
  });

  it.each([
    ["locked", "Assine para liberar o guia e a planilha."],
    ["preparing", "O material ainda está sendo preparado."],
    ["unavailable", "Não foi possível acessar o material agora."],
  ] as const)("renders the %s route notice as a status alert", (notice, copy) => {
    render(
      <BonusLibrary
        materials={freeMaterials}
        unlockedCount={1}
        hasPermanentAccess={false}
        notice={notice}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(copy);
  });

  it("uses icon and text labels for every material state", () => {
    render(
      <BonusLibrary
        materials={freeMaterials}
        unlockedCount={1}
        hasPermanentAccess={false}
        notice={null}
      />,
    );

    expect(screen.getAllByText("Exclusivo para assinantes")).toHaveLength(2);
    expect(screen.getByText("Liberado")).toBeVisible();
  });
});
