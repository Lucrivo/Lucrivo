import { z } from "zod";

const uuidSchema = z.uuid();
const isoDateTimeSchema = z.iso.datetime({ offset: true });
const positiveIdSchema = z.number().int().positive();
const nonnegativeIntegerSchema = z.number().int().nonnegative();
const rateSchema = z.number().int().min(0).max(10_000).nullable();

const adminOnboardingTabSchema = z.enum(["overview", "contacts", "catalog"]);
const adminOnboardingConsentSchema = z.enum(["all", "granted", "declined"]);
const adminOnboardingCursorSchema = z
  .object({
    completedAt: isoDateTimeSchema,
    userId: uuidSchema,
  })
  .strict();

const distributionItemSchema = z
  .object({
    id: positiveIdSchema.nullable(),
    name: z.string().min(1).max(80),
    count: nonnegativeIntegerSchema,
  })
  .strict();

const adminOnboardingOverviewSchema = z
  .object({
    generatedAt: isoDateTimeSchema,
    metrics: z
      .object({
        accountCount: nonnegativeIntegerSchema,
        completedCount: nonnegativeIntegerSchema,
        completionRateBasisPoints: rateSchema,
        activeConsentCount: nonnegativeIntegerSchema,
        consentRateBasisPoints: rateSchema,
      })
      .strict(),
    segments: z.array(distributionItemSchema.extend({ id: positiveIdSchema })),
    subcategories: z.array(distributionItemSchema),
  })
  .strict();

const catalogReferenceSchema = z
  .object({
    id: positiveIdSchema,
    name: z.string().min(1).max(80),
  })
  .strict();
const subcategoryReferenceSchema = z
  .object({
    id: positiveIdSchema.nullable(),
    name: z.string().min(1).max(80),
  })
  .strict();
const adminOnboardingContactSchema = z
  .object({
    userId: uuidSchema,
    fullName: z.string().min(2).max(120),
    whatsappE164: z.string().regex(/^\+[1-9][0-9]{7,14}$/),
    segment: catalogReferenceSchema,
    subcategory: subcategoryReferenceSchema,
    customSubcategory: z.string().min(2).max(80).nullable(),
    consent: z.boolean(),
    consentedAt: isoDateTimeSchema.nullable(),
    completedAt: isoDateTimeSchema,
  })
  .strict()
  .superRefine((contact, context) => {
    const isCustom = contact.subcategory.id === null;
    if (isCustom !== (contact.customSubcategory !== null)) {
      context.addIssue({
        code: "custom",
        path: ["customSubcategory"],
        message: "Custom subcategory must only accompany Outro",
      });
    }
    if (isCustom && contact.subcategory.name !== "Outro") {
      context.addIssue({
        code: "custom",
        path: ["subcategory", "name"],
        message: "Custom subcategory must use the Outro label",
      });
    }
  });

const adminOnboardingContactsSchema = z
  .object({
    items: z.array(adminOnboardingContactSchema).max(50),
    nextCursor: adminOnboardingCursorSchema.nullable(),
  })
  .strict();

const adminBusinessSubcategorySchema = z
  .object({
    id: positiveIdSchema,
    segmentId: positiveIdSchema,
    name: z.string().min(2).max(80),
    sortOrder: z.number().int().min(0).max(10_000),
    isActive: z.boolean(),
    version: nonnegativeIntegerSchema,
  })
  .strict();
const adminBusinessSegmentItemSchema = z
  .object({
    id: positiveIdSchema,
    name: z.string().min(2).max(60),
    sortOrder: z.number().int().min(0).max(10_000),
    isActive: z.boolean(),
    version: nonnegativeIntegerSchema,
  })
  .strict();
const adminBusinessSegmentSchema = adminBusinessSegmentItemSchema.extend({
  subcategories: z.array(adminBusinessSubcategorySchema),
});
const adminBusinessCatalogSchema = z.array(adminBusinessSegmentSchema);

const segmentMutationSchema = z
  .object({
    kind: z.literal("segment"),
    id: positiveIdSchema.nullable(),
    name: z
      .string()
      .trim()
      .transform((value) => value.replace(/\s+/g, " "))
      .pipe(z.string().min(2).max(60)),
    sortOrder: z.number().int().min(0).max(10_000),
    isActive: z.boolean(),
    expectedVersion: nonnegativeIntegerSchema.nullable(),
  })
  .strict();
const subcategoryMutationSchema = z
  .object({
    kind: z.literal("subcategory"),
    id: positiveIdSchema.nullable(),
    segmentId: positiveIdSchema,
    name: z
      .string()
      .trim()
      .transform((value) => value.replace(/\s+/g, " "))
      .pipe(z.string().min(2).max(80)),
    sortOrder: z.number().int().min(0).max(10_000),
    isActive: z.boolean(),
    expectedVersion: nonnegativeIntegerSchema.nullable(),
  })
  .strict();
const businessCatalogMutationSchema = z
  .discriminatedUnion("kind", [
    segmentMutationSchema,
    subcategoryMutationSchema,
  ])
  .superRefine((mutation, context) => {
    if ((mutation.id === null) !== (mutation.expectedVersion === null)) {
      context.addIssue({
        code: "custom",
        path: ["expectedVersion"],
        message: "Expected version must match create or update mode",
      });
    }
  });

type AdminOnboardingTab = z.infer<typeof adminOnboardingTabSchema>;
type AdminOnboardingConsent = z.infer<typeof adminOnboardingConsentSchema>;
type AdminOnboardingCursor = z.infer<typeof adminOnboardingCursorSchema>;
type AdminOnboardingOverview = z.infer<typeof adminOnboardingOverviewSchema>;
type AdminOnboardingContacts = z.infer<typeof adminOnboardingContactsSchema>;
type AdminOnboardingContact = z.infer<typeof adminOnboardingContactSchema>;
type AdminBusinessCatalog = z.infer<typeof adminBusinessCatalogSchema>;
type AdminBusinessSegment = z.infer<typeof adminBusinessSegmentSchema>;
type AdminBusinessSegmentItem = z.infer<typeof adminBusinessSegmentItemSchema>;
type AdminBusinessSubcategory = z.infer<typeof adminBusinessSubcategorySchema>;
type BusinessCatalogMutation = z.infer<typeof businessCatalogMutationSchema>;

export {
  adminBusinessCatalogSchema,
  adminBusinessSegmentItemSchema,
  adminBusinessSegmentSchema,
  adminBusinessSubcategorySchema,
  adminOnboardingConsentSchema,
  adminOnboardingContactsSchema,
  adminOnboardingCursorSchema,
  adminOnboardingOverviewSchema,
  adminOnboardingTabSchema,
  businessCatalogMutationSchema,
  type AdminBusinessCatalog,
  type AdminBusinessSegment,
  type AdminBusinessSegmentItem,
  type AdminBusinessSubcategory,
  type AdminOnboardingConsent,
  type AdminOnboardingContact,
  type AdminOnboardingContacts,
  type AdminOnboardingCursor,
  type AdminOnboardingOverview,
  type AdminOnboardingTab,
  type BusinessCatalogMutation,
};
