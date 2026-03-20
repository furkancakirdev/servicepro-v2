import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function hasSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    Boolean(url) &&
    Boolean(anonKey) &&
    !url?.includes("your_supabase_url") &&
    !anonKey?.includes("your_supabase_anon_key")
  );
}

function isProtectedPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/jobs") ||
    pathname.startsWith("/dispatch") ||
    pathname.startsWith("/boats") ||
    pathname.startsWith("/my-jobs") ||
    pathname.startsWith("/scoreboard") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/dashboard")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!hasSupabaseEnv()) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          request.cookies.set(name, value);
          response = NextResponse.next({ request });
          response.cookies.set(name, value, options);
        },
        remove(name, options) {
          request.cookies.set(name, "");
          response = NextResponse.next({ request });
          response.cookies.set(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
