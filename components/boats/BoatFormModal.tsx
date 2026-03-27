"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Ship } from "lucide-react";
import { useRouter } from "next/navigation";

import { createBoatAction } from "@/app/(dashboard)/boats/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialCreateBoatFormState } from "@/lib/boat-form";
import { boatTypeOptions, type JobFormBoatOption } from "@/lib/jobs";
import { useActionStateCompat } from "@/lib/use-action-state-compat";
import { cn } from "@/lib/utils";

type BoatFormModalProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: (boat: JobFormBoatOption) => void;
  trigger?: ReactNode;
  refreshOnSuccess?: boolean;
  title?: string;
  description?: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="h-11 w-full bg-marine-navy text-white hover:bg-marine-ocean"
      disabled={pending}
    >
      {pending ? "Kaydediliyor..." : "Tekneyi kaydet"}
    </Button>
  );
}

function BoatFormModalBody({
  onCreated,
  onSuccessClose,
  refreshOnSuccess,
  title,
  description,
}: {
  onCreated?: (boat: JobFormBoatOption) => void;
  onSuccessClose: () => void;
  refreshOnSuccess: boolean;
  title: string;
  description: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionStateCompat(createBoatAction, initialCreateBoatFormState);

  useEffect(() => {
    if (!state.createdBoat) {
      return;
    }

    onCreated?.(state.createdBoat);

    if (refreshOnSuccess) {
      router.refresh();
    }

    onSuccessClose();
  }, [onCreated, onSuccessClose, refreshOnSuccess, router, state.createdBoat]);

  return (
    <DialogContent className="max-w-xl p-0 sm:max-w-xl">
      <DialogHeader className="border-b border-slate-200 px-6 py-5">
        <DialogTitle className="flex items-center gap-2 text-marine-navy">
          <Ship className="size-5 text-marine-ocean" />
          {title}
        </DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      <form action={formAction} className="space-y-5 px-6 py-5">
        <div className="space-y-2">
          <Label htmlFor="boat-modal-name">Tekne adi</Label>
          <Input
            id="boat-modal-name"
            name="name"
            className="h-11"
            placeholder="M/V Bonita"
            aria-invalid={Boolean(state.fieldErrors.name)}
          />
          {state.fieldErrors.name ? (
            <p className="text-sm text-red-600">{state.fieldErrors.name}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="boat-modal-type">Tekne tipi</Label>
          <select
            id="boat-modal-type"
            name="type"
            defaultValue={boatTypeOptions[0]}
            className={cn(
              "h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors",
              state.fieldErrors.type
                ? "border-red-300 ring-2 ring-red-100"
                : "focus:border-ring focus:ring-3 focus:ring-ring/50"
            )}
          >
            {boatTypeOptions.map((boatType) => (
              <option key={boatType} value={boatType}>
                {boatType}
              </option>
            ))}
          </select>
          {state.fieldErrors.type ? (
            <p className="text-sm text-red-600">{state.fieldErrors.type}</p>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="boat-modal-owner">Sahibi</Label>
            <Input id="boat-modal-owner" name="ownerName" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="boat-modal-home-port">Ana marina</Label>
            <Input id="boat-modal-home-port" name="homePort" className="h-11" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="boat-modal-flag">Bayrak</Label>
          <Input id="boat-modal-flag" name="flag" className="h-11" />
        </div>

        {state.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}

        <SubmitButton />
      </form>
    </DialogContent>
  );
}

export default function BoatFormModal({
  open,
  onOpenChange,
  onCreated,
  trigger,
  refreshOnSuccess = false,
  title = "Yeni tekne ekle",
  description = "Tekne rehberine yeni kayit ekleyin. Is formu bu kaydi hemen kullanabilir.",
}: BoatFormModalProps) {
  const isControlled = typeof open === "boolean";
  const [internalOpen, setInternalOpen] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const resolvedOpen = isControlled ? open : internalOpen;

  function handleOpenChange(nextOpen: boolean) {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }

    if (!nextOpen) {
      setSessionKey((current) => current + 1);
    }

    onOpenChange?.(nextOpen);
  }

  function handleSuccessClose() {
    handleOpenChange(false);
  }

  return (
    <Dialog open={resolvedOpen} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger
          render={
            <Button
              type="button"
              className="h-11 gap-2 bg-marine-navy text-white hover:bg-marine-ocean"
            />
          }
        >
          <Plus className="size-4" />
          {trigger}
        </DialogTrigger>
      ) : null}

      {resolvedOpen ? (
        <BoatFormModalBody
          key={sessionKey}
          onCreated={onCreated}
          onSuccessClose={handleSuccessClose}
          refreshOnSuccess={refreshOnSuccess}
          title={title}
          description={description}
        />
      ) : null}
    </Dialog>
  );
}
