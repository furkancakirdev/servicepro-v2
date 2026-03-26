import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Role } from "@prisma/client";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { requireAppUser } from "@/lib/auth";
import { getNotificationCenterData } from "@/lib/notifications";

function getOperationsStatus(role: Role) {
  return role === Role.TECHNICIAN ? "Mobil operasyon gorunumu" : "Canli operasyon gorunumu";
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await requireAppUser();
  const notificationCenter = await getNotificationCenterData(currentUser.id);
  const now = new Date();
  const todayLabel = format(now, "d MMMM yyyy", { locale: tr });
  const operationsStatus = getOperationsStatus(currentUser.role);

  return (
    <div className="min-h-screen bg-marine-mist md:grid md:grid-cols-[280px_minmax(0,1fr)]">
      <Sidebar currentUser={currentUser} />
      <div className="relative flex min-h-screen flex-col">
        <Header
          currentUser={currentUser}
          notificationCenter={notificationCenter}
          todayLabel={todayLabel}
          operationsStatus={operationsStatus}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
