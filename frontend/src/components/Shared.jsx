import React, { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Database, Minus, TriangleAlert } from "lucide-react";
import { materials } from "../data.js";

function numeric(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPrice(value) {
  const parsed = numeric(value);
  if (parsed === null) return "—";
  return parsed.toLocaleString("th-TH", { maximumFractionDigits: 2 });
}

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <>
      <style>{SHARED_STYLES}</style>
      <header className="page-header">
        <div className="page-header-copy">
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {action && <div className="page-header-action">{action}</div>}
      </header>
    </>
  );
}

export function StatCard({ label, value, change, note, positive }) {
  const direction = positive === true ? "up" : positive === false ? "down" : "neutral";
  return (
    <article className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {change !== undefined && change !== null && (
        <div className={`stat-change ${direction}`}>
          {direction === "up" ? <ArrowUpRight size={14} /> : direction === "down" ? <ArrowDownRight size={14} /> : <Minus size={14} />}
          {change}
        </div>
      )}
      <div className="stat-note">{note}</div>
    </article>
  );
}

export function Driver({ label, value, unit = "%" }) {
  const parsed = numeric(value);
  const percent = parsed === null ? 0 : Math.min(100, Math.max(0, parsed));
  return (
    <div className={`driver ${parsed === null ? "waiting" : ""}`}>
      <div className="driver-row"><span>{label}</span><b>{parsed === null ? "รอข้อมูล" : `${parsed.toFixed(1)}${unit}`}</b></div>
      <div className="bar"><i style={{ width: `${percent}%` }} /></div>
    </div>
  );
}

const MATERIAL_PAGE_SIZE = 50;

export function MaterialTable({ compact = false }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);

  const categories = useMemo(
    () => [...new Set(materials.map((material) => material?.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th")),
    []
  );

  const filteredMaterials = useMemo(() => {
    if (compact) return materials.slice(0, 4);
    const terms = query.trim().toLocaleLowerCase("th-TH").split(/\s+/).filter(Boolean);
    return materials.filter((material) => {
      const text = [material?.id, material?.name, material?.category, material?.unit].join(" ").toLocaleLowerCase("th-TH");
      const matchesQuery = !terms.length || terms.every((term) => text.includes(term));
      const matchesCategory = category === "all" || material?.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [compact, query, category]);

  const pageCount = Math.max(1, Math.ceil(filteredMaterials.length / MATERIAL_PAGE_SIZE));
  const currentPage = compact ? 1 : Math.min(page, pageCount);
  const rows = compact
    ? filteredMaterials
    : filteredMaterials.slice((currentPage - 1) * MATERIAL_PAGE_SIZE, currentPage * MATERIAL_PAGE_SIZE);
  const hasChange = rows.some((material) => material?.change && material.change !== "-");

  useEffect(() => setPage(1), [query, category]);

  if (!materials.length) return <div className="shared-empty"><Database size={22} />ยังไม่มีรายการวัสดุ</div>;

  return (
    <div className="material-table-responsive">
      {!compact && (
        <div className="material-table-tools">
          <label><span>ค้นหาวัสดุ</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ชื่อ รหัส หมวด หรือหน่วย" /></label>
          <label><span>หมวดวัสดุ</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">ทุกหมวด</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <strong>พบ {filteredMaterials.length.toLocaleString("th-TH")} รายการ</strong>
        </div>
      )}
      {!rows.length && <div className="shared-empty"><Database size={22} />ไม่พบวัสดุที่ตรงกับตัวกรอง</div>}
      <div className="material-mobile-list">
        {rows.map((material) => (
          <article key={`mobile-${material.id || material.name}`}>
            <div><b>{material.id || "—"}</b><span><strong>{material.name}</strong><small>{material.category}</small></span></div>
            <div><span>ราคาส่วนกลางในงวดข้อมูล</span><strong>{numeric(material.price) === null ? "—" : `฿${formatPrice(material.price)}`}</strong><small>{material.unit}</small></div>
            {hasChange && <em className={material.change === "-" ? "neutral" : material.positive ? "up-text" : "down-text"}>{material.change || "—"}</em>}
          </article>
        ))}
      </div>
      <div className="table-scroll material-desktop-table">
        <table>
          <thead><tr><th>รหัสวัสดุ</th><th>วัสดุ</th><th>หมวด</th><th>ราคาส่วนกลางในงวดข้อมูล</th><th>หน่วย</th>{hasChange && <th>เปลี่ยนแปลง</th>}</tr></thead>
          <tbody>{rows.map((material) => (
            <tr key={material.id || material.name}>
              <td className="material-code">{material.id || "—"}</td>
              <td><b>{material.name}</b></td>
              <td><span className="tag">{material.category}</span></td>
              <td className="price">{numeric(material.price) === null ? "—" : `฿${formatPrice(material.price)}`}</td>
              <td>{material.unit}</td>
              {hasChange && <td className={material.change === "-" ? "neutral-text" : material.positive ? "up-text" : "down-text"}>{material.change || "—"}</td>}
            </tr>
          ))}</tbody>
        </table>
      </div>
      {!compact && filteredMaterials.length > MATERIAL_PAGE_SIZE && (
        <div className="material-pagination">
          <button type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>ก่อนหน้า</button>
          <span>หน้า {currentPage} / {pageCount} • แสดง {(currentPage - 1) * MATERIAL_PAGE_SIZE + 1}–{Math.min(currentPage * MATERIAL_PAGE_SIZE, filteredMaterials.length)}</span>
          <button type="button" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>ถัดไป</button>
        </div>
      )}
    </div>
  );
}

export function Metric({ title, value, change }) {
  return <article className="metric-card"><span>{title}</span><b>{value}</b>{change !== undefined && <em>{change}</em>}</article>;
}

export function Source({ name, status = "waiting", note = "ข้อมูลรายเดือน" }) {
  const available = ["connected", "ready", "live"].includes(String(status).toLowerCase());
  return (
    <div className={`source-row ${available ? "connected" : "waiting"}`}>
      <span className="source-dot" />
      <div><b>{name}</b><small>{note}</small></div>
      <em>{available ? "มีข้อมูลแล้ว" : <><TriangleAlert size={12} /> รอข้อมูล</>}</em>
    </div>
  );
}

const SHARED_STYLES = `
  .page-header { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; margin-bottom:18px; }
  .page-header-copy { min-width:0; } .page-header h1 { margin:5px 0 5px; font-size:clamp(22px,3vw,32px); line-height:1.15; letter-spacing:-.5px; }
  .page-header p { max-width:760px; margin:0; font-size:12px; line-height:1.6; opacity:.58; } .page-header-action { flex:0 0 auto; }
  .stat-change { display:flex; align-items:center; gap:4px; } .stat-change.neutral { opacity:.55; }
  .driver.waiting { opacity:.62; } .driver.waiting .bar i { width:0 !important; }
  .material-table-tools { display:grid; grid-template-columns:minmax(240px,1fr) minmax(190px,.55fr) auto; align-items:end; gap:10px; margin-bottom:12px; }
  .material-table-tools label > span { display:block; margin-bottom:5px; font-size:9px; font-weight:700; opacity:.55; }
  .material-table-tools input,.material-table-tools select { width:100%; min-height:40px; box-sizing:border-box; padding:0 10px; border:1px solid rgba(148,163,184,.23); border-radius:8px; outline:0; background:transparent; color:inherit; font:inherit; }
  .material-table-tools input:focus,.material-table-tools select:focus { border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.1); }
  .material-table-tools > strong { min-height:40px; display:flex; align-items:center; padding:0 10px; font-size:10px; white-space:nowrap; }
  .material-code { color:#2563eb; font-weight:750; white-space:nowrap; }
  .material-pagination { display:flex; align-items:center; justify-content:center; gap:10px; margin-top:12px; padding-top:11px; border-top:1px solid rgba(148,163,184,.12); }
  .material-pagination span { font-size:9px; opacity:.58; }
  .material-pagination button { min-height:34px; padding:0 12px; border:1px solid rgba(148,163,184,.22); border-radius:8px; background:transparent; color:inherit; cursor:pointer; font-weight:700; }
  .material-pagination button:disabled { cursor:not-allowed; opacity:.35; }
  .material-mobile-list { display:none; } .neutral-text { opacity:.45; }
  .shared-empty { min-height:140px; display:flex; align-items:center; justify-content:center; gap:8px; border:1px dashed rgba(148,163,184,.23); border-radius:10px; font-size:10px; opacity:.5; }
  .source-row > em { display:flex; align-items:center; gap:4px; }
  @media (max-width:620px) {
    .page-header { align-items:stretch; flex-direction:column; gap:12px; margin-bottom:14px; }
    .page-header h1 { font-size:24px; } .page-header p { font-size:10px; } .page-header-action { width:100%; }
    .page-header-action > button,.page-header-action > .outline-btn { width:100%; min-height:44px; justify-content:center; }
    .material-table-tools { grid-template-columns:1fr; } .material-table-tools input,.material-table-tools select { min-height:44px; font-size:16px; } .material-table-tools > strong { min-height:auto; padding:0; }
    .material-desktop-table { display:none; } .material-mobile-list { display:grid; gap:8px; }
    .material-mobile-list article { position:relative; display:grid; grid-template-columns:1fr auto; gap:9px; padding:11px; border:1px solid rgba(148,163,184,.14); border-radius:9px; }
    .material-mobile-list article > div:first-child { display:flex; align-items:center; gap:8px; min-width:0; } .material-mobile-list article > div:first-child > b { min-width:108px; min-height:28px; display:grid; place-items:center; flex:0 0 auto; padding:0 6px; border-radius:7px; background:rgba(59,130,246,.1); color:#2563eb; font-size:8px; }
    .material-mobile-list strong,.material-mobile-list small,.material-mobile-list span { display:block; } .material-mobile-list strong { font-size:10px; } .material-mobile-list small,.material-mobile-list span { margin-top:2px; font-size:7px; opacity:.5; }
    .material-mobile-list article > div:nth-child(2) { text-align:right; } .material-mobile-list article > em { grid-column:2; font-size:9px; font-style:normal; font-weight:700; text-align:right; }
    .material-pagination { flex-wrap:wrap; } .material-pagination span { order:-1; width:100%; text-align:center; }
  }
`;
