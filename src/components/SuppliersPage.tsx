import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { fmtN } from "../lib/utils";

interface Props { projectId: Id<"projects"> }
const EMPTY = { name:"", phone:"", email:"", address:"", speciality:"", notes:"" };
const FIELDS: [keyof typeof EMPTY, string, string, string][] = [
  ["name","Nom *","text","Ex: SABC Construction"],
  ["phone","Téléphone","tel","Ex: +237 6XX XX XX XX"],
  ["email","Email","email","contact@fournisseur.com"],
  ["speciality","Spécialité","text","Ex: Maçonnerie, Plomberie..."],
  ["address","Adresse","text","Ex: Douala, Cameroun"],
  ["notes","Notes","text","Observations..."],
];

export default function SuppliersPage({ projectId }: Props) {
  const suppliers = useQuery(api.suppliers.listByProject, { project_id: projectId });
  const quotes = useQuery(api.quotes.listAll);
  const payments = useQuery(api.payments.listAll);
  const create = useMutation(api.suppliers.create);
  const update = useMutation(api.suppliers.update);
  const remove = useMutation(api.suppliers.remove);

  const [modal, setModal] = useState<null|{mode:"add"|"edit"; s?: any}>(null);
  const [form, setForm] = useState(EMPTY);
  const [delId, setDelId] = useState<Id<"suppliers">|null>(null);
  const [loading, setLoading] = useState(false);

  if (!suppliers || !quotes || !payments) return <Loader />;

  const paidMap: Record<string,number> = {};
  payments.forEach(p => { paidMap[p.quote_id] = (paidMap[p.quote_id]??0) + p.amount; });

  const open = (mode:"add"|"edit", s?: any) => {
    setForm(s ? { name:s.name, phone:s.phone||"", email:s.email||"", address:s.address||"", speciality:s.speciality||"", notes:s.notes||"" } : EMPTY);
    setModal({ mode, s });
  };

  const save = async () => {
    if (!modal || !form.name.trim()) return;
    setLoading(true);
    try {
      const d = { name:form.name, phone:form.phone||undefined, email:form.email||undefined, address:form.address||undefined, speciality:form.speciality||undefined, notes:form.notes||undefined };
      if (modal.mode==="add") await create({ project_id: projectId, ...d });
      else await update({ id: modal.s._id, ...d });
      setModal(null);
    } finally { setLoading(false); }
  };

  const confirmDel = async () => {
    if (!delId) return;
    setLoading(true);
    try { await remove({ id: delId }); setDelId(null); } finally { setLoading(false); }
  };

  return (
    <div style={S.page}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div><h1 style={S.title}>Fournisseurs</h1><div style={S.sub}>{suppliers.length} fournisseurs</div></div>
        <button style={S.btnPrimary} onClick={() => open("add")}>+ Ajouter</button>
      </div>

      <div style={S.grid}>
        {suppliers.map(s => {
          const eng = quotes.filter(q=>q.supplier_id===s._id).reduce((sum,q)=>sum+q.amount, 0);
          const ver = quotes.filter(q=>q.supplier_id===s._id).reduce((sum,q)=>sum+(paidMap[q._id]??0), 0);
          const nDevis = quotes.filter(q=>q.supplier_id===s._id).length;
          return (
            <div key={s._id} style={S.card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                <div style={S.avatar}>{s.name.charAt(0).toUpperCase()}</div>
                <div style={{ display:"flex", gap:4 }}>
                  <button style={S.btnIcon} onClick={() => open("edit", s)} title="Modifier"><i className="ti ti-pencil"/></button>
                  <button style={{ ...S.btnIcon, color:"#ef4444" }} onClick={() => setDelId(s._id)} title="Supprimer"><i className="ti ti-trash"/></button>
                </div>
              </div>
              <div style={{ fontWeight:700, color:"#f1f5f9", fontSize:15, marginBottom:2 }}>{s.name}</div>
              {s.speciality && <div style={{ color:"#6366f1", fontSize:12, fontWeight:500, marginBottom:8 }}>{s.speciality}</div>}
              {s.phone && <div style={S.contact}><i className="ti ti-phone" style={{ fontSize:12 }}/> {s.phone}</div>}
              {s.email && <div style={S.contact}><i className="ti ti-mail" style={{ fontSize:12 }}/> {s.email}</div>}
              {s.address && <div style={S.contact}><i className="ti ti-map-pin" style={{ fontSize:12 }}/> {s.address}</div>}
              <div style={S.divider}/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, textAlign:"center" as const }}>
                <div><div style={{ color:"#f1f5f9", fontWeight:700, fontSize:13 }}>{nDevis}</div><div style={{ color:"#64748b", fontSize:10 }}>Devis</div></div>
                <div><div style={{ color:"#f1f5f9", fontWeight:700, fontSize:12 }}>{fmtN(eng)}</div><div style={{ color:"#64748b", fontSize:10 }}>Engagé FCFA</div></div>
                <div><div style={{ color:"#10b981", fontWeight:700, fontSize:12 }}>{fmtN(ver)}</div><div style={{ color:"#64748b", fontSize:10 }}>Versé FCFA</div></div>
              </div>
            </div>
          );
        })}
        <div style={{ ...S.card, display:"flex", alignItems:"center", justifyContent:"center", border:"2px dashed #334155", cursor:"pointer", minHeight:180, flexDirection:"column" as const, gap:8, color:"#475569" }} onClick={() => open("add")}>
          <i className="ti ti-plus" style={{ fontSize:28 }}/>
          <span style={{ fontSize:13 }}>Ajouter un fournisseur</span>
        </div>
      </div>

      {modal && (
        <div style={S.overlay} onClick={() => setModal(null)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={S.modalTitle}>{modal.mode==="add"?"Nouveau fournisseur":"Modifier le fournisseur"}</div>
            {(FIELDS as [keyof typeof EMPTY, string, string, string][]).map(([key,label,type,ph]) => (
              <div key={key}>
                <label style={S.label}>{label}</label>
                <input style={S.input} type={type} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph} />
              </div>
            ))}
            <div style={{ display:"flex", gap:8, marginTop:20 }}>
              <button style={S.btnCancel} onClick={() => setModal(null)}>Annuler</button>
              <button style={{ ...S.btnPrimary, flex:1 }} onClick={save} disabled={loading||!form.name.trim()}>{loading?"Sauvegarde...":"Sauvegarder"}</button>
            </div>
          </div>
        </div>
      )}
      {delId && (
        <div style={S.overlay} onClick={()=>setDelId(null)}>
          <div style={{ ...S.modal, maxWidth:360 }} onClick={e=>e.stopPropagation()}>
            <div style={{ color:"#f1f5f9", fontWeight:600, fontSize:16, marginBottom:8 }}>Supprimer ce fournisseur ?</div>
            <div style={{ color:"#94a3b8", fontSize:13, marginBottom:20 }}>Cette action est irréversible.</div>
            <div style={{ display:"flex", gap:8 }}>
              <button style={S.btnCancel} onClick={()=>setDelId(null)}>Annuler</button>
              <button style={{ ...S.btnDanger, flex:1 }} onClick={confirmDel} disabled={loading}>{loading?"...":"Supprimer"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Loader() { return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:200 }}><i className="ti ti-loader" style={{ fontSize:32,color:"#6366f1" }}/></div>; }

const S: Record<string,React.CSSProperties> = {
  page:{ padding:"clamp(12px, 3vw, 28px)", paddingBottom:"max(28px, calc(env(safe-area-inset-bottom) + 70px))" }, title:{ fontSize:22, fontWeight:700, color:"#f1f5f9" }, sub:{ fontSize:13, color:"#64748b", marginTop:4 },
  grid:{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:16 },
  card:{ background:"#1e293b", border:"1px solid #334155", borderRadius:12, padding:20 },
  avatar:{ width:44, height:44, borderRadius:12, background:"#6366f122", color:"#6366f1", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:700 },
  contact:{ color:"#64748b", fontSize:12, display:"flex", alignItems:"center", gap:6, marginTop:4 },
  divider:{ borderTop:"1px solid #334155", margin:"14px 0" },
  btnPrimary:{ background:"#6366f1", color:"#fff", border:"none", borderRadius:8, padding:"10px 18px", fontSize:13, cursor:"pointer", fontWeight:600 },
  btnIcon:{ background:"transparent", border:"none", color:"#64748b", cursor:"pointer", fontSize:16, padding:"4px 6px" },
  btnCancel:{ background:"#334155", color:"#f1f5f9", border:"none", borderRadius:8, padding:"10px 20px", fontSize:13, cursor:"pointer" },
  btnDanger:{ background:"#ef4444", color:"#fff", border:"none", borderRadius:8, padding:"10px 20px", fontSize:13, cursor:"pointer", fontWeight:600 },
  overlay:{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 },
  modal:{ background:"#1e293b", border:"1px solid #334155", borderRadius:16, padding:28, width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto" as const },
  modalTitle:{ fontSize:18, fontWeight:700, color:"#f1f5f9", marginBottom:20 },
  label:{ display:"block", fontSize:11, color:"#94a3b8", marginBottom:4, marginTop:12, fontWeight:600, textTransform:"uppercase" as const, letterSpacing:0.5 },
  input:{ width:"100%", background:"#0f172a", border:"1px solid #334155", borderRadius:8, color:"#f1f5f9", padding:"10px 12px", fontSize:14, boxSizing:"border-box" as const },
};
