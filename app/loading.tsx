export default function Loading() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.75),_transparent_36%),linear-gradient(180deg,_#f7f1e8_0%,_#ece4d5_52%,_#ded7ca_100%)] px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 animate-pulse">
        <div className="h-72 rounded-[2rem] bg-stone-800/60" />
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 rounded-[1.75rem] bg-stone-200/60" />
            ))}
          </div>
          <div className="h-40 rounded-[1.75rem] bg-stone-200/60" />
        </div>
        <div className="h-56 rounded-[1.75rem] bg-stone-200/60" />
      </div>
    </main>
  );
}
