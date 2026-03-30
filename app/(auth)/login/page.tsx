"use client";

import { Suspense, useState } from "react";
import { useFormStatus } from "react-dom";
import { Anchor, ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

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
import { useActionStateCompat } from "@/lib/use-action-state-compat";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="lg"
      className="h-12 w-full bg-marine-navy text-white hover:bg-marine-ocean"
      disabled={pending}
    >
      {pending ? "Giriş yapılıyor..." : "ServicePRO'ya Giriş"}
      {!pending && <ArrowRight className="size-4" />}
    </Button>
  );
}

function LoginCard({ nextPath }: { nextPath: string }) {
  const [state, formAction] = useActionStateCompat(login, initialLoginState);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const toast = searchParams.get("toast");

  return (
    <Card className="border-white/70 bg-white/90 shadow-panel backdrop-blur">
      <CardHeader className="space-y-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-marine-navy text-white shadow-lg shadow-marine-navy/20">
            <Anchor className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-marine-ocean">
              Marlin
            </p>
            <CardTitle className="text-2xl text-marine-navy">ServicePRO</CardTitle>
          </div>
        </div>
        <CardDescription className="text-sm leading-6 text-slate-600">
          Servis operasyonları, dispatch ve performans akışını tek ekranda yönetin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        {toast === "password-updated" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Parolanız güncellendi. Yeni şifrenizle tekrar giriş yapabilirsiniz.
          </div>
        ) : null}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="next" value={nextPath} />

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
                inputMode="email"
                required
                aria-invalid={Boolean(state.error)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Şifre</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="h-12 pl-10 pr-11"
                autoComplete="current-password"
                required
                minLength={6}
                aria-invalid={Boolean(state.error)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-marine-navy"
                aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {state.error ? (
            <div className="animate-fade-in rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.error}
            </div>
          ) : null}

          <SubmitButton />
        </form>

        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>Girişte sorun yaşıyorsanız destek ekibiyle iletişime geçin.</span>
          <Link
            href="/forgot-password"
            className="font-medium text-marine-navy transition-colors hover:text-marine-ocean"
          >
            Şifremi Unuttum
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/";

  return <LoginCard nextPath={nextPath} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginCard nextPath="/" />}>
      <LoginPageContent />
    </Suspense>
  );
}
