"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/ssr-server";

export type AuthState = { error?: string; message?: string };

export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/app") || "/app";

  if (!email || !password) return { error: "E-posta ve şifre gerekli." };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Giriş başarısız. E-posta veya şifre hatalı." };

  redirect(next);
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/app") || "/app";

  if (!email || !password) return { error: "E-posta ve şifre gerekli." };
  if (password.length < 8) return { error: "Şifre en az 8 karakter olmalı." };

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: "Kayıt başarısız: " + error.message };

  // If email confirmation is disabled, a session is returned → straight in.
  if (data.session) redirect(next);

  return {
    message:
      "Hesabın oluşturuldu. E-postandaki doğrulama bağlantısına tıkla, sonra giriş yap.",
  };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
