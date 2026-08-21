import { z } from "zod";

import { passwordSchema } from "./password.schema";

const registerSchema = z
  .object({
    email: z.email("Informe um e-mail válido."),
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

type RegisterInput = z.infer<typeof registerSchema>;

export { registerSchema, type RegisterInput };
