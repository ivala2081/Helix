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
};
