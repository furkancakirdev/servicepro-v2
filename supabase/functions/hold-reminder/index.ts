import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();

  const { data: overdueJobs } = await supabase
    .from("ServiceJob")
    .select("id, description, holdReason, holdUntil, createdById, boat:Boat(name)")
    .eq("status", "BEKLEMEDE")
    .lte("holdUntil", now.toISOString());

  if (!overdueJobs?.length) {
    return new Response("No overdue", { status: 200 });
  }

  for (const job of overdueJobs as Array<{
    id: string;
    holdReason?: string | null;
    createdById: string;
    boat?: { name?: string } | null;
  }>) {
    await supabase.from("Notification").insert({
      userId: job.createdById,
      type: "HOLD_OVERDUE",
      title: `Bekleyen iş: ${job.boat?.name ?? "Tekne"}`,
      body: `Bekleme süresi doldu — ${(job.holdReason ?? "DİĞER").replace(/_/g, " ")}`,
      isRead: false,
      metadata: { jobId: job.id },
    });
  }

  return new Response(JSON.stringify({ reminded: overdueJobs.length }));
});
