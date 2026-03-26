"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ScoreboardRealtime() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 30_000);

    return () => {
      clearInterval(interval);
    };
  }, [router]);

  return null;
}
