"use client";

import { Suspense } from "react";
import { ArrowLeft, KeyRound, LockKeyhole } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { logout } from "@/app/(auth)/logout/actions";
import { completePasswordActivation } from "@/app/(auth)/reset-password/actions";
import { initialResetPasswordActionState } from "@/app/(auth)/reset-password/state";
import { useActionStateCompat } from "@/lib/use-action-state-compat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function ResetPasswordCard() {
  const [state, formAction] = useActionStateCompat(
    completePasswordActivation,
    initialResetPasswordActionState
  );
  const searchParams = useSearchParams();
  const isFirstLogin = searchParams.get("firstLogin") === "1";

  return (
    <Card className="border-white/70 bg-white/90 shadow-panel backdrop-blur">
      <CardHeader className="space-y-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-marine-navy text-white shadow-lg shadow-marine-navy/20">
            <KeyRound className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-marine-ocean">
              Marlin Yachting
            </p>
            <CardTitle className="text-2xl text-marine-navy">Şifre Aktivasyonu</CardTitle>
          </div>
        </div>
        <CardDescription className="text-sm leading-6 text-slate-600">
          {isFirstLogin
            ? "İlk girişinizi tamamlamak için geçici parolanızı değiştirin."
            : "Güvenlik için mevcut parolanızı doğrulayıp yeni parolanızı belirleyin."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 pt-6">
        {isFirstLogin ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
            Bu hesap geçici parola ile oluşturuldu. Yeni parola tanımlanmadan uygulama alanlarına
            erişim açılmaz.
          </div>
        ) : null}

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Geçici / mevcut parola</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                className="h-12 pl-10"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">Yeni parola</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              minLength={8}
              className="h-12"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Yeni parola (tekrar)</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              minLength={8}
              className="h-12"
              autoComplete="new-password"
              required
            />
          </div>

          {state.error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.error}
            </div>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full bg-marine-navy text-white hover:bg-marine-ocean"
          >
            Parolayı Güncelle
          </Button>
        </form>

        <form action={logout}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 text-sm font-medium text-marine-navy transition-colors hover:text-marine-ocean"
          >
            <ArrowLeft className="size-4" />
            Güvenli çıkış
          </button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordCard />}>
      <ResetPasswordCard />
    </Suspense>
  );
}
