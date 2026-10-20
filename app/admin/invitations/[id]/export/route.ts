import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { csvResponse } from "@/lib/rsvp/export";
import { getGuestList } from "@/lib/rsvp/read";
import { createClient } from "@/lib/supabase/server";

const IdSchema = z.uuid();

/**
 * Any invitation's guest list as a spreadsheet. The admin's own session reads
 * both tables, so the admin RLS policies apply and no service key is involved.
 * A bad id and an unknown invitation look the same: not found.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();

  const id = IdSchema.safeParse((await params).id);
  if (!id.success) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitations")
    .select("slug")
    .eq("id", id.data)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();

  return csvResponse(data.slug, (await getGuestList(id.data)).guests);
}
