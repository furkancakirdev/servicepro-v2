"use client";

import Link from "next/link";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <Card className="border-white/70 bg-white/90 shadow-panel backdrop-blur">
      <CardHeader className="space-y-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-marine-navy text-white shadow-lg shadow-marine-navy/20">
            <KeyRound className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-marine-ocean">
              Marlin
            </p>
            <CardTitle className="text-2xl text-marine-navy">Şifre Sıfırla</CardTitle>
          </div>
        </div>
        <CardDescription className="text-sm leading-6 text-slate-600">
          Self-host edilen NAS sürümünde otomatik e-posta tabanlı şifre sıfırlama kapalıdır.
          Şifre güncellemesi için şirket yöneticiniz veya sistem sorumlunuz ile iletişime geçin.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 pt-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 size-4 shrink-0" />
            <p>
              SMTP kurulumu istenirse bu ekran daha sonra yeniden aktif edilebilir. Şimdilik
              parolalar yönetici tarafından sıfırlanmalıdır.
            </p>
          </div>
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-marine-navy transition-colors hover:text-marine-ocean"
        >
          <ArrowLeft className="size-4" />
          Giriş ekranına dön
        </Link>
      </CardContent>
    </Card>
  );
}
