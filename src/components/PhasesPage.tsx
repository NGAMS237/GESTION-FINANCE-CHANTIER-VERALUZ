import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

const STATUS_OPTS = ["planned","in_progress","completed","on_hold"];
const STATUS_LABELS: Record<string,string> = { planned:"Planifiée", in_progress:"En cours", completed:"Terminée", on_hold:"En attente" };
const STATUS_COLORS: Record<string,string> = { planned:"#64748b", in_progress:"#f59e0b", completed:"#10b981", on_hold:"#ef4444" };

interface Props { projectId: Id<"projects"> }

type Phase = { _id: Id<"phases">; category_id: Id<"categories">; name: string; description?: string; position: number; status: string };
type Category = { _id: Id<"categories">; name: string; color: string; icon: string };

const EMPTY_FORM = { name:"", description:"", position:0, status:"planned" };

export default function PhasesPage({ projectId }: Props) {
  const categories = useQuery(api.categories.listByProject, { project_id: projectId });
  const phases = useQuery(api.phases.listByProject, { project_id: projectId }) as Phase[] | undefined;
  const createPhase = useMutation(api.phases.create);
  const updatePhase = useMutation(api.phases.update);
  const deletePhase = useMutation(api.phases.remove);

  const [modal, setModal] = useState<null | { mode:"add"|"edit"; catId: Id<"categories">; phase?: Phase }>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [delId, setDelId] = useState<Id<"phases"> | null>(null);
  const [loading, setLoading] = useState(false);

  if (!categories || !phases) return <Loader />;

  const open = (mode:"add"|"edit", catId: Id<"categories">, phase?: Phase) => {
    setForm(phase ? { name:phase.name, description:phase.description||"", position:phase.position, status:phase.status } : EMPTY_FORM);
    setModal({ mode, catId, phase });
  };
  const close = () => setModal(null);

  const save = async () => {
    if (!modal || !form.name.trim()) return;
    setLoading(true);
    try {
      if (modal.mode === "add") {
        const catPhases = phases.filter(p => p.category_id === modal.catId);
        await createPhase({ category_id: modal.catId, name:form.name, description:form.description||undefined, position: catPhases.length, status: form.status });
      } else if (modal.phase) {
        await updatePhase({ id: modal.phase._id, name:form.name, description:form.description||undefined, position:form.position, status:form.status });
      }
      close();
    } finally { setLoading(false); }
  };

  const confirmDelete = async () => {
    if (!delId) return;
    setLoading(true);
    try { await deletePhase({ id: delId }); setDelId(null); } finally { setLoading(false); }
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Phases de travaux</h1>
        <div style={S.sub}>{phases.length} phases réparties en {categories.length} catégories</div>
      </div>

      {(categories as Category[]).map(cat => {
        const catPhases = phases.filter(p => p.category_id === cat._id).sort((a,b) => a.position - b.position);
        return (
          <div key={cat._id} style={{ ...S.card, borderLeft: `4px solid ${cat.color}`, marginBottom:16 }}>
            <div style={S.catHeader}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ ...S.iconBadge, background: cat.color+"22", color: cat.color }}><i className={`ti ${cat.icon}`} /></span>
                <span style={{ fontWeight:700, color:"#f1f5f9", fontSize:15 }}>{cat.name}</span>
                <span style={S.badge}>{catPhases.length} phase{catPhases.length!==1?"s":""}</span>
              </div>
              <button style={S.btnPrimary} onClick={() => open("add", cat._id)}>+ Ajouter</button>
            </div>
            {catPhases.length === 0 ? (
              <div style={{ color:"#475569", fontSize:13, padding:"8px 0" }}>Aucune phase — cliquez + Ajouter</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:12 }}>
                {catPhases.map(ph => (
                  <div key={ph._id} style={S.phaseRow}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, flex:1 }}>
                      <span style={{ width:8, height:8, borderRadius:"50%", background: STATUS_COLORS[ph.status]||"#64748b", flexShrink:0 }} />
                      <span style={{ color:"#f1f5f9", fontWeight:500 }}>{ph.name}</span>
                      {ph.description && <span style={{ color:"#64748b", fontSize:12 }}>— {ph.description}</span>}
                    </div>
                    <span style={{ ...S.statusChip, background: STATUS_COLORS[ph.status]+"22", color: STATUS_COLORS[ph.status] }}>{STATUS_LABELS[ph.status]||ph.status}</span>
                    <button style={S.btnIcon} onClick={() => open("edit", cat._id, ph)} title="Modifier"><i className="ti ti-pencil" /></button>
                    <button style={{ ...S.btnIcon, color:"#ef4444" }} onClick={() => setDelId(ph._id)} title="Supprimer"><i className="ti ti-trash" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Add/Edit Modal */}
      {modal && (
        <div style={S.overlay} onClick={close}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>{modal.mode === "add" ? "Nouvelle phase" : "Modifier la phase"}</div>
            <label style={S.label}>Nom *</label>
            <input style={S.input} value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Fondations" autoFocus />
            <label style={S.label}>Description</label>
            <input style={S.input} value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Optionnel" />
            <label style={S.label}>Statut</label>
            <select style={S.input} value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))}>
              {STATUS_OPTS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <div style={{ display:"flex", gap:8, marginTop:20 }}>
              <button style={S.btnCancel} onClick={close}>Annuler</button>
              <button style={{ ...S.btnPrimary, flex:1 }} onClick={save} disabled={loading}>{loading ? "Sauvegarde..." : "Sauvegarder"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {delId && (
        <div style={S.overlay} onClick={() => setDelId(null)}>
          <div style={{ ...S.modal, maxWidth:360 }} onClick={e => e.stopPropagation()}>
            <div style={{ color:"#f1f5f9", fontWeight:600, fontSize:16, marginBottom:12 }}>Supprimer cette phase ?</div>
            <div style={{ color:"#94a3b8", fontSize:13, marginBottom:20 }}>Cette action est irréversible.</div>
            <div style={{ display:"flex", gap:8 }}>
              <button style={S.btnCancel} onClick={() => setDelId(null)}>Annuler</button>
              <button style={{ ...S.btnDanger, flex:1 }} onClick={confirmDelete} disabled={loading}>{loading ? "..." : "Supprimer"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Loader() { return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:200 }}><i className="ti ti-loader" style={{ fontSize:32,color:"#6366f1" }} /></div>; }

const S: Record<string,React.CSSProperties> = {
  page:{ padding:"clamp(12px, 3vw, 28px)", paddingBottom:"max(28px, calc(env(safe-area-inset-bottom) + 70px))" }, header:{ marginBottom:24 },
  title:{ fontSize:22, fontWeight:700, color:"#f1f5f9" }, sub:{ fontSize:13, color:"#64748b", marginTop:4 },
  card:{ background:"#1e293b", border:"1px solid #334155", borderRadius:12, padding:20 },
  catHeader:{ display:"flex", alignItems:"center", justifyContent:"space-between" },
  iconBadge:{ width:36, height:36, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 },
  badge:{ background:"#0f172a", color:"#64748b", fontSize:11, padding:"2px 8px", borderRadius:20 },
  phaseRow:{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"#0f172a22", borderRadius:8, border:"1px solid #1e293b" },
  statusChip:{ fontSize:11, padding:"2px 8px", borderRadius:20, fontWeight:600, flexShrink:0 },
  btnPrimary:{ background:"#6366f1", color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontSize:13, cursor:"pointer", fontWeight:600 },
  btnIcon:{ background:"transparent", border:"none", color:"#64748b", cursor:"pointer", fontSize:16, padding:"4px 6px" },
  btnCancel:{ background:"#334155", color:"#f1f5f9", border:"none", borderRadius:8, padding:"10px 20px", fontSize:13, cursor:"pointer" },
  btnDanger:{ background:"#ef4444", color:"#fff", border:"none", borderRadius:8, padding:"10px 20px", fontSize:13, cursor:"pointer", fontWeight:600 },
  overlay:{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 },
  modal:{ background:"#1e293b", border:"1px solid #334155", borderRadius:16, padding:28, width:"100%", maxWidth:440 },
  modalTitle:{ fontSize:18, fontWeight:700, color:"#f1f5f9", marginBottom:20 },
  label:{ display:"block", fontSize:12, color:"#94a3b8", marginBottom:6, marginTop:14, fontWeight:500, textTransform:"uppercase" as const, letterSpacing:0.5 },
  input:{ width:"100%", background:"#0f172a", border:"1px solid #334155", borderRadius:8, color:"#f1f5f9", padding:"10px 12px", fontSize:14, boxSizing:"border-box" as const },
};
