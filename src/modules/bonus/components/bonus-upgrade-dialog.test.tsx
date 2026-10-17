import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BonusUpgradeDialog } from "./bonus-upgrade-dialog";

describe("BonusUpgradeDialog", () => {
  it("explains the permanent subscriber benefit and links to plans", () => {
    render(<BonusUpgradeDialog open onOpenChange={vi.fn()} />);

    expect(
      screen.getByRole("heading", {
        name: "Desbloqueie seus bônus permanentes",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(/continuam disponíveis mesmo se você não renovar/i),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Conhecer os planos" }),
    ).toHaveAttribute("href", "/billing");
    expect(screen.getByRole("dialog").className).toContain("motion-reduce:");
  });

  it("closes through the secondary action", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<BonusUpgradeDialog open onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: "Agora não" }));

    expect(onOpenChange).toHaveBeenCalledOnce();
    expect(onOpenChange.mock.calls[0]?.[0]).toBe(false);
  });
});
