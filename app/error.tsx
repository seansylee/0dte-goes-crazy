"use client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.75),_transparent_36%),linear-gradient(180deg,_#f7f1e8_0%,_#ece4d5_52%,_#ded7ca_100%)] px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">
            Error
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-stone-900">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            {error.message ?? "An unexpected error occurred loading the analysis."}
          </p>
          <button
            onClick={reset}
            className="mt-6 rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-700"
          >
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}
