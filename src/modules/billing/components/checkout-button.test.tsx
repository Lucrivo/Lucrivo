import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CheckoutButton } from "./checkout-button";

describe("CheckoutButton", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const navigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          checkoutUrl: "https://sandbox.asaas.com/checkoutSession/abc",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
  });

  it("sends only the public price and payment method before navigating", async () => {
    const user = userEvent.setup();
    render(
      <CheckoutButton
        priceId="11111111-1111-4111-8111-111111111111"
        paymentMethod="credit_card"
        navigate={navigate}
      >
        Assinar no cartão
      </CheckoutButton>,
    );

    await user.click(screen.getByRole("button", { name: "Assinar no cartão" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceId: "11111111-1111-4111-8111-111111111111",
        paymentMethod: "credit_card",
      }),
    });
    expect(navigate).toHaveBeenCalledWith(
      "https://sandbox.asaas.com/checkoutSession/abc",
    );
  });

  it("stays disabled while checkout creation is pending", async () => {
    let resolveResponse!: (response: Response) => void;
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }),
    );
    const user = userEvent.setup();

    render(
      <CheckoutButton
        priceId="11111111-1111-4111-8111-111111111111"
        paymentMethod="pix"
        navigate={navigate}
      >
        Pagar com Pix
      </CheckoutButton>,
    );

    await user.click(screen.getByRole("button", { name: "Pagar com Pix" }));
    expect(
      screen.getByRole("button", { name: "Abrindo checkout..." }),
    ).toBeDisabled();

    resolveResponse(
      new Response(
        JSON.stringify({ checkoutUrl: "https://www.asaas.com/c/abc" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  });

  it("rejects an unexpected checkout destination", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ checkoutUrl: "https://evil.test/phish" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const user = userEvent.setup();

    render(
      <CheckoutButton
        priceId="11111111-1111-4111-8111-111111111111"
        paymentMethod="pix"
        navigate={navigate}
      >
        Pagar com Pix
      </CheckoutButton>,
    );
    await user.click(screen.getByRole("button", { name: "Pagar com Pix" }));

    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível abrir o checkout",
    );
  });
});
