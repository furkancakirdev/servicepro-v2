"use client";

import { useTransition } from "react";
import { Send } from "lucide-react";
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
    return <span className="text-xs text-slate-500">Bug?n hen?z yay?nlanmad?.</span>;
  }

  return (
    <span className="text-xs text-emerald-700">
      Son yay?n: {new Date(latestPlan.publishedAt).toLocaleTimeString("tr-TR", {
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
            ?ablonu kopyalay?p do?rudan WhatsApp grubuna yap??t?rabilirsiniz.
          </div>
        </div>
        <Button type="button" variant="outline" className="gap-2" onClick={onCopy}>
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

export default function DispatchPublishDialog({
  dateIso,
  planDateLabel,
  workshopTR,
  workshopEN,
  fieldTR,
  fieldEN,
  publishedPlans,
}: DispatchPublishDialogProps) {
  const [isPending, startTransition] = useTransition();

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("?ablon kopyaland? ? WhatsApp'a yap??t?rabilirsin");
    } catch {
      const element = document.createElement("textarea");
      element.value = text;
      document.body.appendChild(element);
      element.select();
      document.execCommand("copy");
      document.body.removeChild(element);
      toast.success("Kopyaland?");
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
        toast.success("Plan yay?nland?.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Plan yay?nlan?rken bir hata olu?tu."
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
        Plan Yay?nla
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-slate-200 px-6 py-5">
          <DialogTitle className="text-marine-navy">G?nl?k plan yay?nlama merkezi</DialogTitle>
          <DialogDescription>
            {planDateLabel} i?in Yatmarin/Netsel ve saha WhatsApp ?ablonlar? haz?r.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <PublishedState publishedPlans={publishedPlans} />
          </div>

          <Tabs defaultValue="workshop" className="gap-4">
            <TabsList className="bg-slate-100">
              <TabsTrigger value="workshop">Yatmarin / Netsel ?ablonu</TabsTrigger>
              <TabsTrigger value="field">Saha ?ablonu</TabsTrigger>
            </TabsList>

            <TabsContent value="workshop" className="space-y-4">
              <TemplatePanel
                title="Yatmarin / Netsel ?ablonu"
                body={workshopTR}
                onCopy={() => void copyToClipboard(workshopTR)}
              />
            </TabsContent>

            <TabsContent value="field" className="space-y-4">
              <TemplatePanel
                title="Saha ?ablonu"
                body={fieldTR}
                onCopy={() => void copyToClipboard(fieldTR)}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button
              type="button"
              className="h-12 bg-marine-navy text-white hover:bg-marine-ocean"
              onClick={handlePublish}
              disabled={isPending}
            >
              {isPending ? "Yay?nlan?yor..." : "Plan? Yay?nla"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
