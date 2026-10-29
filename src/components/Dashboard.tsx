import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { fmtN, STATUS_COLORS } from "../lib/utils";

interface Props {
  project: { _id: Id<"projects">; name: string; budget: number; currency: string; owner_name?: string; location?: string };
}

export default function Dashboard({ project }: Props) {
  const quotes = useQuery(api.quotes.listAll);
  const payments = useQuery(api.payments.listAll);
  const categories = useQuery(api.categories.listByProject, { project_id: project._id });

  if (!quotes || !payments || !categories) {
    return <PageLoader />;
  }

  const totalEngaged = quotes.reduce((s, q) => s + q.amount, 0);
  const totalVerse = payments.reduce((s, p) => s + p.amount, 0);
  const totalReste = totalEngaged - totalVerse;

  const quotesByStatus: Record<string, number> = {};
  quotes.forEach((q) => { quotesByStatus[q.status] = (quotesByStatus[q.status] ?? 0) + 1; });

  const pct = (v: number, t: number) => (t > 0 ? Math.round((v / t) * 100) : 0);
  const avancement = pct(totalVerse, totalEngaged);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Tableau de bord</h1>
          <p style={S.sub}>{project.location}</p>
        </div>
        <div style={S.badge}>
          <i className="ti ti-building" style={{ marginRight: 6 }} />
          {project.owner_name}
        </div>
      </div>

      {/* KPI row */}
      <div style={S.kpiRow}>
        <KpiCard
          icon="ti-files" label="Devis approuvés" color="#6366f1"
          value={`${fmtN(totalEngaged)} ${project.currency}`}
          sub={`${quotes.length} devis au total`}
        />
        <KpiCard
          icon="ti-cash" label="Versements effectués" color="#10b981"
          value={`${fmtN(totalVerse)} ${project.currency}`}
          sub={`${payments.length} paiements — ${avancement}% soldé`}
        />
        <KpiCard
          icon="ti-clock" label="Reste à payer" color="#f59e0b"
          value={`${fmtN(totalReste)} ${project.currency}`}
          sub={`${100 - avancement}% restant`}
          progress={100 - avancement}
        />
        <KpiCard
          icon="ti-chart-bar" label="Budget total" color="#3b82f6"
          value={`${fmtN(project.budget)} ${project.currency}`}
          sub={`Utilisation : ${pct(totalEngaged, project.budget)}%`}
        />
      </div>

      {/* Status breakdown */}
      <div style={S.section}>
        <h2 style={S.sectionTitle}>Répartition des devis</h2>
        <div style={S.statusRow}>
          {Object.entries(quotesByStatus).map(([s, n]) => (
            <div key={s} style={{ ...S.statusChip, borderColor: STATUS_COLORS[s] ?? "#64748b", color: STATUS_COLORS[s] ?? "#64748b" }}>
              {n} × {s === "paid" ? "Soldé" : s === "partial" ? "Partiel" : s === "approved" ? "Approuvé" : s === "pending" ? "En attente" : s}
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div style={S.section}>
        <h2 style={S.sectionTitle}>Avancement global</h2>
        <div style={S.progressTrack}>
          <div style={{ ...S.progressFill, width: `${avancement}%` }} />
        </div>
        <div style={S.progressLabel}>{avancement}% versé ({fmtN(totalVerse)} / {fmtN(totalEngaged)} FCFA)</div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, color, value, sub, progress }: {
  icon: string; label: string; color: string; value: string; sub: string; progress?: number;
}) {
  return (
    <div style={S.kpiCard}>
      <div style={{ ...S.kpiIcon, background: color + "22", color }}>
        <i className={`ti ${icon}`} style={{ fontSize: 22 }} />
      </div>
      <div style={S.kpiLabel}>{label}</div>
      <div style={S.kpiValue}>{value}</div>
      <div style={S.kpiSub}>{sub}</div>
      {progress !== undefined && (
        <div style={{ ...S.progressTrack, marginTop: 8, height: 4 }}>
          <div style={{ ...S.progressFill, width: `${progress}%`, background: "#f59e0b" }} />
        </div>
      )}
    </div>
  );
}

function PageLoader() {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
    <i className="ti ti-loader" style={{ fontSize: 32, color: "#6366f1" }} />
  </div>;
}

const S: Record<string, React.CSSProperties> = {
  page: { padding: 28, maxWidth: 1200 },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: "#f1f5f9" },
  sub: { fontSize: 13, color: "#64748b", marginTop: 4 },
  badge: { background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, padding: "6px 14px", fontSize: 13 },
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 },
  kpiCard: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 },
  kpiIcon: { width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  kpiLabel: { fontSize: 12, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  kpiValue: { fontSize: 20, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 },
  kpiSub: { fontSize: 12, color: "#475569" },
  section: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: "#cbd5e1", marginBottom: 14 },
  statusRow: { display: "flex", flexWrap: "wrap", gap: 10 },
  statusChip: { border: "1px solid", borderRadius: 20, padding: "4px 14px", fontSize: 13, fontWeight: 500 },
  progressTrack: { background: "#0f172a", borderRadius: 4, height: 8, overflow: "hidden" },
  progressFill: { height: "100%", background: "#6366f1", borderRadius: 4, transition: "width 0.5s" },
  progressLabel: { fontSize: 12, color: "#64748b", marginTop: 6 },
};
