import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface Props { projectId: Id<"projects"> }

const CATS = [
  { id: "administratif", label: "Administratif", icon: "📋", color: "#3b82f6" },
  { id: "technique",     label: "Technique",     icon: "🔧", color: "#f59e0b" },
  { id: "photos",        label: "Photos",        icon: "📸", color: "#10b981" },
  { id: "factures",      label: "Factures",      icon: "🧾", color: "#8b5cf6" },
] as const;

const FILE_ICONS: Record<string, string> = {
  pdf: "📄", image: "🖼", contract: "📝", other: "📁",
};

const EMPTY = { name: "", url: "", file_type: "other", category: "administratif", notes: "" };

export default function DocumentsPage({ projectId }: Props) {
  const docs = useQuery(api.documents.listByProject, { project_id: projectId }) ?? [];
  const createDoc  = useMutation(api.documents.create);
  const removeDoc  = useMutation(api.documents.remove);
  const genUpload  = useMutation((api as any).documents.generateUploadUrl);

  const [activeCat, setActiveCat] = useState("administratif");
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ ...EMPTY });
  const [saving, setSaving]       = useState(false);
  const [uploadMode, setUploadMode] = useState<"url" | "file">("url");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [uploading, setUploading]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = docs.filter(d => d.category === activeCat);

  async function handleFileUpload(file: File) {
    setUploading(true);
    try {
      const uploadUrl = await genUpload({});
      const result = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await result.json();
      await createDoc({
        project_id: projectId,
        name: file.name,
        storage_id: storageId,
        file_type: file.type.startsWith("image/") ? "image" : file.type === "application/pdf" ? "pdf" : "other",
        size: file.size,
        category: activeCat,
        notes: undefined,
        url: undefined,
        linked_to_type: undefined,
        linked_to_id: undefined,
      });
      setShowForm(false);
    } catch (e) {
      alert("Erreur upload. Essaie le lien URL.");
    } finally { setUploading(false); }
  }

  async function saveUrl() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await createDoc({
        project_id: projectId,
        name: form.name.trim(),
        url: form.url || undefined,
        file_type: form.file_type,
        category: form.category,
        notes: form.notes || undefined,
        storage_id: undefined,
        linked_to_type: undefined,
        linked_to_id: undefined,
        size: undefined,
      });
      setForm({ ...EMPTY, category: activeCat }); setShowForm(false);
    } finally { setSaving(false); }
  }

  const fmtSize = (b: number) => b > 1e6 ? (b / 1e6).toFixed(1) + " Mo" : b > 1e3 ? (b / 1e3).toFixed(0) + " Ko" : b + " o";

  return (
    <div style={{ padding: 24, minHeight: "100vh", background: "#0f172a" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ color: "#f1f5f9", margin: 0, fontSize: 18, fontWeight: 700 }}>Documents</h2>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{docs.length} fichier{docs.length !== 1 ? "s" : ""}</div>
        </div>
        <button onClick={() => { setForm({ ...EMPTY, category: activeCat }); setUploadMode("url"); setShowForm(true); }} style={{ background: "#6366f1", border: "none", borderRadius: 8, color: "#fff", padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Ajouter
        </button>
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        {CATS.map(cat => {
          const count = docs.filter(d => d.category === cat.id).length;
          return (
            <button key={cat.id} onClick={() => setActiveCat(cat.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: activeCat === cat.id ? cat.color + "33" : "#1e293b", border: `1px solid ${activeCat === cat.id ? cat.color : "#334155"}`, borderRadius: 20, color: activeCat === cat.id ? cat.color : "#64748b", cursor: "pointer", fontSize: 12, fontWeight: activeCat === cat.id ? 700 : 400, whiteSpace: "nowrap" }}>
              {cat.icon} {cat.label}
              <span style={{ background: activeCat === cat.id ? cat.color : "#334155", color: activeCat === cat.id ? "#fff" : "#64748b", borderRadius: 20, padding: "0 6px", fontSize: 10, fontWeight: 700 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Documents grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#475569" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{CATS.find(c => c.id === activeCat)?.icon}</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#64748b", marginBottom: 6 }}>Aucun document</div>
          <button onClick={() => { setForm({ ...EMPTY, category: activeCat }); setShowForm(true); }} style={{ background: "#6366f122", border: "1px solid #6366f144", borderRadius: 8, color: "#6366f1", padding: "8px 16px", fontSize: 12, cursor: "pointer" }}>
            + Ajouter un fichier
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {filtered.map(doc => {
            const catMeta = CATS.find(c => c.id === doc.category) ?? CATS[0];
            const fileIcon = FILE_ICONS[doc.file_type] ?? "📁";
            return (
              <div key={doc._id} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden", transition: "border-color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = catMeta.color)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#334155")}
              >
                {/* Preview area */}
                <div style={{ height: 90, background: catMeta.color + "11", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>
                  {fileIcon}
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.name}</div>
                  {doc.notes && <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, lineHeight: 1.4 }}>{doc.notes}</div>}
                  {doc.size && <div style={{ fontSize: 10, color: "#475569", marginBottom: 6 }}>{fmtSize(doc.size)}</div>}
                  <div style={{ display: "flex", gap: 6 }}>
                    {(doc.url || doc.storage_id) && (
                      <a href={doc.url ?? "#"} target="_blank" rel="noopener noreferrer" style={{ flex: 1, background: catMeta.color + "22", color: catMeta.color, border: "none", borderRadius: 6, padding: "5px 8px", fontSize: 11, cursor: "pointer", textAlign: "center", textDecoration: "none", fontWeight: 600 }}>
                        Ouvrir ↗
                      </a>
                    )}
                    <button onClick={() => setConfirmDel(doc._id)} style={{ background: "#7f1d1d33", border: "none", borderRadius: 6, color: "#f87171", padding: "5px 8px", fontSize: 11, cursor: "pointer" }}>✕</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 16, padding: 24, width: "100%", maxWidth: 440 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>Ajouter un document</span>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "#64748b", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            {/* Mode toggle */}
            <div style={{ display: "flex", background: "#0f172a", borderRadius: 8, padding: 3, marginBottom: 16 }}>
              {(["url", "file"] as const).map(m => (
                <button key={m} onClick={() => setUploadMode(m)} style={{ flex: 1, background: uploadMode === m ? "#6366f1" : "none", border: "none", borderRadius: 6, color: uploadMode === m ? "#fff" : "#64748b", padding: "7px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {m === "url" ? "🔗 Lien URL" : "📤 Upload fichier"}
                </button>
              ))}
            </div>

            {uploadMode === "file" ? (
              <div>
                <input ref={fileRef} type="file" accept="*/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                <div onClick={() => fileRef.current?.click()} style={{ border: "2px dashed #334155", borderRadius: 10, padding: "32px 20px", textAlign: "center", cursor: "pointer", color: "#64748b", transition: "border-color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#6366f1")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#334155")}
                >
                  {uploading ? (
                    <><div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div><div style={{ fontSize: 13 }}>Upload en cours…</div></>
                  ) : (
                    <><div style={{ fontSize: 28, marginBottom: 8 }}>📤</div><div style={{ fontSize: 13, fontWeight: 500 }}>Cliquer pour choisir un fichier</div><div style={{ fontSize: 11, marginTop: 4 }}>PDF, images, Word, Excel…</div></>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Nom du document *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Permis de construire" autoFocus style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", padding: "9px 12px", fontSize: 13, boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>URL (Google Drive, Dropbox…)</label>
                  <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://drive.google.com/…" style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", padding: "9px 12px", fontSize: 13, boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Catégorie</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", padding: "8px 10px", fontSize: 12 }}>
                      {CATS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Type</label>
                    <select value={form.file_type} onChange={e => setForm(f => ({ ...f, file_type: e.target.value }))} style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", padding: "8px 10px", fontSize: 12 }}>
                      <option value="pdf">📄 PDF</option>
                      <option value="image">🖼 Image</option>
                      <option value="contract">📝 Contrat</option>
                      <option value="other">📁 Autre</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: "#64748b", fontWeight: 600, display: "block", marginBottom: 4 }}>Notes</label>
                  <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Description courte…" style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", padding: "9px 12px", fontSize: 13, boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setShowForm(false)} style={{ flex: 1, background: "#334155", border: "none", borderRadius: 8, color: "#94a3b8", padding: "10px", fontSize: 13, cursor: "pointer" }}>Annuler</button>
                  <button onClick={saveUrl} disabled={saving || !form.name.trim()} style={{ flex: 2, background: saving || !form.name.trim() ? "#334155" : "#6366f1", border: "none", borderRadius: 8, color: "#fff", padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    {saving ? "Ajout…" : "Ajouter le document"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001 }}>
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 24, maxWidth: 300, width: "90%" }}>
            <div style={{ fontSize: 14, color: "#f1f5f9", marginBottom: 16 }}>Supprimer ce document ?</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDel(null)} style={{ flex: 1, background: "#334155", border: "none", borderRadius: 8, color: "#94a3b8", padding: "9px", cursor: "pointer" }}>Annuler</button>
              <button onClick={async () => { await removeDoc({ id: confirmDel as Id<"documents"> }); setConfirmDel(null); }} style={{ flex: 1, background: "#7f1d1d", border: "none", borderRadius: 8, color: "#fca5a5", padding: "9px", cursor: "pointer", fontWeight: 600 }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
