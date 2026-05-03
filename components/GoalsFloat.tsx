"use client";

import { useEffect, useState } from "react";
import { Target, X, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface Goal {
  id: string;
  title: string;
  period: Period;
  description: string | null;
  completed: boolean;
}

type Period = "week" | "month" | "year" | "5years" | "10years";

const periodLabels: Record<Period, string> = {
  week: "今週",
  month: "今月",
  year: "今年",
  "5years": "5年後",
  "10years": "10年後",
};

const periodOrder: Period[] = ["week", "month", "year", "5years", "10years"];

export default function GoalsFloat() {
  const [open, setOpen] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPeriod, setNewPeriod] = useState<Period>("month");
  const [newDesc, setNewDesc] = useState("");
  const [expanded, setExpanded] = useState<Period | null>("month");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/goals");
    const data = await res.json();
    setGoals(data.goals ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (open && goals.length === 0) load();
  }, [open]);

  const addGoal = async () => {
    if (!newTitle.trim()) return;
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, period: newPeriod, description: newDesc || null }),
    });
    const data = await res.json();
    if (data.goal) {
      setGoals((prev) => [...prev, data.goal]);
      setNewTitle("");
      setNewDesc("");
      setShowAdd(false);
    }
  };

  const toggleGoal = async (id: string, completed: boolean) => {
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, completed: !completed } : g));
    await fetch("/api/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, completed: !completed }),
    });
  };

  const deleteGoal = async (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await fetch("/api/goals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  };

  return (
    <>
      {/* フローティングボタン */}
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-24 z-40 w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full shadow-lg flex items-center justify-center"
      >
        <Target className="w-5 h-5 text-white" />
      </button>

      {/* モーダル */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-t-3xl w-full max-w-lg max-h-[80vh] flex flex-col">
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-bold text-gray-900">目標</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAdd(!showAdd)}
                  className="flex items-center gap-1 text-sm text-primary-600 font-medium bg-primary-50 px-3 py-1.5 rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                  追加
                </button>
                <button onClick={() => setOpen(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* 追加フォーム */}
            {showAdd && (
              <div className="px-5 py-3 border-b border-gray-100 space-y-2">
                <input
                  type="text"
                  placeholder="目標を入力..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
                <div className="flex gap-1 flex-wrap">
                  {periodOrder.map((p) => (
                    <button
                      key={p}
                      onClick={() => setNewPeriod(p)}
                      className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                        newPeriod === p
                          ? "border-amber-400 bg-amber-50 text-amber-700"
                          : "border-gray-200 text-gray-400"
                      }`}
                    >
                      {periodLabels[p]}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="メモ（任意）"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAdd(false)}
                    className="flex-1 py-2 text-sm text-gray-400 border border-gray-200 rounded-xl"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={addGoal}
                    disabled={!newTitle.trim()}
                    className="flex-1 py-2 text-sm font-semibold text-white bg-amber-500 rounded-xl disabled:opacity-40"
                  >
                    保存
                  </button>
                </div>
              </div>
            )}

            {/* 目標一覧 */}
            <div className="overflow-y-auto flex-1 px-5 py-3 space-y-2">
              {loading ? (
                <p className="text-sm text-gray-300 text-center py-4">読み込み中...</p>
              ) : goals.length === 0 ? (
                <p className="text-sm text-gray-300 text-center py-8">目標を追加してみましょう</p>
              ) : (
                periodOrder.map((period) => {
                  const group = goals.filter((g) => g.period === period);
                  if (group.length === 0) return null;
                  const isOpen = expanded === period;
                  return (
                    <div key={period} className="bg-gray-50 rounded-2xl overflow-hidden">
                      <button
                        onClick={() => setExpanded(isOpen ? null : period)}
                        className="w-full flex items-center justify-between px-4 py-3"
                      >
                        <span className="text-sm font-bold text-gray-700">{periodLabels[period]}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">
                            {group.filter(g => g.completed).length}/{group.length}
                          </span>
                          {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-3 space-y-2">
                          {group.map((goal) => (
                            <div key={goal.id} className="flex items-start gap-3 bg-white rounded-xl p-3">
                              <button
                                onClick={() => toggleGoal(goal.id, goal.completed)}
                                className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                                  goal.completed ? "bg-amber-400 border-amber-400" : "border-gray-300"
                                }`}
                              >
                                {goal.completed && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                              <div className="flex-1">
                                <p className={`text-sm ${goal.completed ? "line-through text-gray-300" : "text-gray-800"}`}>
                                  {goal.title}
                                </p>
                                {goal.description && (
                                  <p className="text-xs text-gray-400 mt-0.5">{goal.description}</p>
                                )}
                              </div>
                              <button onClick={() => deleteGoal(goal.id)}>
                                <Trash2 className="w-3.5 h-3.5 text-gray-200 hover:text-red-400 transition-colors" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div className="h-4" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
