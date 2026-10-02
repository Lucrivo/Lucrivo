"use client";

import Link from "next/link";
import { useEffect, type ComponentProps, type MouseEvent } from "react";

const FOCUS_SCROLL_FLAG = "lucrivo:dashboard-scroll-to-focus";
const FOCUS_SECTION_SELECTOR = "[data-dashboard-section='report-focus']";

function prefersReducedMotion() {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
}

function scrollToDashboardFocus() {
  document.querySelector<HTMLElement>(FOCUS_SECTION_SELECTOR)?.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
}

function markDashboardFocusScroll() {
  try {
    sessionStorage.setItem(FOCUS_SCROLL_FLAG, "1");
  } catch {
    return;
  }
}

function consumeDashboardFocusScrollFlag() {
  try {
    if (sessionStorage.getItem(FOCUS_SCROLL_FLAG) !== "1") return false;
    sessionStorage.removeItem(FOCUS_SCROLL_FLAG);
    return true;
  } catch {
    return false;
  }
}

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

function DashboardFocusScroll({
  focusReportId,
}: {
  focusReportId: number | null;
}) {
  useEffect(() => {
    if (!consumeDashboardFocusScrollFlag()) return;
    scrollToDashboardFocus();
  }, [focusReportId]);

  return null;
}

function DashboardFocusLink({
  selected = false,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { selected?: boolean }) {
  return (
    <Link
      scroll={false}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (isModifiedClick(event)) return;
        if (selected) {
          scrollToDashboardFocus();
          return;
        }
        markDashboardFocusScroll();
      }}
    />
  );
}

export {
  DashboardFocusLink,
  DashboardFocusScroll,
  markDashboardFocusScroll,
  scrollToDashboardFocus,
};
