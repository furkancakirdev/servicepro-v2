"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

function getToastMessage(key: string | null) {
  switch (key) {
    case "personnel-created":
      return { type: "success", message: "Personel olusturuldu" };
    case "role-updated":
      return { type: "success", message: "Personel rolu guncellendi" };
    case "boat-saved":
      return { type: "success", message: "Tekne kaydi guncellendi" };
    case "category-saved":
      return { type: "success", message: "Kategori kaydedildi" };
    case "category-created":
      return { type: "success", message: "Kategori olusturuldu" };
    case "system-saved":
      return { type: "success", message: "Sistem ayari guncellendi" };
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
      toast.success("Is olusturuldu");
    }

    if (searchParams.get("updated") === "1") {
      toast.success("Durum guncellendi");
    }

    if (searchParams.get("badge") === "1") {
      toast.success("Rozet hesaplamasi tamamlandi");
    }

    if (searchParams.get("objection") === "1") {
      toast.success("Puan itirazi gonderildi");
    }

    if (searchParams.get("reviewed")) {
      toast.success("Puanlama guncellendi");
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
