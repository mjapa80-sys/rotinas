import { createClient } from "@/lib/supabase/server";
import { getGoogleAccessToken } from "@/lib/google-tokens";
import { google } from "googleapis";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
      reauth_needed: true,
    }, { status: 401 });
  }

  const body = await request.json();
  const { title, date, startTime, endTime, location, description } = body;

  if (!title || !date) {
    return NextResponse.json({ error: "タイトルと日付は必須です。" }, { status: 400 });
  }

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });

    const calendar = google.calendar({ version: "v3", auth });

    const isAllDay = !startTime;

    const event = isAllDay
      ? {
          summary: title,
          location,
          description,
          start: { date },
          end: { date },
        }
      : {
          summary: title,
          location,
          description,
          start: { dateTime: `${date}T${startTime}:00`, timeZone: "America/Sao_Paulo" },
          end: { dateTime: `${date}T${endTime || startTime}:00`, timeZone: "America/Sao_Paulo" },
        };

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    return NextResponse.json({ event: response.data });
  } catch (err: unknown) {
    console.error("Google Calendar create error:", err);
    const message = err instanceof Error ? err.message : "イベントの作成エラー";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
