export default function InvitationNotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6f1ea] px-6 text-center text-[#2b2118]">
      <div>
        <h1 className="text-3xl">This invitation is not available</h1>
        <p className="mt-4 text-sm">
          The link may be incorrect, or the invitation may not be published yet.
        </p>
      </div>
    </main>
  );
}
