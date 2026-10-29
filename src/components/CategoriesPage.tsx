import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { fmtN, STATUS_LABELS, STATUS_COLORS } from "../lib/utils";

interface Props { projectId: Id<"projects"> }

export default function CategoriesPage({ projectId }: Props) {
  const categories = useQuery(api.categories.listByProject, { project_id: projectId });
  const quotes = useQuery(api.quotes.listAll);
  const payments = useQuery(api.payments.listAll);

  if (!categories || !quotes || !payments) return <Loader />;

  // Build paid map
  const paidMap: Record<string, number> = {};
  payments.forEach((p) => { paidMap[p.quote_id] = (paidMap[p.quote_id] ?? 0) + p.amount; });

  const sorted = [...categories].sort((a, b) => a.position - b.position);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Catégories</h1>
        <div style={S.sub}>{categories.length} catégories de travaux</div>
      </div>

      <div style={S.grid}>
        {sorted.map((cat) => {
          const catQuotes = quotes.filter((q) => q._id); // all quotes (we filter by phase→cat below)
          // Sum quotes tied to this category — we need phase info, use all quotes for now
          // For simplicity, show totals per cat using a flat approach
          const catTotal = quotes.reduce((s, q) => {
            // We don't have category_id on quotes directly — show all for now
            return s;
          }, 0);

          return (
            <div key={cat._id} style={{ ...S.card, borderLeft: `4px solid ${cat.color}` }}>
              <div style={S.cardTop}>
                <div style={{ ...S.iconBadge, background: cat.color + "22", color: cat.color }}>
                  <i className={`ti ${cat.icon}`} style={{ fontSize: 22 }} />
                </div>
                <div>
                  <div style={S.catName}>{cat.name}</div>
                  <div style={S.catDesc}>{cat.description}</div>
                </div>
              </div>
              <div style={S.catPosition}>Position #{cat.position}</div>
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
  header: { marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: "#f1f5f9" },
  sub: { fontSize: 13, color: "#64748b", marginTop: 4 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 },
  card: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 },
  cardTop: { display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 12 },
  iconBadge: { width: 48, height: 48, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  catName: { fontWeight: 600, color: "#f1f5f9", fontSize: 15 },
  catDesc: { fontSize: 12, color: "#64748b", marginTop: 4, lineHeight: 1.4 },
  catPosition: { fontSize: 11, color: "#334155", textAlign: "right" as const },
};
