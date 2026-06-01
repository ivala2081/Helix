// Runtime environment variable validation.
// Import these accessors in server code instead of reading process.env directly —
// ensures missing vars fail loudly at first call, not silently at runtime.

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Set it in .env.local (dev) or Vercel environment variables (prod).`,
    );
  }
  return value;
}

export const env = {
  get SUPABASE_URL(): string {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get SUPABASE_ANON_KEY(): string {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
  get SUPABASE_SERVICE_ROLE_KEY(): string {
    return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
  get CRON_SECRET(): string {
    return required("CRON_SECRET", process.env.CRON_SECRET);
  },
  // 32-byte key as 64 hex chars. Encrypts customer exchange API secrets at rest.
  // Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  get APP_ENCRYPTION_KEY(): string {
    return required("APP_ENCRYPTION_KEY", process.env.APP_ENCRYPTION_KEY);
  },
};
