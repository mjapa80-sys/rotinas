"use client";

import { useEffect, useState } from "react";
import { format, isFuture, isPast } from "date-fns";
import { ja } from "date-fns/locale";
import { Plus, MapPin, User, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";

interface HealthRecord {
  id: string;
  type: string;
  title: string;
  doctor_name?: string;
  specialty?: string;
  location?: string;
  scheduled_at?: string;
  notes?: string;
}

const typeLabel: Record<string, { label: string; emoji: string; color: string }> = {
  medico:      { label: "診察",     emoji: "🩺", color: "bg-blue-100 text-blue-700" },
  exame:       { label: "検査",     emoji: "🔬", color: "bg-purple-100 text-purple-700" },
  medicamento: { label: "薬",       emoji: "💊", color: "bg-green-100 text-green-700" },
  outro:       { label: "その他",   emoji: "📋", color: "bg-gray-100 text-gray-700" },
};

export default function SaudePage() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const [form, setForm] = useState({
    type: "medico",
    title: "",
    doctor_name: "",
    specialty: "",
    location: "",
    scheduled_at: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const loadRecords = async () => {
    const res = await fetch("/api/saude");
    const data = await res.json();
    setRecords(data.records ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const upcoming = records.filter(
    (r) => !r.scheduled_at || isFuture(new Date(r.scheduled_at))
  );
  const past = records.filter(
    (r) => r.scheduled_at && isPast(new Date(r.scheduled_at))
  );

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch("/api/saude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowForm(false);
    setForm({
      type: "medico",
      title: "",
      doctor_name: "",
      specialty: "",
      location: "",
      scheduled_at: "",
      notes: "",
    });
    loadRecords();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この記録を削除しますか？")) return;
    await fetch(`/api/saude?id=${id}`, { method: "DELETE" });
    loadRecords();
  };

  const displayed = tab === "upcoming" ? upcoming : past;

  return (
    <div>
      <PageHeader
        title="健康"
        subtitle="診察・検査"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary-600 text-white p-2 rounded-xl"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      {/* フォーム */}
      {showForm && (
        <div className="mx-4 mb-4 bg-white rounded-2xl p-4 shadow-sm border border-primary-100 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">新規記録</h3>

          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary-400"
          >
            <option value="medico">🩺 診察</option>
            <option value="exame">🔬 検査</option>
            <option value="medicamento">💊 薬</option>
            <option value="outro">📋 その他</option>
          </select>

          <input
            type="text"
            placeholder="タイトル（例：内科診察）*"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary-400"
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="医師名"
              value={form.doctor_name}
              onChange={(e) => setForm({ ...form, doctor_name: e.target.value })}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary-400"
            />
            <input
              type="text"
              placeholder="専門科"
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary-400"
            />
          </div>

          <input
            type="text"
            placeholder="場所・クリニック"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary-400"
          />

          <input
            type="datetime-local"
            value={form.scheduled_at}
            onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary-400 text-gray-600"
          />

          <textarea
            placeholder="メモ..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary-400 min-h-[70px]"
          />

          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
              className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      )}

      {/* タブ */}
      <div className="flex mx-4 bg-gray-100 rounded-xl p-1 mb-4">
        <button
          onClick={() => setTab("upcoming")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "upcoming" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500"
          }`}
        >
          今後（{upcoming.length}）
        </button>
        <button
          onClick={() => setTab("past")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "past" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500"
          }`}
        >
          履歴（{past.length}）
        </button>
      </div>

      {/* リスト */}
      <div className="px-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🏥</p>
            <p className="text-gray-500 text-sm">
              {tab === "upcoming"
                ? "予定された診察・検査はありません"
                : "履歴がありません"}
            </p>
            {tab === "upcoming" && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-primary-600 text-sm font-medium"
              >
                ＋ 今すぐ追加
              </button>
            )}
          </div>
        ) : (
          displayed.map((record) => {
            const meta = typeLabel[record.type] ?? typeLabel.outro;
            return (
              <div key={record.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>
                        {meta.emoji} {meta.label}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-800">{record.title}</p>

                    {record.doctor_name && (
                      <div className="flex items-center gap-1 mt-1">
                        <User className="w-3 h-3 text-gray-400" />
                        <p className="text-xs text-gray-500">
                          {record.doctor_name}
                          {record.specialty && ` — ${record.specialty}`}
                        </p>
                      </div>
                    )}

                    {record.location && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <p className="text-xs text-gray-500">{record.location}</p>
                      </div>
                    )}

                    {record.scheduled_at && (
                      <p className="text-xs text-primary-600 font-medium mt-1.5">
                        📅 {format(new Date(record.scheduled_at), "yyyy年M月d日（E） HH:mm", { locale: ja })}
                      </p>
                    )}

                    {record.notes && (
                      <p className="text-xs text-gray-400 mt-1.5 italic">{record.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(record.id)}
                    className="text-gray-300 hover:text-red-400 p-1 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
        <div className="h-4" />
      </div>
    </div>
  );
}
