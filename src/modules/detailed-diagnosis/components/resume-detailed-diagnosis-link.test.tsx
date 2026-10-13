import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { ResumeDetailedDiagnosisLink } from "./resume-detailed-diagnosis-link";
import {
  readDetailedDiagnosisIntent,
  saveDetailedDiagnosisIntent,
} from "../services/detailed-diagnosis-intent";

const userId = "user-1";

describe("ResumeDetailedDiagnosisLink", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("renders the quick diagnosis link when no valid intent exists", async () => {
    render(<ResumeDetailedDiagnosisLink userId={userId} />);

    const link = await screen.findByRole("link", { name: "Fazer diagnóstico" });
    expect(link).toBeVisible();
    expect(link).toHaveAttribute("href", "/quick-diagnosis");
  });

  it("resumes a product intent and clears it when the link is clicked", async () => {
    saveDetailedDiagnosisIntent(window.sessionStorage, {
      userId,
      category: "product",
      now: Date.now(),
    });

    render(<ResumeDetailedDiagnosisLink userId={userId} />);

    const link = await screen.findByRole("link", {
      name: "Continuar diagnóstico detalhado",
    });
    expect(link).toHaveAttribute(
      "href",
      "/quick-diagnosis?resume=detailed&category=product",
    );

    await userEvent.click(link);

    expect(
      readDetailedDiagnosisIntent(window.sessionStorage, userId),
    ).toBeNull();
  });

  it("falls back when the stored intent belongs to another user", async () => {
    saveDetailedDiagnosisIntent(window.sessionStorage, {
      userId: "user-2",
      category: "production",
      now: Date.now(),
    });

    render(<ResumeDetailedDiagnosisLink userId={userId} />);

    const link = await screen.findByRole("link", { name: "Fazer diagnóstico" });
    expect(link).toHaveAttribute("href", "/quick-diagnosis");
  });
});
