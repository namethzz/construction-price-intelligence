import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Database, Menu, X } from "lucide-react";
import "./styles.css";

import { dataMeta, navItems } from "./data.js";
import Overview from "./pages/Overview.jsx";
import Prices from "./pages/Prices.jsx";
import Forecast from "./pages/Forecast.jsx";
import Analysis from "./pages/Analysis.jsx";
import CostPlanner from "./pages/CostPlanner.jsx";
import DataStats from "./pages/DataStats.jsx";

function validPage(id) {
  return navItems.some(([pageId]) => pageId === id);
}

function initialPage() {
  if (typeof window === "undefined") return "overview";
  const hashPage = window.location.hash.replace(/^#\/?/, "");
  return validPage(hashPage) ? hashPage : "overview";
}

function App() {
  const [page, setPage] = useState(initialPage);
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = navItems.find(([id]) => id === page)?.[1] || "ภาพรวม";
  const liveData = dataMeta?.status === "live" && !dataMeta?.isMock;

  useEffect(() => {
    const handleHash = () => {
      const nextPage = window.location.hash.replace(/^#\/?/, "");
      if (validPage(nextPage)) setPage(nextPage);
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("hashchange", handleHash);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("hashchange", handleHash);
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const previousOverflow = document.body.style.overflow;
    if (mobileOpen) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [mobileOpen]);

  const navigate = (nextPage) => {
    if (!validPage(nextPage)) return;
    setPage(nextPage);
    setMobileOpen(false);
    if (typeof window !== "undefined") {
      if (window.location.hash.replace(/^#\/?/, "") !== nextPage) window.location.hash = nextPage;
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    }
  };

  return (
    <div className="app">
      <style>{APP_RESPONSIVE_STYLES}</style>
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`} aria-label="เมนูหลัก">
        <div className="brand">
          <div className="brand-mark">TT</div>
          <div className="brand-copy"><div className="brand-name">THAI TAY</div><div className="brand-sub">CONSTRUCTION PRICE INTELLIGENCE</div></div>
          <button type="button" className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="ปิดเมนู"><X size={20} /></button>
        </div>

        <div className="nav-label">เมนูระบบ</div>
        <nav>
          {navItems.map(([id, label, Icon]) => (
            <button type="button" key={id} className={`nav-item ${page === id ? "active" : ""}`} onClick={() => navigate(id)} aria-current={page === id ? "page" : undefined}>
              <Icon size={18} /><span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className={`system-status ${liveData ? "live" : "demo"}`}><span className="dot" />{liveData ? "ข้อมูลจริงพร้อมใช้งาน" : "โหมดข้อมูลตัวอย่าง"}</div>
          <div className="version">Frontend v0.2 • {liveData ? "Live Data" : "Demo Data"}</div>
        </div>
      </aside>

      {mobileOpen && <button type="button" className="mobile-overlay" onClick={() => setMobileOpen(false)} aria-label="ปิดเมนู" />}

      <main className="main">
        <header className="topbar">
          <button type="button" className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="เปิดเมนู"><Menu size={22} /></button>
          <div className="breadcrumb"><span>THAI TAY</span><b>/</b><strong>{title}</strong></div>
          <div className={`top-data-status ${liveData ? "live" : "demo"}`} title={dataMeta?.note || "สถานะข้อมูล"}><Database size={15} /><span>{liveData ? "ข้อมูลจริง" : "Demo Data"}</span></div>
        </header>

        <div className="content">
          {page === "overview" && <Overview navigate={navigate} />}
          {page === "prices" && <Prices />}
          {page === "forecast" && <Forecast />}
          {page === "analysis" && <Analysis />}
          {page === "cost" && <CostPlanner />}
          {page === "data" && <DataStats />}
        </div>
      </main>
    </div>
  );
}

const APP_RESPONSIVE_STYLES = `
  .app { min-height:100vh; min-height:100dvh; } .main { min-width:0; } .content { width:100%; max-width:1500px; margin:0 auto; }
  .brand-copy { min-width:0; } .brand-name { white-space:nowrap; } .brand-sub { max-width:170px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .mobile-overlay { display:none; } .top-data-status { min-height:34px; display:flex; align-items:center; gap:6px; padding:0 10px; border:0; border-radius:999px; font-size:9px; font-weight:750; }
  .top-data-status.live { background:rgba(5,150,105,.1); color:#047857; } .top-data-status.demo { background:rgba(217,119,6,.1); color:#b45309; }
  .system-status.demo .dot { background:#f59e0b; box-shadow:0 0 0 3px rgba(245,158,11,.13); } .system-status.live .dot { background:#10b981; }
  @media (min-width:901px) { .mobile-close,.mobile-menu { display:none !important; } }
  @media (max-width:900px) {
    .app .sidebar { position:fixed; z-index:1000; inset:0 auto 0 0; width:min(84vw,300px); max-width:300px; height:100dvh; transform:translateX(-105%); transition:transform .22s ease; box-shadow:18px 0 50px rgba(15,23,42,.22); }
    .app .sidebar.open { transform:translateX(0); } .mobile-overlay { position:fixed; z-index:999; inset:0; display:block; border:0; background:rgba(15,23,42,.48); backdrop-filter:blur(2px); }
    .main { width:100%; margin-left:0 !important; } .topbar { position:sticky; z-index:40; top:0; min-height:58px; padding-left:max(14px,env(safe-area-inset-left)); padding-right:max(14px,env(safe-area-inset-right)); background:var(--card-bg,#fff); }
    .mobile-menu { width:42px; height:42px; display:grid; place-items:center; flex:0 0 auto; border:1px solid rgba(148,163,184,.2); border-radius:10px; background:transparent; color:inherit; }
    .mobile-close { width:40px; height:40px; display:grid; place-items:center; margin-left:auto; flex:0 0 auto; border:0; border-radius:9px; background:rgba(148,163,184,.1); color:inherit; }
    .breadcrumb { min-width:0; overflow:hidden; font-size:10px; text-overflow:ellipsis; white-space:nowrap; } .breadcrumb strong { font-weight:750; } .top-data-status span { display:none; }
    .content { padding:16px max(14px,env(safe-area-inset-right)) calc(86px + env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left)) !important; }
    .sidebar-bottom { padding-bottom:calc(18px + env(safe-area-inset-bottom)); }
  }
  @media (max-width:390px) { .brand-sub { max-width:145px; } .breadcrumb span,.breadcrumb b { display:none; } }
`;

createRoot(document.getElementById("root")).render(<App />);
