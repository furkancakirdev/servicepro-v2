export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(30,107,168,0.16),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef5fb_48%,#f8fafc_100%)]" />
      <div className="absolute inset-0 bg-marine-grid bg-[size:42px_42px] opacity-30" />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
