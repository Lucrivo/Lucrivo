import { z } from "zod";

import {
  evaluatePasswordRequirements,
  passwordPolicy,
} from "./password-policy";

const passwordSchema = z
  .string()
  .min(
    passwordPolicy.minLength,
    `A senha deve ter pelo menos ${passwordPolicy.minLength} caracteres.`,
  )
  .max(
    passwordPolicy.maxLength,
    `A senha deve ter no máximo ${passwordPolicy.maxLength} caracteres.`,
  )
  .refine(
    (password) => evaluatePasswordRequirements(password).hasLetter,
    "A senha deve conter pelo menos uma letra.",
  )
  .refine(
    (password) => evaluatePasswordRequirements(password).hasNumber,
    "A senha deve conter pelo menos um número.",
  );

export { passwordSchema };
