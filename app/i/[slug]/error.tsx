'use client';

type InvitationErrorProps = {
  error: Error;
  reset: () => void;
};

export default function InvitationError({ reset }: InvitationErrorProps) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6f1ea] px-6 text-center text-[#2b2118]">
      <div>
        <h1 className="text-3xl">Something went wrong</h1>
        <p className="mt-4 text-sm">Please try again in a moment.</p>
        <button className="mt-6 underline" onClick={reset} type="button">
          Retry
        </button>
      </div>
    </main>
  );
}
