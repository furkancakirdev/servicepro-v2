import Skeleton from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={`stat-${index}`}
            className="h-40 rounded-[28px] border border-border/70 shadow-panel"
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="space-y-6">
          <Skeleton className="h-56 rounded-[28px] border border-border/70 shadow-panel" />
          <Skeleton className="h-[28rem] rounded-[28px] border border-border/70 shadow-panel" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-80 rounded-[28px] border border-border/70 shadow-panel" />
          <Skeleton className="h-96 rounded-[28px] border border-border/70 shadow-panel" />
        </div>
      </div>
    </div>
  );
}
