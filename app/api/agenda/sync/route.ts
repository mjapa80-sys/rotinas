import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { addDays, startOfDay, endOfDay } from "date-fns";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const providerToken = session.provider_token;
  if (!providerToken) {
    return NextResponse.json(
      {
        error:
          "Token do Google Calendar não encontrado. Faça logout e entre novamente para conceder acesso ao Calendar.",
        events: [],
      },
      { status: 200 }
    );
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") ?? "7");

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: providerToken });

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
    console.error("Google Calendar error:", err);
    const message = err instanceof Error ? err.message : "Erro ao acessar Google Calendar";
    return NextResponse.json({ error: message, events: [] }, { status: 200 });
  }
}
