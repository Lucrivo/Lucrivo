import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { PreDiagnosisDialog, storageKey } from "./pre-diagnosis-dialog";

const headline = /Seu preço pode estar\s+dando prejuízo\s+e você nem sabe\./;

describe("PreDiagnosisDialog", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("invites a new visit to start the free diagnosis", async () => {
    render(<PreDiagnosisDialog />);

    const dialog = await screen.findByRole("dialog", { name: headline });

    expect(within(dialog).getByText("Oferta especial")).toBeVisible();
    expect(dialog).toHaveTextContent("diagnóstico gratuito");
    expect(dialog).toHaveTextContent("Quanto sobra de cada venda?");
    expect(within(dialog).getByText("Grátis")).toBeVisible();
    expect(dialog).toHaveTextContent(
      "Descubra informações importantes sobre seu preço em poucos minutos.",
    );
    expect(
      within(dialog).getByRole("img", {
        name: "Exemplo de notebook com o resultado de um diagnóstico no Lucrivo.",
      }),
    ).toBeVisible();
    expect(
      within(dialog).getByRole("link", {
        name: "Quero fazer meu diagnóstico grátis",
      }),
    ).toHaveAttribute("href", "/quick-diagnosis");
    expect(dialog).toHaveTextContent(
      "Gratuito, sem cartão de crédito e com resultado em poucos minutos.",
    );
    expect(dialog).not.toHaveTextContent(/lançamento|R\$ 39,90|R\$ 49,90/i);
    expect(window.sessionStorage.getItem(storageKey)).toBeNull();
  });

  it("stays closed for the rest of the browser session", () => {
    window.sessionStorage.setItem(storageKey, "shown");
    render(<PreDiagnosisDialog />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes from the button and ignores the backdrop", async () => {
    render(<PreDiagnosisDialog />);

    const dialog = await screen.findByRole("dialog", { name: headline });
    const backdrop = document.querySelector('[data-slot="dialog-overlay"]');

    expect(backdrop).not.toBeNull();
    fireEvent.pointerDown(backdrop!);
    fireEvent.click(backdrop!);
    expect(dialog).toBeVisible();

    fireEvent.click(within(dialog).getByRole("button", { name: "Fechar" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(window.sessionStorage.getItem(storageKey)).toBe("shown");
  });
});
