"use client";

import { useEffect, useState } from "react";
import { format, addDays, isToday, isTomorrow } from "date-fns";
import { ja } from "date-fns/locale";
import { RefreshCw, MapPin, Clock, AlertCircle, Plus, X } from "lucide-react";
import PageHeader from "@/components/PageHeader";

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  description?: string;
}

interface DayGroup {
  date: Date;
  events: CalendarEvent[];
}

interface NewEvent {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
}

const emptyEvent: NewEvent = {
  title: "",
  date: format(new Date(), "yyyy-MM-dd"),
  startTime: "",
  endTime: "",
  location: "",
  description: "",
};

export default function AgendaPage() {
  const [groups, setGroups] = useState<DayGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newEvent, setNewEvent] = useState<NewEvent>(emptyEvent);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadEvents = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/agenda/sync?days=7");
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setGroups([]);
        return;
      }

      const events: CalendarEvent[] = data.events ?? [];

      const grouped: Record<string, CalendarEvent[]> = {};
      events.forEach((event) => {
        const dateKey = event.start.dateTime
          ? format(new Date(event.start.dateTime), "yyyy-MM-dd")
          : event.start.date ?? "";
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(event);
      });

      const days: DayGroup[] = Array.from({ length: 7 }).map((_, i) => {
        const date = addDays(new Date(), i);
        const key = format(date, "yyyy-MM-dd");
        return { date, events: grouped[key] ?? [] };
      });

      setGroups(days);
    } catch {
      setError("Googleカレンダーと同期できませんでした。");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleSave = async () => {
    if (!newEvent.title || !newEvent.date) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/agenda/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent),
      });
      const data = await res.json();
      if (data.error) {
        setSaveError(data.error);
        return;
      }
      setShowForm(false);
      setNewEvent(emptyEvent);
      await loadEvents();
    } catch {
      setSaveError("イベントの保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  const dayLabel = (date: Date) => {
    if (isToday(date)) return "今日";
    if (isTomorrow(date)) return "明日";
    return format(date, "M月d日（E）", { locale: ja });
  };

  const timeLabel = (event: CalendarEvent) => {
    if (event.start.dateTime) {
      const start = format(new Date(event.start.dateTime), "HH:mm");
      const end = event.end.dateTime
        ? format(new Date(event.end.dateTime), "HH:mm")
        : "";
      return end ? `${start} – ${end}` : start;
    }
    return "終日";
  };

  return (
    <div>
      <PageHeader
        title="スケジュール"
        subtitle="今後7日間"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 text-sm text-white font-medium bg-primary-600 px-3 py-1.5 rounded-xl"
            >
              <Plus className="w-4 h-4" />
              新規
            </button>
            <button
              onClick={loadEvents}
              disabled={syncing}
              className="flex items-center gap-1.5 text-sm text-primary-600 font-medium bg-primary-50 px-3 py-1.5 rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "..." : "同期"}
            </button>
          </div>
        }
      />

      {/* 新規イベントモーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">新規イベント</h2>
              <button onClick={() => setShowForm(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="タイトル *"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />

              <input
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">開始</label>
                  <input
                    type="time"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">終了</label>
                  <input
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
              </div>

              <input
                type="text"
                placeholder="場所（任意）"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />

              <textarea
                placeholder="説明（任意）"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              />
            </div>

            {saveError && (
              <p className="text-sm text-red-600">{saveError}</p>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !newEvent.title}
              className="w-full bg-primary-600 text-white font-semibold py-3 rounded-2xl disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      )}

      <div className="px-4 space-y-4 mt-2">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">同期エラー</p>
              <p className="text-sm text-red-600 mt-0.5">{error}</p>
              <p className="text-xs text-red-500 mt-1">
                ログイン時にGoogleカレンダーへのアクセスを許可してください。
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
                <div className="h-4 bg-gray-100 rounded w-24 animate-pulse" />
                <div className="h-3 bg-gray-100 rounded w-full animate-pulse" />
                <div className="h-3 bg-gray-100 rounded w-3/4 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          groups.map(({ date, events }) => (
            <div
              key={format(date, "yyyy-MM-dd")}
              className={`bg-white rounded-2xl p-4 shadow-sm ${
                isToday(date) ? "ring-2 ring-primary-400" : ""
              }`}
            >
              <p
                className={`text-sm font-bold mb-2 ${
                  isToday(date) ? "text-primary-600" : "text-gray-700"
                }`}
              >
                {dayLabel(date)}
              </p>
              {events.length === 0 ? (
                <p className="text-sm text-gray-300">予定なし</p>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => (
                    <div key={event.id} className="flex items-start gap-3">
                      <div className="w-1 h-full min-h-[2.5rem] bg-primary-200 rounded-full shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{event.summary}</p>
                        <div className="flex flex-wrap gap-2 mt-0.5">
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            {timeLabel(event)}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
