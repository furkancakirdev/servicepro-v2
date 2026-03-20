"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Send } from "lucide-react";

import { publishDailyPlans } from "@/app/(dashboard)/dispatch/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DispatchPublishDialogProps = {
  dateIso: string;
  planDateLabel: string;
  workshopTR: string;
  workshopEN: string;
  fieldTR: string;
  fieldEN: string;
  publishedPlans: Array<{
    location: string;
    publishedAt: string | null;
  }>;
};

function PublishedState({
  publishedPlans,
}: {
  publishedPlans: DispatchPublishDialogProps["publishedPlans"];
}) {
  const latestPlan = publishedPlans
    .filter((plan) => plan.publishedAt)
    .sort((left, right) =>
      (right.publishedAt ?? "").localeCompare(left.publishedAt ?? "")
    )[0];

  if (!latestPlan?.publishedAt) {
    return <span className="text-xs text-slate-500">Bugun henuz yayinlanmadi</span>;
  }

  return (
    <span className="text-xs text-emerald-700">
      Son yayin: {new Date(latestPlan.publishedAt).toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  );
}

function TemplatePanel({
  title,
  body,
  onCopy,
}: {
  title: string;
  body: string;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium text-marine-navy">{title}</div>
          <div className="text-sm text-slate-500">
            Sablon panoya kopyalanir, ardindan WhatsApp grubunda paylasilabilir.
          </div>
        </div>
        <Button type="button" variant="outline" className="gap-2" onClick={onCopy}>
          <Copy className="size-4" />
          Kopyala
        </Button>
      </div>
      <textarea
        readOnly
        value={body}
        className="min-h-[280px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none"
      />
    </div>
  );
}

export default function DispatchPublishDialog({
  dateIso,
  planDateLabel,
  workshopTR,
  workshopEN,
  fieldTR,
  fieldEN,
  publishedPlans,
}: DispatchPublishDialogProps) {
  const [open, setOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  async function handleCopy(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  function handlePublish() {
    setPublishMessage(null);
    startTransition(async () => {
      await publishDailyPlans({
        dateIso,
        workshopTR,
        workshopEN,
        fieldTR,
        fieldEN,
      });
      setPublishMessage("Plan yayinlandi. Teknik ekibe push placeholder bildirimi olusturuldu.");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="h-12 bg-marine-navy text-white hover:bg-marine-ocean" />
        }
      >
        <Send className="size-4" />
        Plan Yayinla
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-slate-200 px-6 py-5">
          <DialogTitle className="text-marine-navy">
            Gunluk plan yayinlama merkezi
          </DialogTitle>
          <DialogDescription>
            {planDateLabel} icin atolye ve saha sablonlari hazir. Kopyalayip gruplara
            gonderebilir, ardindan tek tusla plan yayini kaydini olusturabilirsiniz.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <PublishedState publishedPlans={publishedPlans} />
            {copiedKey ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <Check className="size-3.5" />
                {copiedKey} panoya kopyalandi
              </div>
            ) : null}
          </div>

          <Tabs defaultValue="workshop" className="gap-4">
            <TabsList className="bg-slate-100">
              <TabsTrigger value="workshop">Yatmarin / Netsel sablonu</TabsTrigger>
              <TabsTrigger value="field">Saha sablonu</TabsTrigger>
            </TabsList>

            <TabsContent value="workshop" className="space-y-4">
              <TemplatePanel
                title="Turkce atolye brifingi"
                body={workshopTR}
                onCopy={() => handleCopy("Atolye TR", workshopTR)}
              />
              <TemplatePanel
                title="English workshop briefing"
                body={workshopEN}
                onCopy={() => handleCopy("Workshop EN", workshopEN)}
              />
            </TabsContent>

            <TabsContent value="field" className="space-y-4">
              <TemplatePanel
                title="Turkce saha cikisi"
                body={fieldTR}
                onCopy={() => handleCopy("Saha TR", fieldTR)}
              />
              <TemplatePanel
                title="English field briefing"
                body={fieldEN}
                onCopy={() => handleCopy("Field EN", fieldEN)}
              />
            </TabsContent>
          </Tabs>

          {publishMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {publishMessage}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button
              type="button"
              className="h-12 bg-marine-navy text-white hover:bg-marine-ocean"
              onClick={handlePublish}
              disabled={isPending}
            >
              {isPending ? "Yayinlaniyor..." : "Plan yayini kaydini olustur"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
