import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function getInvitationForEditor(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invitations')
    .select(
      'id, slug, status, template_slug, content, theme, entitlements, published_at, orders(id, reference, status, tier, client_id, clients(full_name)), invitation_reviews(id, decision, note, on_behalf, content_snapshot, created_at)',
    )
    .eq('id', id)
    .order('created_at', { referencedTable: 'invitation_reviews', ascending: false })
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type EditorInvitation = NonNullable<Awaited<ReturnType<typeof getInvitationForEditor>>>;
