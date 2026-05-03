import { createClient } from "@/lib/supabase/server";
import { analyzeDiaryEntry } from "@/lib/anthropic";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { date, content, goals_planned, goals_achieved, recent_entries } = body;

  try {
    const analysis = await analyzeDiaryEntry(
      content,
      goals_planned ?? [],
      goals_achieved ?? [],
      recent_entries ?? []
    );

    // Persiste o resultado da análise
    await supabase
      .from("diary_entries")
      .upsert(
        {
          user_id: user.id,
          date,
          content,
          goals_planned: goals_planned ?? [],
          goals_achieved: goals_achieved ?? [],
          mood_score: analysis.mood_score,
          mood_keywords: analysis.mood_keywords,
          ai_feedback: analysis.feedback,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,date" }
      );

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("Analyze error:", err);
    return NextResponse.json(
      { error: "Falha ao analisar com IA. Tente novamente." },
      { status: 500 }
    );
  }
}
