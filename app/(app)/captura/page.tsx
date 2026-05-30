"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { Zap, Sparkles, Calendar, Check, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import VoiceInput from "@/components/VoiceInput";

interface Capture {
  id: string;
  content: string;
  source: string;
  category?: string;
  scheduled_date?: string;
  processed: boolean;
  created_at: string;
}

const sources = [
  { value: "marista", label: "📚 マリスタ連絡" },
  { value: "whatsapp", label: "💬 WhatsApp" },
  { value: "pessoal", label: "💭 メモ" },
  { value: "reuniao", label: "📋 ミーティング" },
  { value: "outro", label: "📌 その他" },
];

const categories = [
  { value: "tarefa", label: "✅ タスク",   color: "bg-blue-100 text-blue-700" },
  { value: "prova",  label: "📝 テスト・課題", color: "bg-red-100 text-red-700" },
  { value: "evento", label: "🎉 イベント", color: "bg-purple-100 text-purple-700" },
  { value: "lembrete", label: "🔔 リマインダー", color: "bg-amber-100 text-amber-700" },
  { value: "outro",  label: "📌 その他",   color: "bg-gray-100 text-gray-700" },
];

export default function CapturaPage() {
  const [content, setContent] = useState("");
  const [source, setSource] = useState("marista");
  const [category, setCategory] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loadingCaptures, setLoadingCaptures] = useState(true);

  const loadCaptures = async () => {
    const res = await fetch("/api/captura?processed=false");
    const data = await res.json();
    setCaptures(data.captures ?? []);
    setLoadingCaptures(false);
  };

  useEffect(() => {
    loadCaptures();
  }, []);

  const handleSuggest = async () => {
    if (!content.trim()) return;
    setSuggesting(true);
    try {
      const res = await fetch("/api/captura/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.category) setCategory(data.category);
      if (data.date) setScheduledDate(data.date);
    } finally {
      setSuggesting(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    await fetch("/api/captura", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        source,
        category: category || "outro",
        scheduled_date: scheduledDate || null,
      }),
    });
    setSaving(false);
    setSavedOk(true);
    setContent("");
    setCategory("");
    setScheduledDate("");
    loadCaptures();
    setTimeout(() => setSavedOk(false), 2000);
  };

  const handleMarkDone = async (id: string) => {
    await fetch(`/api/captura?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ processed: true }),
    });
    loadCaptures();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/captura?id=${id}`, { method: "DELETE" });
    loadCaptures();
  };

  const catConfig = (cat?: string) =>
    categories.find((c) => c.value === cat) ?? categories[categories.length - 1];

  return (
    <div>
      <PageHeader
        title="クイックメモ"
        subtitle="すぐ記録、あとで整理"
      />

      <div className="px-4 space-y-4">
        {/* メモ入力エリア */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-semibold text-gray-700">何を記録しますか？</span>
            </div>
            <VoiceInput onTranscript={(t) => setContent((prev) => prev ? prev + " " + t : t)} />
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="ここに貼り付けるか入力してください... 例：「算数テスト5/10 第7・8章」「金曜19時から学校行事」"
            className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl p-3 min-h-[110px] focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            autoFocus
          />

          {/* ソース */}
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-1.5">どこからですか？</p>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSource(s.value)}
                  className={`text-xs px-2.5 py-1.5 rounded-full border transition-all ${
                    source === s.value
                      ? "bg-primary-600 text-white border-primary-600"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* AIカテゴリ提案 */}
          <button
            onClick={handleSuggest}
            disabled={suggesting || !content.trim()}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-primary-300 text-primary-600 text-sm hover:bg-primary-50 disabled:opacity-40"
          >
            <Sparkles className="w-4 h-4" />
            {suggesting ? "分類中..." : "AIでカテゴリを提案"}
          </button>

          {/* カテゴリ */}
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-1.5">カテゴリ</p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`text-xs px-2.5 py-1.5 rounded-full border transition-all ${
                    category === c.value
                      ? `${c.color} border-current`
                      : "bg-white text-gray-500 border-gray-200"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 日付 */}
          <div className="mt-3">
            <label className="text-xs text-gray-500 mb-1 block">
              <Calendar className="w-3 h-3 inline mr-1" />
              関連日（任意）
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-primary-400 text-gray-600"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="mt-4 w-full py-3 rounded-xl bg-primary-600 text-white font-semibold text-sm disabled:opacity-50"
          >
            {savedOk ? "✓ 記録しました！" : saving ? "保存中..." : "記録する"}
          </button>
        </div>

        {/* 未処理メモ */}
        <div>
          <h3 className="font-semibold text-gray-700 text-sm px-1 mb-2">
            未処理（{captures.length}）
          </h3>

          {loadingCaptures ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-xl p-3 shadow-sm">
                  <div className="h-3 bg-gray-100 rounded w-full animate-pulse mb-1" />
                  <div className="h-3 bg-gray-100 rounded w-2/3 animate-pulse" />
                </div>
              ))}
            </div>
          ) : captures.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              未処理のメモはありません 🎉
            </p>
          ) : (
            <div className="space-y-2">
              {captures.map((cap) => {
                const cat = catConfig(cap.category);
                const src = sources.find((s) => s.value === cap.source);
                return (
                  <div key={cap.id} className="bg-white rounded-xl p-3 shadow-sm">
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${cat.color}`}>
                            {cat.label}
                          </span>
                          {src && (
                            <span className="text-xs text-gray-400">{src.label}</span>
                          )}
                          {cap.scheduled_date && (
                            <span className="text-xs text-primary-600 font-medium">
                              📅 {format(parseISO(cap.scheduled_date), "M/d", { locale: ja })}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">{cap.content}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {format(parseISO(cap.created_at), "M/d HH:mm", { locale: ja })}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleMarkDone(cap.id)}
                          className="p-1.5 text-green-400 hover:bg-green-50 rounded-lg"
                          title="処理済みにする"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cap.id)}
                          className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
