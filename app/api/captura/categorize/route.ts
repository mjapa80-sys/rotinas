import { anthropic } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = await request.json();
  if (!content) return NextResponse.json({ error: "Missing content" }, { status: 400 });

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `Analise este texto e retorne APENAS JSON válido com categoria e data (se mencionada).

Texto: "${content}"

Categorias possíveis: tarefa, prova, evento, lembrete, outro

Responda APENAS com JSON:
{"category": "<categoria>", "date": "<YYYY-MM-DD ou null>"}`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text.trim() : "{}";
    const match = text.match(/\{[\s\S]*\}/);
    const result = match ? JSON.parse(match[0]) : { category: "outro", date: null };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ category: "outro", date: null });
  }
}
