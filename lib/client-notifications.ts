import { format } from "date-fns";
import { tr } from "date-fns/locale";

export type ClientNotificationTemplateInput = {
  boatName: string;
  categoryName: string;
  date: Date;
  location: string | null | undefined;
  berthDetail?: string | null | undefined;
  technicianName: string;
  contactName: string;
  contactLanguage: string;
};

function normalizePhone(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

function resolveLanguage(language: string) {
  const normalized = language.trim().toUpperCase();
  return normalized === "EN" ? "EN" : "TR";
}

export function buildClientNotificationTemplate(
  input: ClientNotificationTemplateInput
) {
  const language = resolveLanguage(input.contactLanguage);
  const dayTr = format(input.date, "EEEE", { locale: tr });
  const dateTr = format(input.date, "d MMMM yyyy", { locale: tr });
  const timeLabel = format(input.date, "HH:mm");
  const berth = input.berthDetail ?? input.location ?? "Marina alani";

  if (language === "EN") {
    return {
      language,
      text: `Dear Captain ${input.contactName},

This is a reminder for your upcoming service appointment.

Date: ${format(input.date, "EEEE, MMM d, yyyy")}
Time: ${timeLabel}
Location: ${input.location ?? "Marina"} - ${berth}
Service: ${input.categoryName}
Technician: ${input.technicianName}

Please confirm with 👍
Marlin Yachting Technical Service`,
    };
  }

  return {
    language,
    text: `Merhaba ${input.contactName},

${input.boatName} tekneniz icin randevunuzu hatirlatmak istedik.

Tarih: ${dayTr}, ${dateTr}
Saat: ${timeLabel}
Yer: ${input.location ?? "Marina"} - ${berth}
Is: ${input.categoryName}
Teknisyen: ${input.technicianName}

Onaylamak icin 👍 gonderebilirsiniz.
Marlin Yachting Teknik Servis`,
  };
}

export function buildWhatsAppDeepLink(phone: string, text: string) {
  const normalizedPhone = normalizePhone(phone);

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;
}
