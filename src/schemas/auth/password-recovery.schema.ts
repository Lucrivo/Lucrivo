import { z } from "zod";

import { passwordSchema } from "./password.schema";

const passwordRecoveryRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Informe um e-mail válido.")),
});

const passwordUpdateSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirme sua senha."),
  })
  .superRefine(({ password, confirmPassword }, context) => {
    if (password !== confirmPassword) {
      context.addIssue({
        code: "custom",
        message: "As senhas não coincidem.",
        path: ["confirmPassword"],
      });
    }
  });

type PasswordRecoveryRequestInput = z.infer<
  typeof passwordRecoveryRequestSchema
>;
type PasswordUpdateInput = z.infer<typeof passwordUpdateSchema>;

export {
  passwordRecoveryRequestSchema,
  passwordUpdateSchema,
  type PasswordRecoveryRequestInput,
  type PasswordUpdateInput,
};
