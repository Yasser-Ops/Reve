/**
 * The hidden `company` field bots fill and guests never see. Off-screen rather
 * than display:none, which some bots skip; out of the tab order and the
 * accessibility tree so a real guest never meets it.
 */
const HONEYPOT_STYLE = { position: 'absolute', left: '-10000px', width: 1, height: 1 } as const;

export function RsvpHoneypot() {
  return (
    <div aria-hidden="true" style={HONEYPOT_STYLE}>
      <label>
        Company
        <input autoComplete="off" name="company" tabIndex={-1} type="text" />
      </label>
    </div>
  );
}
