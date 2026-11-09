"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isCountry } from "@/lib/countries";

export async function setCountry(formData: FormData) {
  const code = String(formData.get("pays") ?? "");
  if (isCountry(code)) (await cookies()).set("pays", code, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
  redirect("/");
}
