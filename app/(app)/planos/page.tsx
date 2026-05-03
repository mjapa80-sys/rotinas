"use client";

import { useEffect, useState } from "react";
import { format, isPast, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Bell, Users, Trash2, Edit2, Check, X } from "lucide-react";
import PageHeader from "@/components/PageHeader";

interface FuturePlan {
  id: string;
  title: string;
  category: string;
  description?: string;
  people_involved?: string[];
  estimated_date?: string;
  reminder_date?: string;
  status: string;
}

const categoryConfig: Record<string, { emoji: string; label: string; color: string }> = {
  viagem:   { emoji: "✈️", label: "Viagem",   color: "bg-sky-100 text-sky-700" },
  evento:   { emoji: "🎉", label: "Evento",   color: "bg-pink-100 text-pink-700" },
  encontro: { emoji: "👥", label: "Encontro", color: "bg-orange-100 text-orange-700" },
  outro:    { emoji: "📌", label: "Outro",    color: "bg-gray-100 text-gray-700" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  ideia:      { label: "Ideia",      color: "bg-gray-100 text-gray-600" },
  planejando: { label: "Planejando", color: "bg-blue-100 text-blue-700" },
  confirmado: { label: "Confirmado", color: "bg-green-100 text-green-700" },
  feito:      { label: "Feito ✓",   color: "bg-green-50 text-green-500" },
  cancelado:  { label: "Cancelado",  color: "bg-red-50 text-red-400" },
};

export default function PlanosPage() {
  const [plans, setPlans] = useState<FuturePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("todos");
  const [showForm, setShowForm] = useState(false);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    category: "viagem",
    description: "",
    people_involved: "",
    estimated_date: "",
    reminder_date: "",
    status: "ideia",
  });
  const [saving, setSaving] = useState(false);

  const loadPlans = async () => {
    const res = await fetch("/api/planos");
    const data = await res.json();
    setPlans(data.plans ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const filtered =
    filter === "todos"
      ? plans
      : plans.filter((p) => p.category === filter);

  const pendingReminders = plans.filter(
    (p) =>
      p.reminder_date &&
      (isPast(parseISO(p.reminder_date)) || isToday(parseISO(p.reminder_date))) &&
      p.status !== "feito" &&
      p.status !== "cancelado"
  );

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch("/api/planos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        people_involved: form.people_involved
          ? form.people_involved.split(",").map((p) => p.trim()).filter(Boolean)
          : [],
      }),
    });
    setSaving(false);
    setShowForm(false);
    setForm({
      title: "",
      category: "viagem",
      description: "",
      people_involved: "",
      estimated_date: "",
      reminder_date: "",
      status: "ideia",
    });
    loadPlans();
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    await fetch(`/api/planos?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setEditingStatus(null);
    loadPlans();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este plano?")) return;
    await fetch(`/api/planos?id=${id}`, { method: "DELETE" });
    loadPlans();
  };

  const hasReminder = (plan: FuturePlan) =>
    plan.reminder_date &&
    (isPast(parseISO(plan.reminder_date)) || isToday(parseISO(plan.reminder_date))) &&
    plan.status !== "feito" &&
    plan.status !== "cancelado";

  return (
    <div>
      <PageHeader
        title="Planos Futuros"
        subtitle={`${plans.filter((p) => p.status !== "feito" && p.status !== "cancelado").length} plano(s) ativos`}
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary-600 text-white p-2 rounded-xl"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      {/* Lembretes pendentes */}
      {pendingReminders.length > 0 && (
        <div className="mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-2xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">
              {pendingReminders.length} lembrete(s) pendente(s)
            </p>
          </div>
          <div className="space-y-1">
            {pendingReminders.map((p) => (
              <p key={p.id} className="text-xs text-amber-700">
                • {p.title} — hora de combinar!
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Formulário */}
      {showForm && (
        <div className="mx-4 mb-4 bg-white rounded-2xl p-4 shadow-sm border border-primary-100 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">Novo plano</h3>

          <input
            type="text"
            placeholder="Nome do plano (ex: Viagem a Floripa) *"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary-400"
          />

          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary-400"
          >
            <option value="viagem">✈️ Viagem</option>
            <option value="evento">🎉 Evento (casamento, festa...)</option>
            <option value="encontro">👥 Encontro com pessoas</option>
            <option value="outro">📌 Outro</option>
          </select>

          <textarea
            placeholder="Detalhes do plano..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary-400 min-h-[70px]"
          />

          <input
            type="text"
            placeholder="Pessoas envolvidas (separar por vírgula)"
            value={form.people_involved}
            onChange={(e) => setForm({ ...form, people_involved: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary-400"
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 ml-1 mb-1 block">Data estimada</label>
              <input
                type="date"
                value={form.estimated_date}
                onChange={(e) => setForm({ ...form, estimated_date: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary-400 text-gray-600"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 ml-1 mb-1 block">Lembrar em</label>
              <input
                type="date"
                value={form.reminder_date}
                onChange={(e) => setForm({ ...form, reminder_date: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary-400 text-gray-600"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
              className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto pb-1">
        {["todos", "viagem", "evento", "encontro", "outro"].map((cat) => {
          const cfg = categoryConfig[cat];
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === cat
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-500 border border-gray-200"
              }`}
            >
              {cfg ? `${cfg.emoji} ${cfg.label}` : "Todos"}
            </button>
          );
        })}
      </div>

      {/* Lista */}
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
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🗺️</p>
            <p className="text-gray-500 text-sm">Nenhum plano ainda</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-primary-600 text-sm font-medium"
            >
              + Criar primeiro plano
            </button>
          </div>
        ) : (
          filtered.map((plan) => {
            const cat = categoryConfig[plan.category] ?? categoryConfig.outro;
            const status = statusConfig[plan.status] ?? statusConfig.ideia;
            const reminder = hasReminder(plan);

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl p-4 shadow-sm ${
                  reminder ? "ring-2 ring-amber-300" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.color}`}>
                        {cat.emoji} {cat.label}
                      </span>
                      {reminder && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <Bell className="w-3 h-3" /> Lembrete!
                        </span>
                      )}
                    </div>

                    <p className="font-semibold text-gray-800">{plan.title}</p>

                    {plan.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
                    )}

                    {plan.people_involved && plan.people_involved.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Users className="w-3 h-3 text-gray-400" />
                        <p className="text-xs text-gray-500">
                          {plan.people_involved.join(", ")}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3 mt-1.5 flex-wrap">
                      {plan.estimated_date && (
                        <p className="text-xs text-gray-400">
                          📅 {format(parseISO(plan.estimated_date), "MMM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                      {plan.reminder_date && (
                        <p className={`text-xs ${reminder ? "text-amber-600 font-medium" : "text-gray-400"}`}>
                          🔔 {format(parseISO(plan.reminder_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>

                    {/* Status picker */}
                    {editingStatus === plan.id ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(statusConfig).map(([key, val]) => (
                          <button
                            key={key}
                            onClick={() => handleUpdateStatus(plan.id, key)}
                            className={`text-xs px-2 py-0.5 rounded-full border ${val.color} border-current`}
                          >
                            {val.label}
                          </button>
                        ))}
                        <button
                          onClick={() => setEditingStatus(null)}
                          className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingStatus(plan.id)}
                        className={`mt-2 text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}
                      >
                        {status.label}
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(plan.id)}
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
