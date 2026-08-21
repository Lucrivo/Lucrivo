import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import DesignSystemPage from "@/app/design-system/page";
import { ThemeProvider } from "@/providers/theme-provider";

vi.mock("next/image", () => ({
  default: () => <div data-testid="brand-logo" />,
}));

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe("DesignSystemPage", () => {
  it("opens the actions dropdown with its group context", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <DesignSystemPage />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Ações" }));

    expect(await screen.findByText("Exportar PDF")).toBeVisible();
  });
});
