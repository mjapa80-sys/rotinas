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
      ? `\n\n最近の日記（パターン分析用）:\n${recentEntries
          .map(
            (e) =>
              `${e.date}（気分: ${e.mood_score}/10）: ${e.content.substring(0, 150)}...`
          )
          .join("\n")}`
      : "";

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system:
      "あなたは共感力のある個人アシスタントです。日記の内容を分析し、有効なJSONのみを返してください。余分なテキストは不要です。",
    messages: [
      {
        role: "user",
        content: `この日記の内容を分析してJSONで答えてください。

日記の内容:
${content}

計画した目標:
${goalsPlanned.length ? goalsPlanned.map((g) => `- ${g}`).join("\n") : "なし"}

達成した目標:
${goalsAchieved.length ? goalsAchieved.map((g) => `- ${g}`).join("\n") : "なし"}
${recentContext}

以下のJSON形式のみで答えてください（マークダウン不要）:
{
  "mood_score": <1〜10の数字>,
  "mood_keywords": ["<キーワード1>", "<キーワード2>", "<キーワード3>"],
  "accomplished": ["<達成1>", "<達成2>"],
  "goals_comparison": "<目標と達成の簡単な比較>",
  "feedback": "<2〜3文の励ましと具体的なフィードバック>",
  "patterns": "<行動パターンの分析、またはnull>"
}`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text.trim() : "{}";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AIの応答が不正な形式です");

  return JSON.parse(jsonMatch[0]) as DiaryAnalysis;
}
