import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import QuickDiagnosisLoading from "./loading";

describe("QuickDiagnosisLoading", () => {
  it("reserves the initial diagnosis wizard structure", () => {
    const { container } = render(<QuickDiagnosisLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Preparando seu diagnóstico...",
    );
    expect(screen.getByLabelText("Preparando diagnóstico")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(
      container.querySelectorAll('[data-skeleton-kind="diagnosis-option"]'),
    ).toHaveLength(3);
  });
});
