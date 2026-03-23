"use client";

import { createBrowserClient } from "@supabase/ssr";

function getSupabaseClientEnv() {
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

export function isBrowserSupabaseConfigured() {
  return getSupabaseClientEnv().isConfigured;
}

export function createClientSupabaseClient() {
  const { url, anonKey, isConfigured } = getSupabaseClientEnv();

  if (!isConfigured || !url || !anonKey) {
    throw new Error(
      "Supabase ayarlari eksik. .env.local icindeki NEXT_PUBLIC_SUPABASE_* degerlerini güncelle."
    );
  }

  return createBrowserClient(url, anonKey);
}

export const createClient = createClientSupabaseClient;

