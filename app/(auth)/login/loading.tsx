import Skeleton from "@/components/ui/Skeleton";

export default function LoginLoading() {
  return (
    <div className="rounded-[32px] border border-border/70 bg-card p-8 shadow-panel">
      <div className="space-y-4">
        <Skeleton className="h-4 w-28 rounded-full" />
        <Skeleton className="h-8 w-1/2 rounded-2xl" />
        <Skeleton className="h-12 rounded-2xl" />
        <Skeleton className="h-12 rounded-2xl" />
        <Skeleton className="h-12 rounded-2xl" />
      </div>
    </div>
  );
}
