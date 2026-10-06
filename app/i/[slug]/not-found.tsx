export default function InvitationNotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bone px-6 text-center text-ink">
      <div className="grid justify-items-center gap-5">
        <p className="font-display text-[15px] uppercase tracking-[0.3em] text-cocoa">Rêve</p>
        <h1 className="font-display text-[32px] leading-tight sm:text-[40px]">
          This invitation is <span className="font-accent italic text-wine">not available</span>
        </h1>
        <p className="max-w-sm text-[15px] text-cocoa">
          The link may be incorrect, or the invitation may not be published yet.
        </p>
      </div>
    </main>
  );
}
