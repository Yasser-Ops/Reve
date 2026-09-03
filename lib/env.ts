import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
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
