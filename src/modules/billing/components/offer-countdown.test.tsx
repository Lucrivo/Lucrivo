import { act, render, screen, within } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { OfferCountdown } from "./offer-countdown";

describe("OfferCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T12:00:00.000Z"));
    refresh.mockClear();
  });

  afterEach(() => vi.useRealTimers());

  it("hydrates safely when the server and browser observe different seconds", async () => {
    const markup = renderToString(
      <OfferCountdown endsAt="2026-10-20T12:00:02.000Z" />,
    );
    const host = document.createElement("div");
    host.innerHTML = markup;
    document.body.append(host);
    vi.setSystemTime(new Date("2026-10-20T12:00:01.000Z"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const root = hydrateRoot(
      host,
      <OfferCountdown endsAt="2026-10-20T12:00:02.000Z" />,
    );
    await act(async () => {});

    expect(consoleError.mock.calls.flat().join(" ")).not.toContain(
      "Hydration failed",
    );

    await act(async () => root.unmount());
    consoleError.mockRestore();
    host.remove();
  });

  it("shows stable deadline context and hides ticking digits from assistive technology", () => {
    const { container } = render(
      <OfferCountdown endsAt="2026-10-21T14:03:04.000Z" />,
    );

    const region = screen.getByRole("region", {
      name: "Tempo restante da oferta de lançamento",
    });
    const digits = container.querySelector("[data-countdown-digits]");
    expect(digits).not.toBeNull();
    expect(within(digits as HTMLElement).getByText("1")).toBeVisible();
    expect(within(digits as HTMLElement).getByText("dia")).toBeVisible();
    expect(within(digits as HTMLElement).getByText("02")).toBeVisible();
    expect(within(digits as HTMLElement).getByText("horas")).toBeVisible();
    expect(within(digits as HTMLElement).getByText("03")).toBeVisible();
    expect(within(digits as HTMLElement).getByText("min")).toBeVisible();
    expect(within(digits as HTMLElement).getByText("04")).toBeVisible();
    expect(within(digits as HTMLElement).getByText("seg")).toBeVisible();
    expect(
      screen.getByText(/Oferta válida até 21 de outubro de 2026/),
    ).toHaveClass("sr-only");
    expect(container.querySelector("[data-countdown-digits]")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(region.querySelector('[aria-live="polite"]')).toHaveTextContent(
      /Oferta válida até/,
    );
  });

  it("runs the expiry transition exactly once", () => {
    const onExpire = vi.fn();
    const { rerender } = render(
      <OfferCountdown endsAt="2026-10-20T12:00:02.000Z" onExpire={onExpire} />,
    );

    act(() => vi.advanceTimersByTime(3_000));
    expect(
      screen.getByText("Oferta encerrada", { selector: "strong" }),
    ).toBeInTheDocument();
    expect(onExpire).toHaveBeenCalledOnce();

    act(() => vi.advanceTimersByTime(5_000));
    rerender(
      <OfferCountdown endsAt="2026-10-20T12:00:02.000Z" onExpire={onExpire} />,
    );
    expect(onExpire).toHaveBeenCalledOnce();
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each(["not-a-date", "2026-10-20T11:59:59.000Z"])(
    "renders an ended state for %s",
    (endsAt) => {
      render(<OfferCountdown endsAt={endsAt} />);
      expect(
        screen.getByText("Oferta encerrada", { selector: "strong" }),
      ).toBeInTheDocument();
    },
  );

  it("uses router refresh as the default expiry action", () => {
    render(<OfferCountdown endsAt="2026-10-20T12:00:01.000Z" />);
    act(() => vi.advanceTimersByTime(2_000));
    expect(refresh).toHaveBeenCalledOnce();
  });
});
