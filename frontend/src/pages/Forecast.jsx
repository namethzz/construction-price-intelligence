import React, { useState } from "react";
import { RefreshCw, ArrowUpRight } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { materials, forecastData } from "../data.js";
import { PageHeader, Metric } from "../components/Shared.jsx";

export default function Forecast() {
  const [selected, setSelected] = useState(materials[0]);
  const f3 = Math.round(selected.price * 1.065);

  return (
    <>
      <PageHeader
        eyebrow="MACHINE LEARNING"
        title="พยากรณ์ราคา"
        description="เลือกวัสดุก่อสร้างเชิงพาณิชย์เพื่อดูแนวโน้มราคาในอนาคต"
        action={<button className="outline-btn"><RefreshCw size={15}/> Run forecast</button>}
      />

      <div className="selection-card">
        <div>
          <div className="field-label">วัสดุที่ต้องการพยากรณ์</div>
          <select value={selected.name} onChange={e=>setSelected(materials.find(m=>m.name===e.target.value))}>
            {materials.map(m=><option key={m.name} value={m.name}>{m.name} — {m.category}</option>)}
          </select>
        </div>
        <div className="selection-meta"><span>{selected.category}</span><b>{selected.unit}</b></div>
      </div>

      <div className="forecast-hero">
        <div>
          <div className="eyebrow">{selected.name.toUpperCase()} • 3 MONTH FORECAST</div>
          <div className="big-number">฿{f3.toLocaleString()}</div>
          <div className="forecast-change"><ArrowUpRight size={18}/> +6.5% จากราคาปัจจุบัน</div>
        </div>
        <div className="confidence"><span>MODEL CONFIDENCE</span><b>82%</b><small>XGBoost • v1.4</small></div>
      </div>

      <section className="card chart-card">
        <div className="card-head">
          <div><h2>Forecast trajectory</h2><span>{selected.name} • {selected.unit}</span></div>
          <span className="legend"><i/> Actual <i className="forecast-dot"/> Forecast</span>
        </div>
        <div className="chart-wrap tall">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="month" tickLine={false} axisLine={false}/>
              <YAxis tickLine={false} axisLine={false}/>
              <Tooltip formatter={(v)=>v ? [`฿${Math.round(v).toLocaleString()}`, "ราคา"] : ["—"]}/>
              <Area type="monotone" dataKey="actual" strokeWidth={2.5} fill="none"/>
              <Area type="monotone" dataKey="forecast" strokeWidth={2.5} fill="none" strokeDasharray="7 5"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid-3">
        <Metric title="1 เดือน" value={`฿${Math.round(selected.price*1.027).toLocaleString()}`} change="+2.7%"/>
        <Metric title="3 เดือน" value={`฿${f3.toLocaleString()}`} change="+6.5%"/>
        <Metric title="6 เดือน" value={`฿${Math.round(selected.price*1.124).toLocaleString()}`} change="+12.4%"/>
      </div>
    </>
  );
}
