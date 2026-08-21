import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { remove, renderWidget, reset } = vi.hoisted(() => ({
  remove: vi.fn(),
  renderWidget: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("next/script", () => ({
  default: ({ onReady }: { onReady: () => void }) => (
    <button data-testid="turnstile-script" onClick={onReady} />
  ),
}));

import { TurnstileField } from "./turnstile-field";

describe("TurnstileField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    renderWidget.mockReturnValue("widget-id");
    window.turnstile = { render: renderWidget, remove, reset };
  });

  it("renders explicitly and stores the completed token", () => {
    render(<TurnstileField siteKey="site-key" resetSignal={null} />);

    fireEvent.click(screen.getByTestId("turnstile-script"));
    const options = renderWidget.mock.calls[0][1];
    act(() => options.callback("captcha-token"));

    expect(renderWidget).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({ sitekey: "site-key" }),
    );
    expect(screen.getByDisplayValue("captcha-token")).toHaveAttribute(
      "name",
      "captchaToken",
    );
  });

  it("clears and resets the challenge after an action completes", () => {
    const { rerender } = render(
      <TurnstileField siteKey="site-key" resetSignal={null} />,
    );
    fireEvent.click(screen.getByTestId("turnstile-script"));
    act(() => renderWidget.mock.calls[0][1].callback("captcha-token"));

    rerender(
      <TurnstileField siteKey="site-key" resetSignal={{ status: "error" }} />,
    );

    expect(reset).toHaveBeenCalledWith("widget-id");
    expect(screen.getByDisplayValue("")).toHaveAttribute(
      "name",
      "captchaToken",
    );
  });

  it("clears expired tokens", () => {
    render(<TurnstileField siteKey="site-key" resetSignal={null} />);
    fireEvent.click(screen.getByTestId("turnstile-script"));
    const options = renderWidget.mock.calls[0][1];
    act(() => options.callback("captcha-token"));
    act(() => options["expired-callback"]());

    expect(screen.getByDisplayValue("")).toBeInTheDocument();
  });

  it("fails closed without exposing provider details when the site key is absent", () => {
    render(<TurnstileField siteKey="" resetSignal={null} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Verificação de segurança indisponível",
    );
    expect(screen.queryByTestId("turnstile-script")).not.toBeInTheDocument();
  });
});
