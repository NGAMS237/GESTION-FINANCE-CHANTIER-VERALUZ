import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useIsMobile } from "./lib/useIsMobile";
import Dashboard from "./components/Dashboard";
import CategoriesPage from "./components/CategoriesPage";
import QuotesPage from "./components/QuotesPage";
import PaymentsPage from "./components/PaymentsPage";
import SuppliersPage from "./components/SuppliersPage";
import ReportsPage from "./components/ReportsPage";
import PhasesPage from "./components/PhasesPage";

type Page = "dashboard" | "categories" | "phases" | "quotes" | "payments" | "suppliers" | "reports";

const NAV = [
  { id: "dashboard",  icon: "ti-layout-dashboard", label: "Dashboard"     },
  { id: "quotes",     icon: "ti-file-text",         label: "Devis"         },
  { id: "payments",   icon: "ti-credit-card",        label: "Paiements"    },
  { id: "suppliers",  icon: "ti-users",              label: "Fournisseurs" },
  { id: "categories", icon: "ti-category",           label: "Catégories"   },
  { id: "phases",     icon: "ti-layers-intersect",   label: "Phases"       },
  { id: "reports",    icon: "ti-report",             label: "Rapports"     },
] as const;

// 5 most-used pages in bottom nav on mobile
const BOTTOM_NAV = ["dashboard", "quotes", "payments", "suppliers", "reports"] as const;

const APP_URL = "https://ngams237.github.io/GESTION-FINANCE-CHANTIER-VERALUZ/";

export default function App() {
  const isMobile = useIsMobile();
  const [page, setPage] = useState<Page>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const projects = useQuery(api.projects.list);
  const project = projects?.[0];

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
    if (navigator.share) { navigator.share({ title: "Chantier Finance — Résidence Veraluz", url: APP_URL }).catch(doCopy); }
    else { doCopy(); }
  };

  const go = (p: Page) => { setPage(p); setMoreOpen(false); };

  const renderPage = () => {
    if (!project) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#6366f1" }}><i className="ti ti-loader" style={{ fontSize:32 }}/></div>;
    switch (page) {
      case "dashboard":  return <Dashboard project={project} />;
      case "categories": return <CategoriesPage projectId={project._id} />;
      case "phases":     return <PhasesPage projectId={project._id} />;
      case "quotes":     return <QuotesPage projectId={project._id} />;
      case "payments":   return <PaymentsPage projectId={project._id} />;
      case "suppliers":  return <SuppliersPage projectId={project._id} />;
      case "reports":    return <ReportsPage project={project} />;
    }
  };

  /* ── MOBILE LAYOUT ── */
  if (isMobile) {
    return (
      <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:"#0f172a" }}>

        {/* Top header */}
        <header style={{ background:"#0f172a", borderBottom:"1px solid #1e293b", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:"#6366f1" }}>Chantier Finance</div>
            <div style={{ fontSize:11, color:"#475569" }}>{project?.name ?? "…"}</div>
          </div>
          <button onClick={share} style={{ background:"#6366f122", border:"1px solid #6366f144", borderRadius:8, color:copied?"#10b981":"#6366f1", padding:"7px 12px", fontSize:12, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
            <i className={`ti ${copied ? "ti-check" : "ti-share-2"}`} style={{ fontSize:15 }}/>
            {copied ? "Copié !" : "Partager"}
          </button>
        </header>

        {/* Page content */}
        <main style={{ flex:1, overflowY:"auto", overflowX:"hidden" }}>
          {renderPage()}
        </main>

        {/* Bottom nav */}
        <nav style={{ background:"#0f172a", borderTop:"1px solid #1e293b", display:"flex", alignItems:"stretch", flexShrink:0, paddingBottom:"env(safe-area-inset-bottom)" }}>
          {BOTTOM_NAV.map(id => {
            const item = NAV.find(n => n.id === id)!;
            const active = page === id && !moreOpen;
            return (
              <button key={id} onClick={() => { go(id as Page); }} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, padding:"8px 2px", background:"none", border:"none", color: active ? "#6366f1" : "#475569", cursor:"pointer", fontSize:10, fontWeight: active ? 600 : 400 }}>
                <i className={`ti ${item.icon}`} style={{ fontSize:20 }}/>
                <span>{item.label}</span>
              </button>
            );
          })}
          {/* "Plus" button for extra pages */}
          <button onClick={() => setMoreOpen(v => !v)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, padding:"8px 2px", background:"none", border:"none", color: moreOpen ? "#6366f1" : "#475569", cursor:"pointer", fontSize:10, fontWeight: moreOpen ? 600 : 400 }}>
            <i className="ti ti-dots" style={{ fontSize:20 }}/>
            <span>Plus</span>
          </button>
        </nav>

        {/* More drawer */}
        {moreOpen && (
          <div style={{ position:"fixed", inset:0, zIndex:50 }} onClick={() => setMoreOpen(false)}>
            <div style={{ position:"absolute", bottom:60, left:0, right:0, background:"#1e293b", borderTop:"1px solid #334155", padding:"8px 0", paddingBottom:"env(safe-area-inset-bottom)" }} onClick={e => e.stopPropagation()}>
              {NAV.filter(n => !BOTTOM_NAV.includes(n.id as any)).map(item => (
                <button key={item.id} onClick={() => go(item.id as Page)} style={{ display:"flex", alignItems:"center", gap:14, width:"100%", padding:"14px 20px", background:"none", border:"none", color: page === item.id ? "#6366f1" : "#94a3b8", cursor:"pointer", fontSize:14, fontWeight: page === item.id ? 600 : 400 }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize:20, minWidth:20 }}/>
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
    <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
      <aside style={{ background:"#0f172a", borderRight:"1px solid #1e293b", display:"flex", flexDirection:"column", transition:"width 0.2s", flexShrink:0, overflow:"hidden", width: sidebarOpen ? 220 : 60 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 12px", borderBottom:"1px solid #1e293b" }}>
          {sidebarOpen && (
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#6366f1", letterSpacing:0.5 }}>Chantier Finance</div>
              <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{project?.name ?? "Chargement…"}</div>
            </div>
          )}
          <button style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:18, padding:4, borderRadius:6 }} onClick={() => setSidebarOpen(!sidebarOpen)}>
            <i className={`ti ${sidebarOpen ? "ti-chevron-left" : "ti-menu-2"}`}/>
          </button>
        </div>
        <nav style={{ flex:1, padding:"8px 0", overflowY:"auto" }}>
          {NAV.map(item => (
            <button key={item.id} onClick={() => setPage(item.id as Page)} style={{ display:"flex", alignItems:"center", width:"100%", padding:"10px 16px", background: page === item.id ? "#1e293b" : "none", border:"none", borderLeft: page === item.id ? "3px solid #6366f1" : "3px solid transparent", color: page === item.id ? "#6366f1" : "#94a3b8", cursor:"pointer", fontSize:13, textAlign:"left", transition:"all 0.15s", whiteSpace:"nowrap" }}>
              <i className={`ti ${item.icon}`} style={{ fontSize:18, minWidth:18 }}/>
              {sidebarOpen && <span style={{ marginLeft:10 }}>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding:"12px 16px", borderTop:"1px solid #1e293b" }}>
          <button onClick={share} style={{ display:"flex", alignItems:"center", gap:8, background:"#6366f122", border:"1px solid #6366f144", borderRadius:8, color:copied?"#10b981":"#6366f1", padding:"8px 10px", cursor:"pointer", width:"100%", fontSize:12, fontWeight:600 }}>
            <i className={`ti ${copied ? "ti-check" : "ti-share"}`} style={{ fontSize:16, minWidth:16 }}/>
            {sidebarOpen && <span>{copied ? "Lien copié !" : "Partager l'app"}</span>}
          </button>
          {sidebarOpen && <div style={{ fontSize:10, color:"#334155", marginTop:8, textAlign:"center" as const }}>Propulsé par Convex</div>}
        </div>
      </aside>
      <main style={{ flex:1, overflow:"auto", background:"#0f172a" }}>
        {renderPage()}
      </main>
    </div>
  );
}
