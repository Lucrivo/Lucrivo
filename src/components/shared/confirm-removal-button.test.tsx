import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConfirmRemovalButton } from "./confirm-removal-button";

const props = {
  ariaLabel: "Remover Farinha",
  tooltip: "Remover ingrediente",
  title: "Remover Farinha?",
  description:
    "Os valores preenchidos para Farinha serão removidos desta ficha técnica.",
  confirmLabel: "Remover ingrediente" as const,
};

describe("ConfirmRemovalButton", () => {
  it("requires confirmation, cancels without mutation, and restores trigger focus", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmRemovalButton {...props} onConfirm={onConfirm} />);

    const trigger = screen.getByRole("button", { name: "Remover Farinha" });
    await user.click(trigger);

    expect(onConfirm).not.toHaveBeenCalled();
    expect(
      screen.getByRole("alertdialog", { name: "Remover Farinha?" }),
    ).toBeVisible();
    expect(screen.getByText(props.description)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(trigger);
    await user.click(
      screen.getByRole("button", { name: "Remover ingrediente" }),
    );
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("opens from the keyboard", async () => {
    const user = userEvent.setup();
    render(<ConfirmRemovalButton {...props} onConfirm={vi.fn()} />);

    await user.tab();
    expect(
      screen.getByRole("button", { name: "Remover Farinha" }),
    ).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(
      screen.getByRole("alertdialog", { name: "Remover Farinha?" }),
    ).toBeVisible();
  });

  it("explains a disabled removal through its wrapper tooltip", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmRemovalButton
        {...props}
        disabled
        disabledReason="Mantenha pelo menos um ingrediente."
        onConfirm={onConfirm}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Remover Farinha" });
    const wrapper = screen.getByRole("group", {
      name: "Remover Farinha. Mantenha pelo menos um ingrediente.",
    });

    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    await user.hover(wrapper);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Mantenha pelo menos um ingrediente.",
    );
    await user.tab();
    expect(wrapper).toHaveFocus();
    expect(trigger).not.toHaveFocus();
  });
});
