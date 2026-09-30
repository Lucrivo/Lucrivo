import { z } from "zod";

const safeNonNegativeInteger = z.number().int().nonnegative().safe();
const safePositiveInteger = z.number().int().positive().safe();

const reportAiDiagnosisIdSchema = z
  .union([z.string().regex(/^\d+$/), z.number()])
  .transform(Number)
  .pipe(safePositiveInteger);

const reportAiMessageSchema = z
  .object({
    requestId: z.uuid(),
    reportVersion: safeNonNegativeInteger,
    question: z.string().trim().min(1).max(2_000),
  })
  .strict();

const reportAiHistoryQuerySchema = z
  .object({
    version: z.coerce.number().int().nonnegative().safe().optional(),
  })
  .strict();

const reportAiTurnDtoSchema = z
  .object({
    id: safePositiveInteger,
    requestId: z.uuid(),
    question: z.string().min(1).max(2_000),
    answer: z.string().nullable(),
    status: z.enum(["pending", "completed", "failed"]),
    errorCode: z.string().nullable(),
    createdAt: z.string().min(1),
  })
  .strict();

const reportAiHistorySchema = z
  .object({
    currentVersion: safeNonNegativeInteger,
    selectedVersion: safeNonNegativeInteger,
    versions: z.array(safeNonNegativeInteger),
    summary: z.string(),
    turns: z.array(reportAiTurnDtoSchema),
  })
  .strict();

const reportAiStreamEventSchema = z.discriminatedUnion("type", [
  z
    .object({ type: z.literal("accepted"), turnId: safePositiveInteger })
    .strict(),
  z.object({ type: z.literal("delta"), text: z.string() }).strict(),
  z
    .object({ type: z.literal("completed"), turn: reportAiTurnDtoSchema })
    .strict(),
  z
    .object({
      type: z.literal("failed"),
      code: z.string().min(1),
      retry: z.enum(["same_request", "new_request"]),
    })
    .strict(),
]);

export {
  reportAiDiagnosisIdSchema,
  reportAiHistorySchema,
  reportAiHistoryQuerySchema,
  reportAiMessageSchema,
  reportAiStreamEventSchema,
  reportAiTurnDtoSchema,
};
