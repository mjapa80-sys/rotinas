"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Sparkles, Sun, Sunset, Moon } from "lucide-react";
import PageHeader from "@/components/PageHeader";

interface RoutineItem {
  id: string;
  title: string;
  time_of_day: "manha" | "tarde" | "noite";
}

interface Completion {
  routine_item_id: string;
  completed: boolean;
}

interface Todo {
  id: string;
  title: string;
  due_date: string | null;
  completed: boolean;
}

type Tab = "rotinas" | "todo";
type TimeOfDay = "manha" | "tarde" | "noite";

const timeLabels: Record<TimeOfDay, string> = {
  manha: "☀️ 朝",
  tarde: "🌤 昼",
  noite: "🌙 夜",
};

const timeIcons: Record<TimeOfDay, React.ElementType> = {
  manha: Sun,
  tarde: Sunset,
  noite: Moon,
};

export default function RotinasPage() {
  const [tab, setTab] = useState<Tab>("rotinas");

  // Routines state
  const [items, setItems] = useState<RoutineItem[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState<TimeOfDay>("manha");
  const [showAddRoutine, setShowAddRoutine] = useState(false);
  const [loadingRoutines, setLoadingRoutines] = useState(true);

  // Todo state
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [loadingTodos, setLoadingTodos] = useState(true);

  // AI feedback state
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const loadRoutines = async () => {
    setLoadingRoutines(true);
    const res = await fetch("/api/rotinas");
    const data = await res.json();
    setItems(data.items ?? []);
    setCompletions(data.completions ?? []);
    setLoadingRoutines(false);
  };

  const loadTodos = async () => {
    setLoadingTodos(true);
    const res = await fetch("/api/todos");
    const data = await res.json();
    setTodos(data.todos ?? []);
    setLoadingTodos(false);
  };

  useEffect(() => {
    loadRoutines();
    loadTodos();
  }, []);

  const isCompleted = (id: string) =>
    completions.some((c) => c.routine_item_id === id && c.completed);

  const completedCount = items.filter((i) => isCompleted(i.id)).length;
  const totalCount = items.length;
  const completedTodos = todos.filter((t) => t.completed).length;
  const totalTodos = todos.length;

  const toggleRoutine = async (id: string) => {
    const current = isCompleted(id);
    setCompletions((prev) => {
      const existing = prev.find((c) => c.routine_item_id === id);
      if (existing) return prev.map((c) => c.routine_item_id === id ? { ...c, completed: !current } : c);
      return [...prev, { routine_item_id: id, completed: true }];
    });
    await fetch("/api/rotinas/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routine_item_id: id, completed: !current }),
    });
  };

  const addRoutine = async () => {
    if (!newTitle.trim()) return;
    const res = await fetch("/api/rotinas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, time_of_day: newTime }),
    });
    const data = await res.json();
    if (data.item) {
      setItems((prev) => [...prev, data.item]);
      setNewTitle("");
      setShowAddRoutine(false);
    }
  };

  const deleteRoutine = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch("/api/rotinas", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  };

  const addTodo = async () => {
    if (!newTodo.trim()) return;
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTodo, due_date: newDueDate || null }),
    });
    const data = await res.json();
    if (data.todo) {
      setTodos((prev) => [data.todo, ...prev]);
      setNewTodo("");
      setNewDueDate("");
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, completed: !completed } : t));
    await fetch("/api/todos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, completed: !completed }),
    });
  };

  const deleteTodo = async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await fetch("/api/todos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  };

  const getFeedback = async () => {
    setLoadingFeedback(true);
    setFeedback(null);
    const res = await fetch("/api/rotinas/feedback", { method: "POST" });
    const data = await res.json();
    setFeedback(data.feedback ?? "フィードバックを取得できませんでした。");
    setLoadingFeedback(false);
  };

  const timeGroups: TimeOfDay[] = ["manha", "tarde", "noite"];

  return (
    <div>
      <PageHeader
        title="ルーティン & TODO"
        subtitle={
          tab === "rotinas"
            ? `今日: ${completedCount}/${totalCount} 完了`
            : `残り: ${totalTodos - completedTodos}件`
        }
      />

      {/* タブ */}
      <div className="px-4 mb-4">
        <div className="flex bg-gray-100 rounded-2xl p-1">
          {(["rotinas", "todo"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${
                tab === t ? "bg-white text-primary-600 shadow-sm" : "text-gray-400"
              }`}
            >
              {t === "rotinas" ? "ルーティン" : "TODO"}
            </button>
          ))}
        </div>
      </div>

      {tab === "rotinas" && (
        <div className="px-4 space-y-4">
          {loadingRoutines ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-white rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            timeGroups.map((time) => {
              const group = items.filter((i) => i.time_of_day === time);
              if (group.length === 0) return null;
              const Icon = timeIcons[time];
              return (
                <div key={time}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {timeLabels[time]}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {group.map((item) => {
                      const done = isCompleted(item.id);
                      return (
                        <div
                          key={item.id}
                          className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm"
                        >
                          <button
                            onClick={() => toggleRoutine(item.id)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                              done
                                ? "bg-primary-500 border-primary-500"
                                : "border-gray-300"
                            }`}
                          >
                            {done && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <span className={`flex-1 text-sm ${done ? "line-through text-gray-300" : "text-gray-800"}`}>
                            {item.title}
                          </span>
                          <button onClick={() => deleteRoutine(item.id)}>
                            <Trash2 className="w-4 h-4 text-gray-200 hover:text-red-400 transition-colors" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}

          {/* ルーティン追加フォーム */}
          {showAddRoutine ? (
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <input
                type="text"
                placeholder="ルーティン名"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRoutine()}
                autoFocus
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <div className="flex gap-2">
                {timeGroups.map((t) => (
                  <button
                    key={t}
                    onClick={() => setNewTime(t)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                      newTime === t
                        ? "border-primary-400 bg-primary-50 text-primary-600"
                        : "border-gray-200 text-gray-400"
                    }`}
                  >
                    {timeLabels[t]}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddRoutine(false)}
                  className="flex-1 py-2 text-sm text-gray-400 border border-gray-200 rounded-xl"
                >
                  キャンセル
                </button>
                <button
                  onClick={addRoutine}
                  className="flex-1 py-2 text-sm font-semibold text-white bg-primary-600 rounded-xl"
                >
                  追加
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddRoutine(true)}
              className="w-full flex items-center gap-2 justify-center py-3 text-sm text-primary-600 font-medium border-2 border-dashed border-primary-200 rounded-2xl"
            >
              <Plus className="w-4 h-4" />
              ルーティンを追加
            </button>
          )}

          {/* AIフィードバック */}
          <div className="pt-2">
            <button
              onClick={getFeedback}
              disabled={loadingFeedback}
              className="w-full flex items-center gap-2 justify-center py-3 text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-primary-600 rounded-2xl shadow-sm disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              {loadingFeedback ? "分析中..." : "AIで今日を振り返る"}
            </button>
            {feedback && (
              <div className="mt-3 bg-purple-50 border border-purple-100 rounded-2xl p-4">
                <p className="text-sm text-purple-900 leading-relaxed">{feedback}</p>
              </div>
            )}
          </div>

          <div className="h-4" />
        </div>
      )}

      {tab === "todo" && (
        <div className="px-4 space-y-3">
          {/* TODO追加 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <input
              type="text"
              placeholder="タスクを追加..."
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTodo()}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <button
                onClick={addTodo}
                disabled={!newTodo.trim()}
                className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-xl disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loadingTodos ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-white rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {todos.filter((t) => !t.completed).map((todo) => (
                <div key={todo.id} className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
                  <button
                    onClick={() => toggleTodo(todo.id, todo.completed)}
                    className="w-6 h-6 rounded-full border-2 border-gray-300 shrink-0"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{todo.title}</p>
                    {todo.due_date && (
                      <p className="text-xs text-gray-400 mt-0.5">{todo.due_date}</p>
                    )}
                  </div>
                  <button onClick={() => deleteTodo(todo.id)}>
                    <Trash2 className="w-4 h-4 text-gray-200 hover:text-red-400 transition-colors" />
                  </button>
                </div>
              ))}

              {todos.filter((t) => t.completed).length > 0 && (
                <>
                  <p className="text-xs text-gray-400 font-semibold pt-2">完了済み</p>
                  {todos.filter((t) => t.completed).map((todo) => (
                    <div key={todo.id} className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm opacity-50">
                      <button
                        onClick={() => toggleTodo(todo.id, todo.completed)}
                        className="w-6 h-6 rounded-full border-2 bg-primary-500 border-primary-500 flex items-center justify-center shrink-0"
                      >
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <p className="flex-1 text-sm text-gray-400 line-through">{todo.title}</p>
                      <button onClick={() => deleteTodo(todo.id)}>
                        <Trash2 className="w-4 h-4 text-gray-200 hover:text-red-400 transition-colors" />
                      </button>
                    </div>
                  ))}
                </>
              )}

              {todos.length === 0 && (
                <p className="text-center text-sm text-gray-300 py-8">タスクはありません</p>
              )}
            </div>
          )}
          <div className="h-4" />
        </div>
      )}
    </div>
  );
}
