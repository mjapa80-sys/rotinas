"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Plus,
  Calendar,
  Heart,
  Map,
  BookOpen,
  Bell,
  ChevronRight,
  Zap,
  LogOut,
} from "lucide-react";

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  location?: string;
}

interface HealthRecord {
  id: string;
  title: string;
  doctor_name?: string;
  scheduled_at: string;
  location?: string;
  type: string;
}

interface FuturePlan {
  id: string;
  title: string;
  category: string;
  reminder_date: string;
  status: string;
}

interface DiaryEntry {
  mood_score?: number;
  mood_keywords?: string[];
}

export default function DashboardPage() {
  const [user, setUser] = useState<{ email?: string; user_metadata?: { full_name?: string } } | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [health, setHealth] = useState<HealthRecord[]>([]);
  const [plans, setPlans] = useState<FuturePlan[]>([]);
  const [diary, setDiary] = useState<DiaryEntry | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const supabase = createClient();
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const greeting = () => {
    const h = today.getHours();
    if (h < 12) return "おはようございます";
    if (h < 18) return "こんにちは";
    return "こんばんは";
  };

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? "";

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    fetch("/api/agenda/sync?days=1")
      .then((r) => r.json())
      .then((data) => {
        setEvents(data.events ?? []);
        setLoadingEvents(false);
      })
      .catch(() => setLoadingEvents(false));

    fetch("/api/saude?upcoming=2")
      .then((r) => r.json())
      .then((data) => setHealth(data.records ?? []));

    fetch("/api/planos?reminder=pending")
      .then((r) => r.json())
      .then((data) => setPlans(data.plans ?? []));

    fetch(`/api/diario?date=${todayStr}`)
      .then((r) => r.json())
      .then((data) => setDiary(data.entry ?? null));
  }, []);

  const moodColor = (score?: number) => {
    if (!score) return "bg-gray-100 text-gray-500";
    if (score >= 7) return "bg-green-100 text-green-700";
    if (score >= 4) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };

  const moodEmoji = (score?: number) => {
    if (!score) return "—";
    if (score >= 8) return "😊";
    if (score >= 6) return "🙂";
    if (score >= 4) return "😐";
    if (score >= 2) return "😕";
    return "😔";
  };

  const categoryLabel: Record<string, string> = {
    viagem: "✈️ 旅行",
    evento: "🎉 イベント",
    encontro: "👥 集まり",
    outro: "📌 その他",
  };

  return (
    <div className="px-4 pt-6 space-y-5">
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-sm">{format(today, "M月d日（E）", { locale: ja })}</p>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting()}{firstName ? `、${firstName}` : ""}！👋
          </h1>
        </div>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/login";
          }}
          className="flex items-center gap-1.5 text-xs text-gray-400 mt-1 px-2 py-1.5 rounded-xl hover:bg-gray-100"
        >
          <LogOut className="w-3.5 h-3.5" />
          ログアウト
        </button>
      </div>

      {/* クイックキャプチャ */}
      <Link
        href="/captura"
        className="flex items-center gap-3 bg-primary-600 text-white rounded-2xl p-4 shadow-lg shadow-primary-200 active:scale-[0.98] transition-transform"
      >
        <div className="bg-white/20 rounded-xl p-2">
          <Zap className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">クイックメモ</p>
          <p className="text-white/70 text-xs">気になったことをすぐ記録</p>
        </div>
        <Plus className="w-5 h-5 text-white/80" />
      </Link>

      {/* 今日の日記 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary-500" />
            <span className="font-semibold text-sm text-gray-700">今日の日記</span>
          </div>
          <Link href="/diario" className="text-xs text-primary-600 font-medium flex items-center gap-0.5">
            開く <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {diary ? (
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${moodColor(diary.mood_score)}`}>
              {moodEmoji(diary.mood_score)} 気分 {diary.mood_score ?? "—"}/10
            </span>
            {diary.mood_keywords && diary.mood_keywords.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {diary.mood_keywords.slice(0, 2).map((k) => (
                  <span key={k} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {k}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">今日はまだ記録していません。書いてみましょう！</p>
        )}
      </div>

      {/* 今日の予定 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-sm text-gray-700">今日の予定</span>
          </div>
          <Link href="/agenda" className="text-xs text-primary-600 font-medium flex items-center gap-0.5">
            すべて見る <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {loadingEvents ? (
          <div className="space-y-2">
            <div className="h-4 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
          </div>
        ) : events.length > 0 ? (
          <div className="space-y-2">
            {events.slice(0, 3).map((event) => {
              const time = event.start.dateTime
                ? format(new Date(event.start.dateTime), "HH:mm")
                : "終日";
              return (
                <div key={event.id} className="flex items-start gap-2">
                  <span className="text-xs text-gray-400 w-10 shrink-0 pt-0.5">{time}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{event.summary}</p>
                    {event.location && (
                      <p className="text-xs text-gray-400">{event.location}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Googleカレンダーに今日の予定はありません。</p>
        )}
      </div>

      {/* 近い健診・診察 */}
      {health.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" />
              <span className="font-semibold text-sm text-gray-700">もうすぐの健康予定</span>
            </div>
            <Link href="/saude" className="text-xs text-primary-600 font-medium flex items-center gap-0.5">
              すべて見る <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {health.map((rec) => (
              <div key={rec.id} className="flex items-start gap-2">
                <span className="text-xs text-gray-400 shrink-0 pt-0.5 w-16">
                  {format(new Date(rec.scheduled_at), "M/d")}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{rec.title}</p>
                  {rec.doctor_name && (
                    <p className="text-xs text-gray-400">{rec.doctor_name}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* プランのリマインダー */}
      {plans.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-600" />
              <span className="font-semibold text-sm text-amber-800">プランのリマインダー</span>
            </div>
            <Link href="/planos" className="text-xs text-amber-700 font-medium flex items-center gap-0.5">
              すべて見る <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {plans.slice(0, 3).map((plan) => (
              <div key={plan.id} className="flex items-center gap-2">
                <span className="text-xs">{categoryLabel[plan.category] ?? "📌"}</span>
                <p className="text-sm font-medium text-amber-900">{plan.title}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-2">💡 これらのプランは決断を待っています！</p>
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}
