'use client';

type InvitationErrorProps = {
  error: Error;
  retry: () => void;
  reset: () => void;
};

/* `retry` re-fetches the invitation; `reset` would re-render the read that
   just failed, so a guest's Retry could never succeed. */
export default function InvitationError({ retry }: InvitationErrorProps) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6f1ea] px-6 text-center text-[#2b2118]">
      <div>
        <h1 className="text-3xl">Something went wrong</h1>
        <p className="mt-4 text-sm">Please try again in a moment.</p>
        <button className="mt-6 underline" onClick={retry} type="button">
          Retry
        </button>
      </div>
    </main>
  );
}
