import { z } from "zod";

import {
  AdminMfaRequiredError,
  AdminRequiredError,
  requireAdmin,
} from "@/modules/auth/services/require-admin";
import { AuthRequiredError } from "@/modules/auth/services/require-user";
import { serializeAuthorizedContactsCsv } from "@/modules/admin/onboarding/onboarding-export";

const protectedHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

const positiveIdQuerySchema = z
  .string()
  .regex(/^[1-9][0-9]*$/)
  .transform(Number)
  .pipe(z.number().int().positive().safe());
const dateQuerySchema = z.iso.date().refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
});
const exportQuerySchema = z
  .object({
    segmentId: positiveIdQuerySchema.optional(),
    subcategoryId: positiveIdQuerySchema.optional(),
    from: dateQuerySchema.optional(),
    to: dateQuerySchema.optional(),
  })
  .strict()
  .superRefine((filters, context) => {
    if (filters.from && filters.to && filters.from >= filters.to) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "The end date must be after the start date",
      });
    }
  });

const exportItemSchema = z
  .object({
    fullName: z.string().min(2).max(120),
    whatsappE164: z.string().regex(/^\+[1-9][0-9]{7,14}$/),
    segment: z.string().min(2).max(60),
    subcategory: z.string().min(2).max(80),
    consentedAt: z.iso.datetime({ offset: true }),
  })
  .strict();
const exportResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("empty") }).strict(),
  z.object({ status: z.literal("limit_exceeded") }).strict(),
  z
    .object({
      status: z.literal("ready"),
      items: z.array(exportItemSchema).min(1).max(5_000),
    })
    .strict(),
]);

function protectedResponse(status: number, body: BodyInit | null = null) {
  return new Response(body, { status, headers: protectedHeaders });
}

function parseQuery(request: Request) {
  const params = new URL(request.url).searchParams;
  const keys = [...params.keys()];
  if (new Set(keys).size !== keys.length) return null;

  const parsed = exportQuerySchema.safeParse(Object.fromEntries(params));
  return parsed.success ? parsed.data : null;
}

function saoPauloDate() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

async function GET(request: Request) {
  let supabase;
  try {
    ({ supabase } = await requireAdmin());
  } catch (error) {
    if (error instanceof AuthRequiredError) return protectedResponse(401);
    if (
      error instanceof AdminRequiredError ||
      error instanceof AdminMfaRequiredError
    ) {
      return protectedResponse(403);
    }
    return protectedResponse(503);
  }

  const filters = parseQuery(request);
  if (!filters) return protectedResponse(400);

  const { data, error } = await supabase.rpc(
    "export_admin_onboarding_contacts_v1",
    {
      p_segment_id: filters.segmentId,
      p_subcategory_id: filters.subcategoryId,
      p_from: filters.from,
      p_to: filters.to,
    },
  );
  if (error) return protectedResponse(503);

  const parsed = exportResultSchema.safeParse(data);
  if (!parsed.success) return protectedResponse(503);
  if (parsed.data.status === "empty") return protectedResponse(204);
  if (parsed.data.status === "limit_exceeded") return protectedResponse(422);

  const csv = `\uFEFF${serializeAuthorizedContactsCsv(parsed.data.items)}`;
  return new Response(csv, {
    status: 200,
    headers: {
      ...protectedHeaders,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lucrivo-contatos-autorizados-${saoPauloDate()}.csv"`,
    },
  });
}

export { GET };
