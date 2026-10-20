import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { GuestListSummary } from '@/lib/rsvp/guest-list';

const EMPTY_MESSAGE = 'No replies yet. They appear here as guests answer.';
const NOTES_SEPARATOR = ' · ';
const YES = 'Yes';
const NO = 'No';
const TILE_COMING = 'Coming';
const TILE_NOT_COMING = 'Not coming';
const TILE_REPLIES = 'Replies';

/**
 * The replies to one invitation: headcount, then one row per guest. Takes the
 * summary so the portal and admin share it; it knows nothing of either.
 */
export function GuestList({ summary }: { summary: GuestListSummary }) {
  const tiles = [
    { label: TILE_COMING, value: summary.coming },
    { label: TILE_NOT_COMING, value: summary.declined },
    { label: TILE_REPLIES, value: summary.replies },
  ];

  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-3 gap-3">
        {tiles.map((tile) => (
          <div className="rounded-xl bg-muted/40 p-3" key={tile.label}>
            <dt className="text-muted-foreground">{tile.label}</dt>
            <dd className="text-2xl font-medium tabular-nums">{tile.value}</dd>
          </div>
        ))}
      </dl>

      {summary.guests.length === 0 ? (
        <p className="text-muted-foreground">{EMPTY_MESSAGE}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Coming</TableHead>
              <TableHead>Guests</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.guests.map((guest, index) => (
              <TableRow key={`${index}-${guest.name}`}>
                <TableCell className="font-medium">{guest.name}</TableCell>
                <TableCell>{guest.attending ? YES : NO}</TableCell>
                <TableCell>{guest.attending ? guest.partySize : 0}</TableCell>
                <TableCell className="whitespace-normal">
                  {[guest.dietaryNotes, guest.message].filter(Boolean).join(NOTES_SEPARATOR)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
