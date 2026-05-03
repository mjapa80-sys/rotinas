"use client";

import { useEffect, useState } from "react";
import { format, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Sparkles,
  Check,
  TrendingUp,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";

interface Goal {
  text: string;
  done: boolean;
}

interface DiaryAnalysis {
  mood_score: number;
  mood_keywords: string[];
  accomplished: string[];
  goals_comparison: string;
  feedback: string;
  patterns: string | null;
}

interface DiaryEntry {
  id?: string;
  date: string;
  content: string;
  mood_score?: number;
  mood_keywords?: string[];
  ai_feedback?: string;
  goals_planned?: string[];
  goals_achieved?: string[];
}

export default function DiarioPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [content, setContent] = useState("");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoal, setNewGoal] = useState("");
  const [analysis, setAnalysis] = useState<DiaryAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [recentEntries, setRecentEntries] = useState<DiaryEntry[]>([]);
  const [loadingEntry, setLoadingEntry] = useState(false);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const dateLabel = format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR });
  const isToday = dateStr === format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    loadEntry(dateStr);
    loadRecentEntries();
  }, [dateStr]);

  const loadEntry = async (date: string) => {
    setLoadingEntry(true);
    setAnalysis(null);
    try {
      const res = await fetch(`/api/diario?date=${date}`);
      const data = await res.json();
      if (data.entry) {
        setContent(data.entry.content ?? "");
        const combined = [
          ...(data.entry.goals_planned ?? []).map((g: string) => ({
            text: g,
            done: (data.entry.goals_achieved ?? []).includes(g),
          })),
        ];
        setGoals(combined);
        if (data.entry.mood_score) {
          setAnalysis({
            mood_score: data.entry.mood_score,
            mood_keywords: data.entry.mood_keywords ?? [],
            accomplished: [],
            goals_comparison: "",
            feedback: data.entry.ai_feedback ?? "",
            patterns: null,
          });
        }
      } else {
        setContent("");
        setGoals([]);
      }
    } finally {
      setLoadingEntry(false);
    }
  };

  const loadRecentEntries = async () => {
    const res = await fetch("/api/diario?recent=7");
    const data = await res.json();
    setRecentEntries(data.entries ?? []);
  };

  const addGoal = () => {
    if (!newGoal.trim()) return;
    setGoals([...goals, { text: newGoal.trim(), done: false }]);
    setNewGoal("");
  };

  const toggleGoal = (i: number) => {
    setGoals(goals.map((g, idx) => (idx === i ? { ...g, done: !g.done } : g)));
  };

  const removeGoal = (i: number) => {
    setGoals(goals.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/diario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: dateStr,
        content,
        goals_planned: goals.map((g) => g.text),
        goals_achieved: goals.filter((g) => g.done).map((g) => g.text),
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAnalyze = async () => {
    if (!content.trim()) return;
    setAnalyzing(true);

    // Salva antes de analisar
    await handleSave();

    try {
      const recentForAI = recentEntries
        .filter((e) => e.date !== dateStr && e.mood_score)
        .slice(0, 3)
        .map((e) => ({
          date: e.date,
          mood_score: e.mood_score!,
          content: e.content,
        }));

      const res = await fetch("/api/diario/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr,
          content,
          goals_planned: goals.map((g) => g.text),
          goals_achieved: goals.filter((g) => g.done).map((g) => g.text),
          recent_entries: recentForAI,
        }),
      });
      const data = await res.json();
      if (data.analysis) {
        setAnalysis(data.analysis);
        loadRecentEntries();
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const moodColor = (score: number) => {
    if (score >= 7) return "bg-green-100 text-green-700 border-green-200";
    if (score >= 4) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  const moodBar = (score: number) => {
    const pct = (score / 10) * 100;
    const color = score >= 7 ? "bg-green-400" : score >= 4 ? "bg-amber-400" : "bg-red-400";
    return (
      <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
        <div
          className={`${color} h-2 rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Diário" subtitle={isToday ? "Hoje" : dateLabel} />

      {/* Navegação de data */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          className="p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <p className="text-sm font-medium text-gray-700 capitalize">
          {isToday ? "Hoje" : dateLabel}
        </p>
        <button
          onClick={() => setSelectedDate(new Date(Math.min(new Date(dateStr).getTime() + 86400000, new Date().getTime())))}
          disabled={isToday}
          className="p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="px-4 space-y-4">
        {/* Metas do dia */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">🎯 Metas do dia</h3>
          <div className="space-y-2">
            {goals.map((goal, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  onClick={() => toggleGoal(i)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    goal.done
                      ? "bg-primary-600 border-primary-600"
                      : "border-gray-300"
                  }`}
                >
                  {goal.done && <Check className="w-3 h-3 text-white" />}
                </button>
                <span
                  className={`text-sm flex-1 ${
                    goal.done ? "line-through text-gray-400" : "text-gray-700"
                  }`}
                >
                  {goal.text}
                </span>
                <button onClick={() => removeGoal(i)} className="text-gray-300 hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addGoal()}
              placeholder="Adicionar meta..."
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
            <button
              onClick={addGoal}
              className="bg-primary-100 text-primary-700 p-2 rounded-xl hover:bg-primary-200"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Entrada do diário */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">📝 Como foi seu dia?</h3>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva livremente... o que aconteceu, como você se sentiu, o que aprendeu..."
            className="w-full text-sm text-gray-700 border-none outline-none min-h-[140px] leading-relaxed placeholder:text-gray-300"
          />
        </div>

        {/* Botões */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 disabled:opacity-50"
          >
            {saved ? "✓ Salvo!" : saving ? "Salvando..." : "Salvar"}
          </button>
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !content.trim()}
            className="flex-1 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary-700 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {analyzing ? "Analisando..." : "Analisar com IA"}
          </button>
        </div>

        {/* Resultado da análise */}
        {analysis && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-500" />
              <h3 className="font-semibold text-gray-800 text-sm">Análise do dia</h3>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Humor</span>
                <span className={`text-sm font-bold px-2 py-0.5 rounded-full border ${moodColor(analysis.mood_score)}`}>
                  {analysis.mood_score}/10
                </span>
              </div>
              {moodBar(analysis.mood_score)}
            </div>

            {analysis.mood_keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {analysis.mood_keywords.map((k) => (
                  <span key={k} className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full">
                    {k}
                  </span>
                ))}
              </div>
            )}

            {analysis.goals_comparison && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 font-medium mb-1">Metas vs realizações</p>
                <p className="text-sm text-gray-700">{analysis.goals_comparison}</p>
              </div>
            )}

            {analysis.feedback && (
              <div className="bg-primary-50 rounded-xl p-3">
                <p className="text-xs text-primary-600 font-medium mb-1">✨ Feedback</p>
                <p className="text-sm text-primary-900">{analysis.feedback}</p>
              </div>
            )}

            {analysis.patterns && (
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-xs text-amber-600 font-medium mb-1">📊 Padrões identificados</p>
                <p className="text-sm text-amber-900">{analysis.patterns}</p>
              </div>
            )}
          </div>
        )}

        {/* Entradas recentes */}
        {recentEntries.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-700 text-sm px-1 mb-2">Últimos dias</h3>
            <div className="space-y-2">
              {recentEntries.slice(0, 5).map((entry) => {
                const entryDate = parseISO(entry.date);
                return (
                  <button
                    key={entry.date}
                    onClick={() => setSelectedDate(entryDate)}
                    className={`w-full flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm text-left ${
                      entry.date === dateStr ? "ring-2 ring-primary-400" : ""
                    }`}
                  >
                    <div className="w-10 text-center">
                      <p className="text-xs text-gray-400">{format(entryDate, "EEE", { locale: ptBR })}</p>
                      <p className="text-base font-bold text-gray-700">{format(entryDate, "d")}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 truncate">
                        {entry.content?.substring(0, 60) ?? "Sem texto"}...
                      </p>
                    </div>
                    {entry.mood_score && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${moodColor(entry.mood_score)}`}>
                        {entry.mood_score}/10
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
