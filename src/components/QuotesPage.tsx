import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { fmtN, fmtDate, STATUS_LABELS, STATUS_COLORS } from "../lib/utils";

interface Props { projectId: Id<"projects"> }

export default function QuotesPage({ projectId }: Props) {
  const quotes = useQuery(api.quotes.listAll);
  const payments = useQuery(api.payments.listAll);
  const categories = useQuery(api.categories.listByProject, { project_id: projectId });
  const suppliers = useQuery(api.suppliers.listByProject, { project_id: projectId });
  const updateQuote = useMutation(api.quotes.update);
  const removeQuote = useMutation(api.quotes.remove);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  if (!quotes || !payments || !categories || !suppliers) return <Loader />;

  // Build paid map per quote
  const paidMap: Record<string, number> = {};
  payments.forEach((p) => { paidMap[p.quote_id] = (paidMap[p.quote_id] ?? 0) + p.amount; });

  const supplierMap: Record<string, string> = {};
  suppliers.forEach((s) => { supplierMap[s._id] = s.name; });

  const filtered = quotes.filter((q) => {
    const match = search === "" || q.description.toLowerCase().includes(search.toLowerCase()) || (q.number ?? "").toLowerCase().includes(search.toLowerCase());
    const st = filterStatus === "all" || q.status === filterStatus;
    return match && st;
  }).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  const totalEngaged = filtered.reduce((s, q) => s + q.amount, 0);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Devis</h1>
        <div style={S.sub}>{filtered.length} devis — {fmtN(totalEngaged)} FCFA engagés</div>
      </div>

      <div style={S.toolbar}>
        <input
          style={S.search} placeholder="Rechercher…" value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select style={S.select} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).slice(0, 4).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div style={S.table}>
        <div style={{ ...S.row, ...S.headerRow }}>
          <span>N°</span><span>Description</span><span>Fournisseur</span>
          <span>Montant</span><span>Versé</span><span>Reste</span><span>Statut</span>
        </div>
        {filtered.map((q) => {
          const verse = paidMap[q._id] ?? 0;
          const reste = q.amount - verse;
          return (
            <div key={q._id} style={S.row}>
              <span style={{ color: "#6366f1", fontWeight: 600 }}>{q.number ?? "—"}</span>
              <span style={{ color: "#e2e8f0" }}>
                <div>{q.description}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>{fmtDate(q.date)}</div>
              </span>
              <span style={{ color: "#94a3b8", fontSize: 12 }}>{q.supplier_id ? supplierMap[q.supplier_id] ?? "—" : "—"}</span>
              <span style={{ fontWeight: 600, color: "#f1f5f9" }}>{fmtN(q.amount)}</span>
              <span style={{ color: "#10b981" }}>{fmtN(verse)}</span>
              <span style={{ color: reste > 0 ? "#f59e0b" : "#10b981" }}>{fmtN(reste)}</span>
              <span>
                <span style={{ ...S.chip, background: (STATUS_COLORS[q.status] ?? "#64748b") + "22", color: STATUS_COLORS[q.status] ?? "#64748b", borderColor: STATUS_COLORS[q.status] ?? "#64748b" }}>
                  {STATUS_LABELS[q.status] ?? q.status}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Loader() { return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%" }}><i className="ti ti-loader" style={{ fontSize:32,color:"#6366f1" }} /></div>; }

const S: Record<string, React.CSSProperties> = {
  page: { padding: 28 },
  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, color: "#f1f5f9" },
  sub: { fontSize: 13, color: "#64748b", marginTop: 4 },
  toolbar: { display: "flex", gap: 12, marginBottom: 20 },
  search: { background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 8, padding: "8px 14px", fontSize: 13, flex: 1 },
  select: { background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 8, padding: "8px 14px", fontSize: 13 },
  table: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" },
  headerRow: { background: "#0f172a", color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 },
  row: { display: "grid", gridTemplateColumns: "80px 1fr 140px 120px 100px 100px 100px", gap: 12, padding: "12px 16px", borderBottom: "1px solid #0f172a", alignItems: "center", fontSize: 13 },
  chip: { border: "1px solid", borderRadius: 12, padding: "2px 10px", fontSize: 11, fontWeight: 600 },
};
