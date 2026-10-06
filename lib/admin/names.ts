/**
 * The typed-name check for destructive actions. Mirrors the database's
 * `lower(btrim(...))` in admin_delete_client, so the dialog and the function
 * agree on what counts as a match.
 */
export function namesMatch(typed: string, actual: string): boolean {
  const normal = (value: string) => value.trim().toLowerCase();
  return normal(typed) !== '' && normal(typed) === normal(actual);
}
