import { requireAppUser } from "@/lib/auth";
import { getNotificationCenterData } from "@/lib/dashboard";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await requireAppUser();
  const notificationCenter = await getNotificationCenterData(currentUser.id);

  return (
    <div className="min-h-screen bg-marine-mist md:grid md:grid-cols-[280px_minmax(0,1fr)]">
      <Sidebar currentUser={currentUser} />
      <div className="relative flex min-h-screen flex-col">
        <Header currentUser={currentUser} notificationCenter={notificationCenter} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
