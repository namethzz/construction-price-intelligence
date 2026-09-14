import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { materials } from "../data.js";

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function StatCard({label,value,change,note,positive}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className={`stat-change ${positive ? "up" : "down"}`}>
        {positive ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>} {change}
      </div>
      <div className="stat-note">{note}</div>
    </div>
  );
}

export function Driver({label,value}) {
  return (
    <div className="driver">
      <div className="driver-row"><span>{label}</span><b>{value}%</b></div>
      <div className="bar"><i style={{width: `${value}%`}}/></div>
    </div>
  );
}

export function MaterialTable({compact=false}) {
  const rows = compact ? materials.slice(0,4) : materials;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr><th>วัสดุ</th><th>หมวด</th><th>ราคาปัจจุบัน</th><th>หน่วย</th><th>เปลี่ยนแปลง</th></tr>
        </thead>
        <tbody>
          {rows.map(m => (
            <tr key={m.name}>
              <td><b>{m.name}</b></td>
              <td><span className="tag">{m.category}</span></td>
              <td className="price">฿{Number(m.price).toLocaleString()}</td>
              <td>{m.unit}</td>
              <td className={m.positive ? "up-text" : "down-text"}>{m.change}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Metric({title,value,change}) {
  return <div className="metric-card"><span>{title}</span><b>{value}</b><em>{change}</em></div>;
}

export function Source({name,status}) {
  return (
    <div className="source-row">
      <span className="source-dot"/>
      <div><b>{name}</b><small>Monthly data</small></div>
      <em className={status==="Connected"?"connected":""}>{status}</em>
    </div>
  );
}
