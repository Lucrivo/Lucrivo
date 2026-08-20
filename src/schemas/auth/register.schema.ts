import { z } from "zod";

const registerSchema = z
  .object({
    email: z.email("Informe um e-mail válido."),
    password: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres.")
      .max(72, "A senha deve ter no máximo 72 caracteres."),
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
