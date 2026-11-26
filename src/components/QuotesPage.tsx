import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { fmtN, fmtDate } from "../lib/utils";

interface Props { projectId: Id<"projects"> }

const CURRENCY_OPTS = ["FCFA","EUR","USD","CAD"];
const STATUS_OPTS   = ["prevu","pending","approved","partial","paid"];

const STATUS_META: Record<string,{label:string; color:string; dashed?:boolean}> = {
  prevu:    { label:"Prévu",       color:"#8b5cf6", dashed:true },
  pending:  { label:"En attente",  color:"#f59e0b" },
  approved: { label:"Approuvé",    color:"#3b82f6" },
  partial:  { label:"Partiel",     color:"#f97316" },
  paid:     { label:"Soldé",       color:"#10b981" },
};

const PAY_METHODS = ["Virement","Espèces","Chèque","Mobile Money","Carte","Autre"];

const EMPTY_Q  = { phase_id:"", supplier_id:"", number:"", description:"", date:"", amount:"", currency:"FCFA", status:"pending", notes:"" };
const EMPTY_PH = { category_id:"", name:"", status:"planned" };
const EMPTY_PAY = { date:"", amount:"", method:"Virement", reference:"", note:"" };

export default function QuotesPage({ projectId }: Props) {
  // ── ALL HOOKS FIRST (before any conditional return) ──
  const quotes     = useQuery(api.quotes.listByProject,   { project_id: projectId });
  const payments   = useQuery(api.payments.listByProject, { project_id: projectId });
  const suppliers  = useQuery(api.suppliers.listByProject, { project_id: projectId });
  const categories = useQuery(api.categories.listByProject, { project_id: projectId });
  const phases     = useQuery(api.phases.listByProject,   { project_id: projectId });

  const createQuote   = useMutation(api.quotes.create);
  const updateQuote   = useMutation(api.quotes.update);
  const removeQuote   = useMutation(api.quotes.remove);
  const createPhase   = useMutation(api.phases.create);
  const createPayment = useMutation(api.payments.create);
  const removePayment = useMutation(api.payments.remove);

  const [view, setView]           = useState<"list"|"kanban">("list");
  const [modal, setModal]         = useState<null|{mode:"add"|"edit"; q?:any}>(null);
  const [form, setForm]           = useState({...EMPTY_Q});
  const [delId, setDelId]         = useState<Id<"quotes">|null>(null);
  const [filter, setFilter]       = useState("all");
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(false);
  const [showNewPhase, setShowNewPhase] = useState(false);
  const [phaseForm, setPhaseForm] = useState({...EMPTY_PH});

  // Detail panel state
  const [detail, setDetail]       = useState<any|null>(null); // selected quote
  const [addPay, setAddPay]       = useState(false);
  const [payForm, setPayForm]     = useState({...EMPTY_PAY});
  const [delPayId, setDelPayId]   = useState<Id<"payments">|null>(null);

  if (!quotes || !payments || !suppliers || !categories || !phases) return <Loader />;

  // ── Maps ──
  const supMap: Record<string,string> = {};
  suppliers.forEach(s => { supMap[s._id] = s.name; });

  const phaseMap: Record<string,string> = {};
  phases.forEach(p => { phaseMap[p._id] = p.name; });

  const paidByQuote: Record<string,number> = {};
  payments.forEach(p => { paidByQuote[p.quote_id] = (paidByQuote[p.quote_id]??0) + p.amount; });

  const paysByQuote: Record<string,typeof payments> = {};
  payments.forEach(p => { if(!paysByQuote[p.quote_id]) paysByQuote[p.quote_id]=[];  paysByQuote[p.quote_id].push(p); });

  const phasesByCat = categories.map(cat => ({
    cat, phases: phases.filter(p => p.category_id === cat._id).sort((a,b)=>a.position-b.position)
  })).filter(g => g.phases.length > 0);

  // ── Filter ──
  const filtered = quotes
    .filter(q => filter==="all" || q.status===filter)
    .filter(q => !search || q.description.toLowerCase().includes(search.toLowerCase()) || (q.number||"").toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => (b.date||"").localeCompare(a.date||""));

  const total     = filtered.reduce((s,q)=>s+q.amount,0);
  const totalPaid = filtered.reduce((s,q)=>s+(paidByQuote[q._id]??0),0);
  const totalReste = Math.max(total - totalPaid, 0);

  // ── Handlers ──
  const openAdd  = () => { setForm({...EMPTY_Q}); setShowNewPhase(false); setModal({mode:"add"}); };
  const openEdit = (q:any) => {
    setForm({ phase_id:q.phase_id, supplier_id:q.supplier_id||"", number:q.number||"", description:q.description, date:q.date||"", amount:String(q.amount), currency:q.currency, status:q.status, notes:q.notes||"" });
    setShowNewPhase(false); setModal({mode:"edit",q});
  };
  const openDetail = (q:any) => { setDetail(q); setAddPay(false); setPayForm({...EMPTY_PAY}); };

  const save = async () => {
    if (!modal) return;
    const isPrevu = form.status==="prevu";
    if (!form.phase_id || !form.description.trim() || (!isPrevu && !form.amount)) return;
    setLoading(true);
    try {
      const data = { phase_id:form.phase_id as Id<"phases">, supplier_id: form.supplier_id ? form.supplier_id as Id<"suppliers"> : undefined, number:form.number||undefined, description:form.description, date:form.date||undefined, amount:isPrevu&&!form.amount?0:parseFloat(form.amount), currency:form.currency, status:form.status, notes:form.notes||undefined };
      if (modal.mode==="add") await createQuote(data);
      else await updateQuote({ id:modal.q._id, ...data });
      setModal(null);
    } finally { setLoading(false); }
  };

  const addPhase = async () => {
    if (!phaseForm.category_id || !phaseForm.name.trim()) return;
    setLoading(true);
    try {
      const maxPos = phases.filter(p=>p.category_id===phaseForm.category_id).length+1;
      const id = await createPhase({ category_id:phaseForm.category_id as Id<"categories">, name:phaseForm.name, status:phaseForm.status, position:maxPos });
      setForm(f=>({...f,phase_id:id})); setPhaseForm({...EMPTY_PH}); setShowNewPhase(false);
    } finally { setLoading(false); }
  };

  const confirmDel = async () => {
    if (!delId) return; setLoading(true);
    try { await removeQuote({id:delId}); setDelId(null); } finally { setLoading(false); }
  };

  const savePayment = async () => {
    if (!detail || !payForm.date || !payForm.amount) return;
    setLoading(true);
    try {
      await createPayment({ quote_id:detail._id, date:payForm.date, amount:parseFloat(payForm.amount), method:payForm.method, reference:payForm.reference||undefined, note:payForm.note||undefined });
      setAddPay(false); setPayForm({...EMPTY_PAY});
    } finally { setLoading(false); }
  };

  const confirmDelPay = async () => {
    if (!delPayId) return; setLoading(true);
    try { await removePayment({id:delPayId}); setDelPayId(null); } finally { setLoading(false); }
  };

  const isPrevu = form.status==="prevu";

  const kanbanCols = [
    { id:"prevu",    label:"Prévu",       color:"#8b5cf6" },
    { id:"pending",  label:"En attente",  color:"#f59e0b" },
    { id:"approved", label:"Approuvé",    color:"#3b82f6" },
    { id:"partial",  label:"Partiel",     color:"#f97316" },
    { id:"paid",     label:"Soldé",       color:"#10b981" },
  ];

  // Sync detail with latest data (payments may have changed)
  const detailQuote  = detail ? quotes.find(q=>q._id===detail._id) ?? detail : null;
  const detailPays   = detailQuote ? (paysByQuote[detailQuote._id] ?? []).sort((a:any,b:any)=>b.date.localeCompare(a.date)) : [];
  const detailPaid   = detailPays.reduce((s:number,p:any)=>s+p.amount,0);
  const detailReste  = Math.max((detailQuote?.amount??0) - detailPaid, 0);

  return (
    <div style={S.page}>
      {/* Toolbar */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap" as const }}>
        <div style={{ flex:1 }}>
          <h1 style={S.title}>Devis</h1>
          <div style={{ fontSize:13, color:"#64748b", marginTop:2 }}>
            {filtered.length} devis · <span style={{ color:"#f1f5f9" }}>{fmtN(total)} FCFA</span> engagé ·{" "}
            <span style={{ color:"#10b981" }}>{fmtN(totalPaid)} versé</span> ·{" "}
            <span style={{ color: totalReste>0?"#f59e0b":"#10b981" }}>{totalReste>0?`${fmtN(totalReste)} reste`:"✓ Soldé"}</span>
          </div>
        </div>
        <input style={{ ...S.input, width:160, padding:"8px 12px" }} placeholder="Rechercher…" value={search} onChange={e=>setSearch(e.target.value)} />
        <select style={{ ...S.input, width:150, padding:"8px 12px" }} value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="all">Tous les statuts</option>
          {STATUS_OPTS.map(s=><option key={s} value={s}>{STATUS_META[s]?.label||s}</option>)}
        </select>
        <div style={{ display:"flex", gap:4, background:"#1e293b", borderRadius:8, padding:3 }}>
          {(["list","kanban"] as const).map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{ background:view===v?"#334155":"none", border:"none", borderRadius:6, color:view===v?"#e2e8f0":"#64748b", padding:"6px 12px", fontSize:12, cursor:"pointer", fontWeight:view===v?600:400 }}>
              {v==="list"?"≡ Liste":"⊞ Kanban"}
            </button>
          ))}
        </div>
        <button style={S.btnPrimary} onClick={openAdd}>+ Nouveau devis</button>
      </div>

      {/* ── KANBAN ── */}
      {view==="kanban" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:16 }}>
          {kanbanCols.map(col=>{
            const colQ = filtered.filter(q=>q.status===col.id);
            const colTotal = colQ.reduce((s,q)=>s+q.amount,0);
            return (
              <div key={col.id} style={{ background:"#1e293b", borderRadius:12, border:`1px solid ${col.color}33`, overflow:"hidden" }}>
                <div style={{ padding:"10px 12px", background:col.color+"22", borderBottom:"1px solid #334155", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:7,height:7,borderRadius:"50%",background:col.color }}/>
                    <span style={{ fontSize:11,fontWeight:700,color:col.color }}>{col.label}</span>
                  </div>
                  <span style={{ fontSize:10,background:col.color+"33",color:col.color,padding:"1px 6px",borderRadius:10,fontWeight:600 }}>{colQ.length}</span>
                </div>
                <div style={{ padding:"8px", display:"flex", flexDirection:"column", gap:6, minHeight:80 }}>
                  {colQ.length===0 && <div style={{ textAlign:"center",color:"#475569",fontSize:11,padding:"10px 0" }}>—</div>}
                  {colQ.map(q=>{
                    const paid=paidByQuote[q._id]??0;
                    const reste=Math.max(q.amount-paid,0);
                    return (
                      <div key={q._id} onClick={()=>openDetail(q)} style={{ background:"#0f172a",border:"1px solid #334155",borderLeft:`3px solid ${col.color}`,borderRadius:8,padding:"8px 10px",cursor:"pointer" }}>
                        <div style={{ fontSize:12,fontWeight:500,color:"#e2e8f0",marginBottom:4,lineHeight:1.3 }}>{q.description}</div>
                        {q.number && <div style={{ fontSize:10,color:"#64748b",marginBottom:3 }}>#{q.number}</div>}
                        {q.supplier_id && <div style={{ fontSize:10,color:"#64748b",marginBottom:3 }}>👤 {supMap[q.supplier_id]??""}</div>}
                        <div style={{ fontSize:11,fontWeight:700,color:col.color }}>{fmtN(q.amount)} {q.currency}</div>
                        {paid>0 && <div style={{ fontSize:10,color:"#10b981" }}>✓ {fmtN(paid)} versé</div>}
                        {reste>0 && <div style={{ fontSize:10,color:"#f59e0b" }}>⏳ {fmtN(reste)} reste</div>}
                      </div>
                    );
                  })}
                  {colTotal>0 && <div style={{ fontSize:10,color:"#475569",textAlign:"center",paddingTop:4,borderTop:"1px solid #1e293b" }}>{fmtN(colTotal)}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TABLE ── */}
      {view==="list" && (
        <div style={{ overflowX:"auto" as const }}>
          <div style={{ ...S.tableWrap, minWidth:800 }}>
            <div style={{ ...S.row, ...S.hdr }}>
              <span>N°</span><span>Description</span><span>Phase</span><span>Fournisseur</span>
              <span style={{ textAlign:"right" as const }}>Montant</span>
              <span style={{ textAlign:"right" as const }}>Versé</span>
              <span style={{ textAlign:"right" as const }}>Reste</span>
              <span>Statut</span><span>Actions</span>
            </div>
            {filtered.length===0 && <div style={{ padding:28,color:"#475569",textAlign:"center" as const }}>Aucun devis</div>}
            {filtered.map(q=>{
              const paid  = paidByQuote[q._id]??0;
              const reste = Math.max(q.amount-paid,0);
              const meta  = STATUS_META[q.status]??{label:q.status,color:"#64748b"};
              const phase = phases.find(p=>p._id===q.phase_id);
              return (
                <div key={q._id} onClick={()=>openDetail(q)} style={{ ...S.row, cursor:"pointer", borderLeft:`3px solid ${meta.color}44` }}>
                  <span style={{ color:"#64748b",fontSize:12 }}>{q.number||"—"}</span>
                  <span style={{ color:"#f1f5f9",fontWeight:500 }}>{q.description}</span>
                  <span style={{ color:"#64748b",fontSize:12 }}>{phase?.name||"—"}</span>
                  <span style={{ color:"#94a3b8",fontSize:12 }}>{q.supplier_id?supMap[q.supplier_id]||"—":"—"}</span>
                  <span style={{ fontWeight:700,color:q.status==="prevu"?"#8b5cf6":"#f1f5f9",textAlign:"right" as const }}>
                    {q.amount===0&&q.status==="prevu"?"Estimé":fmtN(q.amount)+" "+q.currency}
                  </span>
                  <span style={{ color:"#10b981",textAlign:"right" as const }}>{paid>0?fmtN(paid):"—"}</span>
                  <span style={{ color:reste>0?"#f59e0b":"#10b981",fontWeight:600,textAlign:"right" as const }}>
                    {q.status==="prevu"?"—":reste>0?fmtN(reste):"✓"}
                  </span>
                  <span>
                    <span style={{ background:meta.color+"22",color:meta.color,border:`1px ${meta.dashed?"dashed":"solid"} ${meta.color}44`,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600,whiteSpace:"nowrap" as const }}>
                      {meta.label}
                    </span>
                  </span>
                  <div style={{ display:"flex",gap:4 }} onClick={e=>e.stopPropagation()}>
                    <button style={S.btnIcon} onClick={()=>openEdit(q)} title="Modifier"><i className="ti ti-edit"/></button>
                    <button style={{ ...S.btnIcon,color:"#ef4444" }} onClick={()=>setDelId(q._id)} title="Supprimer"><i className="ti ti-trash"/></button>
                  </div>
                </div>
              );
            })}
            {filtered.length>0 && (
              <div style={{ ...S.row, background:"#0f172a",borderTop:"2px solid #334155",fontWeight:700 }}>
                <span/><span style={{ color:"#64748b" }}>TOTAL</span><span/><span/>
                <span style={{ color:"#f1f5f9",textAlign:"right" as const }}>{fmtN(total)}</span>
                <span style={{ color:"#10b981",textAlign:"right" as const }}>{fmtN(totalPaid)}</span>
                <span style={{ color:totalReste>0?"#f59e0b":"#10b981",textAlign:"right" as const }}>{totalReste>0?fmtN(totalReste):"✓ Soldé"}</span>
                <span/><span/>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DETAIL PANEL ── */}
      {detail && detailQuote && (
        <div style={S.overlay} onClick={()=>setDetail(null)}>
          <div style={{ background:"#1e293b",border:"1px solid #334155",borderRadius:16,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto" as const,display:"flex",flexDirection:"column" }} onClick={e=>e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding:"20px 24px 16px",borderBottom:"1px solid #334155",flexShrink:0 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:16,fontWeight:700,color:"#f1f5f9",marginBottom:4 }}>{detailQuote.description}</div>
                  {detailQuote.number && <div style={{ fontSize:12,color:"#64748b" }}>Devis #{detailQuote.number}</div>}
                </div>
                <button onClick={()=>setDetail(null)} style={{ background:"none",border:"none",color:"#64748b",fontSize:20,cursor:"pointer",padding:4,flexShrink:0 }}>✕</button>
              </div>

              {/* KPI row */}
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:16 }}>
                <div style={{ background:"#0f172a",borderRadius:10,padding:"10px 14px" }}>
                  <div style={{ fontSize:10,color:"#475569",fontWeight:600,textTransform:"uppercase" as const,letterSpacing:0.5,marginBottom:4 }}>Montant</div>
                  <div style={{ fontSize:15,fontWeight:700,color:"#f1f5f9" }}>{fmtN(detailQuote.amount)}</div>
                  <div style={{ fontSize:11,color:"#64748b" }}>{detailQuote.currency}</div>
                </div>
                <div style={{ background:"#0f172a",borderRadius:10,padding:"10px 14px" }}>
                  <div style={{ fontSize:10,color:"#10b981",fontWeight:600,textTransform:"uppercase" as const,letterSpacing:0.5,marginBottom:4 }}>Versé</div>
                  <div style={{ fontSize:15,fontWeight:700,color:"#10b981" }}>{fmtN(detailPaid)}</div>
                  <div style={{ fontSize:11,color:"#64748b" }}>{detailPays.length} paiement{detailPays.length!==1?"s":""}</div>
                </div>
                <div style={{ background:"#0f172a",borderRadius:10,padding:"10px 14px" }}>
                  <div style={{ fontSize:10,color:detailReste>0?"#f59e0b":"#10b981",fontWeight:600,textTransform:"uppercase" as const,letterSpacing:0.5,marginBottom:4 }}>Reste</div>
                  <div style={{ fontSize:15,fontWeight:700,color:detailReste>0?"#f59e0b":"#10b981" }}>{detailReste>0?fmtN(detailReste):"✓ Soldé"}</div>
                  <div style={{ fontSize:11,color:"#64748b" }}>{detailQuote.currency}</div>
                </div>
              </div>

              {/* Barre de progression */}
              {detailQuote.amount>0 && (
                <div style={{ marginTop:12 }}>
                  <div style={{ background:"#0f172a",borderRadius:4,height:6,overflow:"hidden" }}>
                    <div style={{ height:"100%",width:`${Math.min(100,Math.round(detailPaid/detailQuote.amount*100))}%`,background:detailReste===0?"#10b981":"#6366f1",borderRadius:4,transition:"width 0.3s" }}/>
                  </div>
                  <div style={{ fontSize:10,color:"#475569",marginTop:4 }}>
                    {Math.min(100,Math.round(detailPaid/detailQuote.amount*100))}% versé
                  </div>
                </div>
              )}

              {/* Meta info */}
              <div style={{ display:"flex",gap:10,marginTop:12,flexWrap:"wrap" as const }}>
                {(() => { const m=STATUS_META[detailQuote.status]; return <span style={{ background:m.color+"22",color:m.color,border:`1px solid ${m.color}44`,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600 }}>{m.label}</span>; })()}
                {detailQuote.supplier_id && <span style={{ background:"#334155",color:"#94a3b8",borderRadius:20,padding:"3px 10px",fontSize:11 }}>👤 {supMap[detailQuote.supplier_id]||"—"}</span>}
                {phaseMap[detailQuote.phase_id] && <span style={{ background:"#334155",color:"#94a3b8",borderRadius:20,padding:"3px 10px",fontSize:11 }}>📋 {phaseMap[detailQuote.phase_id]}</span>}
                {detailQuote.date && <span style={{ background:"#334155",color:"#94a3b8",borderRadius:20,padding:"3px 10px",fontSize:11 }}>📅 {fmtDate(detailQuote.date)}</span>}
              </div>
            </div>

            {/* Payments list */}
            <div style={{ flex:1,overflowY:"auto" as const,padding:"16px 24px" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
                <span style={{ fontSize:13,fontWeight:600,color:"#94a3b8" }}>Paiements liés</span>
                <button onClick={()=>{ setAddPay(true); setPayForm({...EMPTY_PAY}); }} style={{ background:"#6366f122",border:"1px solid #6366f144",borderRadius:8,color:"#6366f1",padding:"5px 12px",fontSize:12,cursor:"pointer",fontWeight:600 }}>
                  + Ajouter un paiement
                </button>
              </div>

              {/* Add payment form */}
              {addPay && (
                <div style={{ background:"#0f172a",border:"1px dashed #6366f1",borderRadius:12,padding:16,marginBottom:12 }}>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10 }}>
                    <div>
                      <label style={S.label}>Date *</label>
                      <input type="date" style={S.input} value={payForm.date} onChange={e=>setPayForm(f=>({...f,date:e.target.value}))} />
                    </div>
                    <div>
                      <label style={S.label}>Montant *</label>
                      <input type="number" style={S.input} placeholder="0" value={payForm.amount} onChange={e=>setPayForm(f=>({...f,amount:e.target.value}))} />
                    </div>
                    <div>
                      <label style={S.label}>Méthode</label>
                      <select style={S.input} value={payForm.method} onChange={e=>setPayForm(f=>({...f,method:e.target.value}))}>
                        {PAY_METHODS.map(m=><option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={S.label}>Référence</label>
                      <input style={S.input} placeholder="N° virement…" value={payForm.reference} onChange={e=>setPayForm(f=>({...f,reference:e.target.value}))} />
                    </div>
                    <div style={{ gridColumn:"1/-1" }}>
                      <label style={S.label}>Note</label>
                      <input style={S.input} placeholder="Optionnel" value={payForm.note} onChange={e=>setPayForm(f=>({...f,note:e.target.value}))} />
                    </div>
                  </div>
                  <div style={{ display:"flex",gap:8 }}>
                    <button style={S.btnCancel} onClick={()=>setAddPay(false)}>Annuler</button>
                    <button style={{ ...S.btnPrimary,flex:1 }} onClick={savePayment} disabled={loading||!payForm.date||!payForm.amount}>{loading?"…":"Enregistrer le paiement"}</button>
                  </div>
                </div>
              )}

              {detailPays.length===0 && !addPay && (
                <div style={{ textAlign:"center" as const,color:"#475569",fontSize:13,padding:"24px 0" }}>
                  Aucun paiement enregistré
                </div>
              )}

              {detailPays.map((p:any)=>(
                <div key={p._id} style={{ background:"#0f172a",border:"1px solid #1e293b",borderRadius:10,padding:"12px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:14,fontWeight:700,color:"#10b981",marginBottom:3 }}>+{fmtN(p.amount)} {detailQuote.currency}</div>
                    <div style={{ fontSize:12,color:"#64748b" }}>{p.method} · {fmtDate(p.date)}</div>
                    {p.reference && <div style={{ fontSize:11,color:"#475569",marginTop:2 }}>Réf: {p.reference}</div>}
                    {p.note && <div style={{ fontSize:11,color:"#475569",marginTop:2,fontStyle:"italic" }}>{p.note}</div>}
                  </div>
                  <button style={{ background:"#ef444422",border:"1px solid #ef444444",borderRadius:8,color:"#ef4444",padding:"5px 8px",cursor:"pointer",fontSize:13 }} onClick={()=>setDelPayId(p._id)} title="Supprimer">
                    <i className="ti ti-trash"/>
                  </button>
                </div>
              ))}
            </div>

            {/* Footer actions */}
            <div style={{ padding:"12px 24px",borderTop:"1px solid #334155",display:"flex",gap:8,flexShrink:0 }}>
              <button style={S.btnCancel} onClick={()=>setDetail(null)}>Fermer</button>
              <button style={{ ...S.btnPrimary,flex:1 }} onClick={()=>{ setDetail(null); openEdit(detailQuote); }}>
                <i className="ti ti-edit" style={{ marginRight:6 }}/>Modifier le devis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD/EDIT MODAL ── */}
      {modal && (
        <div style={S.overlay} onClick={()=>setModal(null)}>
          <div style={{ background:"#1e293b",border:"1px solid #334155",borderRadius:16,padding:28,width:"100%",maxWidth:580,maxHeight:"90vh",overflowY:"auto" as const }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontWeight:700,color:"#f1f5f9",fontSize:16,marginBottom:20 }}>
              {modal.mode==="add"?"Nouveau devis":"Modifier le devis"}
            </div>
            <div style={S.grid2}>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={S.label}>Statut *</label>
                <div style={{ display:"flex",gap:8,flexWrap:"wrap" as const }}>
                  {STATUS_OPTS.map(s=>{ const m=STATUS_META[s]; return (
                    <button key={s} type="button" onClick={()=>setForm(f=>({...f,status:s}))}
                      style={{ padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",border:`1px ${m.dashed?"dashed":"solid"} ${form.status===s?m.color:"#334155"}`,background:form.status===s?m.color+"22":"transparent",color:form.status===s?m.color:"#64748b" }}>
                      {m.label}
                    </button>
                  );})}
                </div>
                {isPrevu && <div style={{ fontSize:11,color:"#8b5cf6",marginTop:6 }}>💡 Prévu = travaux planifiés sans devis final. Le montant est optionnel.</div>}
              </div>

              <div style={{ gridColumn:"1/-1" }}>
                <label style={S.label}>Phase *</label>
                <div style={{ display:"flex",gap:8 }}>
                  <select style={{ ...S.input,flex:1 }} value={form.phase_id} onChange={e=>setForm(f=>({...f,phase_id:e.target.value}))}>
                    <option value="">— Sélectionner une phase —</option>
                    {phasesByCat.map(({cat,phases:ps})=>(
                      <optgroup key={cat._id} label={cat.name}>
                        {ps.map(ph=><option key={ph._id} value={ph._id}>{ph.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <button type="button" onClick={()=>setShowNewPhase(v=>!v)}
                    style={{ background:showNewPhase?"#6366f1":"#1e293b",border:"1px solid #6366f1",borderRadius:8,color:showNewPhase?"#fff":"#6366f1",padding:"0 14px",cursor:"pointer",fontSize:18,fontWeight:700,flexShrink:0 }}>
                    {showNewPhase?"✕":"+"}
                  </button>
                </div>
                {showNewPhase && (
                  <div style={{ background:"#0f172a",border:"1px dashed #6366f1",borderRadius:10,padding:14,marginTop:10 }}>
                    <div style={{ fontSize:12,color:"#6366f1",fontWeight:600,marginBottom:10 }}>Nouvelle phase</div>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10 }}>
                      <div>
                        <label style={S.label}>Catégorie *</label>
                        <select style={S.input} value={phaseForm.category_id} onChange={e=>setPhaseForm(f=>({...f,category_id:e.target.value}))}>
                          <option value="">— Catégorie —</option>
                          {categories.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={S.label}>Statut</label>
                        <select style={S.input} value={phaseForm.status} onChange={e=>setPhaseForm(f=>({...f,status:e.target.value}))}>
                          <option value="planned">Planifiée</option>
                          <option value="in_progress">En cours</option>
                          <option value="completed">Terminée</option>
                          <option value="on_hold">En attente</option>
                        </select>
                      </div>
                      <div style={{ gridColumn:"1/-1" }}>
                        <label style={S.label}>Nom *</label>
                        <input style={S.input} value={phaseForm.name} onChange={e=>setPhaseForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Carrelage salon" />
                      </div>
                    </div>
                    <button style={{ ...S.btnPrimary,fontSize:12,padding:"8px 16px" }} onClick={addPhase} disabled={loading||!phaseForm.category_id||!phaseForm.name}>
                      {loading?"…":"Créer et sélectionner"}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label style={S.label}>Description *</label>
                <input style={S.input} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Ex: Fourniture carrelage 60×60" />
              </div>
              <div>
                <label style={S.label}>N° devis</label>
                <input style={S.input} value={form.number} onChange={e=>setForm(f=>({...f,number:e.target.value}))} placeholder="DEV-001" />
              </div>
              <div>
                <label style={S.label}>Fournisseur</label>
                <select style={S.input} value={form.supplier_id} onChange={e=>setForm(f=>({...f,supplier_id:e.target.value}))}>
                  <option value="">— Aucun —</option>
                  {suppliers.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Date</label>
                <input style={S.input} type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
              </div>
              <div>
                <label style={S.label}>Montant {isPrevu?"(optionnel)":"*"}</label>
                <input style={S.input} type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder={isPrevu?"Estimation":"Montant"} />
              </div>
              <div>
                <label style={S.label}>Devise</label>
                <select style={S.input} value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}>
                  {CURRENCY_OPTS.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={S.label}>Notes</label>
                <textarea style={{ ...S.input,height:60,resize:"vertical" as const }} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} />
              </div>
            </div>
            <div style={{ display:"flex",gap:8,marginTop:20 }}>
              <button style={S.btnCancel} onClick={()=>setModal(null)}>Annuler</button>
              <button style={{ ...S.btnPrimary,flex:1 }} onClick={save} disabled={loading||!form.description||!form.phase_id||(!isPrevu&&!form.amount)}>
                {loading?"Sauvegarde…":"Sauvegarder"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete quote confirm */}
      {delId && (
        <div style={S.overlay} onClick={()=>setDelId(null)}>
          <div style={{ background:"#1e293b",border:"1px solid #334155",borderRadius:16,padding:28,maxWidth:360,width:"100%" }} onClick={e=>e.stopPropagation()}>
            <div style={{ color:"#f1f5f9",fontWeight:600,fontSize:16,marginBottom:8 }}>Supprimer ce devis ?</div>
            <div style={{ color:"#94a3b8",fontSize:13,marginBottom:20 }}>Les paiements associés seront aussi supprimés.</div>
            <div style={{ display:"flex",gap:8 }}>
              <button style={S.btnCancel} onClick={()=>setDelId(null)}>Annuler</button>
              <button style={{ background:"#ef4444",color:"#fff",border:"none",borderRadius:8,padding:"10px 20px",fontSize:13,cursor:"pointer",fontWeight:600,flex:1 }} onClick={confirmDel} disabled={loading}>{loading?"…":"Supprimer"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete payment confirm */}
      {delPayId && (
        <div style={S.overlay} onClick={()=>setDelPayId(null)}>
          <div style={{ background:"#1e293b",border:"1px solid #334155",borderRadius:16,padding:28,maxWidth:360,width:"100%" }} onClick={e=>e.stopPropagation()}>
            <div style={{ color:"#f1f5f9",fontWeight:600,fontSize:16,marginBottom:8 }}>Supprimer ce paiement ?</div>
            <div style={{ color:"#94a3b8",fontSize:13,marginBottom:20 }}>Cette action est irréversible.</div>
            <div style={{ display:"flex",gap:8 }}>
              <button style={S.btnCancel} onClick={()=>setDelPayId(null)}>Annuler</button>
              <button style={{ background:"#ef4444",color:"#fff",border:"none",borderRadius:8,padding:"10px 20px",fontSize:13,cursor:"pointer",fontWeight:600,flex:1 }} onClick={confirmDelPay} disabled={loading}>{loading?"…":"Supprimer"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Loader() { return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:200,color:"#6366f1" }}><i className="ti ti-loader" style={{ fontSize:32 }}/></div>; }

const S: Record<string,React.CSSProperties> = {
  page:{ padding:"clamp(12px,3vw,28px)",paddingBottom:"max(28px,calc(env(safe-area-inset-bottom) + 70px))" },
  title:{ fontSize:22,fontWeight:700,color:"#f1f5f9" },
  tableWrap:{ background:"#1e293b",border:"1px solid #334155",borderRadius:12,overflow:"hidden" },
  hdr:{ background:"#0f172a",color:"#64748b",fontSize:11,textTransform:"uppercase" as const,fontWeight:600,letterSpacing:0.5 },
  row:{ display:"grid",gridTemplateColumns:"70px 1fr 110px 120px 120px 100px 100px 110px 70px",gap:8,padding:"11px 14px",borderBottom:"1px solid #0f172a",alignItems:"center",fontSize:13 },
  overlay:{ position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16 },
  grid2:{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 },
  btnPrimary:{ background:"#6366f1",color:"#fff",border:"none",borderRadius:8,padding:"10px 18px",fontSize:13,cursor:"pointer",fontWeight:600 },
  btnCancel:{ background:"#334155",color:"#f1f5f9",border:"none",borderRadius:8,padding:"10px 20px",fontSize:13,cursor:"pointer" },
  btnIcon:{ background:"transparent",border:"none",color:"#64748b",cursor:"pointer",fontSize:16,padding:"4px 6px" },
  label:{ display:"block",fontSize:11,color:"#94a3b8",marginBottom:4,fontWeight:600,textTransform:"uppercase" as const,letterSpacing:0.5 },
  input:{ width:"100%",background:"#0f172a",border:"1px solid #334155",borderRadius:8,color:"#f1f5f9",padding:"10px 12px",fontSize:14,boxSizing:"border-box" as const },
};
