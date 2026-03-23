"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Copy, MessageCircle, Send } from "lucide-react";

import { markClientNotificationSent } from "@/app/(dashboard)/jobs/actions";
import {
  buildClientNotificationTemplate,
  buildWhatsAppDeepLink,
} from "@/lib/client-notifications";
import { Button } from "@/components/ui/button";

type BoatContactItem = {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  language: string;
  isPrimary: boolean;
  whatsappOptIn: boolean;
};

type ClientNotificationItem = {
  id: string;
  templateLang: string;
  sentAt: string | null;
  confirmed: boolean;
  contact: {
    name: string;
  };
};

type ClientNotificationPanelProps = {
  jobId: string;
  boatName: string;
  categoryName: string;
  location: string | null;
  appointmentDateIso: string;
  technicianName: string;
  contacts: BoatContactItem[];
  notifications: ClientNotificationItem[];
};

export default function ClientNotificationPanel({
  jobId,
  boatName,
  categoryName,
  location,
  appointmentDateIso,
  technicianName,
  contacts,
  notifications,
}: ClientNotificationPanelProps) {
  const [selectedContactId, setSelectedContactId] = useState(
    contacts.find((contact) => contact.isPrimary && contact.phone)?.id ??
      contacts.find((contact) => contact.phone)?.id ??
      ""
  );
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedContact =
    contacts.find((contact) => contact.id === selectedContactId) ?? null;
  const template = useMemo(
    () =>
      selectedContact
        ? buildClientNotificationTemplate({
            boatName,
            categoryName,
            date: new Date(appointmentDateIso),
            location,
            berthDetail: location,
            technicianName,
            contactName: selectedContact.name,
            contactLanguage: selectedContact.language,
          })
        : null,
    [
      appointmentDateIso,
      boatName,
      categoryName,
      location,
      selectedContact,
      technicianName,
    ]
  );
  const waLink =
    selectedContact?.phone && template
      ? buildWhatsAppDeepLink(selectedContact.phone, template.text)
      : null;

  async function handleCopy() {
    if (!template) {
      return;
    }

    await navigator.clipboard.writeText(template.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  function handleMarkSent() {
    if (!selectedContact || !template) {
      return;
    }

    setStatusMessage(null);
    startTransition(async () => {
      await markClientNotificationSent({
        jobId,
        contactId: selectedContact.id,
        templateLang: template.language,
      });
      setStatusMessage("Bildirim kaydi oluşturuldu.");
    });
  }

  return (
    <div className="space-y-4">
      {contacts.length > 0 ? (
        <div className="space-y-2">
          <label className="text-sm font-medium text-marine-navy" htmlFor="contactId">
            ?rtibat secimi
          </label>
          <select
            id="contactId"
            value={selectedContactId}
            onChange={(event) => setSelectedContactId(event.target.value)}
            className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-marine-ocean/40 focus:ring-2 focus:ring-marine-ocean/10"
          >
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name} - {contact.role} ({contact.language})
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {template ? (
        <>
          <textarea
            readOnly
            value={template.text}
            className="min-h-[220px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none"
          />

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" className="gap-2" onClick={handleCopy}>
              <Copy className="size-4" />
              {copied ? "Kopyaland?" : "Panoya kopyala"}
            </Button>
            {waLink ? (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                <MessageCircle className="size-4" />
                WhatsApp ac
              </a>
            ) : null}
            <Button
              type="button"
              className="gap-2 bg-marine-navy text-white hover:bg-marine-ocean"
              onClick={handleMarkSent}
              disabled={isPending}
            >
              <Send className="size-4" />
              {isPending ? "Kaydediliyor..." : "G?nderildi olarak isaretle"}
            </Button>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
          WhatsApp icin telefonlu bir irtibat secin.
        </div>
      )}

      {statusMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {statusMessage}
        </div>
      ) : null}

      {notifications.length > 0 ? (
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="text-sm font-medium text-marine-navy">Son g?nderimler</div>
          {notifications.map((notification) => (
            <div key={notification.id} className="flex items-center justify-between gap-3 text-sm text-slate-600">
              <span>
                {notification.contact.name} Â· {notification.templateLang}
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <Check className="size-3.5" />
                {notification.sentAt
                  ? new Date(notification.sentAt).toLocaleString("tr-TR")
                  : "Kaydedildi"}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

