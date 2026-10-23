import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import OnboardingError from "./error";
import OnboardingLoading from "./loading";

describe("onboarding route states", () => {
  it("reserves the form structure while onboarding data loads", () => {
    const { container } = render(<OnboardingLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Preparando os dados do seu negócio...",
    );
    expect(screen.getByLabelText("Carregando onboarding")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(
      container.querySelectorAll('[data-skeleton-kind="onboarding-field"]'),
    ).toHaveLength(4);
  });

  it("offers a safe retry without exposing infrastructure details", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();

    render(<OnboardingError reset={reset} />);

    expect(
      screen.getByRole("heading", {
        name: "Não foi possível carregar esta etapa",
      }),
    ).toBeVisible();
    expect(screen.getByText(/seus dados continuam seguros/i)).toBeVisible();
    expect(
      screen.queryByText(/postgres|supabase|rpc/i),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
