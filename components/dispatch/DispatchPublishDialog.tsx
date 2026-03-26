"use client";

import { useTransition } from "react";
import { CheckCircle2, Copy, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { publishDailyPlans } from "@/app/(dashboard)/dispatch/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DispatchPublishedPlanLogEntry } from "@/lib/dispatch";

type DispatchPublishDialogProps = {
  dateIso: string;
  planDateLabel: string;
  workshopTR: string;
  workshopEN: string;
  fieldTR: string;
  fieldEN: string;
  publishedPlans: DispatchPublishedPlanLogEntry[];
};

function TemplatePanel({
  title,
  description,
  body,
  onCopy,
}: {
  title: string;
  description: string;
  body: string;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium text-marine-navy">{title}</div>
          <div className="text-sm text-slate-500">{description}</div>
        </div>
        <Button type="button" variant="outline" className="gap-2" onClick={onCopy}>
          <Copy className="size-4" />
          Kopyala
        </Button>
      </div>
      <textarea
        readOnly
        value={body}
        className="min-h-[320px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none"
      />
    </div>
  );
}

function PublishLog({ publishedPlans }: { publishedPlans: DispatchPublishedPlanLogEntry[] }) {
  if (publishedPlans.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
        Bu tarih için henüz yayın kaydı yok.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-sm font-medium text-marine-navy">Yayın logu</div>
      {publishedPlans.map((plan) => (
        <div
          key={`${plan.location}-${plan.publishedAt ?? "draft"}`}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
        >
          <div>
            <div className="font-medium text-marine-navy">{plan.location}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">
              {plan.publishedAtLabel ?? "Taslak"}{" "}
              {plan.publishedByName ? `• ${plan.publishedByName}` : ""}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium">
            <span
              className={`rounded-full px-2 py-1 ${
                plan.hasTRTemplate
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              TR
            </span>
            <span
              className={`rounded-full px-2 py-1 ${
                plan.hasENTemplate
                  ? "bg-sky-100 text-sky-800"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              EN
            </span>
          </div>
        </div>
      ))}
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} kopyalandı.`);
    } catch {
      toast.error(`${label} kopyalanamadı. Metni manuel olarak seçip kopyalayın.`);
    }
  }

  function handlePublish() {
    startTransition(async () => {
      try {
        await publishDailyPlans({
          dateIso,
          workshopTR,
          workshopEN,
          fieldTR,
          fieldEN,
        });
        toast.success("Plan yayınlandı. Güncel log ekrana yansıtılıyor.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Plan yayınlanırken bir hata oluştu."
        );
      }
    });
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button className="h-12 bg-marine-navy text-white hover:bg-marine-ocean" />
        }
      >
        <Send className="size-4" />
        Plan yayınla
      </DialogTrigger>
      <DialogContent className="max-w-5xl p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-slate-200 px-6 py-5">
          <DialogTitle className="text-marine-navy">Günlük plan yayınlama merkezi</DialogTitle>
          <DialogDescription>
            {planDateLabel} için TR ve EN şablonları ayrı preview, kopyalama ve yayın logu ile
            hazır.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <PublishLog publishedPlans={publishedPlans} />

          <Tabs defaultValue="workshop" className="gap-4">
            <TabsList className="bg-slate-100">
              <TabsTrigger value="workshop">Yatmarin / Netsel</TabsTrigger>
              <TabsTrigger value="field">Saha</TabsTrigger>
            </TabsList>

            <TabsContent value="workshop" className="space-y-4">
              <Tabs defaultValue="tr" className="gap-4">
                <TabsList className="bg-slate-100">
                  <TabsTrigger value="tr">TR preview</TabsTrigger>
                  <TabsTrigger value="en">EN preview</TabsTrigger>
                </TabsList>

                <TabsContent value="tr">
                  <TemplatePanel
                    title="Yatmarin / Netsel TR"
                    description="Türkçe ekip duyurusu. Doğrudan WhatsApp grubuna yapıştırabilirsiniz."
                    body={workshopTR}
                    onCopy={() => void copyToClipboard(workshopTR, "Yatmarin / Netsel TR şablonu")}
                  />
                </TabsContent>

                <TabsContent value="en">
                  <TemplatePanel
                    title="Yatmarin / Netsel EN"
                    description="English preview for mixed-language crew communication."
                    body={workshopEN}
                    onCopy={() => void copyToClipboard(workshopEN, "Yatmarin / Netsel EN şablonu")}
                  />
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="field" className="space-y-4">
              <Tabs defaultValue="tr" className="gap-4">
                <TabsList className="bg-slate-100">
                  <TabsTrigger value="tr">TR preview</TabsTrigger>
                  <TabsTrigger value="en">EN preview</TabsTrigger>
                </TabsList>

                <TabsContent value="tr">
                  <TemplatePanel
                    title="Saha TR"
                    description="Saha ekip çıkışı ve dönüş saatlerini içeren Türkçe şablon."
                    body={fieldTR}
                    onCopy={() => void copyToClipboard(fieldTR, "Saha TR şablonu")}
                  />
                </TabsContent>

                <TabsContent value="en">
                  <TemplatePanel
                    title="Saha EN"
                    description="English field-operation preview with departure and return details."
                    body={fieldEN}
                    onCopy={() => void copyToClipboard(fieldEN, "Saha EN şablonu")}
                  />
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button
              type="button"
              className="h-12 gap-2 bg-marine-navy text-white hover:bg-marine-ocean"
              onClick={handlePublish}
              disabled={isPending}
            >
              <CheckCircle2 className="size-4" />
              {isPending ? "Yayınlanıyor..." : "Planı yayınla"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
