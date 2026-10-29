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

const COLORS_PIE = ["#10b981", "#6366f1", "#334155"];
const CAT_COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#3b82f6","#8b5cf6","#f97316","#06b6d4","#ec4899","#84cc16"];

export default function Dashboard({ project }: Props) {
  const quotes   = useQuery(api.quotes.listAll);
  const payments = useQuery(api.payments.listAll);
  const categories = useQuery(api.categories.listByProject, { project_id: project._id });
  const suppliers  = useQuery(api.suppliers.listByProject, { project_id: project._id });
  const phases     = useQuery(api.phases.listAll);

  if (!quotes || !payments || !categories || !suppliers || !phases) return <PageLoader />;

  /* ─── Totaux globaux ─── */
  const totalEngaged = quotes.reduce((s, q) => s + q.amount, 0);
  const totalVerse   = payments.reduce((s, p) => s + p.amount, 0);
  const totalReste   = totalEngaged - totalVerse;
  const budgetReste  = project.budget - totalEngaged;
  const avancement   = project.budget > 0 ? Math.round((totalVerse / project.budget) * 100) : 0;

  /* ─── Donut budget ─── */
  const donutData = [
    { name: "Versé", value: totalVerse },
    { name: "Engagé (reste)", value: Math.max(totalReste, 0) },
    { name: "Non alloué", value: Math.max(budgetReste, 0) },
  ].filter(d => d.value > 0);

  /* ─── Barres par catégorie ─── */
  const paidByQuote: Record<string, number> = {};
  payments.forEach(p => { paidByQuote[p.quote_id] = (paidByQuote[p.quote_id] ?? 0) + p.amount; });

  /* map phase → category */
  const phaseCatMap: Record<string, string> = {};
  phases.forEach(p => { phaseCatMap[p._id] = p.category_id; });

  const catBar = categories.map(cat => {
    const catPhaseIds = new Set(phases.filter(p => p.category_id === cat._id).map(p => p._id));
    const catQuotes   = quotes.filter(q => catPhaseIds.has(q.phase_id));
    const engaged     = catQuotes.reduce((s, q) => s + q.amount, 0);
    const paid        = catQuotes.reduce((s, q) => s + (paidByQuote[q._id] ?? 0), 0);
    return { name: cat.name.length > 14 ? cat.name.slice(0, 12) + "…" : cat.name, fullName: cat.name, Engagé: engaged, Versé: paid };
  }).filter(c => c.Engagé > 0).sort((a, b) => b.Engagé - a.Engagé).slice(0, 8);

  /* ─── Top fournisseurs ─── */
  const supMap: Record<string, number> = {};
  quotes.forEach(q => {
    if (q.supplier_id) supMap[q.supplier_id] = (supMap[q.supplier_id] ?? 0) + q.amount;
  });
  const topSuppliers = Object.entries(supMap)
    .map(([id, amount]) => ({ name: suppliers.find(s => s._id === id)?.name ?? "—", amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  /* ─── Répartition statuts ─── */
  const quotesByStatus: Record<string, number> = {};
  quotes.forEach(q => { quotesByStatus[q.status] = (quotesByStatus[q.status] ?? 0) + 1; });

  const fmtKpi = (v: number) => fmtN(v) + " " + project.currency;
  const pct = (v: number, t: number) => t > 0 ? Math.round((v / t) * 100) : 0;

  const TooltipContent = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:8, padding:"8px 14px", fontSize:12 }}>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ color: p.color }}>{p.name}: {fmtN(p.value)} FCFA</div>
        ))}
      </div>
    );
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Tableau de bord</h1>
          <p style={S.sub}>{project.location}</p>
        </div>
        <div style={S.badge}><i className="ti ti-building" style={{ marginRight:6 }}/>{project.owner_name}</div>
      </div>

      {/* KPI row */}
      <div style={S.kpiRow}>
        <KpiCard icon="ti-files"     label="Devis engagés"  color="#6366f1" value={fmtKpi(totalEngaged)} sub={`${quotes.length} devis`} />
        <KpiCard icon="ti-cash"      label="Versé"          color="#10b981" value={fmtKpi(totalVerse)}   sub={`${avancement}% du budget`} />
        <KpiCard icon="ti-clock"     label="Reste à payer"  color="#f59e0b" value={fmtKpi(totalReste)}   sub="devis − versements" />
        <KpiCard icon="ti-chart-bar" label="Budget total"   color="#3b82f6" value={fmtKpi(project.budget)} sub={`Utilisé : ${pct(totalEngaged, project.budget)}%`} />
      </div>

      {/* Charts row */}
      <div style={S.chartsRow}>

        {/* Donut */}
        <div style={S.chartCard}>
          <div style={S.chartTitle}><i className="ti ti-chart-donut" style={S.chartIcon}/> Répartition du budget</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                {donutData.map((_, i) => <Cell key={i} fill={COLORS_PIE[i]} />)}
              </Pie>
              <Tooltip content={<TooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:4 }}>
            {donutData.map((d, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:COLORS_PIE[i] }}/>
                  <span style={{ color:"#94a3b8" }}>{d.name}</span>
                </div>
                <span style={{ color:"#f1f5f9", fontWeight:600 }}>{fmtN(d.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top fournisseurs */}
        <div style={{ ...S.chartCard, flex:1.2 }}>
          <div style={S.chartTitle}><i className="ti ti-users" style={S.chartIcon}/> Top fournisseurs</div>
          {topSuppliers.length === 0
            ? <Empty />
            : (
              <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:8 }}>
                {topSuppliers.map((s, i) => {
                  const pctW = Math.round((s.amount / topSuppliers[0].amount) * 100);
                  return (
                    <div key={i}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                        <span style={{ color:"#cbd5e1" }}>{s.name}</span>
                        <span style={{ color:"#f1f5f9", fontWeight:600 }}>{fmtN(s.amount)}</span>
                      </div>
                      <div style={{ background:"#0f172a", borderRadius:4, height:6, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${pctW}%`, background: CAT_COLORS[i % CAT_COLORS.length], borderRadius:4, transition:"width 0.5s" }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      </div>

      {/* Bar chart categories */}
      {catBar.length > 0 && (
        <div style={S.chartCard}>
          <div style={S.chartTitle}><i className="ti ti-chart-bar" style={S.chartIcon}/> Engagé vs Versé par catégorie</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={catBar} margin={{ top:4, right:16, left:0, bottom:0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill:"#64748b", fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:"#64748b", fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => fmtN(v)} width={70} />
              <Tooltip content={<TooltipContent />} cursor={{ fill:"#1e293b" }} />
              <Legend wrapperStyle={{ fontSize:12, color:"#64748b" }} />
              <Bar dataKey="Engagé" fill="#6366f1" radius={[4,4,0,0]} />
              <Bar dataKey="Versé"  fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Statuts + avancement */}
      <div style={S.chartsRow}>
        <div style={S.chartCard}>
          <div style={S.chartTitle}><i className="ti ti-files" style={S.chartIcon}/> Statuts des devis</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:8 }}>
            {Object.entries(quotesByStatus).map(([s, n]) => (
              <div key={s} style={{ border:`1px solid ${STATUS_COLORS[s]??'#64748b'}`, color:STATUS_COLORS[s]??'#64748b', borderRadius:20, padding:"4px 14px", fontSize:13, fontWeight:500 }}>
                {n} × {s==="paid"?"Soldé":s==="partial"?"Partiel":s==="approved"?"Approuvé":s==="pending"?"En attente":s}
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...S.chartCard, flex:1 }}>
          <div style={S.chartTitle}><i className="ti ti-progress" style={S.chartIcon}/> Avancement global</div>
          <div style={{ fontSize:32, fontWeight:700, color:"#6366f1", marginTop:8 }}>{avancement}%</div>
          <div style={{ fontSize:12, color:"#64748b", marginBottom:10 }}>{fmtN(totalVerse)} / {fmtN(project.budget)} FCFA versé</div>
          <div style={{ background:"#0f172a", borderRadius:6, height:12, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${Math.min(avancement,100)}%`, background:"linear-gradient(90deg,#6366f1,#10b981)", borderRadius:6, transition:"width 0.6s" }}/>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#334155", marginTop:6 }}>
            <span>0%</span><span>50%</span><span>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, color, value, sub }: { icon:string; label:string; color:string; value:string; sub:string }) {
  return (
    <div style={S.kpiCard}>
      <div style={{ width:44,height:44,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",background:color+"22",color,marginBottom:12 }}>
        <i className={`ti ${icon}`} style={{ fontSize:22 }}/>
      </div>
      <div style={{ fontSize:12,color:"#64748b",marginBottom:6,textTransform:"uppercase" as const,letterSpacing:0.5 }}>{label}</div>
      <div style={{ fontSize:18,fontWeight:700,color:"#f1f5f9",marginBottom:4 }}>{value}</div>
      <div style={{ fontSize:12,color:"#475569" }}>{sub}</div>
    </div>
  );
}

function Empty() { return <div style={{ color:"#334155",fontSize:13,marginTop:16,textAlign:"center" as const }}>Aucune donnée</div>; }
function PageLoader() { return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%" }}><i className="ti ti-loader" style={{ fontSize:32,color:"#6366f1" }}/></div>; }

const S: Record<string,React.CSSProperties> = {
  page:{ padding:28, maxWidth:1200 },
  header:{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24 },
  title:{ fontSize:22,fontWeight:700,color:"#f1f5f9" },
  sub:{ fontSize:13,color:"#64748b",marginTop:4 },
  badge:{ background:"#1e293b",color:"#94a3b8",border:"1px solid #334155",borderRadius:8,padding:"6px 14px",fontSize:13 },
  kpiRow:{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16,marginBottom:20 },
  kpiCard:{ background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:20 },
  chartsRow:{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16 },
  chartCard:{ background:"#1e293b",border:"1px solid #334155",borderRadius:12,padding:20,marginBottom:16 },
  chartTitle:{ fontSize:13,fontWeight:600,color:"#94a3b8",marginBottom:12,display:"flex",alignItems:"center",gap:8 },
  chartIcon:{ fontSize:16,color:"#6366f1" } as React.CSSProperties,
};
