import { createClient } from "@/lib/supabase/server";
import { getGoogleAccessToken } from "@/lib/google-tokens";
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { addDays, startOfDay, endOfDay } from "date-fns";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { session } } = await supabase.auth.getSession();

  const { token, reauth_needed } = await getGoogleAccessToken(
    supabase,
    user.id,
    session?.provider_token
  );

  if (!token) {
    return NextResponse.json({
      error: "Googleカレンダーへのアクセス権限がありません。ログアウトして再度ログインしてください。",
      events: [],
      reauth_needed: true,
    });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") ?? "7");

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });

    const calendar = google.calendar({ version: "v3", auth });

    const now = new Date();
    const timeMin = startOfDay(now).toISOString();
    const timeMax = endOfDay(addDays(now, days - 1)).toISOString();

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      maxResults: 50,
      singleEvents: true,
      orderBy: "startTime",
    });

    return NextResponse.json({ events: response.data.items ?? [] });
  } catch (err: unknown) {
    console.error("Google Calendar sync error:", err);
    const message = err instanceof Error ? err.message : "Googleカレンダーへのアクセスエラー";
    // トークン期限切れの場合は reauth_needed を返す
    const isAuthError =
      message.includes("invalid_grant") ||
      message.includes("Token has been expired") ||
      message.includes("401");
    return NextResponse.json({
      error: message,
      events: [],
      reauth_needed: isAuthError,
    });
  }
}
