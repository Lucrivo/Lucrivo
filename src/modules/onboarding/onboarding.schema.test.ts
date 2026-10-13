import { describe, expect, it } from "vitest";

import {
  ONBOARDING_CONSENT_COPY_VERSION,
  businessSegmentSchema,
  onboardingInputSchema,
  onboardingProfileSchema,
  onboardingRpcResultSchema,
} from "./onboarding.schema";

const validInput = {
  fullName: "Maria da Silva",
  whatsappE164: "+5511999999999",
  segmentId: 1,
  subcategoryId: 2,
  customSubcategory: null,
  whatsappMarketingConsent: false,
  expectedVersion: null,
};

function fieldMessages(input: Record<string, unknown>, field: string) {
  const parsed = onboardingInputSchema.safeParse(input);

  expect(parsed.success).toBe(false);
  if (parsed.success) return [];

  return parsed.error.issues
    .filter((issue) => issue.path[0] === field)
    .map((issue) => issue.message);
}

describe("onboardingInputSchema", () => {
  it("accepts the bounded catalog selection contract", () => {
    expect(onboardingInputSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects both subcategory representations", () => {
    expect(
      onboardingInputSchema.safeParse({
        ...validInput,
        customSubcategory: "Confeitaria",
      }).success,
    ).toBe(false);
  });

  it("rejects a missing subcategory representation", () => {
    expect(
      onboardingInputSchema.safeParse({
        ...validInput,
        subcategoryId: null,
      }).success,
    ).toBe(false);
  });

  it("accepts and normalizes exact maximum text lengths", () => {
    const parsed = onboardingInputSchema.safeParse({
      ...validInput,
      fullName: `  ${"a".repeat(120)}  `,
      subcategoryId: null,
      customSubcategory: `  ${"b".repeat(80)}  `,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.fullName).toHaveLength(120);
      expect(parsed.data.customSubcategory).toHaveLength(80);
    }
  });

  it.each([
    { field: "fullName", value: "a" },
    { field: "fullName", value: "a".repeat(121) },
    { field: "segmentId", value: 0 },
    { field: "segmentId", value: 1.2 },
    { field: "subcategoryId", value: -1 },
    { field: "expectedVersion", value: -1 },
    { field: "expectedVersion", value: 1.5 },
    { field: "whatsappE164", value: "11999999999" },
    { field: "whatsappE164", value: "+123" },
  ])("rejects invalid $field values", ({ field, value }) => {
    expect(
      onboardingInputSchema.safeParse({ ...validInput, [field]: value })
        .success,
    ).toBe(false);
  });

  it("rejects a custom subcategory over 80 normalized characters", () => {
    expect(
      onboardingInputSchema.safeParse({
        ...validInput,
        subcategoryId: null,
        customSubcategory: "b".repeat(81),
      }).success,
    ).toBe(false);
  });

  it.each([
    {
      field: "fullName",
      value: undefined,
      message: "Informe seu nome.",
    },
    {
      field: "segmentId",
      value: 0,
      message: "Escolha um segmento principal.",
    },
    {
      field: "segmentId",
      value: 1.2,
      message: "Escolha um segmento principal válido.",
    },
    {
      field: "subcategoryId",
      value: -1,
      message: "Escolha uma subcategoria válida.",
    },
    {
      field: "customSubcategory",
      value: 42,
      message: "Informe uma subcategoria válida.",
    },
    {
      field: "whatsappMarketingConsent",
      value: "yes",
      message: "A escolha de consentimento do WhatsApp é inválida.",
    },
    {
      field: "expectedVersion",
      value: -1,
      message:
        "Os dados do perfil estão desatualizados. Atualize a página e tente novamente.",
    },
  ])(
    "returns a Portuguese message for invalid $field variants",
    ({ field, value, message }) => {
      const input = {
        ...validInput,
        [field]: value,
        ...(field === "customSubcategory" ? { subcategoryId: null } : {}),
      };

      expect(fieldMessages(input, field)).toContain(message);
    },
  );

  it.each([
    {
      value: undefined,
      message: "Informe um WhatsApp válido com código do país.",
    },
    {
      value: "11999999999",
      message: "Informe um WhatsApp válido com código do país.",
    },
    {
      value: "+99999999",
      message: "Informe um número de telefone possível.",
    },
  ])(
    "returns one Portuguese WhatsApp message for $value",
    ({ value, message }) => {
      expect(
        fieldMessages({ ...validInput, whatsappE164: value }, "whatsappE164"),
      ).toEqual([message]);
    },
  );

  it("strictly rejects unknown input keys", () => {
    const parsed = onboardingInputSchema.safeParse({
      ...validInput,
      userId: "spoofed",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.message)).toContain(
        "Os dados enviados são inválidos. Atualize a página e tente novamente.",
      );
    }
  });
});

describe("onboarding RPC schemas", () => {
  it("accepts exact catalog label limits and rejects unknown keys", () => {
    const segment = {
      id: 1,
      name: "s".repeat(60),
      sortOrder: 10,
      isActive: true,
      subcategories: [
        {
          id: 2,
          segmentId: 1,
          name: "c".repeat(80),
          sortOrder: 10,
          isActive: true,
        },
      ],
    };

    expect(businessSegmentSchema.safeParse(segment).success).toBe(true);
    expect(
      businessSegmentSchema.safeParse({ ...segment, extra: true }).success,
    ).toBe(false);
  });

  it("enforces the projected profile subcategory shape", () => {
    const profile = {
      fullName: "Maria da Silva",
      whatsappE164: "+5511999999999",
      segmentId: 1,
      segmentName: "Alimentação",
      segmentIsActive: true,
      subcategoryId: 2,
      subcategoryName: "Confeitaria",
      subcategoryIsActive: true,
      customSubcategory: null,
      whatsappMarketingConsent: true,
      marketingConsentGrantedAt: "2026-10-09T12:00:00Z",
      completedAt: "2026-10-09T12:00:00Z",
      updatedAt: "2026-10-09T12:00:00Z",
      version: 0,
    };

    expect(onboardingProfileSchema.safeParse(profile).success).toBe(true);
    expect(
      onboardingProfileSchema.safeParse({
        ...profile,
        customSubcategory: "Confeitaria artesanal",
      }).success,
    ).toBe(false);
  });

  it("accepts only stable save statuses", () => {
    expect(
      onboardingRpcResultSchema.parse({ status: "saved", version: 3 }),
    ).toEqual({ status: "saved", version: 3 });
    expect(
      onboardingRpcResultSchema.safeParse({ status: "conflict" }).success,
    ).toBe(true);
    expect(
      onboardingRpcResultSchema.safeParse({ status: "unexpected" }).success,
    ).toBe(false);
    expect(ONBOARDING_CONSENT_COPY_VERSION).toBe("whatsapp-marketing-v1");
  });
});
