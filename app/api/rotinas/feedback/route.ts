import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];

  const { data: items } = await supabase
    .from("routine_items")
    .select("*")
    .eq("user_id", user.id);

  const { data: completions } = await supabase
    .from("routine_completions")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today);

  const { data: todos } = await supabase
    .from("todos")
    .select("*")
    .eq("user_id", user.id);

  const completedIds = new Set((completions ?? []).filter(c => c.completed).map(c => c.routine_item_id));
  const totalRoutines = (items ?? []).length;
  const completedRoutines = (items ?? []).filter(i => completedIds.has(i.id));
  const pendingRoutines = (items ?? []).filter(i => !completedIds.has(i.id));

  const completedTodos = (todos ?? []).filter(t => t.completed && t.completed_at?.startsWith(today));
  const pendingTodos = (todos ?? []).filter(t => !t.completed);

  const prompt = `あなたは親しみやすく励ましてくれる個人アシスタントです。以下の情報をもとに、その日の振り返りを日本語で短く（3〜5文）フィードバックしてください。親友のような温かいトーンで、ポジティブかつ正直に。

日付: ${today}

ルーティン (${completedRoutines.length}/${totalRoutines} 完了):
- 完了: ${completedRoutines.map(i => i.title).join("、") || "なし"}
- 未完了: ${pendingRoutines.map(i => i.title).join("、") || "なし"}

タスク:
- 今日完了したもの: ${completedTodos.map(t => t.title).join("、") || "なし"}
- まだ残っているもの: ${pendingTodos.map(t => t.title).join("、") || "なし"}

今日うまくいったことを褒め、明日に向けてシンプルなアドバイスを一つ添えてください。`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const feedback = message.content[0].type === "text" ? message.content[0].text : "";
  return NextResponse.json({ feedback });
}
