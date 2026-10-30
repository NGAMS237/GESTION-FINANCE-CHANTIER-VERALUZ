import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { useIsMobile } from "./lib/useIsMobile";
import Dashboard from "./components/Dashboard";
import CategoriesPage from "./components/CategoriesPage";
import QuotesPage from "./components/QuotesPage";
import PaymentsPage from "./components/PaymentsPage";
import SuppliersPage from "./components/SuppliersPage";
import ReportsPage from "./components/ReportsPage";
import PhasesPage from "./components/PhasesPage";
import ProjectsHome from "./components/ProjectsHome";
import TasksPage from "./components/TasksPage";
import DocumentsPage from "./components/DocumentsPage";
import GlobalDashboard from "./components/GlobalDashboard";

type Page = "dashboard" | "categories" | "phases" | "quotes" | "payments" | "suppliers" | "reports" | "tasks" | "documents";

const NAV = [
  { id: "dashboard",  icon: "ti-layout-dashboard", label: "Dashboard"     },
  { id: "quotes",     icon: "ti-file-text",         label: "Devis"         },
  { id: "payments",   icon: "ti-credit-card",        label: "Paiements"    },
  { id: "suppliers",  icon: "ti-users",              label: "Fournisseurs" },
  { id: "categories", icon: "ti-category",           label: "Catégories"   },
  { id: "phases",     icon: "ti-layers-intersect",   label: "Phases"       },
  { id: "reports",    icon: "ti-report",             label: "Rapports"     },
  { id: "tasks",      icon: "ti-checkbox",           label: "Tâches"       },
  { id: "documents",  icon: "ti-folder",             label: "Documents"    },
] as const;

const BOTTOM_NAV = ["dashboard", "quotes", "payments", "suppliers", "reports"] as const;
const APP_URL = "https://ngams237.github.io/GESTION-FINANCE-CHANTIER-VERALUZ/";

const TYPE_COLOR: Record<string, string> = {
  construction: "#3b82f6",
  acquisition: "#10b981",
  financement: "#f59e0b",
  autre: "#8b5cf6",
};
const TYPE_ICON: Record<string, string> = {
  construction: "🏗",
  acquisition: "🏡",
  financement: "🏦",
  autre: "📦",
};

export default function App() {
  const isMobile = useIsMobile();
  const [page, setPage] = useState<Page>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<Id<"projects"> | null>(null);
  const [showHome, setShowHome] = useState(true);
  const [showGlobal, setShowGlobal] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  const projects = useQuery(api.projects.list) ?? [];
  const project = projects.find(p => p._id === activeProjectId) ?? null;

  const selectProject = (id: Id<"projects">) => {
    setActiveProjectId(id);
    setShowHome(false);
    setShowGlobal(false);
    setPage("dashboard");
    setShowProjectPicker(false);
  };

  const goHome = () => {
    setShowHome(true);
    setShowGlobal(false);
    setActiveProjectId(null);
    setShowProjectPicker(false);
  };

  const goGlobal = () => {
    setShowGlobal(true);
    setShowHome(false);
    setShowProjectPicker(false);
  };

  const share = () => {
    const legacyCopy = () => {
      const el = document.createElement("textarea");
      el.value = APP_URL; el.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el);
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    };
    const doCopy = () => {
      try { navigator.clipboard.writeText(APP_URL).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }).catch(legacyCopy); }
      catch { legacyCopy(); }
    };
    if (navigator.share) { navigator.share({ title: "Centre Financier", url: APP_URL }).catch(doCopy); }
    else { doCopy(); }
  };

  const go = (p: Page) => { setPage(p); setMoreOpen(false); };

  // Show home or global before a project is selected
  if (showHome) {
    return <ProjectsHome onSelectProject={selectProject} />;
  }
  if (showGlobal) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <div style={{ background: "#1a1a2e", padding: "14px 24px", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={goHome} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 6, color: "#fff", padding: "6px 10px", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 14 }} /> Accueil
          </button>
          <span style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>Vue globale</span>
        </div>
        <GlobalDashboard onSelectProject={selectProject} />
      </div>
    );
  }

  const renderPage = () => {
    if (!project) return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#6366f1" }}>
        <i className="ti ti-loader" style={{ fontSize: 32 }} />
      </div>
    );
    switch (page) {
      case "dashboard":  return <Dashboard project={project} />;
      case "categories": return <CategoriesPage projectId={project._id} />;
      case "phases":     return <PhasesPage projectId={project._id} />;
      case "quotes":     return <QuotesPage projectId={project._id} />;
      case "payments":   return <PaymentsPage projectId={project._id} />;
      case "suppliers":  return <SuppliersPage projectId={project._id} />;
      case "reports":    return <ReportsPage project={project} />;
      case "tasks":      return <TasksPage projectId={project._id} />;
      case "documents":  return <DocumentsPage projectId={project._id} />;
    }
  };

  const projColor = project?.color ?? "#6366f1";
  const projType = project?.type ?? "construction";
  const projIcon = TYPE_ICON[projType] ?? "📁";

  /* ── MOBILE LAYOUT ── */
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0f172a" }}>
        <header style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <button onClick={goHome} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: 0 }}>
            <i className="ti ti-arrow-left" style={{ color: "#64748b", fontSize: 16 }} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: projColor }}>{projIcon} {project?.name ?? "…"}</div>
              <div style={{ fontSize: 10, color: "#475569" }}>Tap pour changer</div>
            </div>
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={goGlobal} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", padding: "7px 10px", fontSize: 12, cursor: "pointer" }}>
              <i className="ti ti-layout-grid" style={{ fontSize: 14 }} />
            </button>
            <button onClick={share} style={{ background: "#6366f122", border: "1px solid #6366f144", borderRadius: 8, color: copied ? "#10b981" : "#6366f1", padding: "7px 10px", fontSize: 12, cursor: "pointer" }}>
              <i className={`ti ${copied ? "ti-check" : "ti-share-2"}`} style={{ fontSize: 14 }} />
            </button>
          </div>
        </header>
        <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>{renderPage()}</main>
        <nav style={{ background: "#0f172a", borderTop: "1px solid #1e293b", display: "flex", alignItems: "stretch", flexShrink: 0, paddingBottom: "env(safe-area-inset-bottom)" }}>
          {BOTTOM_NAV.map(id => {
            const item = NAV.find(n => n.id === id)!;
            const active = page === id && !moreOpen;
            return (
              <button key={id} onClick={() => go(id as Page)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: "8px 2px", background: "none", border: "none", color: active ? "#6366f1" : "#475569", cursor: "pointer", fontSize: 10, fontWeight: active ? 600 : 400 }}>
                <i className={`ti ${item.icon}`} style={{ fontSize: 20 }} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <button onClick={() => setMoreOpen(v => !v)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: "8px 2px", background: "none", border: "none", color: moreOpen ? "#6366f1" : "#475569", cursor: "pointer", fontSize: 10, fontWeight: moreOpen ? 600 : 400 }}>
            <i className="ti ti-dots" style={{ fontSize: 20 }} />
            <span>Plus</span>
          </button>
        </nav>
        {moreOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={() => setMoreOpen(false)}>
            <div style={{ position: "absolute", bottom: 60, left: 0, right: 0, background: "#1e293b", borderTop: "1px solid #334155", padding: "8px 0", paddingBottom: "env(safe-area-inset-bottom)" }} onClick={e => e.stopPropagation()}>
              {NAV.filter(n => !BOTTOM_NAV.includes(n.id as any)).map(item => (
                <button key={item.id} onClick={() => go(item.id as Page)} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "14px 20px", background: "none", border: "none", color: page === item.id ? "#6366f1" : "#94a3b8", cursor: "pointer", fontSize: 14, fontWeight: page === item.id ? 600 : 400 }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize: 20, minWidth: 20 }} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── DESKTOP LAYOUT ── */
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <aside style={{ background: "#0f172a", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column", transition: "width 0.2s", flexShrink: 0, overflow: "hidden", width: sidebarOpen ? 230 : 60 }}>
        {/* Project selector */}
        <div style={{ borderBottom: "1px solid #1e293b", padding: sidebarOpen ? "14px 14px 12px" : "14px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: sidebarOpen ? 10 : 0 }}>
            {sidebarOpen && <div style={{ fontSize: 11, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Projet actif</div>}
            <button style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 18, padding: 4, borderRadius: 6, marginLeft: "auto" }} onClick={() => setSidebarOpen(!sidebarOpen)}>
              <i className={`ti ${sidebarOpen ? "ti-chevron-left" : "ti-menu-2"}`} />
            </button>
          </div>
          {sidebarOpen ? (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowProjectPicker(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 10px", cursor: "pointer", color: "#fff" }}
              >
                <span style={{ fontSize: 16 }}>{projIcon}</span>
                <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: projColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{project?.name ?? "Choisir…"}</div>
                  <div style={{ fontSize: 10, color: "#475569" }}>{projects.length} projet{projects.length !== 1 ? "s" : ""}</div>
                </div>
                <i className="ti ti-chevron-down" style={{ fontSize: 12, color: "#64748b" }} />
              </button>
              {showProjectPicker && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, zIndex: 100, overflow: "hidden" }}>
                  {projects.map(p => (
                    <button key={p._id} onClick={() => selectProject(p._id)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 12px", background: p._id === activeProjectId ? "#334155" : "none", border: "none", color: "#e2e8f0", cursor: "pointer", fontSize: 12, textAlign: "left" }}>
                      <span style={{ fontSize: 14 }}>{TYPE_ICON[p.type ?? "construction"] ?? "📁"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: p.color }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: "#64748b" }}>{new Intl.NumberFormat("fr-FR").format(p.budget)} {p.currency}</div>
                      </div>
                      {p._id === activeProjectId && <i className="ti ti-check" style={{ color: "#6366f1", fontSize: 12 }} />}
                    </button>
                  ))}
                  <div style={{ borderTop: "1px solid #334155" }}>
                    <button onClick={goHome} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 12px", background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontSize: 12 }}>
                      <i className="ti ti-plus" style={{ fontSize: 14 }} /> Nouveau projet
                    </button>
                    <button onClick={goGlobal} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 12px", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 12 }}>
                      <i className="ti ti-layout-grid" style={{ fontSize: 14 }} /> Vue globale
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button onClick={goHome} title="Accueil projets" style={{ background: "none", border: "none", color: "#64748b", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "4px 0" }}>
              <i className="ti ti-home" />
            </button>
          )}
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
          {NAV.map(item => (
            <button key={item.id} onClick={() => { setPage(item.id as Page); setShowProjectPicker(false); }} style={{ display: "flex", alignItems: "center", width: "100%", padding: "10px 16px", background: page === item.id ? "#1e293b" : "none", border: "none", borderLeft: page === item.id ? `3px solid ${projColor}` : "3px solid transparent", color: page === item.id ? projColor : "#94a3b8", cursor: "pointer", fontSize: 13, textAlign: "left", transition: "all 0.15s", whiteSpace: "nowrap" }}>
              <i className={`ti ${item.icon}`} style={{ fontSize: 18, minWidth: 18 }} />
              {sidebarOpen && <span style={{ marginLeft: 10 }}>{item.label}</span>}
            </button>
          ))}
          {sidebarOpen && (
            <>
              <div style={{ borderTop: "1px solid #1e293b", margin: "8px 0" }} />
              <button onClick={goGlobal} style={{ display: "flex", alignItems: "center", width: "100%", padding: "10px 16px", background: "none", border: "none", borderLeft: "3px solid transparent", color: "#64748b", cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" }}>
                <i className="ti ti-layout-grid" style={{ fontSize: 18, minWidth: 18 }} />
                <span style={{ marginLeft: 10 }}>Vue globale</span>
              </button>
              <button onClick={goHome} style={{ display: "flex", alignItems: "center", width: "100%", padding: "10px 16px", background: "none", border: "none", borderLeft: "3px solid transparent", color: "#64748b", cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" }}>
                <i className="ti ti-home" style={{ fontSize: 18, minWidth: 18 }} />
                <span style={{ marginLeft: 10 }}>Accueil projets</span>
              </button>
            </>
          )}
        </nav>

        {/* Share footer */}
        <div style={{ padding: "12px", borderTop: "1px solid #1e293b" }}>
          <button onClick={share} style={{ display: "flex", alignItems: "center", gap: 8, background: "#6366f122", border: "1px solid #6366f144", borderRadius: 8, color: copied ? "#10b981" : "#6366f1", padding: "8px 10px", cursor: "pointer", width: "100%", fontSize: 12, fontWeight: 600 }}>
            <i className={`ti ${copied ? "ti-check" : "ti-share"}`} style={{ fontSize: 16, minWidth: 16 }} />
            {sidebarOpen && <span>{copied ? "Lien copié !" : "Partager l'app"}</span>}
          </button>
          {sidebarOpen && <div style={{ fontSize: 10, color: "#334155", marginTop: 8, textAlign: "center" as const }}>Propulsé par Convex</div>}
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto", background: "#0f172a" }} onClick={() => setShowProjectPicker(false)}>
        {renderPage()}
      </main>
    </div>
  );
}
