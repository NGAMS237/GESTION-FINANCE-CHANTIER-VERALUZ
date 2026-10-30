import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

const TYPE_META: Record<string, { label: string; icon: string; color: string; bg: string; description: string; categories: { name: string; color: string; icon: string }[] }> = {
  construction: {
    label: "Construction",
    icon: "🏗",
    color: "#185fa5",
    bg: "#e6f1fb",
    description: "Chantier, gros œuvre, finitions, aménagement",
    categories: [
      { name: "Gros œuvre", color: "#185fa5", icon: "building" },
      { name: "Électricité", color: "#f59e0b", icon: "bolt" },
      { name: "Plomberie", color: "#06b6d4", icon: "droplet" },
      { name: "Menuiserie", color: "#92400e", icon: "door" },
      { name: "Finitions", color: "#8b5cf6", icon: "brush" },
      { name: "Divers", color: "#6b7280", icon: "tool" },
    ],
  },
  acquisition: {
    label: "Acquisition",
    icon: "🏡",
    color: "#3b6d11",
    bg: "#eaf3de",
    description: "Achat terrain, bien immobilier, frais notaire",
    categories: [
      { name: "Prix d'achat", color: "#3b6d11", icon: "coin" },
      { name: "Frais notaire", color: "#854f0b", icon: "file-text" },
      { name: "Taxes & impôts", color: "#a32d2d", icon: "receipt" },
      { name: "Géomètre / Bornage", color: "#185fa5", icon: "map" },
      { name: "Viabilisation", color: "#0f6e56", icon: "plug" },
    ],
  },
  financement: {
    label: "Financement",
    icon: "🏦",
    color: "#854f0b",
    bg: "#faeeda",
    description: "Prêt bancaire, crédit, remboursements, titre",
    categories: [
      { name: "Capital emprunté", color: "#854f0b", icon: "bank" },
      { name: "Intérêts", color: "#a32d2d", icon: "percentage" },
      { name: "Assurance prêt", color: "#185fa5", icon: "shield" },
      { name: "Frais de dossier", color: "#6b7280", icon: "file" },
      { name: "Remboursements", color: "#3b6d11", icon: "arrow-down" },
    ],
  },
  autre: {
    label: "Autre",
    icon: "📦",
    color: "#3c3489",
    bg: "#eeedfe",
    description: "Mobilier, études, dépenses diverses",
    categories: [
      { name: "Dépenses générales", color: "#3c3489", icon: "package" },
    ],
  },
};

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  planning: "#3b82f6",
  paused: "#f59e0b",
  completed: "#6b7280",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  planning: "Planification",
  paused: "En pause",
  completed: "Terminé",
};

const COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899","#14b8a6","#6366f1"];

interface ProjectsHomeProps {
  onSelectProject: (id: Id<"projects">) => void;
}

export default function ProjectsHome({ onSelectProject }: ProjectsHomeProps) {
  const projects = useQuery(api.projects.list) ?? [];
  const categories = useQuery(api.categories.list) ?? [];
  const quotes = useQuery(api.quotes.listAll) ?? [];
  const payments = useQuery(api.payments.listAll) ?? [];
  const phases = useQuery(api.phases.listAll) ?? [];
  const createProject = useMutation(api.projects.create);
  const createCategory = useMutation(api.categories.create);

  const [showCreate, setShowCreate] = useState(false);
  const [step, setStep] = useState<"type" | "details">("type");
  const [selectedType, setSelectedType] = useState("construction");
  const [form, setForm] = useState({ name: "", budget: "", currency: "FCFA", location: "", description: "", color: COLORS[0] });
  const [saving, setSaving] = useState(false);

  // Compute per-project stats
  const projectStats = projects.map(p => {
    const projCategories = categories.filter(c => c.project_id === p._id);
    const catIds = new Set(projCategories.map(c => c._id));
    const projPhases = phases.filter(ph => catIds.has(ph.category_id));
    const phaseIds = new Set(projPhases.map(ph => ph._id));
    const projQuotes = quotes.filter(q => phaseIds.has(q.phase_id));
    const quoteIds = new Set(projQuotes.map(q => q._id));
    const projPayments = payments.filter(py => quoteIds.has(py.quote_id));
    const totalEngaged = projQuotes.reduce((s, q) => s + q.amount, 0);
    const totalPaid = projPayments.reduce((s, py) => s + py.amount, 0);
    const pct = p.budget > 0 ? Math.min(Math.round((totalPaid / p.budget) * 100), 100) : 0;
    const exceeded = p.budget > 0 && totalPaid > p.budget;
    return { ...p, totalEngaged, totalPaid, pct, exceeded };
  }).sort((a, b) => a.position - b.position);

  const totalAllProjects = projectStats.reduce((s, p) => s + p.totalPaid, 0);
  const totalBudget = projectStats.reduce((s, p) => s + p.budget, 0);

  async function handleCreate() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const projectId = await createProject({
        name: form.name.trim(),
        description: form.description || undefined,
        location: form.location || undefined,
        budget: parseFloat(form.budget) || 0,
        currency: form.currency,
        status: "active",
        color: form.color,
        position: projects.length,
        type: selectedType,
      });
      const template = TYPE_META[selectedType].categories;
      for (let i = 0; i < template.length; i++) {
        await createCategory({
          project_id: projectId,
          name: template[i].name,
          color: template[i].color,
          icon: template[i].icon,
          position: i,
        });
      }
      setShowCreate(false);
      setStep("type");
      setForm({ name: "", budget: "", currency: "FCFA", location: "", description: "", color: COLORS[0] });
      onSelectProject(projectId);
    } finally {
      setSaving(false);
    }
  }

  const fmt = (n: number, cur: string) =>
    new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " " + cur;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg, #f8f7f4)", padding: "0" }}>
      {/* Header */}
      <div style={{ background: "#1a1a2e", padding: "20px 28px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: "#fff", fontSize: 20, fontWeight: 600 }}>Centre Financier</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 }}>
            {projects.length} projet{projects.length !== 1 ? "s" : ""} · {fmt(totalAllProjects, "FCFA")} versé sur {fmt(totalBudget, "FCFA")}
          </div>
        </div>
        <button
          onClick={() => { setShowCreate(true); setStep("type"); }}
          style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          + Nouveau projet
        </button>
      </div>

      {/* Global stat bar */}
      {projects.length > 1 && (
        <div style={{ background: "#fff", borderBottom: "0.5px solid var(--border, #e5e3de)", padding: "10px 28px", display: "flex", gap: 24 }}>
          {projectStats.map(p => (
            <div key={p._id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
              <span style={{ fontSize: 12, color: "var(--text-secondary, #6b7280)" }}>{p.name}</span>
              <span style={{ fontSize: 12, fontWeight: 500 }}>{fmt(p.totalPaid, p.currency)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Projects grid */}
      <div style={{ padding: "24px 28px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {projectStats.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 20px", color: "var(--text-secondary, #6b7280)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>Aucun projet</div>
            <div style={{ fontSize: 13 }}>Crée ton premier projet pour commencer</div>
          </div>
        )}
        {projectStats.map(p => {
          const meta = TYPE_META[p.type ?? "construction"] ?? TYPE_META.construction;
          return (
            <div
              key={p._id}
              onClick={() => onSelectProject(p._id)}
              style={{ background: "#fff", border: "0.5px solid var(--border, #e5e3de)", borderRadius: 14, padding: "18px 20px", cursor: "pointer", transition: "box-shadow 0.15s", borderLeft: `4px solid ${p.color}` }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 18 }}>{meta.icon}</span>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</span>
                  </div>
                  <span style={{ fontSize: 11, background: meta.bg, color: meta.color, padding: "2px 8px", borderRadius: 20, fontWeight: 500 }}>
                    {meta.label}
                  </span>
                  {p.location && <span style={{ fontSize: 11, color: "var(--text-secondary, #6b7280)", marginLeft: 8 }}>📍 {p.location}</span>}
                </div>
                <span style={{ fontSize: 11, background: p.exceeded ? "#fef2f2" : "#f0fdf4", color: p.exceeded ? "#991b1b" : "#166534", padding: "3px 8px", borderRadius: 20, fontWeight: 500 }}>
                  {STATUS_LABELS[p.status] ?? p.status}
                </span>
              </div>

              {/* Budget bar */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--text-secondary, #6b7280)" }}>Versé</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: p.exceeded ? "#991b1b" : "inherit" }}>
                    {fmt(p.totalPaid, p.currency)} / {fmt(p.budget, p.currency)}
                  </span>
                </div>
                <div style={{ height: 4, background: "#f1f1ef", borderRadius: 4 }}>
                  <div style={{ height: "100%", width: `${p.pct}%`, background: p.exceeded ? "#ef4444" : p.color, borderRadius: 4, transition: "width 0.5s" }} />
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1, background: "#f8f7f4", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, color: "var(--text-secondary, #6b7280)" }}>Engagé</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{fmt(p.totalEngaged, p.currency)}</div>
                </div>
                <div style={{ flex: 1, background: "#f8f7f4", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, color: "var(--text-secondary, #6b7280)" }}>Avancement</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: p.exceeded ? "#991b1b" : p.color }}>{p.pct}%</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{step === "type" ? "Type de projet" : "Détails du projet"}</div>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#9ca3af" }}>✕</button>
            </div>

            {step === "type" ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                  {Object.entries(TYPE_META).map(([key, meta]) => (
                    <div
                      key={key}
                      onClick={() => setSelectedType(key)}
                      style={{ border: `2px solid ${selectedType === key ? meta.color : "#e5e3de"}`, borderRadius: 12, padding: "14px", cursor: "pointer", background: selectedType === key ? meta.bg : "#fff", transition: "all 0.15s" }}
                    >
                      <div style={{ fontSize: 22, marginBottom: 6 }}>{meta.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: meta.color }}>{meta.label}</div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{meta.description}</div>
                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 3 }}>
                        {meta.categories.slice(0, 3).map(c => (
                          <span key={c.name} style={{ fontSize: 10, background: "#f1f1ef", padding: "1px 6px", borderRadius: 10, color: "#6b7280" }}>{c.name}</span>
                        ))}
                        {meta.categories.length > 3 && <span style={{ fontSize: 10, color: "#9ca3af" }}>+{meta.categories.length - 3}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setStep("details")}
                  style={{ width: "100%", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                >
                  Continuer →
                </button>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Nom du projet *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={`Ex: ${TYPE_META[selectedType].label} 2025`} style={{ width: "100%", padding: "9px 12px", border: "0.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Budget</label>
                    <input value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="0" type="number" style={{ width: "100%", padding: "9px 12px", border: "0.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Devise</label>
                    <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} style={{ width: "100%", padding: "9px 12px", border: "0.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}>
                      <option>FCFA</option><option>EUR</option><option>USD</option><option>CAD</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Localisation</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Ville, pays..." style={{ width: "100%", padding: "9px 12px", border: "0.5px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brève description..." rows={2} style={{ width: "100%", padding: "9px 12px", border: "0.5px solid #d1d5db", borderRadius: 8, fontSize: 14, resize: "vertical", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 6 }}>Couleur</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {COLORS.map(c => (
                      <div key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{ width: 24, height: 24, borderRadius: "50%", background: c, cursor: "pointer", border: form.color === c ? "3px solid #1a1a2e" : "2px solid transparent", transition: "all 0.1s" }} />
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setStep("type")} style={{ flex: 1, background: "#f3f4f6", border: "none", borderRadius: 8, padding: "11px", fontSize: 14, cursor: "pointer" }}>← Retour</button>
                  <button onClick={handleCreate} disabled={saving || !form.name.trim()} style={{ flex: 2, background: saving || !form.name.trim() ? "#9ca3af" : "#1a1a2e", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontSize: 14, fontWeight: 500, cursor: saving ? "wait" : "pointer" }}>
                    {saving ? "Création..." : "Créer le projet"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
