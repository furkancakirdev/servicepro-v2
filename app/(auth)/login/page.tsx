"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Anchor, ArrowRight, LockKeyhole, Mail } from "lucide-react";

import { login } from "@/app/(auth)/login/actions";
import { initialLoginState } from "@/app/(auth)/login/state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="lg"
      className="h-12 w-full bg-marine-navy text-white hover:bg-marine-ocean"
      disabled={pending}
    >
      {pending ? "Giris yapiliyor..." : "ServicePRO'ya Giris"}
      {!pending && <ArrowRight className="size-4" />}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(login, initialLoginState);

  return (
    <Card className="border-white/70 bg-white/90 shadow-panel backdrop-blur">
      <CardHeader className="space-y-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-marine-navy text-white shadow-lg shadow-marine-navy/20">
            <Anchor className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-marine-ocean">
              Marlin Yachting
            </p>
            <CardTitle className="text-2xl text-marine-navy">ServicePRO</CardTitle>
          </div>
        </div>
        <CardDescription className="text-sm leading-6 text-slate-600">
          Servis operasyonlari, dispatch ve performans akisini tek ekranda yonetin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="ornek@marlin.com"
                className="h-12 pl-10"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Sifre</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                className="h-12 pl-10"
                autoComplete="current-password"
              />
            </div>
          </div>

          {state.error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.error}
            </div>
          ) : null}

          <SubmitButton />
        </form>

        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
          Seed tamamlandiginda ornek hesaplar: admin@marlin.com, ismail@marlin.com
          ve tech1@marlin.com. Varsayilan sifre: admin123.
        </div>
      </CardContent>
    </Card>
  );
}
