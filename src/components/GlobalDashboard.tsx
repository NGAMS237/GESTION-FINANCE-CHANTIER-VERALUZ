import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface GlobalDashboardProps {
  onSelectProject: (id: Id<"projects">) => void;
}

const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  construction: { label: "Construction", icon: "🏗", color: "#3b82f6" },
  acquisition:  { label: "Acquisition",  icon: "🏡", color: "#10b981" },
  financement:  { label: "Financement",  icon: "🏦", color: "#f59e0b" },
  autre:        { label: "Autre",        icon: "📦", color: "#8b5cf6" },
};

export default function GlobalDashboard({ onSelectProject }: GlobalDashboardProps) {
  const projects   = useQuery(api.projects.list)   ?? [];
  const categories = useQuery(api.categories.list) ?? [];
  const phases     = useQuery(api.phases.listAll)  ?? [];
  const quotes     = useQuery(api.quotes.listAll)  ?? [];
  const payments   = useQuery(api.payments.listAll)?? [];
  const tasks = (useQuery((api as any).tasks?.listAll) ?? []) as Array<{_id: string; project_id: any; title: string; status: string; priority: string; due_date?: string}>   ?? [];

  const fmt = (n: number, cur = "FCFA") =>
    new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " " + cur;

  // Per-project stats
  const stats = projects.map(p => {
    const catIds = new Set(categories.filter(c => c.project_id === p._id).map(c => c._id));
    const phaseIds = new Set(phases.filter(ph => catIds.has(ph.category_id)).map(ph => ph._id));
    const projQuotes = quotes.filter(q => phaseIds.has(q.phase_id));
    const quoteIds = new Set(projQuotes.map(q => q._id));
    const projPayments = payments.filter(py => quoteIds.has(py.quote_id));
    const totalEngaged = projQuotes.reduce((s, q) => s + q.amount, 0);
    const totalPaid = projPayments.reduce((s, py) => s + py.amount, 0);
    const reste = Math.max(0, p.budget - totalPaid);
    const pct = p.budget > 0 ? Math.min(Math.round((totalPaid / p.budget) * 100), 100) : 0;
    const exceeded = p.budget > 0 && totalPaid > p.budget;
    return { ...p, totalEngaged, totalPaid, reste, pct, exceeded };
  });

  const totalBudget  = stats.reduce((s, p) => s + p.budget, 0);
  const totalPaid    = stats.reduce((s, p) => s + p.totalPaid, 0);
  const totalEngaged = stats.reduce((s, p) => s + p.totalEngaged, 0);
  const totalReste   = stats.reduce((s, p) => s + p.reste, 0);

  // Urgent tasks (high priority, not done)
  const urgentTasks = tasks
    .filter(t => t.status !== "done" && t.priority === "high")
    .slice(0, 5);
  const pendingTasks = tasks.filter(t => t.status !== "done");

  // Pie data: versé par projet
  const pieData = stats.map(p => ({
    name: p.name,
    value: p.totalPaid,
    color: p.color,
  })).filter(d => d.value > 0);

  // Bar data: budget vs versé par projet (truncated names)
  const barData = stats.map(p => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
    budget: p.budget,
    versé: p.totalPaid,
    color: p.color,
  }));

  const CARD = { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "16px 20px" };

  return (
    <div style={{ padding: "24px", background: "#0f172a", minHeight: "calc(100vh - 52px)" }}>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Budget total", value: fmt(totalBudget), icon: "ti-target", color: "#6366f1" },
          { label: "Total versé",  value: fmt(totalPaid),   icon: "ti-credit-card", color: "#10b981" },
          { label: "Engagé",      value: fmt(totalEngaged), icon: "ti-file-text", color: "#f59e0b" },
          { label: "Reste prévu", value: fmt(totalReste),   icon: "ti-clock", color: "#64748b" },
        ].map(k => (
          <div key={k.label} style={CARD}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <i className={`ti ${k.icon}`} style={{ color: k.color, fontSize: 18 }} />
              <span style={{ fontSize: 11, color: "#64748b" }}>{k.label}</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: 16, marginBottom: 20 }}>
        {/* Pie */}
        <div style={CARD}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 14 }}>Répartition des versements</div>
          {pieData.length === 0 ? (
            <div style={{ textAlign: "center", color: "#475569", fontSize: 12, padding: "20px 0" }}>Aucun paiement</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                {pieData.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "#94a3b8", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: "#e2e8f0" }}>{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bar */}
        <div style={CARD}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 14 }}>Budget vs Versé par projet</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={(v: any) => { const n = Number(v); return n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(0) + "k" : String(n); }} />
              <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 12 }} />
              <Bar dataKey="budget" name="Budget" fill="#334155" radius={[4, 4, 0, 0]} />
              <Bar dataKey="versé" name="Versé" radius={[4, 4, 0, 0]}>
                {barData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Projects list + tasks */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
        {/* Projects */}
        <div style={CARD}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 14 }}>Tous les projets</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {stats.map(p => {
              const meta = TYPE_META[p.type ?? "construction"] ?? TYPE_META.construction;
              return (
                <div key={p._id} onClick={() => onSelectProject(p._id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#0f172a", borderRadius: 10, cursor: "pointer", border: `1px solid ${p.color}22`, transition: "border-color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = p.color)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = p.color + "22")}
                >
                  <span style={{ fontSize: 20 }}>{meta.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: p.color }}>{p.name}</span>
                      {p.exceeded && <span style={{ fontSize: 10, background: "#7f1d1d", color: "#fca5a5", padding: "1px 6px", borderRadius: 10 }}>Budget dépassé</span>}
                    </div>
                    <div style={{ height: 3, background: "#334155", borderRadius: 3, marginBottom: 4 }}>
                      <div style={{ height: "100%", width: `${p.pct}%`, background: p.exceeded ? "#ef4444" : p.color, borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      {fmt(p.totalPaid, p.currency)} versé · {p.pct}% · reste {fmt(p.reste, p.currency)}
                    </div>
                  </div>
                  <i className="ti ti-chevron-right" style={{ color: "#475569", fontSize: 14 }} />
                </div>
              );
            })}
            {stats.length === 0 && <div style={{ textAlign: "center", color: "#475569", fontSize: 12, padding: "16px 0" }}>Aucun projet</div>}
          </div>
        </div>

        {/* Tasks */}
        <div style={CARD}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>Tâches en cours</div>
            <span style={{ fontSize: 11, background: "#1e293b", border: "1px solid #334155", borderRadius: 20, padding: "2px 8px", color: "#64748b" }}>{pendingTasks.length} actives</span>
          </div>
          {pendingTasks.length === 0 ? (
            <div style={{ textAlign: "center", color: "#475569", fontSize: 12, padding: "20px 0" }}>
              <i className="ti ti-check" style={{ fontSize: 24, display: "block", marginBottom: 6, color: "#10b981" }} />
              Tout est fait !
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pendingTasks.slice(0, 6).map(t => {
                const proj = projects.find(p => p._id === t.project_id);
                const pcolor = proj?.color ?? "#6366f1";
                const priorityColor = t.priority === "high" ? "#ef4444" : t.priority === "normal" ? "#f59e0b" : "#64748b";
                return (
                  <div key={t._id} onClick={() => proj && onSelectProject(proj._id)} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px", background: "#0f172a", borderRadius: 8, cursor: "pointer", borderLeft: `3px solid ${priorityColor}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#e2e8f0", marginBottom: 2 }}>{t.title}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: pcolor }} />
                        <span style={{ fontSize: 10, color: "#64748b" }}>{proj?.name ?? "—"}</span>
                        {t.due_date && <span style={{ fontSize: 10, color: "#475569" }}>📅 {t.due_date}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {pendingTasks.length > 6 && (
                <div style={{ fontSize: 11, color: "#475569", textAlign: "center", paddingTop: 4 }}>+{pendingTasks.length - 6} autres tâches</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
