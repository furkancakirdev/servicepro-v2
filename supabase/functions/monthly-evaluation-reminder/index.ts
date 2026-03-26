import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ReminderRecipient = {
  id: string;
};

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();

  if (now.getDate() < 25) {
    return new Response(JSON.stringify({ created: 0, skipped: "before-threshold" }));
  }

  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthLabel = new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
  }).format(now);
  const monthStart = new Date(year, now.getMonth(), 1).toISOString();

  const [
    { data: adminUsers },
    { data: coordinatorUsers },
    { data: workshopUsers },
    { count: technicianCount },
    { count: workshopCount },
    { count: coordinatorCount },
    { data: existingNotifications },
  ] = await Promise.all([
    supabase.from("User").select("id").eq("role", "ADMIN"),
    supabase.from("User").select("id").eq("role", "COORDINATOR"),
    supabase.from("User").select("id").eq("role", "WORKSHOP_CHIEF"),
    supabase.from("User").select("id", { count: "exact", head: true }).eq("role", "TECHNICIAN"),
    supabase
      .from("MonthlyEvaluation")
      .select("id", { count: "exact", head: true })
      .eq("month", month)
      .eq("year", year)
      .eq("evaluatorType", "WORKSHOP_CHIEF"),
    supabase
      .from("MonthlyEvaluation")
      .select("id", { count: "exact", head: true })
      .eq("month", month)
      .eq("year", year)
      .eq("evaluatorType", "TECHNICAL_COORDINATOR"),
    supabase
      .from("Notification")
      .select("userId,type,metadata")
      .in("type", ["MISSING_WORKSHOP_EVAL", "MISSING_COORDINATOR_EVAL"])
      .gte("createdAt", monthStart),
  ]);

  const missingWorkshopCount = Math.max((technicianCount ?? 0) - (workshopCount ?? 0), 0);
  const missingCoordinatorCount = Math.max(
    (technicianCount ?? 0) - (coordinatorCount ?? 0),
    0
  );

  const existingMonthlyKeys = new Set(
    (existingNotifications ?? [])
      .map((notification) => {
        const metadata = notification.metadata as { month?: number; year?: number } | null;

        if (!metadata?.month || !metadata?.year) {
          return null;
        }

        return `${notification.userId}:${notification.type}:${metadata.year}-${metadata.month}`;
      })
      .filter(Boolean) as string[]
  );

  const workshopReminderRecipients = [
    ...((workshopUsers ?? []) as ReminderRecipient[]),
    ...((adminUsers ?? []) as ReminderRecipient[]),
  ];
  const coordinatorReminderRecipients = [
    ...((coordinatorUsers ?? []) as ReminderRecipient[]),
    ...((adminUsers ?? []) as ReminderRecipient[]),
  ];

  const notificationsToCreate = [
    ...(missingWorkshopCount > 0
      ? workshopReminderRecipients
          .filter(
            (recipient) =>
              !existingMonthlyKeys.has(
                `${recipient.id}:MISSING_WORKSHOP_EVAL:${year}-${month}`
              )
          )
          .map((recipient) => ({
            userId: recipient.id,
            type: "MISSING_WORKSHOP_EVAL",
            title: "Aylık usta değerlendirmesi bekleniyor",
            body: `${monthLabel} için ${missingWorkshopCount} teknisyenin Form 2 değerlendirmesi eksik.`,
            isRead: false,
            metadata: { month, year },
          }))
      : []),
    ...(missingCoordinatorCount > 0
      ? coordinatorReminderRecipients
          .filter(
            (recipient) =>
              !existingMonthlyKeys.has(
                `${recipient.id}:MISSING_COORDINATOR_EVAL:${year}-${month}`
              )
          )
          .map((recipient) => ({
            userId: recipient.id,
            type: "MISSING_COORDINATOR_EVAL",
            title: "Aylık koordinatör değerlendirmesi bekleniyor",
            body: `${monthLabel} için ${missingCoordinatorCount} teknisyenin Form 3 değerlendirmesi eksik.`,
            isRead: false,
            metadata: { month, year },
          }))
      : []),
  ];

  if (notificationsToCreate.length === 0) {
    return new Response(JSON.stringify({ created: 0 }));
  }

  const { error } = await supabase.from("Notification").insert(notificationsToCreate);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ created: notificationsToCreate.length }), {
    headers: { "content-type": "application/json" },
  });
});
