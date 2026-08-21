"use server";

import { redirect } from "next/navigation";

import { registerSchema } from "@/schemas/auth/register.schema";

import {
  signup,
  type SignupServiceResult,
} from "@/modules/auth/services/signup.service";

type SignupActionError = Extract<
  SignupServiceResult,
  { status: "error" }
>["error"];

type RegisterActionState =
  | { status: "success"; outcome: "confirmation_required" }
  | {
      status: "error";
      error: "invalid_fields" | "password_mismatch" | SignupActionError;
    }
  | null;

async function register(
  _previousState: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  const input = {
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };
  const parsed = registerSchema.safeParse(input);

  if (!parsed.success) {
    const passwordMismatch = parsed.error.issues.some(
      (issue) => issue.path[0] === "confirmPassword" && issue.code === "custom",
    );
    return {
      status: "error",
      error: passwordMismatch ? "password_mismatch" : "invalid_fields",
    };
  }

  const result = await signup({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (result.status === "error") return result;
  if (result.status === "confirmation_required") {
    return { status: "success", outcome: "confirmation_required" };
  }

  redirect("/dashboard");
}

export { register, type RegisterActionState };
