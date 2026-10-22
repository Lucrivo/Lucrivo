import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AdminUserDetail } from "../admin-users.schema";
import { AdminUserProfile } from "./admin-user-profile";

const user: AdminUserDetail = {
  id: "96300000-0000-4000-8000-000000000002",
  email: "ana@example.com",
  fullName: null,
  createdAt: "2026-09-16T12:00:00+00:00",
  onboardingCompletedAt: null,
  lastSignInAt: null,
  segment: null,
  subcategory: null,
  state: "active",
  blockedAt: null,
  deletedAt: null,
  access: "free",
  courtesyExpiresAt: null,
  subscription: null,
  diagnosisCount: 2,
  version: 1,
  hasPaidAccess: false,
};

describe("AdminUserProfile", () => {
  it("shows every approved group and explicit missing-name copy", () => {
    render(<AdminUserProfile user={user} />);

    expect(screen.getByRole("heading", { name: "Identidade" })).toBeVisible();
    expect(screen.getByText("ana@example.com")).toBeVisible();
    expect(screen.getByText("Nome ainda não informado")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Atividade" })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Contexto do negócio" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Conta e acesso" }),
    ).toBeVisible();
  });
});
