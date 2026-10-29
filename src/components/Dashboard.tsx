import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { fmtN, STATUS_COLORS } from "../lib/utils";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

interface Props {
  project: { _id: Id<"projects">; name: string; budget: number; currency: string; owner_name?: string; location?: string };
}

const PIE_COLORS = ["#10b981", "#f59e0b", "#334155"];
const BAR_COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#3b82f6","#8b5cf6","#f97316","#06b6d4"];

const STATUS_FR: Record<string,string> = {
  paid:"Soldé", partial:"Partiel", approved:"Approuvé", pending:"En attente", in_progress:"En cours", completed:"Terminé",
};

export default function Dashboard({ project }: Props) {
  const quotes     = useQuery(api.quotes.listAll);
  const payments   = useQuery(api.payments.listAll);
  const categories = useQuery(api.categories.listByProject, { project_id: project._id });
  const suppliers  = useQuery(api.suppliers.listByProject, { project_id: project._id });
  const phases     = useQuery(api.phases.listAll);

  if (!quotes || !payments || !categories || !suppliers || !phases) return <PageLoader />;

  /* ── Totaux globaux ── */
  const totalEngaged = quotes.reduce((s, q) => s + q.amount, 0);
  const totalVerse   = payments.reduce((s, p) => s + p.amount, 0);
  const totalReste   = Math.max(totalEngaged - totalVerse, 0);
  const nonAlloue    = Math.max(project.budget - totalEngaged, 0);
  const avancement   = project.budget > 0 ? Math.min(Math.round((totalVerse / project.budget) * 100), 100) : 0;
  const budgetUsePct = project.budget > 0 ? Math.round((totalEngaged / project.budget) * 100) : 0;

  /* ── Donut ── */
  const donutData = [
    { name: "Versé",          value: totalVerse   },
    { name: "Reste à payer",  value: totalReste   },
    { name: "Non alloué",     value: nonAlloue    },
  ].filter(d => d.value > 0);

  /* ── Paiements par devis ── */
  const paidByQuote: Record<string, number> = {};
  payments.forEach(p => { paidByQuote[p.quote_id] = (paidByQuote[p.quote_id] ?? 0) + p.amount; });

  /* ── Barres par catégorie (quote → phase → category) ── */
  const phaseTocat: Record<string, string> = {};
  phases.forEach(p => { phaseTocat[p._id] = p.category_id; });

  const catBar = categories
    .map(cat => {
      const catPhaseIds = new Set(phases.filter(p => p.category_id === cat._id).map(p => p._id));
      const catQuotes   = quotes.filter(q => catPhaseIds.has(q.phase_id));
      const engaged     = catQuotes.reduce((s, q) => s + q.amount, 0);
      const paid        = catQuotes.reduce((s, q) => s + (paidByQuote[q._id] ?? 0), 0);
      return { name: cat.name.length > 13 ? cat.name.slice(0, 11) + "…" : cat.name, Engagé: engaged, Versé: paid };
    })
    .filter(c => c.Engagé > 0)
    .sort((a, b) => b.Engagé - a.Engagé)
    .slice(0, 8);

  /* ── Top fournisseurs ── */
  const supTotals: Record<string, number> = {};
  quotes.forEach(q => {
    if (q.supplier_id) supTotals[q.supplier_id] = (supTotals[q.supplier_id] ?? 0) + q.amount;
  });
  const topSup = Object.entries(supTotals)
    .map(([id, amount]) => ({ name: suppliers.find(s => s._id === id)?.name ?? "—", amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);
  const maxSup = topSup[0]?.amount ?? 1;

  /* ── Statuts ── */
  const byStatus: Record<string, number> = {};
  quotes.forEach(q => { byStatus[q.status] = (byStatus[q.status] ?? 0) + 1; });

  const Tip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:8, padding:"8px 12px", fontSize:12 }}>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ color: p.color, marginBottom:2 }}>{p.name}: <b>{fmtN(p.value)}</b> FCFA</div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding:24, maxWidth:1200 }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:"#f1f5f9" }}>Tableau de bord</h1>
          <p style={{ fontSize:13, color:"#64748b", marginTop:4 }}>{project.location}</p>
        </div>
        <div style={{ background:"#1e293b", color:"#94a3b8", border:"1px solid #334155", borderRadius:8, padding:"6px 14px", fontSize:13 }}>
          <i className="ti ti-building" style={{ marginRight:6 }}/>{project.owner_name}
        </div>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        <Kpi icon="ti-files"     color="#6366f1" label="Devis engagés"  value={`${fmtN(totalEngaged)} ${project.currency}`} sub={`${quotes.length} devis`} />
        <Kpi icon="ti-cash"      color="#10b981" label="Versé"          value={`${fmtN(totalVerse)} ${project.currency}`}   sub={`${avancement}% du budget`} />
        <Kpi icon="ti-clock"     color="#f59e0b" label="Reste à payer"  value={`${fmtN(totalReste)} ${project.currency}`}   sub="devis − versements" />
        <Kpi icon="ti-chart-bar" color="#3b82f6" label="Budget total"   value={`${fmtN(project.budget)} ${project.currency}`} sub={`Alloué : ${budgetUsePct}%`} />
      </div>

      {/* ── Ligne 2 : Donut + Top fournisseurs ── */}
      <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:16, marginBottom:16 }}>

        {/* Donut */}
        <Card title="Répartition budget" icon="ti-chart-donut-2">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                {donutData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip content={<Tip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {donutData.map((d, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <div style={{ width:9, height:9, borderRadius:"50%", background:PIE_COLORS[i], flexShrink:0 }}/>
                  <span style={{ color:"#94a3b8" }}>{d.name}</span>
                </div>
                <span style={{ color:"#f1f5f9", fontWeight:600 }}>{fmtN(d.value)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Top fournisseurs */}
        <Card title="Top fournisseurs" icon="ti-users">
          {topSup.length === 0
            ? <div style={{ color:"#475569", fontSize:13, paddingTop:20 }}>Aucun fournisseur</div>
            : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {topSup.map((s, i) => (
                  <div key={i}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:5 }}>
                      <span style={{ color:"#cbd5e1" }}>{s.name}</span>
                      <span style={{ color:"#f1f5f9", fontWeight:600 }}>{fmtN(s.amount)} FCFA</span>
                    </div>
                    <div style={{ background:"#0f172a", borderRadius:4, height:6, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${Math.round((s.amount/maxSup)*100)}%`, background:BAR_COLORS[i % BAR_COLORS.length], borderRadius:4 }}/>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </Card>
      </div>

      {/* ── Barres catégories ── */}
      {catBar.length > 0 && (
        <Card title="Engagé vs Versé par catégorie" icon="ti-chart-bar" style={{ marginBottom:16 }}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={catBar} margin={{ top:4, right:8, left:0, bottom:0 }} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" tick={{ fill:"#64748b", fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:"#64748b", fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => fmtN(v)} width={72} />
              <Tooltip content={<Tip />} cursor={{ fill:"rgba(99,102,241,0.08)" }} />
              <Legend wrapperStyle={{ fontSize:12, color:"#64748b", paddingTop:8 }} />
              <Bar dataKey="Engagé" fill="#6366f1" radius={[3,3,0,0]} maxBarSize={40} />
              <Bar dataKey="Versé"  fill="#10b981" radius={[3,3,0,0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ── Ligne 3 : Statuts + Avancement ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card title="Statuts des devis" icon="ti-files">
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:4 }}>
            {Object.entries(byStatus).map(([s, n]) => (
              <div key={s} style={{ border:`1px solid ${STATUS_COLORS[s]??"#64748b"}`, color:STATUS_COLORS[s]??"#64748b", borderRadius:20, padding:"4px 14px", fontSize:13, fontWeight:500 }}>
                {n} × {STATUS_FR[s] ?? s}
              </div>
            ))}
          </div>
        </Card>

        <Card title="Avancement global" icon="ti-progress">
          <div style={{ fontSize:36, fontWeight:700, color:"#6366f1", lineHeight:1, marginBottom:6 }}>{avancement}%</div>
          <div style={{ fontSize:12, color:"#64748b", marginBottom:14 }}>
            {fmtN(totalVerse)} / {fmtN(project.budget)} FCFA versé
          </div>
          <div style={{ background:"#0f172a", borderRadius:6, height:10, overflow:"hidden", marginBottom:6 }}>
            <div style={{ height:"100%", width:`${avancement}%`, background:"#6366f1", borderRadius:6, transition:"width 0.6s" }}/>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#475569" }}>
            <span>0%</span><span>50%</span><span>100%</span>
          </div>
        </Card>
      </div>

    </div>
  );
}

function Card({ title, icon, children, style }: { title:string; icon:string; children:React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:12, padding:20, ...style }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
        <i className={`ti ${icon}`} style={{ fontSize:15, color:"#6366f1" }}/>
        <span style={{ fontSize:13, fontWeight:600, color:"#94a3b8" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Kpi({ icon, color, label, value, sub }: { icon:string; color:string; label:string; value:string; sub:string }) {
  return (
    <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:12, padding:20 }}>
      <div style={{ width:40, height:40, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", background:color+"22", color, marginBottom:12 }}>
        <i className={`ti ${icon}`} style={{ fontSize:20 }}/>
      </div>
      <div style={{ fontSize:11, color:"#64748b", marginBottom:5, textTransform:"uppercase" as const, letterSpacing:0.5 }}>{label}</div>
      <div style={{ fontSize:17, fontWeight:700, color:"#f1f5f9", marginBottom:3 }}>{value}</div>
      <div style={{ fontSize:12, color:"#475569" }}>{sub}</div>
    </div>
  );
}

function PageLoader() {
  return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#6366f1" }}><i className="ti ti-loader" style={{ fontSize:32 }}/></div>;
}
