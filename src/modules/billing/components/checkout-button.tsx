"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

import type { BillingPaymentMethod } from "../types";

const checkoutHosts = new Set([
  "sandbox.asaas.com",
  "www.asaas.com",
  "asaas.com",
]);

type CheckoutButtonProps = {
  priceId: string;
  paymentMethod: BillingPaymentMethod;
  children: ReactNode;
  className?: string;
  navigate?: (checkoutUrl: string) => void;
};

function isSafeCheckoutUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      checkoutHosts.has(url.hostname)
    );
  } catch {
    return false;
  }
}

function navigateWindow(checkoutUrl: string) {
  window.location.assign(checkoutUrl);
}

function CheckoutButton({
  priceId,
  paymentMethod,
  children,
  className,
  navigate = navigateWindow,
}: CheckoutButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function openCheckout() {
    if (pending) return;

    setPending(true);
    setError(false);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, paymentMethod }),
      });
      const body: unknown = await response.json();
      const checkoutUrl =
        typeof body === "object" && body !== null && "checkoutUrl" in body
          ? body.checkoutUrl
          : null;

      if (!response.ok || !isSafeCheckoutUrl(checkoutUrl)) {
        throw new Error("unsafe_checkout_response");
      }

      navigate(checkoutUrl);
    } catch {
      setError(true);
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        className={className}
        disabled={pending}
        onClick={openCheckout}
      >
        {pending ? "Abrindo checkout..." : children}
      </Button>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          Não foi possível abrir o checkout. Tente novamente.
        </p>
      ) : null}
    </div>
  );
}

export { CheckoutButton };
export type { CheckoutButtonProps };
