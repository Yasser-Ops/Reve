'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { UNEXPECTED, type ActionResult } from '@/lib/admin/action-result';
import { removeInvitationMedia } from '@/lib/admin/media';
import { requireAdmin } from '@/lib/auth/guards';
import { TIERS } from '@/lib/constants';
import { ADMIN_NOTICE, NOTICE_PARAM, ROUTES, adminRoutes } from '@/lib/routes';
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

function orderRow(order: z.infer<typeof orderFieldsSchema>, clientId: string) {
  return {
    client_id: clientId,
    tier: order.tier,
    amount: order.amount,
    event_date: order.eventDate,
    due_at: order.dueAt,
    notes: order.notes || null,
  };
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
  const ordered = await supabase.from('orders').insert(orderRow(order.data, clientId));

  /* Two inserts, no transaction over PostgREST: undo the first rather than
     leave a client with no order, which the client list could not show. */
  if (ordered.error) {
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
    .update({
      full_name: client.data.fullName,
      phone: client.data.phone,
      notes: client.data.notes ?? '',
    })
    .eq('id', id.data);
  if (error) return { ok: false, message: UNEXPECTED };

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
  const { error } = await supabase.from('orders').insert(orderRow(order.data, id.data));
  if (error) return { ok: false, message: UNEXPECTED };

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
  RV002: 'Unpublish their invitation first.',
};

export async function deleteClient(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const input = deleteSchema.safeParse(fields(formData, ['clientId', 'confirmName']));
  if (!input.success) return { ok: false, message: 'Type the client’s full name to confirm.' };

  /* One transaction in the database: the rows go together or not at all. */
  const supabase = await createClient();
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
  revalidatePath(ROUTES.ADMIN);
  redirect(
    `${ROUTES.ADMIN}?${NOTICE_PARAM}=${
      filesRemoved ? ADMIN_NOTICE.CLIENT_DELETED : ADMIN_NOTICE.CLIENT_DELETED_FILES_LEFT
    }`,
  );
}
