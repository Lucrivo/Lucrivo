import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OnboardingData } from "../onboarding.schema";

const { refresh, replace } = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace }),
}));

vi.mock("../actions/save-onboarding-profile.action", () => ({
  saveOnboardingProfile: vi.fn(),
}));

import { OnboardingForm } from "./onboarding-form";

const catalog: OnboardingData["catalog"] = [
  {
    id: 1,
    name: "Alimentação",
    sortOrder: 10,
    isActive: true,
    subcategories: [
      {
        id: 11,
        segmentId: 1,
        name: "Confeitaria",
        sortOrder: 10,
        isActive: true,
      },
    ],
  },
  {
    id: 2,
    name: "Beleza",
    sortOrder: 20,
    isActive: false,
    subcategories: [
      {
        id: 21,
        segmentId: 2,
        name: "Salão de beleza",
        sortOrder: 10,
        isActive: false,
      },
      {
        id: 22,
        segmentId: 2,
        name: "Estética arquivada",
        sortOrder: 20,
        isActive: false,
      },
    ],
  },
  {
    id: 3,
    name: "Tecnologia arquivada",
    sortOrder: 30,
    isActive: false,
    subcategories: [],
  },
];

const emptyData: OnboardingData = { catalog, profile: null };
const accountData: OnboardingData = {
  catalog,
  profile: {
    fullName: "Maria da Silva",
    whatsappE164: "+5511999999999",
    segmentId: 2,
    segmentName: "Beleza",
    segmentIsActive: false,
    subcategoryId: 21,
    subcategoryName: "Salão de beleza",
    subcategoryIsActive: false,
    customSubcategory: null,
    whatsappMarketingConsent: true,
    marketingConsentGrantedAt: "2026-10-09T12:00:00Z",
    completedAt: "2026-10-09T12:00:00Z",
    updatedAt: "2026-10-09T12:00:00Z",
    version: 4,
  },
};

describe("OnboardingForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the approved copy and semantic field order", () => {
    render(
      <OnboardingForm data={emptyData} mode="onboarding" action={vi.fn()} />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Conte um pouco sobre o seu negócio",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Leva menos de um minuto. Essas informações ajudam o Lucrivo a tornar suas análises mais relevantes para a sua realidade.",
      ),
    ).toBeInTheDocument();

    const controls = [
      screen.getByLabelText("Nome"),
      screen.getByLabelText("WhatsApp"),
      screen.getByLabelText("Segmento principal"),
      screen.getByLabelText("Subcategoria"),
      screen.getByRole("checkbox"),
    ];
    for (let index = 1; index < controls.length; index += 1) {
      expect(
        controls[index - 1].compareDocumentPosition(controls[index]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it("limits subcategories to the active selected segment and clears on change", async () => {
    const user = userEvent.setup();
    render(
      <OnboardingForm data={emptyData} mode="onboarding" action={vi.fn()} />,
    );

    const segment = screen.getByLabelText("Segmento principal");
    const subcategory = screen.getByLabelText("Subcategoria");
    expect(subcategory).toBeDisabled();

    await user.selectOptions(segment, "1");
    expect(subcategory).toBeEnabled();
    expect(
      screen.getByRole("option", { name: "Confeitaria" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Salão de beleza" }),
    ).not.toBeInTheDocument();

    await user.selectOptions(subcategory, "11");
    await user.selectOptions(segment, "");
    expect(subcategory).toHaveValue("");
    expect(
      screen.getByText("A subcategoria foi limpa após a troca de segmento."),
    ).toBeInTheDocument();
  });

  it("reveals the bounded required custom field for Outro", async () => {
    const user = userEvent.setup();
    render(
      <OnboardingForm data={emptyData} mode="onboarding" action={vi.fn()} />,
    );

    await user.selectOptions(screen.getByLabelText("Segmento principal"), "1");
    await user.selectOptions(screen.getByLabelText("Subcategoria"), "other");

    expect(screen.getByLabelText("Qual é a sua subcategoria?")).toHaveAttribute(
      "required",
    );
    expect(screen.getByLabelText("Qual é a sua subcategoria?")).toHaveAttribute(
      "maxlength",
      "80",
    );
  });

  it("starts in Brazil with marketing consent unchecked", () => {
    render(
      <OnboardingForm data={emptyData} mode="onboarding" action={vi.fn()} />,
    );

    expect(
      screen.getByRole("combobox", { name: "País do WhatsApp" }),
    ).toHaveTextContent("BR");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("focuses the alert summary after invalid submission", async () => {
    const action = vi.fn().mockResolvedValue({
      status: "invalid",
      fieldErrors: { fullName: ["Informe seu nome completo."] },
    });
    render(
      <OnboardingForm data={emptyData} mode="onboarding" action={action} />,
    );

    fireEvent.submit(screen.getByTestId("onboarding-form"));

    const alert = await screen.findByRole("alert");
    await waitFor(() => expect(alert).toHaveFocus());
    expect(alert).toHaveTextContent("Informe seu nome completo.");
  });

  it("preserves entered values when the catalog changes during submission", async () => {
    const action = vi.fn().mockResolvedValue({ status: "catalog_inactive" });
    render(
      <OnboardingForm data={emptyData} mode="onboarding" action={action} />,
    );

    const name = screen.getByLabelText("Nome");
    await userEvent.type(name, "Valor preservado");
    fireEvent.submit(screen.getByTestId("onboarding-form"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A opção escolhida não está mais disponível",
    );
    expect(name).toHaveValue("Valor preservado");
  });

  it("retains only the exact archived account selection", () => {
    render(
      <OnboardingForm data={accountData} mode="account" action={vi.fn()} />,
    );

    expect(
      screen.getByRole("option", { name: "Beleza — Arquivada" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", {
        name: "Tecnologia arquivada — Arquivada",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Salão de beleza — Arquivada" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Estética arquivada — Arquivada" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Esta escolha se aplica ao número de WhatsApp salvo acima.",
      ),
    ).toBeInTheDocument();
  });

  it("continues to quick diagnosis after a saved onboarding profile", async () => {
    const action = vi.fn().mockResolvedValue({ status: "saved", version: 0 });
    render(
      <OnboardingForm data={emptyData} mode="onboarding" action={action} />,
    );

    fireEvent.submit(screen.getByTestId("onboarding-form"));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/quick-diagnosis");
      expect(refresh).toHaveBeenCalled();
    });
  });
});
