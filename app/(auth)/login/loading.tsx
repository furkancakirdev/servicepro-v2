export default function LoginLoading() {
  return (
    <div className="rounded-[32px] border border-white/70 bg-white p-8 shadow-panel">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-28 rounded-full bg-slate-200" />
        <div className="h-8 w-1/2 rounded-2xl bg-slate-200" />
        <div className="h-12 rounded-2xl bg-slate-100" />
        <div className="h-12 rounded-2xl bg-slate-100" />
        <div className="h-12 rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}
