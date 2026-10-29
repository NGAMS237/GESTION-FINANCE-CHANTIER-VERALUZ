import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import Dashboard from "./components/Dashboard";
import CategoriesPage from "./components/CategoriesPage";
import QuotesPage from "./components/QuotesPage";
import PaymentsPage from "./components/PaymentsPage";
import SuppliersPage from "./components/SuppliersPage";
import ReportsPage from "./components/ReportsPage";
import PhasesPage from "./components/PhasesPage";

type Page = "dashboard" | "categories" | "phases" | "quotes" | "payments" | "suppliers" | "reports";

const NAV = [
  { id: "dashboard", icon: "ti-layout-dashboard", label: "Tableau de bord" },
  { id: "categories", icon: "ti-category", label: "Catégories" },
  { id: "phases", icon: "ti-layers-intersect", label: "Phases" },
  { id: "quotes", icon: "ti-file-text", label: "Devis" },
  { id: "payments", icon: "ti-credit-card", label: "Paiements" },
  { id: "suppliers", icon: "ti-users", label: "Fournisseurs" },
  { id: "reports", icon: "ti-report", label: "Rapports" },
] as const;

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const projects = useQuery(api.projects.list);
  const project = projects?.[0];

  const renderPage = () => {
    if (!project) return <div style={styles.loading}><i className="ti ti-loader" style={{ fontSize: 32 }} /></div>;
    switch (page) {
      case "dashboard": return <Dashboard project={project} />;
      case "categories": return <CategoriesPage projectId={project._id} />;
      case "phases": return <PhasesPage projectId={project._id} />;
      case "quotes": return <QuotesPage projectId={project._id} />;
      case "payments": return <PaymentsPage projectId={project._id} />;
      case "suppliers": return <SuppliersPage projectId={project._id} />;
      case "reports": return <ReportsPage project={project} />;
    }
  };

  return (
    <div style={styles.root}>
      {/* Sidebar */}
      <aside style={{ ...styles.sidebar, width: sidebarOpen ? 220 : 60 }}>
        <div style={styles.sidebarHeader}>
          {sidebarOpen && (
            <div>
              <div style={styles.appName}>Chantier Finance</div>
              <div style={styles.projectName}>{project?.name ?? "Chargement…"}</div>
            </div>
          )}
          <button style={styles.toggleBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
            <i className={`ti ${sidebarOpen ? "ti-chevron-left" : "ti-menu-2"}`} />
          </button>
        </div>
        <nav style={styles.nav}>
          {NAV.map((item) => (
            <button
              key={item.id}
              style={{ ...styles.navItem, ...(page === item.id ? styles.navActive : {}) }}
              onClick={() => setPage(item.id as Page)}
            >
              <i className={`ti ${item.icon}`} style={{ fontSize: 18, minWidth: 18 }} />
              {sidebarOpen && <span style={{ marginLeft: 10 }}>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div style={styles.sidebarFooter}>
          {sidebarOpen && <span style={{ fontSize: 11, color: "#475569" }}>Propulsé par Convex</span>}
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        {renderPage()}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: "flex", height: "100vh", overflow: "hidden" },
  sidebar: { background: "#0f172a", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column", transition: "width 0.2s", flexShrink: 0, overflow: "hidden" },
  sidebarHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 12px", borderBottom: "1px solid #1e293b" },
  appName: { fontSize: 13, fontWeight: 700, color: "#6366f1", letterSpacing: 0.5 },
  projectName: { fontSize: 11, color: "#64748b", marginTop: 2 },
  toggleBtn: { background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 18, padding: 4, borderRadius: 6 },
  nav: { flex: 1, padding: "8px 0", overflowY: "auto" },
  navItem: { display: "flex", alignItems: "center", width: "100%", padding: "10px 16px", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 13, textAlign: "left", borderRadius: 0, transition: "all 0.15s", whiteSpace: "nowrap" },
  navActive: { background: "#1e293b", color: "#6366f1", borderLeft: "3px solid #6366f1" },
  sidebarFooter: { padding: "12px 16px", borderTop: "1px solid #1e293b" },
  main: { flex: 1, overflow: "auto", background: "#0f172a" },
  loading: { display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#6366f1" },
};
