import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface Props { projectId: Id<"projects"> }

const COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#3b82f6","#8b5cf6","#f97316","#06b6d4","#ec4899","#84cc16"];
const ICONS = ["ti-hammer","ti-paint","ti-building","ti-plug","ti-droplet","ti-star","ti-tool","ti-home","ti-sun","ti-leaf"];
const EMPTY = { name:"", description:"", color: COLORS[0], icon: ICONS[0], position: 0 };

export default function CategoriesPage({ projectId }: Props) {
  const categories = useQuery(api.categories.listByProject, { project_id: projectId });
  const create = useMutation(api.categories.create);
  const update = useMutation(api.categories.update);
  const remove = useMutation(api.categories.remove);

  const [editing, setEditing] = useState<string|null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [delId, setDelId] = useState<Id<"categories">|null>(null);
  const [loading, setLoading] = useState(false);

  if (!categories) return <Loader />;

  const sorted = [...categories].sort((a,b) => a.position - b.position);

  const openEdit = (cat: typeof categories[0]) => {
    setEditing(cat._id);
    setForm({ name:cat.name, description:cat.description||"", color:cat.color, icon:cat.icon, position:cat.position });
    setShowNew(false);
  };

  const openNew = () => {
    const maxPos = categories.length > 0 ? Math.max(...categories.map(c=>c.position)) + 1 : 1;
    setForm({ ...EMPTY, position: maxPos });
    setEditing(null);
    setShowNew(true);
  };

  const saveNew = async () => {
    if (!form.name) return;
    setLoading(true);
    try {
      await create({ project_id: projectId, name:form.name, description:form.description||undefined, color:form.color, icon:form.icon, position:Number(form.position) });
      setShowNew(false); setForm(EMPTY);
    } finally { setLoading(false); }
  };

  const saveEdit = async () => {
    if (!editing || !form.name) return;
    setLoading(true);
    try {
      await update({ id: editing as Id<"categories">, name:form.name, description:form.description||undefined, color:form.color, icon:form.icon, position:Number(form.position) });
      setEditing(null);
    } finally { setLoading(false); }
  };

  const confirmDel = async () => {
    if (!delId) return;
    setLoading(true);
    try { await remove({ id: delId }); setDelId(null); } finally { setLoading(false); }
  };

  const FormPanel = ({ onSave, onCancel }: { onSave: ()=>void, onCancel: ()=>void }) => (
    <div style={S.formCard}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div style={{ gridColumn:"1/-1" }}>
          <label style={S.label}>Nom *</label>
          <input style={S.input} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Gros œuvre" />
        </div>
        <div style={{ gridColumn:"1/-1" }}>
          <label style={S.label}>Description</label>
          <input style={S.input} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Optionnel" />
        </div>
        <div>
          <label style={S.label}>Couleur</label>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" as const, marginTop:4 }}>
            {COLORS.map(c=>(
              <button key={c} onClick={()=>setForm(f=>({...f,color:c}))} style={{ width:24,height:24,borderRadius:"50%",background:c,border:form.color===c?"3px solid #fff":"3px solid transparent",cursor:"pointer" }} />
            ))}
          </div>
        </div>
        <div>
          <label style={S.label}>Icône</label>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" as const, marginTop:4 }}>
            {ICONS.map(ic=>(
              <button key={ic} onClick={()=>setForm(f=>({...f,icon:ic}))} style={{ width:32,height:32,borderRadius:8,background:form.icon===ic?"#6366f1":"#0f172a",border:"1px solid #334155",color:"#f1f5f9",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>
                <i className={`ti ${ic}`} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={S.label}>Position</label>
          <input style={S.input} type="number" value={form.position} onChange={e=>setForm(f=>({...f,position:Number(e.target.value)}))} />
        </div>
      </div>
      <div style={{ display:"flex", gap:8, marginTop:14 }}>
        <button style={S.btnCancel} onClick={onCancel}>Annuler</button>
        <button style={S.btnPrimary} onClick={onSave} disabled={loading||!form.name}>{loading?"...":"Enregistrer"}</button>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div><h1 style={S.title}>Catégories</h1><div style={S.sub}>{categories.length} catégories de travaux</div></div>
        <button style={S.btnPrimary} onClick={openNew}>+ Nouvelle catégorie</button>
      </div>

      {showNew && <FormPanel onSave={saveNew} onCancel={()=>setShowNew(false)} />}

      <div style={S.grid}>
        {sorted.map(cat => (
          <div key={cat._id}>
            {editing === cat._id
              ? <FormPanel onSave={saveEdit} onCancel={()=>setEditing(null)} />
              : (
                <div style={{ ...S.card, borderLeft:`4px solid ${cat.color}` }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:14, marginBottom:12 }}>
                    <div style={{ width:48,height:48,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",background:cat.color+"22",color:cat.color,flexShrink:0 }}>
                      <i className={`ti ${cat.icon}`} style={{ fontSize:22 }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, color:"#f1f5f9", fontSize:15 }}>{cat.name}</div>
                      {cat.description && <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>{cat.description}</div>}
                      <div style={{ fontSize:11, color:"#334155", marginTop:6 }}>Position #{cat.position}</div>
                    </div>
                    <div style={{ display:"flex", gap:4 }}>
                      <button style={S.btnIcon} onClick={()=>openEdit(cat)} title="Modifier"><i className="ti ti-edit"/></button>
                      <button style={{ ...S.btnIcon, color:"#ef4444" }} onClick={()=>setDelId(cat._id)} title="Supprimer"><i className="ti ti-trash"/></button>
                    </div>
                  </div>
                </div>
              )
            }
          </div>
        ))}
      </div>

      {delId && (
        <div style={S.overlay} onClick={()=>setDelId(null)}>
          <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:16, padding:28, maxWidth:360, width:"100%" }} onClick={e=>e.stopPropagation()}>
            <div style={{ color:"#f1f5f9", fontWeight:600, fontSize:16, marginBottom:8 }}>Supprimer cette catégorie ?</div>
            <div style={{ color:"#94a3b8", fontSize:13, marginBottom:20 }}>Les phases associées ne seront pas supprimées.</div>
            <div style={{ display:"flex", gap:8 }}>
              <button style={S.btnCancel} onClick={()=>setDelId(null)}>Annuler</button>
              <button style={{ background:"#ef4444", color:"#fff", border:"none", borderRadius:8, padding:"10px 20px", fontSize:13, cursor:"pointer", fontWeight:600, flex:1 }} onClick={confirmDel} disabled={loading}>{loading?"...":"Supprimer"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Loader() { return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:200 }}><i className="ti ti-loader" style={{ fontSize:32,color:"#6366f1" }}/></div>; }

const S: Record<string,React.CSSProperties> = {
  page:{ padding:28 }, title:{ fontSize:22, fontWeight:700, color:"#f1f5f9" }, sub:{ fontSize:13, color:"#64748b", marginTop:4 },
  formCard:{ background:"#1e293b", border:"1px solid #6366f133", borderRadius:12, padding:20, marginBottom:16 },
  grid:{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 },
  card:{ background:"#1e293b", border:"1px solid #334155", borderRadius:12, padding:20 },
  btnPrimary:{ background:"#6366f1", color:"#fff", border:"none", borderRadius:8, padding:"10px 18px", fontSize:13, cursor:"pointer", fontWeight:600 },
  btnCancel:{ background:"#334155", color:"#f1f5f9", border:"none", borderRadius:8, padding:"10px 20px", fontSize:13, cursor:"pointer" },
  btnIcon:{ background:"transparent", border:"none", color:"#64748b", cursor:"pointer", fontSize:16, padding:"4px 6px" },
  overlay:{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 },
  label:{ display:"block", fontSize:11, color:"#94a3b8", marginBottom:4, fontWeight:600, textTransform:"uppercase" as const, letterSpacing:0.5 },
  input:{ width:"100%", background:"#0f172a", border:"1px solid #334155", borderRadius:8, color:"#f1f5f9", padding:"10px 12px", fontSize:14, boxSizing:"border-box" as const },
};
