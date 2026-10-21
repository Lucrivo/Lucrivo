import { z } from "zod";

const pageNumberSchema = z.number().int().positive();

function adminPageSchema<T extends z.ZodType>(item: T) {
  return z
    .object({
      items: z.array(item),
      page: pageNumberSchema,
      pageSize: z.literal(20),
      totalCount: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
    })
    .strict()
    .refine(
      (value) =>
        value.totalPages === Math.ceil(value.totalCount / value.pageSize),
      { message: "Inconsistent administrative page totals" },
    );
}

type AdminPage<T> = {
  items: T[];
  page: number;
  pageSize: 20;
  totalCount: number;
  totalPages: number;
};

export { adminPageSchema, pageNumberSchema, type AdminPage };
