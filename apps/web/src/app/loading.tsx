// Route-level loading UI. Next renders this instantly (via Suspense) the moment a
// nav link is clicked, so switching tabs feels immediate even while the server
// component awaits its data from the (remote) API. Shape mirrors the dashboards:
// a KPI card grid, two chart panels, and a wide table.
function Block({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-xl border border-white/[0.05] ${className}`} />
}

export default function Loading() {
  return (
    <main className="min-h-screen p-6 md:p-8" aria-busy="true" aria-label="Loading">
      {/* KPI grid — 2×4 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <Block key={i} className="h-[112px]" />
        ))}
      </div>

      {/* Two chart panels */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Block className="h-[220px]" />
        <Block className="h-[220px]" />
      </div>

      {/* Wide table / leaderboard */}
      <Block className="mt-5 h-[360px]" />
    </main>
  )
}
