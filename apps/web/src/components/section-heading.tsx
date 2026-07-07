// Shared panel/section heading with a signature gold accent bar.
// Keeps the gold rhythm consistent across every dashboard surface.
export function SectionHeading({
  children,
  right,
}: {
  children: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="flex items-center gap-2 text-[10px] font-semibold tracking-widest uppercase text-gray-400">
        <span className="h-3 w-[2px] rounded-full bg-gradient-to-b from-[#c9a96e] to-[#c9a96e]/20" />
        {children}
      </h3>
      {right}
    </div>
  )
}
