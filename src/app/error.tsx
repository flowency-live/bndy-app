"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-black tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-[14px] font-semibold text-dim">That&apos;s on us. Try again in a moment.</p>
      <button onClick={reset} className="mt-6 rounded-2xl border border-line bg-card px-5 py-3 text-[14px] font-extrabold">
        Try again
      </button>
    </div>
  );
}
