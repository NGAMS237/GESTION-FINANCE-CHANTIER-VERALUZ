import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface Props { projectId: Id<"projects"> }

const COLS = [
  { id: "todo",       label: "À faire",   color: "#6366f1", bg: "#6366f122" },
  { id: "inprogress", label: "En cours",  color: "#f59e0b", bg: "#f59e0b22" },
  { id: "done",       label: "Terminé",   color: "#10b981", bg: "#10b98122" },
] as const;

const PRIORITY = [
  { id: "high",   label: "Haute",   color: "#ef4444" },
  { id: "normal", label: "Normale", color: "#f59e0b" },
  { id: "low",    label: "Basse",   color: "#64748b" },
] as const;

const EMPTY_FORM = { title: "", description: "", priority: "normal", due_date: "", status: "todo" };

export default function TasksPage({ projectId }: Props) {
  const tasks     = useQuery(api.tasks.listByProject, { project_id: projectId }) ?? [];
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);
  const removeTask = useMutation(api.tasks.remove);

  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [editId, setEditId]       = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const tasksByCol = (status: string) => tasks.filter(t => t.status === status)
    .sort((a, b) => (a.due_date ?? "") < (b.due_date ?? "") ? -1 : 1);

  const pMeta = (p: string) => PRIORITY.find(x => x.id === p) ?? PRIORITY[1];

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await updateTask({ id: editId as Id<"tasks">, title: form.title, description: form.description || undefined, priority: form.priority, due_date: form.due_date || undefined, status: form.status });
      } else {
        await createTask({ project_id: projectId, title: form.title, description: form.description || undefined, priority: form.priority, due_date: form.due_date || undefined, status: form.status, linked_to_type: undefined, linked_to_id: undefined });
      }
      setForm({ ...EMPTY_FORM }); setShowForm(false); setEditId(null);
    } finally { setSaving(false); }
  }

  function startEdit(t: any) {
    setForm({ title: t.title, description: t.description ?? "", priority: t.priority, due_date: t.due_date ?? "", status: t.status });
    setEditId(t._id); setShowForm(true);
  }

  async function moveTask(id: string, newStatus: string) {
    await updateTask({ id: id as Id<"tasks">, status: newStatus });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ padding: 24, minHeight: "100vh", background: "#0f172a" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ color: "#f1f5f9", margin: 0, fontSize: 18, fontWeight: 700 }}>Tâches</h2>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{tasks.length} tâche{tasks.length !== 1 ? "s" : ""} · {tasks.filter(t => t.status !== "done").length} active{tasks.filter(t => t.status !== "done").length !== 1 ? "s" : ""}</div>
        </div>
        <button onClick={() => { setForm({ ...EMPTY_FORM }); setEditId(null); setShowForm(true); }} style={{ background: "#6366f1", border: "none", borderRadius: 8, color: "#fff", padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          + Nouvelle tâche
        </button>
      </div>

      {/* Kanban board */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {COLS.map(col => {
          const colTasks = tasksByCol(col.id);
          return (
            <div key={col.id} style={{ background: "#1e293b", borderRadius: 12, border: `1px solid ${col.color}33`, overflow: "hidden" }}>
              {/* Column header */}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "space-between", background: col.bg }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.color }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: col.color }}>{col.label}</span>
                </div>
                <span style={{ fontSize: 11, background: col.color + "33", color: col.color, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{colTasks.length}</span>
              </div>

              {/* Cards */}
              <div style={{ padding: "10px 10px", display: "flex", flexDirection: "column", gap: 8, minHeight: 120 }}>
                {colTasks.length === 0 && (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "#475569", fontSize: 12 }}>Aucune tâche</div>
                )}
                {colTasks.map(t => {
                  const pm = pMeta(t.priority);
                  const isOverdue = t.due_date && t.due_date < today && t.status !== "done";
                  return (
                    <div key={t._id} style={{ background: "#0f172a", border: `1px solid #334155`, borderLeft: `3px solid ${pm.color}`, borderRadius: 8, padding: "10px 12px", cursor: "pointer", transition: "border-color 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = pm.color)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "#334155")}
                    >
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0", marginBottom: 6, lineHeight: 1.3 }}>{t.title}</div>
                      {t.description && <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, lineHeight: 1.4 }}>{t.description}</div>}

                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, background: pm.color + "22", color: pm.color, padding: "1px 6px", borderRadius: 10, fontWeight: 500 }}>{pm.label}</span>
                        {t.due_date && (
                          <span style={{ fontSize: 10, color: isOverdue ? "#f87171" : "#64748b", display: "flex", alignItems: "center", gap: 3 }}>
                            {isOverdue ? "⚠" : "📅"} {t.due_date}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 4, marginTop: 8, justifyContent: "flex-end" }}>
                        {COLS.filter(c => c.id !== col.id).map(c => (
                          <button key={c.id} onClick={() => moveTask(t._id, c.id)} title={`→ ${c.label}`} style={{ background: c.color + "22", border: "none", borderRadius: 6, color: c.color, padding: "3px 7px", fontSize: 10, cursor: "pointer", fontWeight: 600 }}>
                            → {c.label}
                          </button>
                        ))}
                        <button onClick={() => startEdit(t)} style={{ background: "#334155", border: "none", borderRadius: 6, color: "#94a3b8", padding: "3px 7px", fontSize: 11, cursor: "pointer" }}>✏</button>
                        <button onClick={() => setConfirmDel(t._id)} style={{ background: "#7f1d1d33", border: "none", borderRadius: 6, color: "#f87171", padding: "3px 7px", fontSize: 11, cursor: "pointer" }}>✕</button>
                      </div>
                    </div>
                  );
                })}

                {/* Quick-add in column */}
                <button onClick={() => { setForm({ ...EMPTY_FORM, status: col.id }); setEditId(null); setShowForm(true); }} style={{ background: "none", border: "1px dashed #334155", borderRadius: 8, color: "#475569", padding: "8px", fontSize: 12, cursor: "pointer", width: "100%", marginTop: 2 }}>
                  + Ajouter
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Form modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 16, padding: 24, width: "100%", maxWidth: 440 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>{editId ? "Modifier la tâche" : "Nouvelle tâche"}</span>
              <button onClick={() => { setShowForm(false); setEditId(null); }} style={{ background: "none", border: "none", color: "#64748b", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Titre *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Relancer fournisseur SABC" autoFocus style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", padding: "9px 12px", fontSize: 13, boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Détails optionnels..." rows={2} style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", padding: "9px 12px", fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Priorité</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", padding: "8px 10px", fontSize: 12 }}>
                  {PRIORITY.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Statut</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", padding: "8px 10px", fontSize: 12 }}>
                  {COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Échéance</label>
                <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", padding: "8px 10px", fontSize: 12, boxSizing: "border-box" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setShowForm(false); setEditId(null); }} style={{ flex: 1, background: "#334155", border: "none", borderRadius: 8, color: "#94a3b8", padding: "10px", fontSize: 13, cursor: "pointer" }}>Annuler</button>
              <button onClick={save} disabled={saving || !form.title.trim()} style={{ flex: 2, background: saving || !form.title.trim() ? "#334155" : "#6366f1", border: "none", borderRadius: 8, color: "#fff", padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {saving ? "Enregistrement…" : editId ? "Mettre à jour" : "Créer la tâche"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001 }}>
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 24, maxWidth: 320, width: "90%" }}>
            <div style={{ fontSize: 14, color: "#f1f5f9", marginBottom: 16 }}>Supprimer cette tâche ?</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDel(null)} style={{ flex: 1, background: "#334155", border: "none", borderRadius: 8, color: "#94a3b8", padding: "9px", cursor: "pointer" }}>Annuler</button>
              <button onClick={async () => { await removeTask({ id: confirmDel as Id<"tasks"> }); setConfirmDel(null); }} style={{ flex: 1, background: "#7f1d1d", border: "none", borderRadius: 8, color: "#fca5a5", padding: "9px", cursor: "pointer", fontWeight: 600 }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
