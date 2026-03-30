"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

function getToastMessage(key: string | null) {
  switch (key) {
    case "personnel-created":
      return { type: "success", message: "Personel oluşturuldu" };
    case "role-updated":
      return { type: "success", message: "Personel rolu güncellendi" };
    case "boat-saved":
      return { type: "success", message: "Tekne kaydi güncellendi" };
    case "category-saved":
      return { type: "success", message: "Kategori kaydedildi" };
    case "category-created":
      return { type: "success", message: "Kategori oluşturuldu" };
    case "system-saved":
      return { type: "success", message: "Sistem ayari güncellendi" };
    default:
      return null;
  }
}

export default function RouteToastListener() {
  const searchParams = useSearchParams();
  const lastSignatureRef = useRef<string>("");

  useEffect(() => {
    const signature = searchParams.toString();

    if (!signature || signature === lastSignatureRef.current) {
      return;
    }

    lastSignatureRef.current = signature;

    if (searchParams.get("created") === "1") {
      toast.success("?? oluşturuldu");
    }

    if (searchParams.get("updated") === "1") {
      toast.success("Durum güncellendi");
    }

    if (searchParams.get("badge") === "1") {
      toast.success("Rozet hesaplamasi tamamlandi");
    }

    if (searchParams.get("objection") === "1") {
      toast.success("Puan itirazı gönderildi");
    }

    if (searchParams.get("reviewed")) {
      toast.success("Puanlama güncellendi");
    }

    const mappedToast = getToastMessage(searchParams.get("toast"));

    if (mappedToast) {
      if (mappedToast.type === "success") {
        toast.success(mappedToast.message);
      } else {
        toast.error(mappedToast.message);
      }
    }

    const error = searchParams.get("error");

    if (error) {
      toast.error(decodeURIComponent(error));
    }
  }, [searchParams]);

  return null;
}

