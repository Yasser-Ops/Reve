import Image from 'next/image';
import { SAMPLE_CONTENT } from '@/lib/sample-invitation';

/**
 * The invitation as it arrives: a link in a WhatsApp thread.
 *
 * This is how nearly every Rêve invitation actually reaches a guest, so the
 * site should show it rather than assert it in a five-word bullet. The point
 * the block makes is that there is nothing to download and no account to
 * make — the preview card is the product announcing itself in the one app
 * everyone already has open.
 *
 * Deliberately not a screenshot of WhatsApp: a real capture would carry
 * someone's phone number, avatar, and battery level, would date itself with
 * every WhatsApp redesign, and would be a picture of a conversation that
 * never happened. This is an illustration and reads as one.
 *
 * Colours are literals rather than Rêve tokens because they are quoting
 * another product's interface. Using the brand palette here would be the
 * wrong kind of accurate.
 */

const INCOMING = '#ffffff';
const OUTGOING = '#d9fdd3';
const THREAD_BG = '#e6ded7';
const META = '#667781';

const LINK = 'reve.lb/sarah-and-amine';

function Tick() {
  return (
    <svg
      aria-hidden="true"
      className="ms-1 inline-block align-middle"
      fill="none"
      height="11"
      viewBox="0 0 16 11"
      width="16"
    >
      <path
        d="M1 5.5 4.5 9 10 2M6.5 8.2 7.8 9.5 14 2"
        stroke="#53bdeb"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function Bubble({
  children,
  outgoing = false,
  time,
}: {
  children: React.ReactNode;
  outgoing?: boolean;
  time: string;
}) {
  return (
    <div className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[85%] rounded-lg px-2.5 py-1.5 text-[13px] leading-snug shadow-[0_1px_0.5px_rgb(11_20_26/0.13)]"
        style={{ background: outgoing ? OUTGOING : INCOMING, color: '#111b21' }}
      >
        {children}
        <span
          className="ms-2 float-right mt-1 text-[10px] leading-none"
          style={{ color: META }}
        >
          {time}
          {outgoing ? <Tick /> : null}
        </span>
      </div>
    </div>
  );
}

export function WhatsappThread() {
  const names = `${SAMPLE_CONTENT.coupleFirstName} & ${SAMPLE_CONTENT.couplePartnerName}`;

  return (
    <div
      aria-hidden="true"
      className="mx-auto w-full max-w-[300px] select-none overflow-hidden rounded-[1.5rem] border border-taupe/50 shadow-[0_24px_50px_-26px_rgb(var(--reve-shadow-rgb)/0.5)]"
      style={{ background: THREAD_BG }}
    >
      {/* Thread header. Named for a group, since an invitation is forwarded
          into family chats rather than sent one guest at a time. */}
      <div
        className="flex items-center gap-2.5 px-3 py-2.5"
        style={{ background: '#f0f2f5' }}
      >
        <div
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] text-white"
          style={{ background: '#b0b7bd' }}
        >
          <span className="reve-display ps-[0.1em] tracking-[0.08em]">SA</span>
        </div>
        <div className="min-w-0">
          <p
            className="reve-crisp truncate text-[13px] font-medium"
            style={{ color: '#111b21' }}
          >
            Family · {SAMPLE_CONTENT.venue.name}
          </p>
          <p className="reve-crisp text-[10.5px]" style={{ color: META }}>
            online
          </p>
        </div>
      </div>

      <div className="space-y-2 px-3 py-4">
        <Bubble time="20:41">Is the invitation ready?</Bubble>

        {/* The forward itself: a link preview card, which is the only part of
            this a guest ever really looks at. */}
        <div className="flex justify-end">
          <div
            className="max-w-[85%] overflow-hidden rounded-lg shadow-[0_1px_0.5px_rgb(11_20_26/0.13)]"
            style={{ background: OUTGOING }}
          >
            <div className="m-1 overflow-hidden rounded-md">
              {/*
               * Preview image: the sealed envelope, which is what the link
               * unfurls to on a real phone.
               *
               * Turned on its side. The source photograph is a 9:16 portrait
               * because it was shot to fill a phone screen, but an envelope
               * lying in a landscape preview card sits horizontally, the way
               * one does on a table. Rotating the image rather than cropping
               * it keeps the whole envelope and its seal in frame.
               */}
              <div
                className="relative aspect-[1.91/1] overflow-hidden"
                style={{ background: '#efe8df' }}
              >
                {/*
                 * The layer is sized in the image's own portrait orientation
                 * (height across the card, width down it), then turned a
                 * quarter-turn so the envelope lies on its side as one does on
                 * a table. Sizing before rotating is what lets `cover` fill
                 * the card correctly afterwards.
                 */}
                <Image
                  alt=""
                  className="absolute left-1/2 top-1/2 h-auto max-w-none"
                  height={2752}
                  src="/envelope/bone-sealed.webp"
                  style={{
                    width: 'calc(100% / 1.91)',
                    transform: 'translate(-50%, -50%) rotate(-90deg) scale(1.91)',
                  }}
                  width={1536}
                />
              </div>

              <div className="px-2.5 py-2" style={{ background: '#dbf5d3' }}>
                <p
                  className="reve-crisp truncate text-[12px] font-medium"
                  style={{ color: '#111b21' }}
                >
                  {names}
                </p>
                <p
                  className="reve-crisp mt-0.5 truncate text-[11px]"
                  style={{ color: META }}
                >
                  You are invited. Tap to open the envelope.
                </p>
                <p
                  className="reve-crisp mt-1 truncate text-[10.5px]"
                  style={{ color: META }}
                >
                  {LINK}
                </p>
              </div>
            </div>

            <p
              className="px-2.5 pb-1.5 text-[13px] leading-snug"
              style={{ color: '#111b21' }}
            >
              Here it is
              <span
                className="ms-2 float-right mt-1 text-[10px] leading-none"
                style={{ color: META }}
              >
                20:44
                <Tick />
              </span>
            </p>
          </div>
        </div>

        <Bubble time="20:45">Opened it, that is beautiful 😍</Bubble>
        <Bubble time="20:45">Sending it to my sister now</Bubble>
      </div>
    </div>
  );
}
