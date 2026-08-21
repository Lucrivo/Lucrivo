import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});

type LoginInput = z.infer<typeof loginSchema>;

export { loginSchema, type LoginInput };
