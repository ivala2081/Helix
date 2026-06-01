"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { signInAction, signUpAction, type AuthState } from "@/lib/auth/actions";

const INPUT =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/60";
const LABEL = "mb-1 block text-xs text-[var(--color-muted)]";

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
  const [showPassword, setShowPassword] = useState(false);
  const isSignup = mode === "signup";

  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-1 text-xl font-semibold text-white">
        {isSignup ? "Hesap oluştur" : "Giriş yap"}
      </h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        {isSignup ? "Helix botunu kullanmaya başla." : "Helix paneline eriş."}
      </p>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="next" value={next ?? "/app"} />

        <div>
          <label className={LABEL}>E-posta</label>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className={INPUT}
          />
        </div>

        <div>
          <label className={LABEL}>Şifre</label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={8}
              className={`${INPUT} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--color-muted)] transition-colors hover:text-white"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {isSignup && (
          <>
            <div>
              <label className={LABEL}>Telefon</label>
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                placeholder="+90 5xx xxx xx xx"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Referans kodu (opsiyonel)</label>
              <input name="referred_by_code" type="text" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Telegram ID (opsiyonel)</label>
              <input
                name="telegram_id"
                type="text"
                placeholder="@kullaniciadi"
                className={INPUT}
              />
            </div>
          </>
        )}

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
          {pending ? "..." : isSignup ? "Kayıt ol" : "Giriş yap"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
        {isSignup ? (
          <>
            Zaten hesabın var mı?{" "}
            <Link href="/login" className="text-emerald-400 hover:underline">
              Giriş yap
            </Link>
          </>
        ) : (
          <>
            Hesabın yok mu?{" "}
            <Link href="/signup" className="text-emerald-400 hover:underline">
              Kayıt ol
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
