"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const remember = formData.get("remember") === "on" ? "true" : "false";
  const callbackUrl = (formData.get("callbackUrl") as string) || "/";

  try {
    await signIn("credentials", { email, password, remember, redirectTo: callbackUrl });
  } catch (error) {
    if (error instanceof AuthError) {
      throw new Error("Invalid email or password, or your account is locked/suspended");
    }
    throw error;
  }
}
