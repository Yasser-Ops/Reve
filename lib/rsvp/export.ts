import { toGuestCsv } from "@/lib/rsvp/csv";
import type { GuestReply } from "@/lib/rsvp/guest-list";

/* The slug is operator-typed and lands in a header: keep the filename to safe characters. */
const UNSAFE_FILENAME_CHARS = /[^a-z0-9-]/g;

/** The guest list as an uncached spreadsheet download, shared by the portal and admin routes. */
export function csvResponse(slug: string, guests: GuestReply[]): Response {
  const filename = `guests-${slug.toLowerCase().replace(UNSAFE_FILENAME_CHARS, "-")}.csv`;
  return new Response(toGuestCsv(guests), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
