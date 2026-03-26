"use client";

import { LogOut } from "lucide-react";

import { logout } from "@/app/(auth)/logout/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LogoutButtonProps = {
  compact?: boolean;
  className?: string;
};

export default function LogoutButton({ compact = false, className }: LogoutButtonProps) {
  return (
    <form action={logout}>
      <Button
        type="submit"
        variant="outline"
        className={cn(
          "border-marine-ocean/20 bg-white text-marine-navy hover:bg-marine-ocean/5",
          compact ? "h-9 w-9 px-0" : "h-10 gap-2 px-3",
          className
        )}
      >
        <LogOut className="size-4" />
        {compact ? <span className="sr-only">Çıkış yap</span> : "Çıkış Yap"}
      </Button>
    </form>
  );
}
