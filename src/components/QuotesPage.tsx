import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { fmtN, fmtDate, STATUS_LABELS, STATUS_COLORS } from "../lib/utils";

interface Props { projectId: Id<"projects"> }
const STATUS_OPTS = ["pending","approved","in_progress","completed","cancelled"];
const METHOD_OPTS = ["virement","especes","cheque","mobile_money","autre"];
const CURRENCY_OPTS = ["FCFA","EUR","USD","CAD"];

const EMPTY_QUOTE = { phase_id:"" as Id<"phases">, supplier_id:"" as Id<"suppliers">|"", number:"", description:"", date:"", amount:"", currency:"FCFA", status:"pending", notes:"" };

export default function QuotesPage({ projectId }: Props) {
  const quotes = useQuery(api.quotes.listAll);
  const payments = useQuery(api.payments.listAll);
  const suppliers = useQuery(api.suppliers.listByProject, { project_id: projectId });
  const categories = useQuery(api.categories.listByProject, { project_id: projectId });
  const phases = useQuery(api.phases.listAll);
  const createQ = useMutation(api.quotes.create);
  const updateQ = useMutation(api.quotes.update);
  const deleteQ = useMutation(api.quotes.remove);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [modal, setModal] = useState<null|{mode:"add"|"edit"; q?: typeof quotes extends (infer T)[]|undefined ? T : never}>(null);
  const [form, setForm] = useState(EMPTY_QUOTE);
  const [delId, setDelId] = useState<Id<"quotes">|null>(null);
  const [loading, setLoading] = useState(false);

  if (!quotes || !payments || !suppliers || !categories || !phases) return <Loader />;

  const paidMap: Record<string,number> = {};
  payments.forEach(p => { paidMap[p.quote_id] = (paidMap[p.quote_id]??0) + p.amount; });
  const supMap: Record<string,string> = {};
  suppliers.forEach(s => { supMap[s._id] = s.name; });

  const filtered = quotes
    .filter(q => filterStatus==="all" || q.status===filterStatus)
    .filter(q => !search || q.description.toLowerCase().includes(search.toLowerCase()) || (q.number||"").toLowerCase().includes(search.toLowerCase()));

  const open = (mode:"add", q?: undefined) => { setForm(EMPTY_QUOTE); setModal({mode:"add"}); };
  const openEdit = (q: typeof quotes[0]) => {
    setForm({ phase_id:q.phase_id, supplier_id:q.supplier_id||"" as any, number:q.number||"", description:q.description, date:q.date||"", amount:String(q.amount), currency:q.currency, status:q.status, notes:q.notes||"" });
    setModal({mode:"edit", q});
  };
  const close = () => setModal(null);

  const save = async () => {
    if (!modal || !form.description.trim() || !form.phase_id || !form.amount) return;
    setLoading(true);
    try {
      const data = { phase_id: form.phase_id as Id<"phases">, supplier_id: form.supplier_id || undefined, number: form.number||undefined, description: form.description, date: form.date||undefined, amount: parseFloat(form.amount), currency: form.currency, status: form.status, notes: form.notes||undefined };
      if (modal.mode==="add") await createQ(data as any);
      else if (modal.q) await updateQ({ id: modal.q._id, ...data });
      close();
    } finally { setLoading(false); }
  };

  const confirmDel = async () => {
    if (!delId) return;
    setLoading(true);
    try { await deleteQ({ id: delId }); setDelId(null); } finally { setLoading(false); }
  };

  // Group phases by category for selector
  const phasesByCat = categories.map(cat => ({
    cat, phases: phases.filter(p => p.category_id === cat._id).sort((a,b)=>a.position-b.position)
  }));

  const total = filtered.reduce((s,q) => s + q.amount, 0);
  const totalVerse = filtered.reduce((s,q) => s + (paidMap[q._id]??0), 0);

  return (
    <div style={S.page}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div><h1 style={S.title}>Devis</h1><div style={S.sub}>{filtered.length} devis — {fmtN(total)} FCFA engagés</div></div>
        <button style={S.btnPrimary} onClick={() => open("add")}>+ Nouveau devis</button>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" as const }}>
        <input style={{ ...S.input, flex:1, minWidth:200, maxWidth:320 }} placeholder="Rechercher..." value={search} onChange={e=>setSearch(e.target.value)} />
        <select style={{ ...S.input, width:"auto" }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="all">Tous les statuts</option>
          {STATUS_OPTS.map(s=><option key={s} value={s}>{STATUS_LABELS[s]||s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={S.tableWrap}>
        <div style={{ ...S.row, ...S.headerRow }}>
          <span>N°</span><span>Description</span><span>Fournisseur</span><span>Montant</span><span>Versé</span><span>Statut</span><span>Actions</span>
        </div>
        {filtered.length===0 && <div style={{ padding:"24px 14px", color:"#475569", textAlign:"center" as const }}>Aucun devis trouvé</div>}
        {filtered.sort((a,b)=>(a.number||"").localeCompare(b.number||"")).map(q => {
          const verse = paidMap[q._id]??0;
          const reste = q.amount - verse;
          return (
            <div key={q._id} style={S.row}>
              <span style={{ color:"#94a3b8", fontSize:12 }}>{q.number||"—"}</span>
              <div><div style={{ color:"#f1f5f9", fontWeight:500 }}>{q.description}</div>{q.date&&<div style={{ color:"#64748b",fontSize:11 }}>{fmtDate(q.date)}</div>}</div>
              <span style={{ color:"#94a3b8" }}>{q.supplier_id ? supMap[q.supplier_id]||"—" : "—"}</span>
              <span style={{ fontWeight:600, color:"#f1f5f9" }}>{fmtN(q.amount)} <span style={{ fontSize:11,color:"#475569" }}>{q.currency}</span></span>
              <div><div style={{ color:"#10b981" }}>{fmtN(verse)} {q.currency}</div><div style={{ color: reste>0?"#f59e0b":"#10b981", fontSize:11 }}>Reste: {fmtN(reste)}</div></div>
              <span style={{ ...S.chip, background:(STATUS_COLORS[q.status]||"#64748b")+"22", color: STATUS_COLORS[q.status]||"#64748b" }}>{STATUS_LABELS[q.status]||q.status}</span>
              <div style={{ display:"flex", gap:4 }}>
                <button style={S.btnIcon} onClick={()=>openEdit(q)} title="Modifier"><i className="ti ti-pencil"/></button>
                <button style={{ ...S.btnIcon, color:"#ef4444" }} onClick={()=>setDelId(q._id)} title="Supprimer"><i className="ti ti-trash"/></button>
              </div>
            </div>
          );
        })}
        {filtered.length>0 && (
          <div style={{ ...S.row, background:"#0f172a", borderTop:"2px solid #334155" }}>
            <span/><span style={{ color:"#94a3b8", fontWeight:600 }}>TOTAL ({filtered.length})</span><span/>
            <span style={{ fontWeight:700, color:"#f1f5f9" }}>{fmtN(total)} FCFA</span>
            <span style={{ fontWeight:700, color:"#10b981" }}>{fmtN(totalVerse)} FCFA</span>
            <span/><span/>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={S.overlay} onClick={close}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={S.modalTitle}>{modal.mode==="add"?"Nouveau devis":"Modifier le devis"}</div>
            <div style={S.grid2}>
              <div>
                <label style={S.label}>Phase *</label>
                <select style={S.input} value={form.phase_id} onChange={e=>setForm(f=>({...f,phase_id:e.target.value as any}))}>
                  <option value="">— Sélectionner —</option>
                  {phasesByCat.map(({cat,phases:ps})=>ps.length>0&&(
                    <optgroup key={cat._id} label={cat.name}>
                      {ps.map(ph=><option key={ph._id} value={ph._id}>{ph.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label style={S.label}>Fournisseur</label>
                <select style={S.input} value={form.supplier_id} onChange={e=>setForm(f=>({...f,supplier_id:e.target.value as any}))}>
                  <option value="">— Aucun —</option>
                  {suppliers.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div style={S.grid2}>
              <div>
                <label style={S.label}>N° Devis</label>
                <input style={S.input} value={form.number} onChange={e=>setForm(f=>({...f,number:e.target.value}))} placeholder="Ex: DV-001" />
              </div>
              <div>
                <label style={S.label}>Date</label>
                <input style={S.input} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
              </div>
            </div>
            <label style={S.label}>Description *</label>
            <input style={S.input} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Description des travaux" />
            <div style={S.grid2}>
              <div>
                <label style={S.label}>Montant *</label>
                <input style={S.input} type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="0" />
              </div>
              <div>
                <label style={S.label}>Devise</label>
                <select style={S.input} value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}>
                  {CURRENCY_OPTS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={S.grid2}>
              <div>
                <label style={S.label}>Statut</label>
                <select style={S.input} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                  {STATUS_OPTS.map(s=><option key={s} value={s}>{STATUS_LABELS[s]||s}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Notes</label>
                <input style={S.input} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Optionnel" />
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:20 }}>
              <button style={S.btnCancel} onClick={close}>Annuler</button>
              <button style={{ ...S.btnPrimary, flex:1 }} onClick={save} disabled={loading||!form.description||!form.phase_id||!form.amount}>{loading?"Sauvegarde...":"Sauvegarder"}</button>
            </div>
          </div>
        </div>
      )}

      {delId && (
        <div style={S.overlay} onClick={()=>setDelId(null)}>
          <div style={{ ...S.modal, maxWidth:360 }} onClick={e=>e.stopPropagation()}>
            <div style={{ color:"#f1f5f9", fontWeight:600, fontSize:16, marginBottom:8 }}>Supprimer ce devis ?</div>
            <div style={{ color:"#94a3b8", fontSize:13, marginBottom:20 }}>Tous les paiements associés seront aussi supprimés.</div>
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
  tableWrap:{ background:"#1e293b", border:"1px solid #334155", borderRadius:12, overflow:"hidden" },
  headerRow:{ background:"#0f172a", color:"#64748b", fontSize:11, textTransform:"uppercase" as const, fontWeight:600 },
  row:{ display:"grid", gridTemplateColumns:"80px 1fr 140px 130px 130px 110px 80px", gap:12, padding:"12px 14px", borderBottom:"1px solid #0f172a", alignItems:"center", fontSize:13 },
  chip:{ fontSize:11, padding:"3px 8px", borderRadius:20, fontWeight:600 },
  btnPrimary:{ background:"#6366f1", color:"#fff", border:"none", borderRadius:8, padding:"10px 18px", fontSize:13, cursor:"pointer", fontWeight:600 },
  btnIcon:{ background:"transparent", border:"none", color:"#64748b", cursor:"pointer", fontSize:16, padding:"4px 6px" },
  btnCancel:{ background:"#334155", color:"#f1f5f9", border:"none", borderRadius:8, padding:"10px 20px", fontSize:13, cursor:"pointer" },
  btnDanger:{ background:"#ef4444", color:"#fff", border:"none", borderRadius:8, padding:"10px 20px", fontSize:13, cursor:"pointer", fontWeight:600 },
  overlay:{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 },
  modal:{ background:"#1e293b", border:"1px solid #334155", borderRadius:16, padding:28, width:"100%", maxWidth:560, maxHeight:"90vh", overflowY:"auto" as const },
  modalTitle:{ fontSize:18, fontWeight:700, color:"#f1f5f9", marginBottom:20 },
  label:{ display:"block", fontSize:11, color:"#94a3b8", marginBottom:4, marginTop:12, fontWeight:600, textTransform:"uppercase" as const, letterSpacing:0.5 },
  input:{ width:"100%", background:"#0f172a", border:"1px solid #334155", borderRadius:8, color:"#f1f5f9", padding:"10px 12px", fontSize:14, boxSizing:"border-box" as const },
  grid2:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
};
