import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { fmtN, fmtDate, METHOD_LABELS } from "../lib/utils";

interface Props { projectId: Id<"projects"> }

export default function PaymentsPage({ projectId }: Props) {
  const payments = useQuery(api.payments.listAll);
  const quotes = useQuery(api.quotes.listAll);
  const addPayment = useMutation(api.payments.create);
  const removePayment = useMutation(api.payments.remove);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ quote_id: "" as Id<"quotes"> | "", date: new Date().toISOString().slice(0, 10), amount: "", method: "virement", note: "" });

  if (!payments || !quotes) return <Loader />;

  const quoteMap: Record<string, string> = {};
  quotes.forEach((q) => { quoteMap[q._id] = `${q.number ?? "—"} — ${q.description.slice(0, 40)}`; });

  const sorted = [...payments].sort((a, b) => b.date.localeCompare(a.date));
  const total = payments.reduce((s, p) => s + p.amount, 0);

  const handleAdd = async () => {
    if (!form.quote_id || !form.amount) return;
    await addPayment({
      quote_id: form.quote_id as Id<"quotes">,
      date: form.date,
      amount: Number(form.amount),
      method: form.method,
      note: form.note || undefined,
    });
    setForm({ quote_id: "", date: new Date().toISOString().slice(0, 10), amount: "", method: "virement", note: "" });
    setShowForm(false);
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Paiements</h1>
          <div style={S.sub}>{payments.length} versements — Total : {fmtN(total)} FCFA</div>
        </div>
        <button style={S.btn} onClick={() => setShowForm(!showForm)}>
          <i className="ti ti-plus" /> Nouveau paiement
        </button>
      </div>

      {showForm && (
        <div style={S.formCard}>
          <h3 style={{ color: "#cbd5e1", marginBottom: 16, fontSize: 14 }}>Enregistrer un paiement</h3>
          <div style={S.formRow}>
            <select style={S.input} value={form.quote_id} onChange={(e) => setForm({ ...form, quote_id: e.target.value as Id<"quotes"> })}>
              <option value="">Sélectionner un devis…</option>
              {quotes.map((q) => <option key={q._id} value={q._id}>{q.number} — {q.description.slice(0, 50)}</option>)}
            </select>
            <input style={S.input} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div style={S.formRow}>
            <input style={S.input} type="number" placeholder="Montant (FCFA)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <select style={S.input} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              {Object.entries(METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <input style={{ ...S.input, width: "100%", marginBottom: 12 }} placeholder="Note (optionnel)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <div style={{ display: "flex", gap: 10 }}>
            <button style={S.btn} onClick={handleAdd}>Enregistrer</button>
            <button style={S.btnSecondary} onClick={() => setShowForm(false)}>Annuler</button>
          </div>
        </div>
      )}

      <div style={S.table}>
        <div style={{ ...S.row, ...S.headerRow }}>
          <span>Date</span><span>Devis</span><span>Montant</span><span>Méthode</span><span>Note</span><span></span>
        </div>
        {sorted.map((p) => (
          <div key={p._id} style={S.row}>
            <span style={{ color: "#64748b", fontSize: 12 }}>{fmtDate(p.date)}</span>
            <span style={{ color: "#94a3b8", fontSize: 12 }}>{quoteMap[p.quote_id] ?? p.quote_id}</span>
            <span style={{ fontWeight: 700, color: "#10b981" }}>{fmtN(p.amount)} FCFA</span>
            <span>
              <span style={S.methodChip}>{METHOD_LABELS[p.method] ?? p.method}</span>
            </span>
            <span style={{ color: "#64748b", fontSize: 12 }}>{p.note ?? "—"}</span>
            <span>
              <button style={S.deleteBtn} onClick={() => removePayment({ id: p._id })} title="Supprimer">
                <i className="ti ti-trash" />
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Loader() { return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%" }}><i className="ti ti-loader" style={{ fontSize:32,color:"#6366f1" }} /></div>; }

const S: Record<string, React.CSSProperties> = {
  page: { padding: 28 },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, color: "#f1f5f9" },
  sub: { fontSize: 13, color: "#64748b", marginTop: 4 },
  btn: { background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 },
  btnSecondary: { background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" },
  formCard: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20, marginBottom: 20 },
  formRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 },
  input: { background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 13, width: "100%" },
  table: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" },
  headerRow: { background: "#0f172a", color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 },
  row: { display: "grid", gridTemplateColumns: "100px 1fr 140px 120px 1fr 40px", gap: 12, padding: "12px 16px", borderBottom: "1px solid #0f172a", alignItems: "center", fontSize: 13 },
  methodChip: { background: "#0f172a", color: "#94a3b8", border: "1px solid #334155", borderRadius: 12, padding: "2px 10px", fontSize: 11 },
  deleteBtn: { background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16, opacity: 0.6, padding: 4 },
};
