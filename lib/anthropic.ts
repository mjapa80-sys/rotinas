import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface DiaryAnalysis {
  mood_score: number;
  mood_keywords: string[];
  accomplished: string[];
  goals_comparison: string;
  feedback: string;
  patterns: string | null;
}

export async function analyzeDiaryEntry(
  content: string,
  goalsPlanned: string[],
  goalsAchieved: string[],
  recentEntries?: { date: string; mood_score: number; content: string }[]
): Promise<DiaryAnalysis> {
  const recentContext =
    recentEntries && recentEntries.length > 0
      ? `\n\nEntradas recentes para análise de padrões:\n${recentEntries
          .map(
            (e) =>
              `${e.date} (humor: ${e.mood_score}/10): ${e.content.substring(0, 150)}...`
          )
          .join("\n")}`
      : "";

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system:
      "Você é um assistente pessoal empático. Analise entradas de diário e retorne APENAS JSON válido, sem texto extra.",
    messages: [
      {
        role: "user",
        content: `Analise esta entrada de diário e responda em JSON.

ENTRADA:
${content}

METAS PLANEJADAS:
${goalsPlanned.length ? goalsPlanned.map((g) => `- ${g}`).join("\n") : "Nenhuma"}

METAS REALIZADAS:
${goalsAchieved.length ? goalsAchieved.map((g) => `- ${g}`).join("\n") : "Nenhuma marcada"}
${recentContext}

Responda APENAS com este JSON (sem markdown, sem texto extra):
{
  "mood_score": <1-10>,
  "mood_keywords": ["<palavra1>", "<palavra2>", "<palavra3>"],
  "accomplished": ["<realização1>", "<realização2>"],
  "goals_comparison": "<análise breve das metas vs realizações>",
  "feedback": "<mensagem encorajadora e específica em 2-3 frases>",
  "patterns": "<padrões comportamentais identificados, ou null>"
}`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text.trim() : "{}";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Resposta da IA em formato inválido");

  return JSON.parse(jsonMatch[0]) as DiaryAnalysis;
}
