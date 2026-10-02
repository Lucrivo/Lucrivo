import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DashboardFocusLink,
  DashboardFocusScroll,
} from "./dashboard-focus-navigation";

const FOCUS_SCROLL_FLAG = "lucrivo:dashboard-scroll-to-focus";

describe("dashboard focus navigation", () => {
  beforeEach(() => {
    sessionStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("keeps the current scroll when focusing another report, then scrolls after it loads", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <div>
        <DashboardFocusLink href="/dashboard?report=41">
          Selecionar
        </DashboardFocusLink>
        <DashboardFocusScroll focusReportId={42} />
        <section data-dashboard-section="report-focus">Detalhes</section>
      </div>,
    );

    await user.click(screen.getByRole("link", { name: "Selecionar" }));

    expect(sessionStorage.getItem(FOCUS_SCROLL_FLAG)).toBe("1");
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();

    rerender(
      <div>
        <DashboardFocusLink href="/dashboard?report=41">
          Selecionar
        </DashboardFocusLink>
        <DashboardFocusScroll focusReportId={41} />
        <section data-dashboard-section="report-focus">Detalhes</section>
      </div>,
    );

    expect(sessionStorage.getItem(FOCUS_SCROLL_FLAG)).toBeNull();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });

  it("scrolls immediately when the already selected report is chosen again", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <DashboardFocusLink href="/dashboard?report=42" selected>
          Diagnóstico de Produto
        </DashboardFocusLink>
        <section data-dashboard-section="report-focus">Detalhes</section>
      </div>,
    );

    await user.click(
      screen.getByRole("link", { name: "Diagnóstico de Produto" }),
    );

    expect(sessionStorage.getItem(FOCUS_SCROLL_FLAG)).toBeNull();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });

  it("does not steal the scroll position after a filter change", () => {
    render(
      <div>
        <DashboardFocusScroll focusReportId={42} />
        <section data-dashboard-section="report-focus">Detalhes</section>
      </div>,
    );

    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});
