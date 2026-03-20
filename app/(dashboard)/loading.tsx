export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`stat-${index}`}
            className="h-40 animate-pulse rounded-[28px] border border-white/70 bg-white shadow-panel"
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="space-y-6">
          <div className="h-56 animate-pulse rounded-[28px] border border-white/70 bg-white shadow-panel" />
          <div className="h-[28rem] animate-pulse rounded-[28px] border border-white/70 bg-white shadow-panel" />
        </div>
        <div className="space-y-6">
          <div className="h-80 animate-pulse rounded-[28px] border border-white/70 bg-white shadow-panel" />
          <div className="h-96 animate-pulse rounded-[28px] border border-white/70 bg-white shadow-panel" />
        </div>
      </div>
    </div>
  );
}
