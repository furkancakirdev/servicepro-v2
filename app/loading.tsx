export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-marine-mist px-6">
      <div className="w-full max-w-xl rounded-[32px] border border-white/70 bg-white p-8 shadow-panel">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 rounded-full bg-slate-200" />
          <div className="h-10 w-3/4 rounded-2xl bg-slate-200" />
          <div className="h-24 rounded-[28px] bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
