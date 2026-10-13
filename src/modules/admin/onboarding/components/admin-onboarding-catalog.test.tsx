import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { changeBusinessCatalog, refresh } = vi.hoisted(() => ({
  changeBusinessCatalog: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("../change-business-catalog.action", () => ({
  changeBusinessCatalog,
}));

import type { AdminBusinessCatalog } from "../admin-onboarding.schema";
import { AdminOnboardingCatalog } from "./admin-onboarding-catalog";

const catalog: AdminBusinessCatalog = [
  {
    id: 1,
    name: "Alimentação",
    sortOrder: 10,
    isActive: true,
    version: 2,
    subcategories: [
      {
        id: 11,
        segmentId: 1,
        name: "Confeitaria",
        sortOrder: 20,
        isActive: true,
        version: 4,
      },
    ],
  },
  {
    id: 2,
    name: "Tecnologia",
    sortOrder: 30,
    isActive: false,
    version: 1,
    subcategories: [],
  },
];

describe("AdminOnboardingCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    changeBusinessCatalog.mockResolvedValue({ status: "saved", item: {} });
  });

  it("renders hierarchical catalog operations without delete or editable Outro", async () => {
    const user = userEvent.setup();
    render(<AdminOnboardingCatalog catalog={catalog} />);

    expect(
      screen.getByRole("heading", { name: "Catálogo de negócios" }),
    ).toBeVisible();
    expect(screen.getByText("Outro").closest("p")).toHaveTextContent(
      /Outro é oferecida automaticamente/i,
    );
    expect(screen.getByText("Arquivado")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /excluir|remover/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /editar Outro/i }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Alimentação.*1 subcategoria/i }),
    );
    expect(screen.getByText("Confeitaria")).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Nova subcategoria em Alimentação",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Editar subcategoria Confeitaria",
      }),
    ).toBeVisible();
  });

  it("creates a bounded segment, exposes pending state, and refreshes on save", async () => {
    const user = userEvent.setup();
    let resolveMutation:
      ((value: { status: "saved"; item: object }) => void) | undefined;
    changeBusinessCatalog.mockReturnValue(
      new Promise((resolve) => {
        resolveMutation = resolve;
      }),
    );
    render(<AdminOnboardingCatalog catalog={catalog} />);

    await user.click(screen.getByRole("button", { name: "Novo segmento" }));
    const dialog = screen.getByRole("dialog", { name: "Novo segmento" });
    const name = within(dialog).getByRole("textbox", { name: "Nome" });
    const order = within(dialog).getByRole("spinbutton", { name: "Ordem" });
    expect(name).toHaveAttribute("maxlength", "60");
    expect(order).toHaveAttribute("min", "0");
    expect(order).toHaveAttribute("max", "10000");
    expect(
      within(dialog).getByRole("switch", { name: "Criar como ativo" }),
    ).toBeChecked();

    await user.type(name, "  Artesanato   local  ");
    await user.clear(order);
    await user.type(order, "40");
    await user.click(
      within(dialog).getByRole("button", { name: "Criar segmento" }),
    );

    expect(changeBusinessCatalog).toHaveBeenCalledWith({
      kind: "segment",
      id: null,
      name: "  Artesanato   local  ",
      sortOrder: 40,
      isActive: true,
      expectedVersion: null,
    });
    expect(
      within(dialog).getByRole("button", { name: "Salvando…" }),
    ).toBeDisabled();

    await act(async () => {
      resolveMutation?.({ status: "saved", item: {} });
    });
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });

  it("keeps edited values on conflict and sends the optimistic version", async () => {
    const user = userEvent.setup();
    changeBusinessCatalog.mockResolvedValue({ status: "conflict" });
    render(<AdminOnboardingCatalog catalog={catalog} />);

    await user.click(
      screen.getByRole("button", { name: "Editar segmento Alimentação" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Editar segmento" });
    const name = within(dialog).getByRole("textbox", { name: "Nome" });
    await user.clear(name);
    await user.type(name, "Alimentação e bebidas");
    await user.click(
      within(dialog).getByRole("button", { name: "Salvar alterações" }),
    );

    expect(changeBusinessCatalog).toHaveBeenCalledWith({
      kind: "segment",
      id: 1,
      name: "Alimentação e bebidas",
      sortOrder: 10,
      isActive: true,
      expectedVersion: 2,
    });
    expect(
      await within(dialog).findByText(
        "Atualize a página para carregar a versão mais recente.",
      ),
    ).toBeVisible();
    expect(name).toHaveValue("Alimentação e bebidas");
  });

  it("creates and edits subcategories with the immutable segment id", async () => {
    const user = userEvent.setup();
    render(<AdminOnboardingCatalog catalog={catalog} />);
    await user.click(
      screen.getByRole("button", { name: /Alimentação.*1 subcategoria/i }),
    );

    await user.click(
      screen.getByRole("button", { name: "Nova subcategoria em Alimentação" }),
    );
    let dialog = screen.getByRole("dialog", { name: "Nova subcategoria" });
    expect(
      within(dialog).getByRole("textbox", { name: "Nome" }),
    ).toHaveAttribute("maxlength", "80");
    await user.type(
      within(dialog).getByRole("textbox", { name: "Nome" }),
      "Padaria",
    );
    await user.clear(within(dialog).getByRole("spinbutton", { name: "Ordem" }));
    await user.type(
      within(dialog).getByRole("spinbutton", { name: "Ordem" }),
      "25",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Criar subcategoria" }),
    );
    expect(changeBusinessCatalog).toHaveBeenLastCalledWith({
      kind: "subcategory",
      id: null,
      segmentId: 1,
      name: "Padaria",
      sortOrder: 25,
      isActive: true,
      expectedVersion: null,
    });

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await user.click(
      screen.getByRole("button", { name: "Editar subcategoria Confeitaria" }),
    );
    dialog = screen.getByRole("dialog", { name: "Editar subcategoria" });
    await user.click(
      within(dialog).getByRole("button", { name: "Salvar alterações" }),
    );
    expect(changeBusinessCatalog).toHaveBeenLastCalledWith({
      kind: "subcategory",
      id: 11,
      segmentId: 1,
      name: "Confeitaria",
      sortOrder: 20,
      isActive: true,
      expectedVersion: 4,
    });
  });

  it("shows duplicate feedback inline", async () => {
    const user = userEvent.setup();
    changeBusinessCatalog.mockResolvedValue({ status: "duplicate" });
    render(<AdminOnboardingCatalog catalog={catalog} />);
    await user.click(screen.getByRole("button", { name: "Novo segmento" }));
    const dialog = screen.getByRole("dialog", { name: "Novo segmento" });
    await user.type(
      within(dialog).getByRole("textbox", { name: "Nome" }),
      "Tecnologia",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Criar segmento" }),
    );
    expect(
      await within(dialog).findByText("Já existe um item com esse nome."),
    ).toBeVisible();
  });

  it("confirms archive and restore while returning focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<AdminOnboardingCatalog catalog={catalog} />);
    const archive = screen.getByRole("button", {
      name: "Arquivar segmento Alimentação",
    });

    await user.click(archive);
    expect(
      screen.getByRole("alertdialog", { name: "Arquivar segmento?" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(archive).toHaveFocus());

    await user.click(archive);
    await user.click(screen.getByRole("button", { name: "Arquivar segmento" }));
    expect(changeBusinessCatalog).toHaveBeenLastCalledWith({
      kind: "segment",
      id: 1,
      name: "Alimentação",
      sortOrder: 10,
      isActive: false,
      expectedVersion: 2,
    });

    const restore = screen.getByRole("button", {
      name: "Restaurar segmento Tecnologia",
    });
    await user.click(restore);
    expect(
      screen.getByRole("alertdialog", { name: "Restaurar segmento?" }),
    ).toBeVisible();
  });
});
