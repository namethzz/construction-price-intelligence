import React, { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, Database, MapPin, PackageSearch, RefreshCw, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getMaterialById, priceData, materialCatalog, searchMaterials } from "../data.js";
import { PageHeader } from "../components/Shared.jsx";

const OFFICIAL_PRICE_URL = "https://index.tpso.go.th/construction-material-prices/prices-building-materials";

function numeric(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getPrice(row, materialId) {
  return numeric(row?.prices?.[materialId]);
}

function formatPrice(value) {
  const parsed = numeric(value);
  if (parsed === null) return "—";
  return `฿${parsed.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;
}

function changePercent(current, previous) {
  const latest = numeric(current);
  const base = numeric(previous);
  if (latest === null || base === null || base === 0) return null;
  return ((latest - base) / base) * 100;
}

function datasetSource() {
  const records = [...priceData, materialCatalog[0]].filter(Boolean);
  const sourceText = records.map((item) => [item?.source, item?.sourceName, item?.source_url, item?.sourceUrl].filter(Boolean).join(" ")).join(" ").toLowerCase();
  const markedMock = records.some((item) => item?.isMock === true || item?.status === "mock" || item?.dataStatus === "mock");
  const official = /tpso|สนค|สำนักงานนโยบายและยุทธศาสตร์การค้า/.test(sourceText) && !markedMock;
  return official ? { label: "ข้อมูลภาครัฐที่ระบุแหล่งแล้ว", ready: true } : { label: "ข้อมูลในระบบยังไม่ระบุแหล่งที่ตรวจสอบได้", ready: false };
}

export default function Overview({ navigate }) {
  const defaultMaterial = materialCatalog[0];
  const [selectedMaterialId, setSelectedMaterialId] = useState(defaultMaterial?.id ?? "");
  const [materialQuery, setMaterialQuery] = useState("");
  const [visibleMonths, setVisibleMonths] = useState(12);
  const selected = getMaterialById(selectedMaterialId) || materialCatalog[0];
  const source = useMemo(datasetSource, []);
  const materialOptions = useMemo(() => {
    const matches = searchMaterials(materialQuery, 50);
    return selected && !matches.some((item) => item.id === selected.id) ? [selected, ...matches.slice(0, 49)] : matches;
  }, [materialQuery, selected]);

  const history = useMemo(() => priceData.map((row) => ({ key: row?.key, month: row?.month ?? row?.key, price: getPrice(row, selected?.id) })).filter((row) => row.price !== null), [selected]);
  const chartData = useMemo(() => history.slice(-Math.max(1, Math.round(numeric(visibleMonths) ?? 12))), [history, visibleMonths]);
  const latestPrice = history.at(-1)?.price ?? null;
  const previousPrice = history.at(-2)?.price ?? null;
  const monthlyChange = changePercent(latestPrice, previousPrice);

  const completeness = useMemo(() => {
    const expected = priceData.length * materialCatalog.length;
    const catalogIds = new Set(materialCatalog.map((material) => material.id));
    const available = priceData.reduce((sum, row) => sum + Object.entries(row?.prices || {}).filter(([id, value]) => catalogIds.has(id) && numeric(value) !== null).length, 0);
    return expected ? (available / expected) * 100 : 0;
  }, []);

  const movers = useMemo(() => {
    const latest = priceData.at(-1);
    const previous = priceData.at(-2);
    if (!latest || !previous) return [];
    return materialCatalog.map((material) => {
      const current = getPrice(latest, material.id);
      const before = getPrice(previous, material.id);
      return { ...material, current, change: changePercent(current, before) };
    }).filter((item) => item.current !== null && item.change !== null).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 6);
  }, []);

  const latestPeriod = priceData.at(-1)?.month ?? "ยังไม่มีข้อมูล";
  const firstPeriod = priceData[0]?.month ?? "—";

  return (
    <>
      <style>{OVERVIEW_STYLES}</style>
      <PageHeader
        eyebrow="THAI เท • MARKET OVERVIEW"
        title="ภาพรวมตลาดวัสดุก่อสร้าง"
        description="สรุปราคาล่าสุดใน Dataset แนวโน้ม และความพร้อมของข้อมูลในหน้าเดียว"
        action={<button className="outline-btn" onClick={() => navigate?.("data")}><RefreshCw size={15} /> ตรวจคุณภาพข้อมูล</button>}
      />

      <div className={`ov-source ${source.ready ? "ready" : "warning"}`}>
        <Database size={18} /><div><strong>{source.label}</strong><span>ช่วงข้อมูล {firstPeriod} – {latestPeriod} • กรุงเทพมหานคร (อ้างอิงราคาส่วนกลาง ไม่รวม VAT และค่าขนส่ง)</span></div><a href={OFFICIAL_PRICE_URL} target="_blank" rel="noreferrer">ดูแหล่งราคาภาครัฐ</a>
      </div>

      <div className="ov-stats">
        <OverviewMetric icon={<MapPin size={17} />} label="พื้นที่ราคา" value="ส่วนกลาง" note="อ้างอิงกรุงเทพมหานคร" />
        <OverviewMetric icon={<PackageSearch size={17} />} label={`ราคาล่าสุด • ${selected?.name || "วัสดุ"}`} value={formatPrice(latestPrice)} note={`${latestPeriod} • ${selected?.unit || "—"}`} change={monthlyChange} />
        <OverviewMetric icon={<Database size={17} />} label="รายการวัสดุ" value={`${materialCatalog.length} รายการ`} note={`${priceData.length} เดือนใน Dataset`} />
        <OverviewMetric icon={<BarChart3 size={17} />} label="ความครบถ้วน" value={`${completeness.toFixed(1)}%`} note="ช่องราคาที่มีค่าตัวเลข" />
      </div>

      <div className="ov-main-grid">
        <section className="card ov-chart-card">
          <div className="ov-card-head"><div><h2><TrendingUp size={18} /> แนวโน้มราคา</h2><p>{selected?.name} • {selected?.unit}</p></div><div className="ov-chart-controls"><input className="ov-material-search" value={materialQuery} onChange={(event) => setMaterialQuery(event.target.value)} placeholder="ค้นหาชื่อ รหัส หรือหมวด" /><select value={selected?.id ?? ""} onChange={(event) => setSelectedMaterialId(event.target.value)}>{materialOptions.map((material) => <option key={material.id} value={material.id}>{material.id} — {material.name}</option>)}</select><label><input inputMode="numeric" type="number" min="1" step="1" value={visibleMonths} onChange={(event) => setVisibleMonths(event.target.value)} /><span>เดือน</span></label></div></div>
          {chartData.length ? <div className="ov-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 12, right: 12, left: 2, bottom: 4 }}><defs><linearGradient id="overviewFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.24} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" tickLine={false} axisLine={false} /><YAxis width={64} tickLine={false} axisLine={false} domain={["auto", "auto"]} tickFormatter={(value) => `฿${Number(value).toLocaleString("th-TH", { notation: "compact", maximumFractionDigits: 1 })}`} /><Tooltip formatter={(value) => [`${formatPrice(value)} ${selected?.unit || ""}`, "ราคา"]} /><Area type="monotone" dataKey="price" stroke="#2563eb" fill="url(#overviewFill)" strokeWidth={2.5} /></AreaChart></ResponsiveContainer></div> : <div className="ov-empty">ยังไม่มีประวัติราคาสำหรับวัสดุนี้</div>}
        </section>

        <aside className="card ov-snapshot">
          <span>สถานะล่าสุด</span><strong>{monthlyChange === null ? "ข้อมูลไม่พอ" : monthlyChange > 1 ? "ราคาปรับขึ้น" : monthlyChange < -1 ? "ราคาปรับลง" : "ราคาค่อนข้างคงที่"}</strong>
          <p>เทียบราคาของ {selected?.name || "วัสดุที่เลือก"} ระหว่างสองเดือนล่าสุดใน Dataset เท่านั้น ไม่ใช่ผลพยากรณ์</p>
          <dl><div><dt>เดือนล่าสุด</dt><dd>{latestPeriod}</dd></div><div><dt>ราคาล่าสุด</dt><dd>{formatPrice(latestPrice)}</dd></div><div><dt>เปลี่ยนแปลง</dt><dd>{monthlyChange === null ? "—" : `${monthlyChange >= 0 ? "+" : ""}${monthlyChange.toFixed(1)}%`}</dd></div></dl>
          <button type="button" onClick={() => navigate?.("analysis")}>เปิดหน้าวิเคราะห์</button>
        </aside>
      </div>

      <section className="card ov-movers">
        <div className="ov-card-head"><div><h2>รายการที่เปลี่ยนแปลงมากในเดือนล่าสุด</h2><p>เรียงตามขนาดการเปลี่ยนแปลง ไม่ได้หมายถึงผลกระทบสูงสุดต่อทุกโครงการ</p></div><button className="text-btn" type="button" onClick={() => navigate?.("prices")}>ดูราคาทั้งหมด</button></div>
        {movers.length ? <div className="ov-mover-list">{movers.map((item) => <article key={item.id}><div><b>{item.id}</b><span><strong>{item.name}</strong><small>{item.category} • {item.unit}</small></span></div><strong>{formatPrice(item.current)}</strong><span className={item.change >= 0 ? "up" : "down"}>{item.change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{item.change >= 0 ? "+" : ""}{item.change.toFixed(1)}%</span></article>)}</div> : <div className="ov-empty">ต้องมีราคาอย่างน้อย 2 เดือนจึงจะเปรียบเทียบได้</div>}
      </section>
    </>
  );
}

function OverviewMetric({ icon, label, value, note, change }) {
  return <article className="card ov-metric"><div className="ov-metric-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{change === null || change === undefined ? note : <>{change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{change >= 0 ? "+" : ""}{change.toFixed(1)}% • {note}</>}</small></div></article>;
}

const OVERVIEW_STYLES = `
  .ov-source { display:flex; align-items:center; gap:10px; margin-bottom:14px; padding:11px 13px; border-radius:11px; font-size:10px; } .ov-source.ready { background:rgba(5,150,105,.07); color:#047857; } .ov-source.warning { background:rgba(217,119,6,.07); color:#92400e; }
  .ov-source svg { flex:0 0 auto; } .ov-source div { min-width:0; flex:1; } .ov-source strong,.ov-source span { display:block; } .ov-source span { margin-top:2px; opacity:.65; } .ov-source a { flex:0 0 auto; color:inherit; font-weight:750; text-decoration:none; }
  .ov-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-bottom:14px; } .ov-metric { display:flex; align-items:flex-start; gap:10px; padding:14px !important; }
  .ov-metric-icon { width:32px; height:32px; display:grid; place-items:center; flex:0 0 auto; border-radius:9px; background:rgba(59,130,246,.1); color:#2563eb; } .ov-metric > div:last-child { min-width:0; } .ov-metric span,.ov-metric small { display:block; font-size:9px; opacity:.5; } .ov-metric strong { display:block; margin:5px 0 3px; font-size:16px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .ov-metric small { min-height:14px; } .ov-metric small svg { vertical-align:middle; }
  .ov-main-grid { display:grid; grid-template-columns:minmax(0,1.55fr) minmax(260px,.45fr); gap:14px; margin-bottom:14px; } .ov-card-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:13px; }
  .ov-card-head h2 { display:flex; align-items:center; gap:7px; margin:0; font-size:15px; } .ov-card-head p { margin:4px 0 0; font-size:9px; opacity:.5; }
  .ov-chart-controls { display:flex; gap:7px; } .ov-chart-controls select,.ov-chart-controls label,.ov-chart-controls .ov-material-search { min-height:38px; border:1px solid rgba(148,163,184,.22); border-radius:8px; background:rgba(148,163,184,.035); color:inherit; }
  .ov-chart-controls select { max-width:240px; padding:0 9px; } .ov-chart-controls .ov-material-search { width:190px; padding:0 9px; outline:0; text-align:left; } .ov-chart-controls label { display:flex; align-items:center; overflow:hidden; } .ov-chart-controls label input { width:54px; padding:0 7px; border:0; outline:0; background:transparent; color:inherit; text-align:right; } .ov-chart-controls label span { padding-right:8px; font-size:9px; opacity:.5; }
  .ov-chart { height:300px; } .ov-snapshot { color:#f8fafc; background:linear-gradient(145deg,#17243a,#0f172a); } .ov-snapshot > span { font-size:9px; opacity:.5; } .ov-snapshot > strong { display:block; margin:8px 0 5px; font-size:21px; } .ov-snapshot p { margin:0; font-size:10px; line-height:1.6; opacity:.6; }
  .ov-snapshot dl { display:grid; gap:7px; margin:15px 0; padding:12px 0; border-top:1px solid rgba(255,255,255,.1); border-bottom:1px solid rgba(255,255,255,.1); } .ov-snapshot dl div { display:flex; justify-content:space-between; gap:8px; font-size:9px; } .ov-snapshot dt { opacity:.5; } .ov-snapshot dd { margin:0; font-weight:750; }
  .ov-snapshot button { width:100%; min-height:40px; border:0; border-radius:9px; background:#2563eb; color:#fff; cursor:pointer; font-weight:750; }
  .ov-mover-list { display:grid; gap:7px; } .ov-mover-list article { display:grid; grid-template-columns:minmax(0,1fr) auto 80px; align-items:center; gap:12px; padding:10px 12px; border:1px solid rgba(148,163,184,.13); border-radius:9px; }
  .ov-mover-list article > div { display:flex; align-items:center; gap:9px; min-width:0; } .ov-mover-list article > div > b { min-width:112px; height:29px; display:grid; place-items:center; flex:0 0 auto; padding:0 7px; border-radius:8px; background:rgba(59,130,246,.1); color:#2563eb; font-size:8px; } .ov-mover-list span strong,.ov-mover-list span small { display:block; } .ov-mover-list span strong { font-size:10px; } .ov-mover-list span small { margin-top:2px; font-size:8px; opacity:.45; }
  .ov-mover-list article > span:last-child { display:flex; align-items:center; justify-content:flex-end; gap:3px; font-size:10px; font-weight:750; } .ov-mover-list .up { color:#dc2626; } .ov-mover-list .down { color:#059669; } .ov-empty { min-height:130px; display:grid; place-items:center; border:1px dashed rgba(148,163,184,.23); border-radius:10px; font-size:10px; opacity:.5; }
  @media (max-width:920px) { .ov-stats { grid-template-columns:1fr 1fr; } .ov-main-grid { grid-template-columns:1fr; } }
  @media (max-width:620px) { .ov-source { align-items:flex-start; flex-wrap:wrap; } .ov-source a { width:100%; padding-left:28px; } .ov-stats { grid-template-columns:1fr 1fr; } .ov-metric { padding:11px !important; } .ov-metric strong { font-size:14px; } .ov-card-head { flex-direction:column; } .ov-chart-controls { width:100%; display:grid; grid-template-columns:1fr 95px; } .ov-chart-controls .ov-material-search { width:auto; grid-column:1/-1; } .ov-chart-controls select,.ov-chart-controls input { font-size:16px; } .ov-chart { height:250px; margin-left:-8px; } .ov-mover-list article { grid-template-columns:minmax(0,1fr) auto; } .ov-mover-list article > span:last-child { grid-column:2; } .ov-mover-list article > strong { grid-column:2; grid-row:1; } }
  @media (max-width:380px) { .ov-stats { grid-template-columns:1fr; } }
`;
