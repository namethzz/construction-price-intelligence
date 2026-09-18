import React, { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Database, Download, MapPin, PackageSearch, RotateCcw, Search } from "lucide-react";
import { materials, priceData } from "../data.js";
import { PageHeader } from "../components/Shared.jsx";

const OFFICIAL_PRICE_URL = "https://index.tpso.go.th/construction-material-prices/prices-building-materials";

function numeric(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace("%", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPrice(value) {
  const parsed = numeric(value);
  if (parsed === null) return "—";
  return parsed.toLocaleString("th-TH", { minimumFractionDigits: parsed < 100 ? 1 : 0, maximumFractionDigits: 2 });
}

function percentChange(current, previous) {
  const latest = numeric(current);
  const base = numeric(previous);
  if (latest === null || base === null || base === 0) return null;
  return ((latest - base) / base) * 100;
}

function escapeCSV(value) {
  const text = String(value ?? "");
  return /[,"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function sourceLabel(material) {
  return material?.sourceName ?? material?.source_name ?? material?.source ?? "ยังไม่ระบุแหล่งข้อมูลในรายการ";
}

export default function Prices() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const latestRow = priceData.at(-1);
  const previousRow = priceData.at(-2);
  const latestPeriod = latestRow?.month ?? "ไม่ระบุเดือน";

  const normalizedMaterials = useMemo(() => materials.map((material) => {
    const latest = numeric(latestRow?.prices?.[material.id]) ?? numeric(material?.price);
    const previous = numeric(previousRow?.prices?.[material.id]);
    const change = percentChange(latest, previous) ?? numeric(material?.change);
    return { ...material, currentPrice: latest, previousPrice: previous, changePercent: change, sourceLabel: sourceLabel(material) };
  }), [latestRow, previousRow]);

  const categories = useMemo(() => ["all", ...new Set(normalizedMaterials.map((item) => item?.category).filter(Boolean))], [normalizedMaterials]);
  const filteredMaterials = useMemo(() => {
    const search = query.trim().toLowerCase();
    return normalizedMaterials.filter((item) => {
      const matchQuery = !search || [item?.id, item?.name, item?.category].some((value) => String(value ?? "").toLowerCase().includes(search));
      return matchQuery && (selectedCategory === "all" || item?.category === selectedCategory);
    }).sort((a, b) => {
      if (sortBy === "price-high") return (b.currentPrice ?? -Infinity) - (a.currentPrice ?? -Infinity);
      if (sortBy === "price-low") return (a.currentPrice ?? Infinity) - (b.currentPrice ?? Infinity);
      if (sortBy === "change-high") return (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity);
      if (sortBy === "category") return String(a.category ?? "").localeCompare(String(b.category ?? ""), "th");
      return String(a.name ?? "").localeCompare(String(b.name ?? ""), "th");
    });
  }, [normalizedMaterials, query, selectedCategory, sortBy]);

  const summary = useMemo(() => ({
    total: filteredMaterials.length,
    withPrice: filteredMaterials.filter((item) => item.currentPrice !== null).length,
    up: filteredMaterials.filter((item) => item.changePercent !== null && item.changePercent > 0).length,
    down: filteredMaterials.filter((item) => item.changePercent !== null && item.changePercent < 0).length,
  }), [filteredMaterials]);

  const exportCSV = () => {
    const rows = [["รหัส", "วัสดุ", "หมวดหมู่", "พื้นที่", "งวดข้อมูล", "ราคา", "หน่วย", "เปลี่ยนแปลง (%)", "แหล่งข้อมูล"], ...filteredMaterials.map((item) => [item.id, item.name, item.category, "กรุงเทพมหานคร", latestPeriod, item.currentPrice ?? "", item.unit, item.changePercent ?? "", item.sourceLabel])];
    const csv = rows.map((row) => row.map(escapeCSV).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `construction-material-prices-${latestRow?.key || "latest"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => { setQuery(""); setSelectedCategory("all"); setSortBy("name"); };

  return (
    <>
      <style>{PRICE_STYLES}</style>
      <PageHeader eyebrow="THAI เท • PRICE CATALOG" title="ฐานราคาวัสดุก่อสร้าง" description="ค้นหาและเปรียบเทียบราคาล่าสุดที่มีใน Dataset พร้อมระบุงวดและแหล่งข้อมูล" action={<button className="outline-btn" onClick={exportCSV} disabled={!filteredMaterials.length}><Download size={15} /> ดาวน์โหลด CSV</button>} />

      <div className="pr-source"><Database size={18} /><div><strong>งวดข้อมูลล่าสุด: {latestPeriod}</strong><span>ระบบใช้ราคาจาก priceData ก่อน และใช้ราคาในรายการวัสดุเมื่อไม่มีข้อมูลรายเดือน</span></div><a href={OFFICIAL_PRICE_URL} target="_blank" rel="noreferrer">ตรวจสอบราคาภาครัฐ</a></div>

      <div className="pr-stats">
        <PriceMetric label="วัสดุที่แสดง" value={`${summary.total} รายการ`} note={`จากทั้งหมด ${materials.length} รายการ`} />
        <PriceMetric label="มีราคาล่าสุด" value={`${summary.withPrice} รายการ`} note={`${summary.total - summary.withPrice} รายการยังไม่มีราคา`} />
        <PriceMetric label="ราคาเพิ่มขึ้น" value={`${summary.up} รายการ`} note={`ลดลง ${summary.down} รายการ`} />
        <PriceMetric label="พื้นที่ราคา" value="กรุงเทพฯ" note="พื้นที่นำร่อง" icon={<MapPin size={15} />} />
      </div>

      <section className="card pr-filters">
        <label className="pr-search"><span>ค้นหาวัสดุ</span><div><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ชื่อ รหัส หรือหมวดวัสดุ" /></div></label>
        <label><span>หมวดวัสดุ</span><select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}><option value="all">ทุกหมวด</option>{categories.slice(1).map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
        <label><span>เรียงตาม</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="name">ชื่อวัสดุ</option><option value="category">หมวดวัสดุ</option><option value="price-high">ราคาสูง → ต่ำ</option><option value="price-low">ราคาต่ำ → สูง</option><option value="change-high">เปลี่ยนแปลงมาก → น้อย</option></select></label>
        <button type="button" onClick={resetFilters}><RotateCcw size={16} /> ล้างตัวกรอง</button>
      </section>

      <section className="card pr-results">
        <div className="pr-head"><div><h2><PackageSearch size={18} /> รายการราคา</h2><p>พบ {filteredMaterials.length} รายการ • {latestPeriod}</p></div><span>ราคา/หน่วยตาม Dataset</span></div>

        <div className="pr-mobile-list">{filteredMaterials.map((item) => <article key={`mobile-${item.id}`}><div className="pr-item-head"><b>{item.id}</b><div><strong>{item.name}</strong><span>{item.category}</span></div><Change value={item.changePercent} /></div><div className="pr-item-price"><div><span>ราคาล่าสุด</span><strong>{item.currentPrice === null ? "—" : `฿${formatPrice(item.currentPrice)}`}</strong><small>{item.unit}</small></div><div><span>เดือนก่อน</span><strong>{item.previousPrice === null ? "—" : `฿${formatPrice(item.previousPrice)}`}</strong></div></div><div className="pr-item-source"><span>แหล่งข้อมูล</span><strong>{item.sourceLabel}</strong></div></article>)}</div>

        <div className="pr-table-wrap"><table><thead><tr><th>วัสดุ</th><th>หมวด</th><th>ราคา {latestPeriod}</th><th>เดือนก่อน</th><th>เปลี่ยนแปลง</th><th>แหล่งข้อมูล</th></tr></thead><tbody>{filteredMaterials.map((item) => <tr key={item.id}><td><div className="pr-name"><b>{item.id}</b><span><strong>{item.name}</strong><small>{item.unit}</small></span></div></td><td>{item.category}</td><td className="number">{item.currentPrice === null ? "—" : `฿${formatPrice(item.currentPrice)}`}</td><td className="number">{item.previousPrice === null ? "—" : `฿${formatPrice(item.previousPrice)}`}</td><td><Change value={item.changePercent} /></td><td><small>{item.sourceLabel}</small></td></tr>)}</tbody></table></div>
        {!filteredMaterials.length && <div className="pr-empty">ไม่พบวัสดุที่ตรงกับตัวกรอง</div>}
      </section>
    </>
  );
}

function PriceMetric({ label, value, note, icon }) {
  return <article className="card pr-metric">{icon && <i>{icon}</i>}<span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function Change({ value }) {
  if (value === null || value === undefined) return <span className="pr-change neutral">—</span>;
  return <span className={`pr-change ${value >= 0 ? "up" : "down"}`}>{value >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{value >= 0 ? "+" : ""}{value.toFixed(1)}%</span>;
}

const PRICE_STYLES = `
  .pr-source { display:flex; align-items:center; gap:10px; margin-bottom:14px; padding:11px 13px; border-radius:11px; background:rgba(59,130,246,.07); color:#1d4ed8; font-size:10px; } .pr-source svg { flex:0 0 auto; } .pr-source div { min-width:0; flex:1; } .pr-source strong,.pr-source span { display:block; } .pr-source span { margin-top:2px; opacity:.65; } .pr-source a { color:inherit; font-weight:750; text-decoration:none; white-space:nowrap; }
  .pr-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-bottom:14px; } .pr-metric { position:relative; padding:14px !important; } .pr-metric > i { position:absolute; top:12px; right:12px; opacity:.35; } .pr-metric > span,.pr-metric small { display:block; font-size:9px; opacity:.5; } .pr-metric strong { display:block; margin:6px 0 4px; font-size:17px; }
  .pr-filters { display:grid; grid-template-columns:minmax(260px,1.3fr) minmax(180px,.8fr) minmax(180px,.8fr) auto; align-items:end; gap:10px; margin-bottom:14px; } .pr-filters label > span { display:block; margin-bottom:6px; font-size:9px; font-weight:700; opacity:.55; } .pr-filters label > div,.pr-filters select { min-height:44px; border:1px solid rgba(148,163,184,.23); border-radius:9px; background:rgba(148,163,184,.035); color:inherit; }
  .pr-filters label > div { display:flex; align-items:center; gap:8px; padding:0 10px; } .pr-filters input { width:100%; min-width:0; border:0; outline:0; background:transparent; color:inherit; font:inherit; } .pr-filters select { width:100%; padding:0 9px; } .pr-filters button { min-height:44px; display:flex; align-items:center; gap:6px; padding:0 12px; border:1px solid rgba(148,163,184,.23); border-radius:9px; background:transparent; color:inherit; cursor:pointer; font-weight:700; white-space:nowrap; }
  .pr-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:11px; } .pr-head h2 { display:flex; align-items:center; gap:7px; margin:0; font-size:15px; } .pr-head p,.pr-head > span { margin:4px 0 0; font-size:9px; opacity:.5; }
  .pr-table-wrap { overflow-x:auto; } .pr-table-wrap table { width:100%; min-width:850px; border-collapse:collapse; } .pr-table-wrap th { padding:10px 11px; text-align:left; font-size:9px; opacity:.5; background:rgba(148,163,184,.04); } .pr-table-wrap td { padding:11px; border-top:1px solid rgba(148,163,184,.12); font-size:10px; } .pr-table-wrap td.number { font-weight:750; white-space:nowrap; }
  .pr-name { display:flex; align-items:center; gap:9px; min-width:220px; } .pr-name > b { width:30px; height:30px; display:grid; place-items:center; flex:0 0 auto; border-radius:8px; background:rgba(59,130,246,.1); color:#2563eb; font-size:9px; } .pr-name span strong,.pr-name span small { display:block; } .pr-name span small { margin-top:2px; font-size:8px; opacity:.45; }
  .pr-change { display:inline-flex; align-items:center; gap:3px; font-size:10px; font-weight:750; white-space:nowrap; } .pr-change.up { color:#dc2626; } .pr-change.down { color:#059669; } .pr-change.neutral { opacity:.45; }
  .pr-mobile-list { display:none; } .pr-empty { min-height:140px; display:grid; place-items:center; font-size:10px; opacity:.5; }
  @media (max-width:940px) { .pr-stats { grid-template-columns:1fr 1fr; } .pr-filters { grid-template-columns:1fr 1fr; } .pr-search { grid-column:1/-1; } }
  @media (max-width:620px) { .pr-source { align-items:flex-start; flex-wrap:wrap; } .pr-source a { width:100%; padding-left:28px; white-space:normal; } .pr-stats { grid-template-columns:1fr 1fr; } .pr-metric { padding:11px !important; } .pr-metric strong { font-size:14px; } .pr-filters { grid-template-columns:1fr; padding:14px !important; } .pr-search { grid-column:auto; } .pr-filters input,.pr-filters select { font-size:16px; } .pr-filters button { justify-content:center; } .pr-head { flex-direction:column; } .pr-table-wrap { display:none; } .pr-mobile-list { display:grid; gap:9px; } .pr-mobile-list article { padding:12px; border:1px solid rgba(148,163,184,.15); border-radius:10px; } .pr-item-head { display:flex; align-items:flex-start; gap:9px; } .pr-item-head > b { width:31px; height:31px; display:grid; place-items:center; flex:0 0 auto; border-radius:8px; background:rgba(59,130,246,.1); color:#2563eb; font-size:9px; } .pr-item-head > div { min-width:0; flex:1; } .pr-item-head > div strong,.pr-item-head > div span { display:block; } .pr-item-head > div strong { font-size:11px; } .pr-item-head > div span { margin-top:2px; font-size:8px; opacity:.5; } .pr-item-price { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px; } .pr-item-price > div { padding:9px; border-radius:8px; background:rgba(148,163,184,.055); } .pr-item-price span,.pr-item-price small { display:block; font-size:8px; opacity:.5; } .pr-item-price strong { display:block; margin:4px 0 2px; font-size:13px; } .pr-item-source { margin-top:9px; padding-top:8px; border-top:1px solid rgba(148,163,184,.12); } .pr-item-source span,.pr-item-source strong { display:block; } .pr-item-source span { font-size:7px; opacity:.45; } .pr-item-source strong { margin-top:2px; font-size:8px; } }
  @media (max-width:370px) { .pr-stats { grid-template-columns:1fr; } }
`;
