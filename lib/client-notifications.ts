import { format } from "date-fns";
import { tr } from "date-fns/locale";

import type { BoatContactLanguage } from "@/lib/boat-contacts";
import {
  generateClientNotificationEN,
  generateClientNotificationTR,
} from "@/lib/wa-templates";

export type ClientNotificationTemplateInput = {
  boatName: string;
  categoryName: string;
  date: Date;
  location: string | null | undefined;
  berthDetail?: string | null | undefined;
  technicianName: string;
  contactName: string;
  contactLanguage: BoatContactLanguage;
};

function normalizePhone(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

function resolveLanguage(language: BoatContactLanguage) {
  return language === "EN" ? "EN" : "TR";
}

export function buildClientNotificationTemplate(
  input: ClientNotificationTemplateInput
) {
  const language = resolveLanguage(input.contactLanguage);
  const dayTr = format(input.date, "EEEE", { locale: tr });
  const dateTr = format(input.date, "d MMMM yyyy", { locale: tr });
  const timeLabel = format(input.date, "HH:mm");
  const berth = input.berthDetail ?? input.location ?? "Marina alanı";

  if (language === "EN") {
    return {
      language,
      text: generateClientNotificationEN({
        captainName: input.contactName,
        boatName: input.boatName,
        day: format(input.date, "EEEE"),
        date: format(input.date, "MMM d, yyyy"),
        time: timeLabel,
        location: input.location ?? "Marina",
        berth,
        description: input.categoryName,
        technicianName: input.technicianName,
      }),
    };
  }

  return {
    language,
    text: generateClientNotificationTR({
      captainName: input.contactName,
      boatName: input.boatName,
      day: dayTr,
      date: dateTr,
      time: timeLabel,
      location: input.location ?? "Marina",
      berth,
      description: input.categoryName,
      technicianName: input.technicianName,
    }),
  };
}

export function buildWhatsAppDeepLink(phone: string, text: string) {
  const normalizedPhone = normalizePhone(phone);
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;
}
