import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Bell, Menu, X } from "lucide-react";
import "./styles.css";

import { navItems } from "./data.js";
import Overview from "./pages/Overview.jsx";
import Prices from "./pages/Prices.jsx";
import Forecast from "./pages/Forecast.jsx";
import Analysis from "./pages/Analysis.jsx";
import CostPlanner from "./pages/CostPlanner.jsx";
import DataStats from "./pages/DataStats.jsx";

function App() {
  const [page, setPage] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);

  const title = navItems.find(x => x[0] === page)?.[1] || "ภาพรวม";

  const navigate = (p) => {
    setPage(p);
    setMobileOpen(false);
  };

  return (
    <div className="app">
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">C</div>
          <div>
            <div className="brand-name">CONSTRUCT</div>
            <div className="brand-sub">PRICE INTELLIGENCE</div>
          </div>
          <button className="mobile-close" onClick={() => setMobileOpen(false)}><X size={19}/></button>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav>
          {navItems.map(([id, label, Icon]) => (
            <button key={id} className={`nav-item ${page === id ? "active" : ""}`} onClick={() => navigate(id)}>
              <Icon size={18}/>
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status"><span className="dot"/> Data pipeline online</div>
          <div className="version">v0.1 • Prototype</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={21}/></button>
          <div className="breadcrumb"><span>CONSTRUCT</span><b>/</b>{title}</div>
          <div className="top-actions">
            <button className="icon-btn"><Bell size={18}/><span className="notification-dot"/></button>
            <div className="avatar">CP</div>
          </div>
        </header>

        <div className="content">
          {page === "overview" && <Overview navigate={navigate}/>}
          {page === "prices" && <Prices/>}
          {page === "forecast" && <Forecast/>}
          {page === "analysis" && <Analysis/>}
          {page === "cost" && <CostPlanner/>}
          {page === "data" && <DataStats/>}
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
