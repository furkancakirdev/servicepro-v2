import Skeleton from "@/components/ui/Skeleton";

export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-xl rounded-[32px] border border-border/70 bg-card p-8 shadow-panel">
        <div className="space-y-4">
          <Skeleton className="h-4 w-32 rounded-full" />
          <Skeleton className="h-10 w-3/4 rounded-2xl" />
          <Skeleton className="h-24 rounded-[28px]" />
        </div>
      </div>
    </div>
  );
}
