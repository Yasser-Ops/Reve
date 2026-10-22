import { llmsTxt } from '@/lib/llms';

/* Everything it reads is known at build time. */
export const dynamic = 'force-static';

export function GET() {
  return new Response(llmsTxt(), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
