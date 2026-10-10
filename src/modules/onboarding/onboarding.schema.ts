import { isPossiblePhoneNumber } from "libphonenumber-js/min";
import { z } from "zod";

const ONBOARDING_CONSENT_COPY_VERSION = "whatsapp-marketing-v1" as const;
const E164_PATTERN = /^\+[1-9][0-9]{7,14}$/;
const INVALID_WHATSAPP_MESSAGE =
  "Informe um WhatsApp válido com código do país.";
const STALE_PROFILE_MESSAGE =
  "Os dados do perfil estão desatualizados. Atualize a página e tente novamente.";
const INVALID_FORM_MESSAGE =
  "Os dados enviados são inválidos. Atualize a página e tente novamente.";

const positiveIdSchema = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);
const catalogOrderSchema = z.number().int().min(0).max(10_000);
const versionSchema = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);

function normalizeSpaces(value: string) {
  return value.trim().replace(/\s+/gu, " ");
}

function normalizedTextSchema(
  min: number,
  max: number,
  label: string,
  invalidMessage: string,
) {
  return z
    .string({ error: invalidMessage })
    .transform(normalizeSpaces)
    .pipe(
      z
        .string()
        .min(min, `${label} deve ter pelo menos ${min} caracteres.`)
        .max(max, `${label} deve ter no máximo ${max} caracteres.`),
    );
}

const fullNameSchema = normalizedTextSchema(
  2,
  120,
  "Nome",
  "Informe seu nome.",
);
const customSubcategorySchema = normalizedTextSchema(
  2,
  80,
  "Subcategoria",
  "Informe uma subcategoria válida.",
);
const whatsappE164Schema = z
  .string({ error: INVALID_WHATSAPP_MESSAGE })
  .superRefine((value, context) => {
    if (!E164_PATTERN.test(value)) {
      context.addIssue({
        code: "custom",
        message: INVALID_WHATSAPP_MESSAGE,
      });
      return;
    }

    if (!isPossiblePhoneNumber(value)) {
      context.addIssue({
        code: "custom",
        message: "Informe um número de telefone possível.",
      });
    }
  });

const inputSegmentIdSchema = z
  .number({ error: "Escolha um segmento principal." })
  .int("Escolha um segmento principal válido.")
  .positive("Escolha um segmento principal.")
  .max(Number.MAX_SAFE_INTEGER, "Escolha um segmento principal válido.");
const inputSubcategoryIdSchema = z
  .number({ error: "Escolha uma subcategoria válida." })
  .int("Escolha uma subcategoria válida.")
  .positive("Escolha uma subcategoria válida.")
  .max(Number.MAX_SAFE_INTEGER, "Escolha uma subcategoria válida.");
const inputVersionSchema = z
  .number({ error: STALE_PROFILE_MESSAGE })
  .int(STALE_PROFILE_MESSAGE)
  .nonnegative(STALE_PROFILE_MESSAGE)
  .max(Number.MAX_SAFE_INTEGER, STALE_PROFILE_MESSAGE);

const businessSubcategorySchema = z.strictObject({
  id: positiveIdSchema,
  segmentId: positiveIdSchema,
  name: z.string().min(2).max(80),
  sortOrder: catalogOrderSchema,
  isActive: z.boolean(),
});

const businessSegmentSchema = z.strictObject({
  id: positiveIdSchema,
  name: z.string().min(2).max(60),
  sortOrder: catalogOrderSchema,
  isActive: z.boolean(),
  subcategories: z.array(businessSubcategorySchema),
});

const onboardingCatalogSchema = z.array(businessSegmentSchema);

const onboardingProfileSchema = z
  .strictObject({
    fullName: z.string().min(2).max(120),
    whatsappE164: whatsappE164Schema,
    segmentId: positiveIdSchema,
    segmentName: z.string().min(2).max(60),
    segmentIsActive: z.boolean(),
    subcategoryId: positiveIdSchema.nullable(),
    subcategoryName: z.string().min(2).max(80).nullable(),
    subcategoryIsActive: z.boolean().nullable(),
    customSubcategory: z.string().min(2).max(80).nullable(),
    whatsappMarketingConsent: z.boolean(),
    marketingConsentGrantedAt: z.iso.datetime({ offset: true }).nullable(),
    completedAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    version: versionSchema,
  })
  .superRefine((profile, context) => {
    const usesCatalogSubcategory =
      profile.subcategoryId !== null &&
      profile.subcategoryName !== null &&
      profile.subcategoryIsActive !== null &&
      profile.customSubcategory === null;
    const usesCustomSubcategory =
      profile.subcategoryId === null &&
      profile.subcategoryName === null &&
      profile.subcategoryIsActive === null &&
      profile.customSubcategory !== null;

    if (!usesCatalogSubcategory && !usesCustomSubcategory) {
      context.addIssue({
        code: "custom",
        path: ["subcategoryId"],
        message: "Perfil com representação de subcategoria inválida.",
      });
    }

    if (
      profile.whatsappMarketingConsent !==
      (profile.marketingConsentGrantedAt !== null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["whatsappMarketingConsent"],
        message: "Perfil com estado de consentimento inválido.",
      });
    }
  });

const onboardingProfileRpcSchema = onboardingProfileSchema.nullable();

const onboardingInputSchema = z
  .strictObject(
    {
      fullName: fullNameSchema,
      whatsappE164: whatsappE164Schema,
      segmentId: inputSegmentIdSchema,
      subcategoryId: inputSubcategoryIdSchema.nullable(),
      customSubcategory: z.union([customSubcategorySchema, z.null()], {
        error: "Informe uma subcategoria válida.",
      }),
      whatsappMarketingConsent: z.boolean({
        error: "A escolha de consentimento do WhatsApp é inválida.",
      }),
      expectedVersion: inputVersionSchema.nullable(),
    },
    INVALID_FORM_MESSAGE,
  )
  .superRefine((input, context) => {
    const hasCatalogSubcategory = input.subcategoryId !== null;
    const hasCustomSubcategory = input.customSubcategory !== null;

    if (hasCatalogSubcategory === hasCustomSubcategory) {
      context.addIssue({
        code: "custom",
        path: hasCustomSubcategory ? ["customSubcategory"] : ["subcategoryId"],
        message: "Escolha uma subcategoria ou informe a opção Outro.",
      });
    }
  });

const onboardingRpcResultSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("saved"), version: versionSchema }),
  z.strictObject({ status: z.literal("conflict") }),
  z.strictObject({ status: z.literal("catalog_inactive") }),
]);

type BusinessSubcategory = z.infer<typeof businessSubcategorySchema>;
type BusinessSegment = z.infer<typeof businessSegmentSchema>;
type OnboardingProfile = z.infer<typeof onboardingProfileSchema>;
type OnboardingInput = z.input<typeof onboardingInputSchema>;
type NormalizedOnboardingInput = z.output<typeof onboardingInputSchema>;
type OnboardingData = {
  catalog: BusinessSegment[];
  profile: OnboardingProfile | null;
};
type SaveOnboardingResult =
  | { status: "saved"; version: number }
  | { status: "invalid"; fieldErrors: Record<string, string[]> }
  | { status: "conflict" | "catalog_inactive" | "error" };

export {
  E164_PATTERN,
  ONBOARDING_CONSENT_COPY_VERSION,
  businessSegmentSchema,
  businessSubcategorySchema,
  onboardingCatalogSchema,
  onboardingInputSchema,
  onboardingProfileRpcSchema,
  onboardingProfileSchema,
  onboardingRpcResultSchema,
  type BusinessSegment,
  type BusinessSubcategory,
  type NormalizedOnboardingInput,
  type OnboardingData,
  type OnboardingInput,
  type OnboardingProfile,
  type SaveOnboardingResult,
};
