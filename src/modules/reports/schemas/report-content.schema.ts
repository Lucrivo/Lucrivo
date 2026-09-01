import { z } from "zod";

import {
  reportExecutiveSummaryAnswerKeys,
  reportExecutiveSummaryFactKeys,
  reportSectionKeys,
  reportTones,
} from "../types";

const safeIntegerSchema = z
  .number()
  .int()
  .min(Number.MIN_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);
const nonNegativeSafeIntegerSchema = safeIntegerSchema.nonnegative();
const positiveSafeIntegerSchema = safeIntegerSchema.positive();

const reportToneSchema = z.enum(reportTones);

const reportSectionSchema = z.strictObject({
  key: z.enum(reportSectionKeys),
  title: z.string().min(1),
  body: z.string().min(1),
  emphasisLabel: z.string().min(1).nullable(),
  emphasisValue: z.string().min(1).nullable(),
  tone: reportToneSchema,
});

const executiveSummaryFactSchema = z.strictObject({
  key: z.enum(reportExecutiveSummaryFactKeys),
  currentLabel: z.string().min(1),
  currentValue: z.string().min(1),
  referenceLabel: z.string().min(1),
  referenceValue: z.string().min(1),
});

const executiveSummaryAnswerSchema = z.strictObject({
  key: z.enum(reportExecutiveSummaryAnswerKeys),
  question: z.string().min(1),
  answer: z.string().min(1),
});

const reportExecutiveSummarySchema = z.strictObject({
  headline: z.string().min(1),
  introduction: z.string().min(1),
  verdict: z.strictObject({
    label: z.string().min(1),
    body: z.string().min(1),
    tone: reportToneSchema,
  }),
  facts: z
    .array(executiveSummaryFactSchema)
    .length(reportExecutiveSummaryFactKeys.length),
  priority: z.strictObject({
    label: z.string().min(1),
    body: z.string().min(1),
  }),
  answers: z
    .array(executiveSummaryAnswerSchema)
    .length(reportExecutiveSummaryAnswerKeys.length),
});

type ExecutiveSummaryFact = z.infer<typeof executiveSummaryFactSchema>;
type ExecutiveSummaryAnswer = z.infer<typeof executiveSummaryAnswerSchema>;
type ReportExecutiveSummary = z.infer<typeof reportExecutiveSummarySchema>;
type ReportSection = z.infer<typeof reportSectionSchema>;

export {
  executiveSummaryAnswerSchema,
  executiveSummaryFactSchema,
  nonNegativeSafeIntegerSchema,
  positiveSafeIntegerSchema,
  reportExecutiveSummarySchema,
  reportSectionSchema,
  reportToneSchema,
  safeIntegerSchema,
  type ExecutiveSummaryAnswer,
  type ExecutiveSummaryFact,
  type ReportExecutiveSummary,
  type ReportSection,
};
