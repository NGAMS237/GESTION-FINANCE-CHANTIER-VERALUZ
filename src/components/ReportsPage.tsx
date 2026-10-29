import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { fmtN, fmtDate, STATUS_LABELS, METHOD_LABELS } from "../lib/utils";
// @ts-ignore
import jsPDF from "jspdf";
// @ts-ignore
import autoTable from "jspdf-autotable";

interface Props {
  project: { _id: Id<"projects">; name: string; budget: number; currency: string; owner_name?: string; location?: string };
}

const PDF_COLORS = {
  primary: [99, 102, 241] as [number, number, number],
  header_bg: [30, 41, 59] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  text: [30, 41, 59] as [number, number, number],
  row_alt: [248, 250, 252] as [number, number, number],
};

export default function ReportsPage({ project }: Props) {
  const quotes = useQuery(api.quotes.listAll);
  const payments = useQuery(api.payments.listAll);
  const suppliers = useQuery(api.suppliers.listByProject, { project_id: project._id });

  if (!quotes || !payments || !suppliers) return <Loader />;

  const paidMap: Record<string, number> = {};
  payments.forEach((p) => { paidMap[p.quote_id] = (paidMap[p.quote_id] ?? 0) + p.amount; });

  const supplierMap: Record<string, string> = {};
  suppliers.forEach((s) => { supplierMap[s._id] = s.name; });

  const totalEngaged = quotes.reduce((s, q) => s + q.amount, 0);
  const totalVerse = payments.reduce((s, p) => s + p.amount, 0);
  const totalReste = totalEngaged - totalVerse;

  const fmtNPdf = (n: number) => Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  const generateGlobal = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const now = new Date().toLocaleDateString("fr-FR");

    // Header
    doc.setFillColor(...PDF_COLORS.primary);
    doc.rect(0, 0, 297, 22, "F");
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...PDF_COLORS.white);
    doc.text("RAPPORT FINANCIER GLOBAL — " + project.name.toUpperCase(), 14, 14);
    doc.setFontSize(9);
    doc.text("Généré le " + now, 250, 14);

    // KPIs
    let y = 30;
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(`Total engagé : ${fmtNPdf(totalEngaged)} FCFA`, 14, y);
    doc.text(`Total versé : ${fmtNPdf(totalVerse)} FCFA`, 100, y);
    doc.text(`Reste à payer : ${fmtNPdf(totalReste)} FCFA`, 186, y);
    y += 8;
    doc.text(`Avancement : ${totalEngaged > 0 ? Math.round((totalVerse / totalEngaged) * 100) : 0}%`, 14, y);
    y += 8;

    // Quotes table
    autoTable(doc, {
      startY: y,
      margin: { left: 10, right: 10 },
      styles: { fontSize: 8, cellPadding: 3, font: "times", textColor: PDF_COLORS.text },
      headStyles: { fillColor: PDF_COLORS.header_bg, textColor: PDF_COLORS.white, fontStyle: "bold", fontSize: 8, font: "times" },
      alternateRowStyles: { fillColor: PDF_COLORS.row_alt },
      head: [["N° Devis", "Description", "Fournisseur", "Montant", "Versé", "Reste", "Statut"]],
      body: quotes.sort((a, b) => (a.number ?? "").localeCompare(b.number ?? "")).map((q) => {
        const verse = paidMap[q._id] ?? 0;
        return [
          q.number ?? "—",
          q.description,
          q.supplier_id ? (supplierMap[q.supplier_id] ?? "—") : "—",
          fmtNPdf(q.amount) + " FCFA",
          fmtNPdf(verse) + " FCFA",
          fmtNPdf(q.amount - verse) + " FCFA",
          STATUS_LABELS[q.status] ?? q.status,
        ];
      }),
    });

    doc.save(`Rapport-Global-${project.name.replace(/\s+/g, "-")}-${now.replace(/\//g, "-")}.pdf`);
  };

  const generatePayments = () => {
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString("fr-FR");

    doc.setFillColor(...PDF_COLORS.primary);
    doc.rect(0, 0, 210, 22, "F");
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...PDF_COLORS.white);
    doc.text("HISTORIQUE DES PAIEMENTS", 14, 14);
    doc.setFontSize(9);
    doc.text("Généré le " + now, 160, 14);

    const sorted = [...payments].sort((a, b) => b.date.localeCompare(a.date));
    const quoteMap: Record<string, string> = {};
    quotes.forEach((q) => { quoteMap[q._id] = q.number ?? "—"; });

    autoTable(doc, {
      startY: 28,
      margin: { left: 10, right: 10 },
      styles: { fontSize: 8, cellPadding: 3, font: "times", textColor: PDF_COLORS.text },
      headStyles: { fillColor: PDF_COLORS.header_bg, textColor: PDF_COLORS.white, fontStyle: "bold", fontSize: 8, font: "times" },
      alternateRowStyles: { fillColor: PDF_COLORS.row_alt },
      foot: [["", "", `TOTAL : ${fmtNPdf(totalVerse)} FCFA`, "", ""]],
      footStyles: { fillColor: PDF_COLORS.primary, textColor: PDF_COLORS.white, fontStyle: "bold", fontSize: 8, font: "times" },
      head: [["Date", "Devis", "Montant", "Méthode", "Note"]],
      body: sorted.map((p) => [
        fmtDate(p.date),
        quoteMap[p.quote_id] ?? "—",
        fmtNPdf(p.amount) + " FCFA",
        METHOD_LABELS[p.method] ?? p.method,
        p.note ?? "—",
      ]),
    });

    doc.save(`Paiements-${project.name.replace(/\s+/g, "-")}-${now.replace(/\//g, "-")}.pdf`);
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.title}>Rapports</h1>
        <div style={S.sub}>Génération PDF de vos données financières</div>
      </div>

      <div style={S.grid}>
        <ReportCard
          icon="ti-report-analytics"
          title="Rapport Global"
          desc={`${quotes.length} devis — ${fmtN(totalEngaged)} FCFA engagés`}
          color="#6366f1"
          onClick={generateGlobal}
        />
        <ReportCard
          icon="ti-credit-card"
          title="Historique Paiements"
          desc={`${payments.length} paiements — ${fmtN(totalVerse)} FCFA versés`}
          color="#10b981"
          onClick={generatePayments}
        />
      </div>

      {/* Summary table */}
      <div style={S.summaryCard}>
        <h2 style={S.sectionTitle}>Récapitulatif par fournisseur</h2>
        <div style={S.table}>
          <div style={{ ...S.row, ...S.headerRow }}>
            <span>Fournisseur</span><span>Spécialité</span><span>Engagé</span><span>Versé</span><span>Reste</span>
          </div>
          {suppliers.map((s) => {
            const eng = quotes.filter((q) => q.supplier_id === s._id).reduce((sum, q) => sum + q.amount, 0);
            const ver = quotes.filter((q) => q.supplier_id === s._id).reduce((sum, q) => sum + (paidMap[q._id] ?? 0), 0);
            return (
              <div key={s._id} style={S.row}>
                <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{s.name}</span>
                <span style={{ color: "#64748b", fontSize: 12 }}>{s.speciality ?? "—"}</span>
                <span style={{ fontWeight: 600, color: "#f1f5f9" }}>{fmtN(eng)} FCFA</span>
                <span style={{ color: "#10b981" }}>{fmtN(ver)} FCFA</span>
                <span style={{ color: eng - ver > 0 ? "#f59e0b" : "#10b981" }}>{fmtN(eng - ver)} FCFA</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ReportCard({ icon, title, desc, color, onClick }: { icon: string; title: string; desc: string; color: string; onClick: () => void }) {
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 24 }}>
      <div style={{ width: 52, height: 52, borderRadius: 12, background: color + "22", color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 26 }} />
      </div>
      <div style={{ fontWeight: 600, color: "#f1f5f9", fontSize: 15, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 18 }}>{desc}</div>
      <button
        style={{ background: color, color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}
        onClick={onClick}
      >
        <i className="ti ti-download" /> Générer PDF
      </button>
    </div>
  );
}

function Loader() { return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%" }}><i className="ti ti-loader" style={{ fontSize:32,color:"#6366f1" }} /></div>; }

const S: Record<string, React.CSSProperties> = {
  page: { padding: 28 },
  header: { marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: "#f1f5f9" },
  sub: { fontSize: 13, color: "#64748b", marginTop: 4 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 24 },
  summaryCard: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: "#cbd5e1", marginBottom: 14 },
  table: { overflow: "hidden", borderRadius: 8 },
  headerRow: { background: "#0f172a", color: "#64748b", fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 0.5, fontWeight: 600 },
  row: { display: "grid", gridTemplateColumns: "1fr 140px 140px 140px 120px", gap: 12, padding: "11px 14px", borderBottom: "1px solid #0f172a", alignItems: "center", fontSize: 13 },
};
