import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const providerToken = session.provider_token;
  if (!providerToken) {
    return NextResponse.json({ error: "Token do Google Calendar não encontrado." }, { status: 401 });
  }

  const body = await request.json();
  const { title, date, startTime, endTime, location, description } = body;

  if (!title || !date) {
    return NextResponse.json({ error: "Título e data são obrigatórios." }, { status: 400 });
  }

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: providerToken });

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
    const message = err instanceof Error ? err.message : "Erro ao criar evento";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
