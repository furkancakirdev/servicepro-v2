"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  createClientSupabaseClient,
  isBrowserSupabaseConfigured,
} from "@/lib/supabase/client";

export default function ScoreboardRealtime() {
  const router = useRouter();

  useEffect(() => {
    if (!isBrowserSupabaseConfigured()) {
      return undefined;
    }

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const supabase = createClientSupabaseClient();
    const scheduleRefresh = () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      refreshTimer = setTimeout(() => {
        router.refresh();
      }, 400);
    };

    const channel = supabase
      .channel("scoreboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "JobScore" },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "MonthlyEvaluation" },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
