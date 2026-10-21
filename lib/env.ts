import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  /** Sends invite and reset emails (lib/email). Server only. */
  RESEND_API_KEY: z.string().startsWith('re_'),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration — ${detail}`);
  }

  return result.data;
}

let cached: Env | null = null;

/**
 * Validated environment, resolved on first access rather than at import time.
 *
 * Importing this module must stay side-effect free: a module-level parse would
 * make every consumer unimportable in tests without a fully populated
 * environment. Access still fails loudly the first time a value is read.
 */
export const env = new Proxy({} as Env, {
  get(_target, key: string) {
    cached ??= parseEnv(process.env);
    return cached[key as keyof Env];
  },
});

const publicEnvSchema = envSchema.pick({
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
});

/**
 * The two values safe in a browser. Written out by literal name because Next
 * inlines NEXT_PUBLIC_* into client bundles only where `process.env.NAME`
 * appears in full; `env` above would reach for the service key and throw.
 */
export function getPublicEnv() {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
