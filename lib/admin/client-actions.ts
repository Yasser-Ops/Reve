'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { UNEXPECTED, type ActionResult } from '@/lib/admin/action-result';
import { removeInvitationMedia } from '@/lib/admin/media';
import { requireAdmin } from '@/lib/auth/guards';
import { STUDIO_TIME_ZONE, TIERS } from '@/lib/constants';
import { ADMIN_NOTICE, NOTICE_PARAM, ROUTES, adminRoutes } from '@/lib/routes';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const UNIQUE_VIOLATION = '23505';

/** An empty date field arrives as '' and means "not set". */
const optionalDate = z
  .string()
  .trim()
  .transform((value) => value || null)
  .pipe(z.iso.date().nullable());

const orderFieldsSchema = z.object({
  tier: z.enum(TIERS),
  amount: z.coerce.number().min(0).max(100_000),
  eventDate: optionalDate,
  dueAt: optionalDate,
  notes: z.string().trim().max(2000),
});

const clientFieldsSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(3).max(40),
  notes: z.string().trim().max(2000).optional(),
});

const ORDER_FIELDS = ['tier', 'amount', 'eventDate', 'dueAt', 'notes'] as const;

function fields(formData: FormData, names: readonly string[]) {
  return Object.fromEntries(names.map((name) => [name, formData.get(name) ?? '']));
}

/**
 * A typed due date is due until the end of that day in the studio's zone.
 * Stored as midnight UTC it read as overdue from 03:00 on the day it was due.
 * Postgres resolves the zone name, daylight saving included.
 */
function endOfStudioDay(date: string | null): string | null {
  return date ? `${date} 23:59:59 ${STUDIO_TIME_ZONE}` : null;
}

function orderRow(order: z.infer<typeof orderFieldsSchema>, clientId: string) {
  return {
    client_id: clientId,
    tier: order.tier,
    amount: order.amount,
    event_date: order.eventDate,
    due_at: endOfStudioDay(order.dueAt),
  };
}

/**
 * Inserts an order and, when one was typed, its note. The note lives in
 * `order_notes` (admin-only; clients can read their own order row). Two
 * inserts, no transaction over PostgREST: a failed note removes the order
 * again so the caller never sees a half-written order.
 */
async function insertOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  order: z.infer<typeof orderFieldsSchema>,
  clientId: string,
): Promise<{ orderId: string } | { orderId: null; undone: boolean }> {
  const inserted = await supabase
    .from('orders')
    .insert(orderRow(order, clientId))
    .select('id')
    .single();
  if (inserted.error) return { orderId: null, undone: true };

  const orderId = inserted.data.id;
  if (!order.notes) return { orderId };

  const noted = await supabase.from('order_notes').insert({ order_id: orderId, body: order.notes });
  if (!noted.error) return { orderId };

  const removed = await supabase.from('orders').delete().eq('id', orderId);
  return { orderId: null, undone: !removed.error };
}

export async function createClientWithOrder(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const client = clientFieldsSchema
    .extend({ email: z.email().transform((value) => value.toLowerCase()) })
    .safeParse(fields(formData, ['fullName', 'email', 'phone']));
  const order = orderFieldsSchema.safeParse(fields(formData, ORDER_FIELDS));
  if (!client.success || !order.success) {
    return { ok: false, message: 'Check the details and try again.' };
  }

  const supabase = await createClient();
  const created = await supabase
    .from('clients')
    .insert({
      full_name: client.data.fullName,
      email: client.data.email,
      phone: client.data.phone,
    })
    .select('id')
    .single();

  if (created.error) {
    return created.error.code === UNIQUE_VIOLATION
      ? { ok: false, message: 'A client with this email already exists.' }
      : { ok: false, message: UNEXPECTED };
  }

  const clientId = created.data.id;
  const ordered = await insertOrder(supabase, order.data, clientId);

  /* Two inserts, no transaction over PostgREST: undo the first rather than
     leave a client with no order, which the client list could not show. */
  if (ordered.orderId === null) {
    if (!ordered.undone) {
      throw new Error(`Order for client ${clientId} was half-created and could not be removed`);
    }
    const undone = await supabase.from('clients').delete().eq('id', clientId);
    /* If even the undo fails, fail loudly: a client with no order is hidden
       from the list and would block its email from being used again. */
    if (undone.error) {
      throw new Error(
        `Client ${clientId} was created without its order and could not be removed`,
      );
    }
    return { ok: false, message: UNEXPECTED };
  }

  redirect(adminRoutes.client(clientId));
}

export async function updateClient(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  /* The email is not editable here: from Phase 3 it is the client's sign-in
     identity. */
  const id = z.uuid().safeParse(formData.get('clientId'));
  const client = clientFieldsSchema.safeParse(fields(formData, ['fullName', 'phone', 'notes']));
  if (!id.success || !client.success) return { ok: false, message: 'Check the details.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('clients')
    .update({ full_name: client.data.fullName, phone: client.data.phone })
    .eq('id', id.data);
  if (error) return { ok: false, message: UNEXPECTED };

  const noted = await supabase
    .from('client_notes')
    .upsert({ client_id: id.data, body: client.data.notes ?? '' });
  if (noted.error) return { ok: false, message: UNEXPECTED };

  revalidatePath(adminRoutes.client(id.data));
  return { ok: true };
}

export async function addOrder(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const id = z.uuid().safeParse(formData.get('clientId'));
  const order = orderFieldsSchema.safeParse(fields(formData, ORDER_FIELDS));
  if (!id.success || !order.success) return { ok: false, message: 'Check the order details.' };

  const supabase = await createClient();
  const added = await insertOrder(supabase, order.data, id.data);
  if (added.orderId === null) {
    if (!added.undone) {
      throw new Error(`Order for client ${id.data} was half-created and could not be removed`);
    }
    return { ok: false, message: UNEXPECTED };
  }

  revalidatePath(adminRoutes.client(id.data));
  return { ok: true };
}

const deleteSchema = z.object({
  clientId: z.uuid(),
  confirmName: z.string().trim().min(1).max(120),
});

/* Raised by admin_delete_client (migration 0007). */
const DELETE_REFUSALS: Record<string, string> = {
  RV001: 'The name does not match.',
  RV002: 'Their invitation is live for guests, so this client cannot be deleted.',
};

export async function deleteClient(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const input = deleteSchema.safeParse(fields(formData, ['clientId', 'confirmName']));
  if (!input.success) return { ok: false, message: 'Type the client’s full name to confirm.' };

  /* The row is gone after the rpc, and with it the link to the sign-in. */
  const supabase = await createClient();
  const account = await supabase
    .from('clients')
    .select('user_id')
    .eq('id', input.data.clientId)
    .maybeSingle();
  if (account.error) return { ok: false, message: UNEXPECTED };

  /* One transaction in the database: the rows go together or not at all. */
  const { data, error } = await supabase.rpc('admin_delete_client', {
    p_client_id: input.data.clientId,
    p_confirm_name: input.data.confirmName,
  });
  if (error) {
    return {
      ok: false,
      message: Object.hasOwn(DELETE_REFUSALS, error.code) ? DELETE_REFUSALS[error.code] : UNEXPECTED,
    };
  }

  /* null means the client was already gone; the list is where to land either
     way. Files go after the rows: a storage failure leaves harmless orphans,
     never a client whose files were deleted but rows were not. */
  const filesRemoved = await removeInvitationMedia(supabase, data ?? []);

  /* The sign-in goes last: a client without rows but with a live login is the
     worse leftover, so a failure here is the notice the operator must act on. */
  const userId = account.data?.user_id;
  const accountRemoved = userId
    ? !(await createAdminClient().auth.admin.deleteUser(userId)).error
    : true;

  revalidatePath(ROUTES.ADMIN);
  const notice = !accountRemoved
    ? ADMIN_NOTICE.CLIENT_DELETED_ACCOUNT_LEFT
    : filesRemoved
      ? ADMIN_NOTICE.CLIENT_DELETED
      : ADMIN_NOTICE.CLIENT_DELETED_FILES_LEFT;
  redirect(`${ROUTES.ADMIN}?${NOTICE_PARAM}=${notice}`);
}
