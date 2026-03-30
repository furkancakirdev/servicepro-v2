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
import type { DispatchPublishedPlanLogEntry } from "@/lib/dispatch/types";

type DispatchPublishDialogProps = {
  dateIso: string;
  planDateLabel: string;
  dailyTR: string;
  dailyEN: string;
  publishedPlans: DispatchPublishedPlanLogEntry[];
};

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
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium text-marine-navy">{title}</div>
        <Button type="button" variant="outline" className="gap-2" onClick={onCopy}>
          <Copy className="size-4" />
          Kopyala
        </Button>
      </div>
      <textarea
        readOnly
        value={body}
        className="min-h-[320px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none"
      />
    </div>
  );
}

function PublishLog({ publishedPlans }: { publishedPlans: DispatchPublishedPlanLogEntry[] }) {
  if (publishedPlans.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
        Bu tarih icin henuz yayin kaydi yok.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-sm font-medium text-marine-navy">Yayin logu</div>
      {publishedPlans.map((plan) => (
        <div
          key={`${plan.location}-${plan.publishedAt ?? "draft"}`}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
        >
          <div>
            <div className="font-medium text-marine-navy">{plan.locationLabel}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">
              {plan.publishedAtLabel ?? "Taslak"}
              {plan.publishedByName ? ` • ${plan.publishedByName}` : ""}
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
  dailyTR,
  dailyEN,
  publishedPlans,
}: DispatchPublishDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} kopyalandi.`);
    } catch {
      toast.error(`${label} kopyalanamadi. Metni manuel olarak secip kopyalayin.`);
    }
  }

  function handlePublish() {
    startTransition(async () => {
      try {
        await publishDailyPlans({
          dateIso,
          dailyTR,
          dailyEN,
        });
        toast.success("Plan yayinlandi. Guncel log ekrana yansitiliyor.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Plan yayinlanirken bir hata olustu."
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
        Plan yayinla
      </DialogTrigger>
      <DialogContent className="max-w-5xl p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-slate-200 px-6 py-5">
          <DialogTitle className="text-marine-navy">Gunluk yayin merkezi</DialogTitle>
          <DialogDescription>
            {planDateLabel} icin tek mesaji TR ve EN olarak yayinlayabilirsiniz.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <PublishLog publishedPlans={publishedPlans} />

          <div className="grid gap-4 xl:grid-cols-2">
            <TemplatePanel
              title="TR preview"
              body={dailyTR}
              onCopy={() => void copyToClipboard(dailyTR, "TR sablonu")}
            />
            <TemplatePanel
              title="EN preview"
              body={dailyEN}
              onCopy={() => void copyToClipboard(dailyEN, "EN sablonu")}
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              className="h-12 gap-2 bg-marine-navy text-white hover:bg-marine-ocean"
              onClick={handlePublish}
              disabled={isPending}
            >
              <CheckCircle2 className="size-4" />
              {isPending ? "Yayinlaniyor..." : "Mesaji yayinla"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
