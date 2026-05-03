import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const recent = searchParams.get("recent");

  if (date) {
    const { data: entry } = await supabase
      .from("diary_entries")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date)
      .single();
    return NextResponse.json({ entry: entry ?? null });
  }

  if (recent) {
    const days = parseInt(recent) || 7;
    const { data: entries } = await supabase
      .from("diary_entries")
      .select("id, date, content, mood_score, mood_keywords")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(days);
    return NextResponse.json({ entries: entries ?? [] });
  }

  return NextResponse.json({ error: "Missing params" }, { status: 400 });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { date, content, goals_planned, goals_achieved } = body;

  const { data, error } = await supabase
    .from("diary_entries")
    .upsert(
      {
        user_id: user.id,
        date,
        content,
        goals_planned: goals_planned ?? [],
        goals_achieved: goals_achieved ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data });
}
