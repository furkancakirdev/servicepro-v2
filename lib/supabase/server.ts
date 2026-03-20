import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getSupabaseServerEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return {
    url,
    anonKey,
    isConfigured:
      Boolean(url) &&
      Boolean(anonKey) &&
      !url?.includes("your_supabase_url") &&
      !anonKey?.includes("your_supabase_anon_key"),
  };
}

export function isSupabaseConfigured() {
  return getSupabaseServerEnv().isConfigured;
}

export function createServerSupabaseClient() {
  const { url, anonKey, isConfigured } = getSupabaseServerEnv();

  if (!isConfigured || !url || !anonKey) {
    throw new Error(
      "Supabase ayarlari eksik. .env.local icindeki NEXT_PUBLIC_SUPABASE_* degerlerini guncelle."
    );
  }

  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        try {
          cookieStore.set(name, value, options);
        } catch {
          // Server Components içinde set denemeleri bazı render akışlarında yoksayılabilir.
        }
      },
      remove(name, options) {
        try {
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        } catch {
          // Server Components içinde remove denemeleri bazı render akışlarında yoksayılabilir.
        }
      },
    },
  });
}
