import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { CancelSubscriptionButton } from "./cancel-subscription-button";

describe("CancelSubscriptionButton", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "canceled",
          accessEndsAt: "2026-10-10T12:00:00.000Z",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  });

  it("requires confirmation and explains the exact paid-access end date", async () => {
    const user = userEvent.setup();
    render(
      <CancelSubscriptionButton accessEndsAt="2026-10-10T12:00:00.000Z" />,
    );

    await user.click(
      screen.getByRole("button", { name: "Cancelar renovação" }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Cancelar renovação mensal?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Seu acesso continua disponível até 10 de outubro de 2026/i,
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Confirmar cancelamento" }),
    );

    expect(fetchMock).toHaveBeenCalledWith("/api/billing/cancel", {
      method: "POST",
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("disables both dialog actions while the request is pending", async () => {
    fetchMock.mockReturnValue(new Promise<Response>(() => undefined));
    const user = userEvent.setup();
    render(
      <CancelSubscriptionButton accessEndsAt="2026-10-10T12:00:00.000Z" />,
    );

    await user.click(
      screen.getByRole("button", { name: "Cancelar renovação" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirmar cancelamento" }),
    );

    expect(
      screen.getByRole("button", { name: "Cancelando..." }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Voltar" })).toBeDisabled();
  });
});
