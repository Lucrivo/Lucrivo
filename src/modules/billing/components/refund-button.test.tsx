import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { RefundButton } from "./refund-button";

describe("RefundButton", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(
      Response.json({ status: "submitted" }, { status: 202 }),
    );
  });

  it("requires explicit confirmation and explains the consequences", async () => {
    const user = userEvent.setup();
    render(<RefundButton />);

    await user.click(screen.getByRole("button", { name: "Pedir reembolso" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Confirmar reembolso integral?" }),
    ).toBeVisible();
    expect(screen.getByText(/acesso termina imediatamente/i)).toBeVisible();
    expect(screen.getByText(/10 dias úteis/i)).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Confirmar reembolso" }),
    );

    expect(fetchMock).toHaveBeenCalledWith("/api/billing/refund", {
      method: "POST",
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("disables dialog actions while the request is pending", async () => {
    const user = userEvent.setup();
    let resolveRequest!: (response: Response) => void;
    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    render(<RefundButton />);

    await user.click(screen.getByRole("button", { name: "Pedir reembolso" }));
    await user.click(
      screen.getByRole("button", { name: "Confirmar reembolso" }),
    );

    expect(screen.getByRole("button", { name: "Voltar" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Solicitando..." }),
    ).toBeDisabled();
    resolveRequest(Response.json({ status: "submitted" }, { status: 202 }));
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });

  it.each([
    [409, /não está disponível/i],
    [422, /não aceitou/i],
    [503, /precisa ser conferida/i],
  ])("shows safe feedback for HTTP %s", async (status, message) => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      Response.json({ error: "private-provider-detail" }, { status }),
    );
    render(<RefundButton />);

    await user.click(screen.getByRole("button", { name: "Pedir reembolso" }));
    await user.click(
      screen.getByRole("button", { name: "Confirmar reembolso" }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(message);
    expect(alert).not.toHaveTextContent("private-provider-detail");
  });
});
