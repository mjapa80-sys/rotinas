import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const forwardedHost = request.headers.get("x-forwarded-host");
  const redirectBase = forwardedHost ? `https://${forwardedHost}` : origin;

  console.log("[auth/callback] code present:", !!code);
  console.log("[auth/callback] redirectBase:", redirectBase);

  if (code) {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const codeVerifierCookie = allCookies.find(c => c.name.includes("code-verifier"));
    console.log("[auth/callback] total cookies:", allCookies.length);
    console.log("[auth/callback] code-verifier cookie present:", !!codeVerifierCookie);

    const pendingCookies: { name: string; value: string; options?: Record<string, unknown> }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            pendingCookies.push(...cookiesToSet);
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    console.log("[auth/callback] exchange error:", error?.message ?? "none");
    console.log("[auth/callback] session present:", !!data?.session);

    if (!error && data?.session) {
      // GoogleトークンをDBに保存（モバイルでのセッション更新後も使えるよう）
      if (data.session.provider_token || data.session.provider_refresh_token) {
        try {
          await supabase.from("user_tokens").upsert({
            user_id: data.session.user.id,
            google_access_token: data.session.provider_token ?? null,
            google_refresh_token: data.session.provider_refresh_token ?? null,
            token_expiry: new Date(Date.now() + 3_600_000).toISOString(),
            updated_at: new Date().toISOString(),
          });
          console.log("[auth/callback] google tokens saved");
        } catch (e) {
          console.error("[auth/callback] token save failed:", e);
        }
      }

      const response = NextResponse.redirect(`${redirectBase}${next}`);
      pendingCookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
      });
      return response;
    }

    console.log("[auth/callback] redirecting to auth_failed");
  }

  return NextResponse.redirect(`${redirectBase}/login?error=auth_failed`);
}
