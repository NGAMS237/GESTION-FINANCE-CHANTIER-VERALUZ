import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface Props { projectId: Id<"projects"> }

export default function SuppliersPage({ projectId }: Props) {
  const suppliers = useQuery(api.suppliers.listByProject, { project_id: projectId });
  const quotes = useQuery(api.quotes.listAll);
  const payments = useQuery(api.payments.listAll);
  const createSupplier = useMutation(api.suppliers.create);
  const updateSupplier = useMutation(api.suppliers.update);
  const removeSupplier = useMutation(api.suppliers.remove);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", speciality: "", notes: "" });

  if (!suppliers || !quotes || !payments) return <Loader />;

  // Compute paid per supplier
  const paidMap: Record<string, number> = {};
  payments.forEach((p) => { paidMap[p.quote_id] = (paidMap[p.quote_id] ?? 0) + p.amount; });
  const supplierPaid: Record<string, number> = {};
  const supplierEngaged: Record<string, number> = {};
  quotes.forEach((q) => {
    if (q.supplier_id) {
      supplierEngaged[q.supplier_id] = (supplierEngaged[q.supplier_id] ?? 0) + q.amount;
      supplierPaid[q.supplier_id] = (supplierPaid[q.supplier_id] ?? 0) + (paidMap[q._id] ?? 0);
    }
  });

  const handleAdd = async () => {
    if (!form.name) return;
    await createSupplier({ project_id: projectId, name: form.name, phone: form.phone || undefined, email: form.email || undefined, address: form.address || undefined, speciality: form.speciality || undefined, notes: form.notes || undefined });
    setForm({ name: "", phone: "", email: "", address: "", speciality: "", notes: "" });
    setShowForm(false);
  };

  const fmtN = (n: number) => Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Fournisseurs</h1>
          <div style={S.sub}>{suppliers.length} fournisseurs</div>
        </div>
        <button style={S.btn} onClick={() => setShowForm(!showForm)}>
          <i className="ti ti-plus" /> Ajouter
        </button>
      </div>

      {showForm && (
        <div style={S.formCard}>
          <h3 style={{ color: "#cbd5e1", marginBottom: 16, fontSize: 14 }}>Nouveau fournisseur</h3>
          <div style={S.formGrid}>
            {(["name", "phone", "email", "address", "speciality"] as const).map((f) => (
              <input key={f} style={S.input} placeholder={f === "name" ? "Nom *" : f === "speciality" ? "Spécialité" : f.charAt(0).toUpperCase() + f.slice(1)} value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
            ))}
            <input style={S.input} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button style={S.btn} onClick={handleAdd}>Enregistrer</button>
            <button style={S.btnSec} onClick={() => setShowForm(false)}>Annuler</button>
          </div>
        </div>
      )}

      <div style={S.grid}>
        {suppliers.map((s) => {
          const engaged = supplierEngaged[s._id] ?? 0;
          const paid = supplierPaid[s._id] ?? 0;
          const reste = engaged - paid;
          return (
            <div key={s._id} style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.avatar}>{s.name.charAt(0).toUpperCase()}</div>
                <div>
                  <div style={S.cardName}>{s.name}</div>
                  <div style={S.cardSpec}>{s.speciality ?? "—"}</div>
                </div>
              </div>
              <div style={S.cardInfo}>
                {s.phone && <div><i className="ti ti-phone" style={{ marginRight: 6, color: "#64748b" }} />{s.phone}</div>}
                {s.email && <div><i className="ti ti-mail" style={{ marginRight: 6, color: "#64748b" }} />{s.email}</div>}
                {s.address && <div><i className="ti ti-map-pin" style={{ marginRight: 6, color: "#64748b" }} />{s.address}</div>}
              </div>
              {engaged > 0 && (
                <div style={S.cardFinance}>
                  <div style={S.finRow}><span style={{ color: "#64748b" }}>Engagé</span><span style={{ color: "#f1f5f9", fontWeight: 600 }}>{fmtN(engaged)} FCFA</span></div>
                  <div style={S.finRow}><span style={{ color: "#64748b" }}>Versé</span><span style={{ color: "#10b981", fontWeight: 600 }}>{fmtN(paid)} FCFA</span></div>
                  {reste > 0 && <div style={S.finRow}><span style={{ color: "#64748b" }}>Reste</span><span style={{ color: "#f59e0b", fontWeight: 600 }}>{fmtN(reste)} FCFA</span></div>}
                </div>
              )}
              <button style={S.deleteBtn} onClick={() => removeSupplier({ id: s._id })} title="Supprimer">
                <i className="ti ti-trash" />
              </button>
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
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, color: "#f1f5f9" },
  sub: { fontSize: 13, color: "#64748b", marginTop: 4 },
  btn: { background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 },
  btnSec: { background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" },
  formCard: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20, marginBottom: 20 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  input: { background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 13 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 },
  card: { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20, position: "relative" },
  cardHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 },
  avatar: { width: 40, height: 40, borderRadius: 10, background: "#6366f133", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, flexShrink: 0 },
  cardName: { fontWeight: 600, color: "#f1f5f9", fontSize: 14 },
  cardSpec: { fontSize: 12, color: "#64748b", marginTop: 2 },
  cardInfo: { fontSize: 12, color: "#94a3b8", display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 },
  cardFinance: { background: "#0f172a", borderRadius: 8, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 4 },
  finRow: { display: "flex", justifyContent: "space-between", fontSize: 12 },
  deleteBtn: { position: "absolute", top: 12, right: 12, background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16, opacity: 0.5, padding: 4 },
};
