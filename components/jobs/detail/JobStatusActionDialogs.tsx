"use client";

import { useFormStatus } from "react-dom";

import {
  cancelJobAction,
  closeAsWarrantyAction,
} from "@/app/(dashboard)/jobs/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type JobStatusActionDialogsProps = {
  jobId: string;
  showCancel: boolean;
  showWarranty: boolean;
};

function CancelSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="destructive"
      className="h-11"
      disabled={pending}
    >
      {pending ? "Iptal ediliyor..." : "Iptal Et"}
    </Button>
  );
}

function WarrantySubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="h-11 border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
      disabled={pending}
    >
      {pending ? "Garantiye aliniyor..." : "Garanti Olarak Kapat"}
    </Button>
  );
}

export default function JobStatusActionDialogs({
  jobId,
  showCancel,
  showWarranty,
}: JobStatusActionDialogsProps) {
  if (!showCancel && !showWarranty) {
    return null;
  }

  return (
    <div className="space-y-3">
      {showWarranty ? (
        <Dialog>
          <DialogTrigger
            render={
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full border-amber-200 text-amber-700 hover:bg-amber-50"
              />
            }
          >
            Garanti Olarak Kapat
          </DialogTrigger>
          <DialogContent className="max-w-lg p-0 sm:max-w-lg">
            <DialogHeader className="border-b border-slate-200 px-6 py-5">
              <DialogTitle className="text-marine-navy">
                Garanti Kapsaminda Kapat
              </DialogTitle>
              <DialogDescription>
                Bu isi garanti kapsaminda kapatmak istiyor musunuz? Garanti islerine
                puan yazilmaz.
              </DialogDescription>
            </DialogHeader>

            <form action={closeAsWarrantyAction} className="space-y-5 px-6 py-5">
              <input type="hidden" name="jobId" value={jobId} />

              <div className="space-y-2">
                <Label htmlFor={`warranty-note-${jobId}`}>Garanti notu</Label>
                <Textarea
                  id={`warranty-note-${jobId}`}
                  name="warrantyNote"
                  required
                  minLength={3}
                  rows={5}
                  placeholder="Isin neden garanti kapsaminda yapildigini aciklayin."
                />
              </div>

              <DialogFooter className="border-slate-200 bg-slate-50/70">
                <DialogClose render={<Button type="button" variant="outline" />}>
                  Vazgec
                </DialogClose>
                <WarrantySubmitButton />
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}

      {showCancel ? (
        <Dialog>
          <DialogTrigger
            render={
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full border-red-200 text-red-700 hover:bg-red-50"
              />
            }
          >
            Iptal Et
          </DialogTrigger>
          <DialogContent className="max-w-lg p-0 sm:max-w-lg">
            <DialogHeader className="border-b border-slate-200 px-6 py-5">
              <DialogTitle className="text-marine-navy">Isi Iptal Et</DialogTitle>
              <DialogDescription>
                Bu isi iptal etmek istediginize emin misiniz? Iptal edilen is tekrar
                acilamaz.
              </DialogDescription>
            </DialogHeader>

            <form action={cancelJobAction} className="space-y-5 px-6 py-5">
              <input type="hidden" name="jobId" value={jobId} />

              <div className="space-y-2">
                <Label htmlFor={`cancel-reason-${jobId}`}>Iptal sebebi</Label>
                <Textarea
                  id={`cancel-reason-${jobId}`}
                  name="cancelReason"
                  required
                  minLength={3}
                  rows={5}
                  placeholder="Iptal nedenini kisaca aciklayin."
                />
              </div>

              <DialogFooter className="border-slate-200 bg-slate-50/70">
                <DialogClose render={<Button type="button" variant="outline" />}>
                  Vazgec
                </DialogClose>
                <CancelSubmitButton />
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
