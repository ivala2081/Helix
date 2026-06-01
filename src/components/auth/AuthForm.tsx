"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, signUpAction, type AuthState } from "@/lib/auth/actions";

const INPUT =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/60";

export function AuthForm({
  mode,
  next,
}: {
  mode: "login" | "signup";
  next?: string;
}) {
  const action = mode === "login" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    {},
  );

  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-1 text-xl font-semibold text-white">
        {mode === "login" ? "Giriş yap" : "Hesap oluştur"}
      </h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        {mode === "login"
          ? "Helix paneline eriş."
          : "Helix botunu kullanmaya başla."}
      </p>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="next" value={next ?? "/app"} />
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">
            E-posta
          </label>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className={INPUT}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">
            Şifre
          </label>
          <input
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={8}
            className={INPUT}
          />
        </div>

        {state.error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {state.error}
          </p>
        )}
        {state.message && (
          <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-60"
        >
          {pending ? "..." : mode === "login" ? "Giriş yap" : "Kayıt ol"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
        {mode === "login" ? (
          <>
            Hesabın yok mu?{" "}
            <Link href="/signup" className="text-emerald-400 hover:underline">
              Kayıt ol
            </Link>
          </>
        ) : (
          <>
            Zaten hesabın var mı?{" "}
            <Link href="/login" className="text-emerald-400 hover:underline">
              Giriş yap
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
