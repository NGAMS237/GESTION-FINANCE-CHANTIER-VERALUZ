import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { fmtN, fmtDate, METHOD_LABELS } from "../lib/utils";

interface Props { projectId: Id<"projects"> }
const METHOD_OPTS = ["virement","especes","cheque","mobile_money","autre"];
const EMPTY = { quote_id:"" as Id<"quotes">|"", date: new Date().toISOString().slice(0,10), amount:"", method:"virement", reference:"", note:"" };

export default function PaymentsPage({ projectId }: Props) {
  const payments = useQuery(api.payments.listAll);
  const quotes = useQuery(api.quotes.listAll);
  const create = useMutation(api.payments.create);
  const remove = useMutation(api.payments.remove);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [delId, setDelId] = useState<Id<"payments">|null>(null);
  const [loading, setLoading] = useState(false);

  if (!payments || !quotes) return <Loader />;

  const quoteMap: Record<string,string> = {};
  quotes.forEach(q => { quoteMap[q._id] = q.number ? `${q.number} — ${q.description}` : q.description; });

  const sorted = [...payments].sort((a,b) => b.date.localeCompare(a.date));
  const total = payments.reduce((s,p) => s+p.amount, 0);

  const save = async () => {
    if (!form.quote_id || !form.amount || !form.date) return;
    setLoading(true);
    try {
      await create({ quote_id: form.quote_id as Id<"quotes">, date:form.date, amount:parseFloat(form.amount), method:form.method, reference:form.reference||undefined, note:form.note||undefined });
      setForm(EMPTY); setShowForm(false);
    } finally { setLoading(false); }
  };

  const confirmDel = async () => {
    if (!delId) return;
    setLoading(true);
    try { await remove({ id: delId }); setDelId(null); } finally { setLoading(false); }
  };

  return (
    <div style={S.page}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div><h1 style={S.title}>Paiements</h1><div style={S.sub}>{payments.length} paiements — Total versé : {fmtN(total)} FCFA</div></div>
        <button style={S.btnPrimary} onClick={() => setShowForm(v=>!v)}>{showForm ? "✕ Fermer" : "+ Nouveau paiement"}</button>
      </div>

      {showForm && (
        <div style={S.formCard}>
          <div style={{ fontWeight:600, color:"#f1f5f9", marginBottom:16 }}>Nouveau paiement</div>
          <div style={S.grid3}>
            <div>
              <label style={S.label}>Devis *</label>
              <select style={S.input} value={form.quote_id} onChange={e=>setForm(f=>({...f,quote_id:e.target.value as any}))}>
                <option value="">— Sélectionner —</option>
                {quotes.map(q=><option key={q._id} value={q._id}>{quoteMap[q._id]}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Date *</label>
              <input style={S.input} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
            </div>
            <div>
              <label style={S.label}>Montant *</label>
              <input style={S.input} type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="0" />
            </div>
            <div>
              <label style={S.label}>Méthode</label>
              <select style={S.input} value={form.method} onChange={e=>setForm(f=>({...f,method:e.target.value}))}>
                {METHOD_OPTS.map(m=><option key={m} value={m}>{METHOD_LABELS[m]||m}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Référence</label>
              <input style={S.input} value={form.reference} onChange={e=>setForm(f=>({...f,reference:e.target.value}))} placeholder="Ex: TXN-1234" />
            </div>
            <div>
              <label style={S.label}>Note</label>
              <input style={S.input} value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="Optionnel" />
            </div>
          </div>
          <button style={{ ...S.btnPrimary, marginTop:16 }} onClick={save} disabled={loading||!form.quote_id||!form.amount||!form.date}>{loading?"Sauvegarde...":"Enregistrer le paiement"}</button>
        </div>
      )}

      <div style={S.tableWrap}>
        <div style={{ ...S.row, ...S.headerRow }}>
          <span>Date</span><span>Devis</span><span>Montant</span><span>Méthode</span><span>Réf. / Note</span><span>Action</span>
        </div>
        {sorted.length===0 && <div style={{ padding:"24px", color:"#475569", textAlign:"center" as const }}>Aucun paiement</div>}
        {sorted.map(p => (
          <div key={p._id} style={S.row}>
            <span style={{ color:"#94a3b8", fontSize:12 }}>{fmtDate(p.date)}</span>
            <span style={{ color:"#f1f5f9" }}>{quoteMap[p.quote_id]||"—"}</span>
            <span style={{ fontWeight:700, color:"#10b981" }}>{fmtN(p.amount)} FCFA</span>
            <span style={{ color:"#94a3b8" }}>{METHOD_LABELS[p.method]||p.method}</span>
            <div><div style={{ color:"#64748b", fontSize:12 }}>{p.reference||"—"}</div>{p.note&&<div style={{ color:"#475569", fontSize:11 }}>{p.note}</div>}</div>
            <button style={{ ...S.btnIcon, color:"#ef4444" }} onClick={()=>setDelId(p._id)} title="Supprimer"><i className="ti ti-trash"/></button>
          </div>
        ))}
        {sorted.length>0 && (
          <div style={{ ...S.row, background:"#0f172a", borderTop:"2px solid #334155" }}>
            <span/><span style={{ color:"#94a3b8", fontWeight:600 }}>TOTAL</span>
            <span style={{ fontWeight:700, color:"#10b981", fontSize:15 }}>{fmtN(total)} FCFA</span>
            <span/><span/><span/>
          </div>
        )}
      </div>

      {delId && (
        <div style={S.overlay} onClick={()=>setDelId(null)}>
          <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:16, padding:28, width:"100%", maxWidth:360 }} onClick={e=>e.stopPropagation()}>
            <div style={{ color:"#f1f5f9", fontWeight:600, fontSize:16, marginBottom:8 }}>Supprimer ce paiement ?</div>
            <div style={{ color:"#94a3b8", fontSize:13, marginBottom:20 }}>Cette action est irréversible.</div>
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
  page:{ padding:"clamp(12px, 3vw, 28px)", paddingBottom:"max(28px, calc(env(safe-area-inset-bottom) + 70px))" }, title:{ fontSize:22, fontWeight:700, color:"#f1f5f9" }, sub:{ fontSize:13, color:"#64748b", marginTop:4 },
  formCard:{ background:"#1e293b", border:"1px solid #6366f133", borderRadius:12, padding:20, marginBottom:20 },
  tableWrap:{ background:"#1e293b", border:"1px solid #334155", borderRadius:12, overflow:"hidden" },
  headerRow:{ background:"#0f172a", color:"#64748b", fontSize:11, textTransform:"uppercase" as const, fontWeight:600 },
  row:{ display:"grid", gridTemplateColumns:"100px 1fr 140px 120px 1fr 60px", gap:12, padding:"12px 14px", borderBottom:"1px solid #0f172a", alignItems:"center", fontSize:13 },
  grid3:{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 },
  btnPrimary:{ background:"#6366f1", color:"#fff", border:"none", borderRadius:8, padding:"10px 18px", fontSize:13, cursor:"pointer", fontWeight:600 },
  btnIcon:{ background:"transparent", border:"none", color:"#64748b", cursor:"pointer", fontSize:16, padding:"4px 6px" },
  btnCancel:{ background:"#334155", color:"#f1f5f9", border:"none", borderRadius:8, padding:"10px 20px", fontSize:13, cursor:"pointer" },
  overlay:{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 },
  label:{ display:"block", fontSize:11, color:"#94a3b8", marginBottom:4, marginTop:0, fontWeight:600, textTransform:"uppercase" as const, letterSpacing:0.5 },
  input:{ width:"100%", background:"#0f172a", border:"1px solid #334155", borderRadius:8, color:"#f1f5f9", padding:"10px 12px", fontSize:14, boxSizing:"border-box" as const },
};
