import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: assignments } = await supabase
    .from("JobAssignment")
    .select(
      `
      userId,
      job:ServiceJob(id, description, location, boatId, startedAt,
        boat:Boat(name),
        category:ServiceCategory(name)
      )
    `
    )
    .gte("job.startedAt", today.toISOString())
    .lt("job.startedAt", tomorrow.toISOString());

  if (!assignments) {
    return new Response("No assignments", { status: 200 });
  }

  const byUser: Record<string, Array<Record<string, unknown>>> = {};
  for (const assignment of assignments as Array<{
    userId: string;
    job: Record<string, unknown>;
  }>) {
    if (!byUser[assignment.userId]) {
      byUser[assignment.userId] = [];
    }
    byUser[assignment.userId].push(assignment.job);
  }

  for (const [userId, jobs] of Object.entries(byUser)) {
    const jobList = jobs
      .map((job) => {
        const boat = job.boat as { name?: string } | undefined;
        const category = job.category as { name?: string } | undefined;
        return `• ${boat?.name ?? "Tekne"} — ${category?.name ?? "Servis"}`;
      })
      .join("\n");

    await supabase.from("Notification").insert({
      userId,
      type: "DAILY_REMINDER",
      title: `Bugün ${jobs.length} işin var`,
      body: jobList,
      isRead: false,
    });
  }

  return new Response(JSON.stringify({ notified: Object.keys(byUser).length }));
});
