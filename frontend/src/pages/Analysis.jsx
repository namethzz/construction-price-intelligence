import React, { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarRange, Database, Info, MapPin, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getMaterialById, materials, priceData } from "../data.js";
import MaterialPicker from "../components/MaterialPicker.jsx";
import { PageHeader } from "../components/Shared.jsx";

const OFFICIAL_PRICE_URL = "https://index.tpso.go.th/construction-material-prices/prices-building-materials";
const FACTORS = [
  { id: "oil", label: "ราคาน้ำมัน/พลังงาน", keys: ["oil", "oilPrice", "oil_price", "diesel", "energyPrice", "energy_price"] },
  { id: "cpi", label: "เงินเฟ้อ (CPI)", keys: ["cpi", "inflation", "inflationRate", "inflation_rate"] },
  { id: "fx", label: "อัตราแลกเปลี่ยน", keys: ["exchangeRate", "exchange_rate", "thbUsd", "thb_usd", "fx"] },
  { id: "ppi", label: "ดัชนีราคาผู้ผลิต", keys: ["ppi", "producerPriceIndex", "producer_price_index"] },
  { id: "interest", label: "อัตราดอกเบี้ย", keys: ["interestRate", "interest_rate", "policyRate", "policy_rate"] },
  { id: "construction", label: "ดัชนีวัสดุก่อสร้าง", keys: ["constructionMaterialIndex", "construction_material_index", "cmi", "materialIndex"] },
];

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
  return parsed.toLocaleString("th-TH", { minimumFractionDigits: parsed < 100 ? 1 : 0, maximumFractionDigits: 2 });
}

function getChange(current, previous) {
  const latest = numeric(current);
  const base = numeric(previous);
  if (latest === null || base === null || base === 0) return null;
  return ((latest - base) / base) * 100;
}

function factorValue(row, keys) {
  const sources = [row?.factors, row?.externalFactors, row?.external_factors, row];
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    for (const key of keys) {
      const value = numeric(source[key]);
      if (value !== null) return value;
    }
  }
  return null;
}

function pearson(pairs) {
  if (pairs.length < 6) return null;
  const meanX = pairs.reduce((sum, pair) => sum + pair.x, 0) / pairs.length;
  const meanY = pairs.reduce((sum, pair) => sum + pair.y, 0) / pairs.length;
  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;
  pairs.forEach(({ x, y }) => {
    const dx = x - meanX;
    const dy = y - meanY;
    numerator += dx * dy;
    denominatorX += dx * dx;
    denominatorY += dy * dy;
  });
  const denominator = Math.sqrt(denominatorX * denominatorY);
  return denominator > 0 ? numerator / denominator : null;
}

function correlationLabel(value) {
  if (value === null) return "ข้อมูลไม่พอ";
  const strength = Math.abs(value) >= 0.7 ? "สูง" : Math.abs(value) >= 0.4 ? "ปานกลาง" : "ต่ำ";
  return `${value >= 0 ? "ทิศทางเดียวกัน" : "สวนทาง"} • ${strength}`;
}

function trendLabel(change) {
  if (change === null) return "ข้อมูลไม่เพียงพอ";
  if (change > 2) return "ราคาเพิ่มขึ้น";
  if (change < -2) return "ราคาลดลง";
  return "ราคาค่อนข้างทรงตัว";
}

export default function Analysis() {
  const defaultMaterial = materials[0];
  const [selectedId, setSelectedId] = useState(defaultMaterial?.id ?? "");
  const [rangeValue, setRangeValue] = useState(1);
  const [rangeUnit, setRangeUnit] = useState("year");
  const selected = useMemo(() => getMaterialById(selectedId) || materials[0], [selectedId]);

  const fullHistory = useMemo(() => priceData.map((row) => ({ key: row?.key, month: row?.month ?? row?.key, price: getPrice(row, selected?.id), source: row })).filter((row) => row.price !== null), [selected]);
  const requestedMonths = Math.max(1, Math.round((numeric(rangeValue) ?? 1) * (rangeUnit === "year" ? 12 : 1)));
  const visibleHistory = useMemo(() => fullHistory.slice(-requestedMonths), [fullHistory, requestedMonths]);
  const selectedRangeLabel = `${numeric(rangeValue) ?? 1} ${rangeUnit === "year" ? "ปี" : "เดือน"}`;
  const latestPrice = fullHistory.at(-1)?.price ?? numeric(selected?.price);
  const change1 = getChange(latestPrice, fullHistory.at(-2)?.price);
  const change3 = getChange(latestPrice, fullHistory.at(-4)?.price);
  const change6 = getChange(latestPrice, fullHistory.at(-7)?.price);
  const change12 = getChange(latestPrice, fullHistory.at(-13)?.price ?? (fullHistory.length >= 2 ? fullHistory[0]?.price : null));

  const correlations = useMemo(() => FACTORS.map((factor) => {
    const pairs = priceData.map((row) => ({ x: factorValue(row, factor.keys), y: getPrice(row, selected?.id) })).filter((pair) => pair.x !== null && pair.y !== null);
    const correlation = pearson(pairs);
    const latest = [...priceData].reverse().map((row) => factorValue(row, factor.keys)).find((value) => value !== null) ?? null;
    return { ...factor, correlation, latest, samples: pairs.length };
  }).filter((factor) => factor.samples > 0).sort((a, b) => Math.abs(b.correlation ?? 0) - Math.abs(a.correlation ?? 0)), [selected]);

  const hasFactorData = correlations.length > 0;
  const overallTrend = trendLabel(change3 ?? change1);

  return (
    <>
      <style>{ANALYSIS_STYLES}</style>
      <PageHeader eyebrow="THAI เท • PRICE ANALYSIS" title="วิเคราะห์การเปลี่ยนแปลงราคา" description="ดูแนวโน้มย้อนหลังและความสัมพันธ์กับปัจจัยเศรษฐกิจจากข้อมูลที่มีจริง" />

      <div className="an-notice"><Info size={18} /><div><strong>หน้านี้วิเคราะห์ข้อมูลย้อนหลัง ไม่ใช่การพยากรณ์</strong><span>ค่าความสัมพันธ์ช่วยบอกว่าตัวแปรเคลื่อนไหวร่วมกันเพียงใด แต่ไม่ยืนยันว่าเป็นสาเหตุของการเปลี่ยนราคา</span></div></div>

      <section className="card an-controls">
        <div className="an-control-grid">
          <div className="an-picker-field"><MaterialPicker materials={materials} value={selected?.id ?? ""} onChange={setSelectedId} label="วัสดุที่ต้องการวิเคราะห์" /></div>
          <label className="an-range-field"><span>ดูข้อมูลย้อนหลัง</span><div className="an-simple-range"><CalendarRange size={17} /><input inputMode="numeric" type="number" min="1" step="1" value={rangeValue} onChange={(event) => setRangeValue(event.target.value)} aria-label="จำนวนข้อมูลย้อนหลัง" /><select value={rangeUnit} onChange={(event) => setRangeUnit(event.target.value)} aria-label="หน่วยช่วงย้อนหลัง"><option value="month">เดือน</option><option value="year">ปี</option></select></div><small>{requestedMonths > fullHistory.length ? `มีข้อมูลจริง ${fullHistory.length.toLocaleString("th-TH")} เดือน` : `แสดง ${visibleHistory.length.toLocaleString("th-TH")} เดือน`}</small></label>
          <label className="an-location-field"><span>พื้นที่อ้างอิง</span><div className="readonly"><MapPin size={18} /><span><strong>กรุงเทพมหานคร</strong><small>อ้างอิงราคาส่วนกลาง</small></span></div></label>
        </div>
      </section>

      <div className="an-stats">
        <Metric label="ราคาล่าสุดใน Dataset" value={latestPrice === null ? "—" : `฿${formatPrice(latestPrice)}`} note={`${fullHistory.at(-1)?.month || "ไม่ระบุเดือน"} • ${selected?.unit || "—"}`} />
        <ChangeMetric label="เปลี่ยนแปลง 1 เดือน" value={change1} />
        <ChangeMetric label="เปลี่ยนแปลง 3 เดือน" value={change3} />
        <ChangeMetric label="เปลี่ยนแปลง 12 เดือน" value={change12} />
      </div>

      <div className="an-main-grid">
        <section className="card an-chart-card">
          <div className="an-card-head"><div><h2><TrendingUp size={18} /> แนวโน้มราคาย้อนหลัง</h2><p>{selected?.name} • {selectedRangeLabel} • แสดงจริง {visibleHistory.length.toLocaleString("th-TH")} เดือน</p></div><a href={OFFICIAL_PRICE_URL} target="_blank" rel="noreferrer">แหล่งราคาภาครัฐ</a></div>
          {visibleHistory.length ? <div className="an-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={visibleHistory} margin={{ top: 12, right: 12, left: 2, bottom: 4 }}><defs><linearGradient id="analysisFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.24} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" tickLine={false} axisLine={false} minTickGap={28} interval="preserveStartEnd" tick={{ fontSize: 11 }} /><YAxis width={64} tickLine={false} axisLine={false} domain={["auto", "auto"]} tickFormatter={(value) => `฿${Number(value).toLocaleString("th-TH", { notation: "compact", maximumFractionDigits: 1 })}`} /><Tooltip formatter={(value) => [`฿${formatPrice(value)} ${selected?.unit || ""}`, "ราคา"]} /><Area type="monotone" dataKey="price" stroke="#2563eb" fill="url(#analysisFill)" strokeWidth={2.5} /></AreaChart></ResponsiveContainer></div> : <EmptyFactors text="ยังไม่มีประวัติราคาสำหรับวัสดุนี้" />}
        </section>

        <aside className="card an-reading">
          <span>สรุปจากข้อมูลย้อนหลัง</span><strong>{overallTrend}</strong><p>ในช่วง 3 เดือนล่าสุด {change3 === null ? "ยังมีข้อมูลไม่พอสำหรับสรุป" : `ราคาเปลี่ยนแปลง ${change3 >= 0 ? "+" : ""}${change3.toFixed(1)}%`} การตัดสินใจจัดซื้อควรดูร่วมกับราคาหน้างานและผลพยากรณ์ ML</p>
          <dl><div><dt>6 เดือน</dt><dd>{change6 === null ? "—" : `${change6 >= 0 ? "+" : ""}${change6.toFixed(1)}%`}</dd></div><div><dt>ข้อมูลราคา</dt><dd>{fullHistory.length} เดือน</dd></div><div><dt>ข้อมูลปัจจัย</dt><dd>{hasFactorData ? `${correlations.length} ตัวแปร` : "ยังไม่มี"}</dd></div></dl>
        </aside>
      </div>

      <section className="card an-factors">
        <div className="an-card-head"><div><h2><Database size={18} /> ปัจจัยที่อาจสัมพันธ์กับราคา</h2><p>คำนวณ Pearson correlation จากเดือนที่มีข้อมูลทั้งราคาและปัจจัยอย่างน้อย 6 จุด</p></div></div>
        {hasFactorData ? <div className="an-factor-list">{correlations.map((factor) => <article key={factor.id}><div><strong>{factor.label}</strong><small>{factor.samples} เดือนที่จับคู่ข้อมูลได้ • ค่าล่าสุด {factor.latest ?? "—"}</small></div><div className={`an-correlation ${(factor.correlation ?? 0) >= 0 ? "positive" : "negative"}`}><b>{factor.correlation === null ? "—" : factor.correlation.toFixed(2)}</b><span>{correlationLabel(factor.correlation)}</span></div></article>)}</div> : <EmptyFactors text="ยังไม่พบข้อมูล Oil / CPI / FX / PPI หรือปัจจัยอื่นใน priceData เมื่อเชื่อมข้อมูลแล้วระบบจะคำนวณความสัมพันธ์โดยอัตโนมัติ" />}
      </section>
    </>
  );
}

function Metric({ label, value, note }) {
  return <article className="card an-metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function ChangeMetric({ label, value }) {
  const positive = value !== null && value >= 0;
  return <article className="card an-metric"><span>{label}</span><strong>{value === null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`}</strong><small className={value === null ? "" : positive ? "up" : "down"}>{value === null ? "ข้อมูลไม่เพียงพอ" : <>{positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{positive ? "เพิ่มขึ้น" : "ลดลง"}</>}</small></article>;
}

function EmptyFactors({ text }) {
  return <div className="an-empty"><Database size={23} /><strong>รอข้อมูล</strong><span>{text}</span></div>;
}

const ANALYSIS_STYLES = `
  .an-notice { display:flex; align-items:flex-start; gap:10px; margin-bottom:16px; padding:12px 14px; border-radius:12px; background:rgba(59,130,246,.07); color:#1d4ed8; font-size:12px; line-height:1.55; }
  .an-notice svg { flex:0 0 auto; margin-top:2px; } .an-notice strong,.an-notice span { display:block; } .an-notice span { margin-top:2px; opacity:.8; }
  .an-controls { margin-bottom:14px; padding:16px !important; overflow:visible; } .an-control-grid { display:grid; grid-template-columns:minmax(0,1.55fr) minmax(210px,.55fr) minmax(290px,.7fr); align-items:stretch; gap:12px; } .an-picker-field { min-width:0; }
  .an-picker-field .mp-trigger { min-height:96px; padding:13px 15px; border-radius:14px; box-shadow:none; }
  .an-range-field,.an-location-field { min-width:0; min-height:96px; display:grid; align-content:center; padding:12px 14px; border:1px solid rgba(148,163,184,.22); border-radius:14px; background:linear-gradient(180deg,rgba(255,255,255,.94),rgba(248,250,252,.72)); }
  .an-control-grid > label > span { display:block; margin-bottom:7px; font-size:11px; font-weight:750; opacity:.65; }
  .an-simple-range { min-height:36px; display:grid; grid-template-columns:auto minmax(42px,1fr) auto; align-items:center; gap:7px; }
  .an-simple-range svg { flex:0 0 auto; color:#2563eb; opacity:.72; } .an-simple-range input { width:100%; min-width:0; padding:0; border:0; outline:0; background:transparent; color:inherit; font:inherit; font-size:19px; font-weight:850; text-align:center; }
  .an-simple-range select { width:auto; min-width:70px; padding:5px 4px 5px 9px; border:0; border-left:1px solid rgba(148,163,184,.22); outline:0; background:transparent; color:inherit; font:inherit; font-size:13px; font-weight:750; cursor:pointer; }
  .an-range-field small { display:block; min-height:14px; margin-top:2px; color:#64748b; font-size:10px; font-weight:500; text-align:center; }
  .an-location-field > div { display:flex; align-items:center; gap:9px; min-width:0; } .an-location-field > div > svg { flex:0 0 auto; color:#64748b; } .an-location-field > div > span { min-width:0; }
  .an-location-field strong,.an-location-field small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .an-location-field strong { font-size:14px; } .an-location-field small { margin-top:2px; color:#64748b; font-size:11px; font-weight:500; }
  .an-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-bottom:14px; }
  .an-metric { padding:14px !important; } .an-metric > span,.an-metric small { display:block; font-size:11px; opacity:.65; } .an-metric strong { display:block; margin:6px 0 4px; font-size:18px; } .an-metric small { min-height:17px; } .an-metric small.up,.an-metric small.down { display:flex; align-items:center; gap:3px; opacity:1; } .an-metric small.up { color:#dc2626; } .an-metric small.down { color:#059669; }
  .an-main-grid { display:grid; grid-template-columns:minmax(0,1.55fr) minmax(260px,.45fr); gap:14px; margin-bottom:14px; } .an-card-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:13px; }
  .an-card-head h2 { display:flex; align-items:center; gap:7px; margin:0; font-size:15px; } .an-card-head p { margin:4px 0 0; font-size:11px; opacity:.65; } .an-card-head a { color:#2563eb; font-size:11px; font-weight:700; text-decoration:none; }
  .an-chart { height:300px; } .an-reading { color:#f8fafc; background:linear-gradient(145deg,#17243a,#0f172a); } .an-reading > span { font-size:11px; opacity:.65; } .an-reading > strong { display:block; margin:8px 0 5px; font-size:20px; } .an-reading > p { margin:0; font-size:12px; line-height:1.6; opacity:.73; }
  .an-reading dl { display:grid; gap:7px; margin:16px 0 0; padding-top:13px; border-top:1px solid rgba(255,255,255,.1); } .an-reading dl div { display:flex; justify-content:space-between; gap:8px; font-size:11px; } .an-reading dt { opacity:.65; } .an-reading dd { margin:0; font-weight:750; }
  .an-factor-list { display:grid; gap:8px; } .an-factor-list article { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:11px 12px; border:1px solid rgba(148,163,184,.14); border-radius:9px; } .an-factor-list strong,.an-factor-list small { display:block; } .an-factor-list strong { font-size:11px; } .an-factor-list small { margin-top:3px; font-size:10px; opacity:.63; }
  .an-correlation { min-width:145px; text-align:right; } .an-correlation b,.an-correlation span { display:block; } .an-correlation b { font-size:15px; } .an-correlation span { margin-top:2px; font-size:10px; opacity:.68; }
  .an-empty { min-height:150px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; padding:20px; text-align:center; border:1px dashed rgba(148,163,184,.24); border-radius:10px; } .an-empty svg { opacity:.58; } .an-empty strong { font-size:12px; } .an-empty span { max-width:560px; font-size:11px; line-height:1.55; opacity:.65; }
  @media (max-width:1180px) { .an-control-grid { grid-template-columns:minmax(0,1fr) minmax(0,1fr); } .an-picker-field { grid-column:1/-1; } .an-picker-field .mp-trigger { min-height:82px; } .an-range-field,.an-location-field { min-height:82px; } .an-stats { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  @media (max-width:900px) { .an-main-grid { grid-template-columns:1fr; } }
  @media (max-width:700px) { .an-controls { padding:12px !important; } .an-control-grid { grid-template-columns:1fr; gap:10px; } .an-picker-field { grid-column:auto; } .an-picker-field .mp-trigger,.an-range-field,.an-location-field { min-height:78px; } }
  @media (max-width:620px) { .an-control-grid > label > span,.an-control-grid i,.an-metric > span,.an-metric small,.an-card-head p,.an-card-head a,.an-reading dl div,.an-factor-list strong,.an-factor-list small,.an-correlation span,.an-empty span { font-size:12px; } .an-simple-range input { font-size:20px; } .an-simple-range select { min-width:82px; font-size:16px; } .an-range-field small,.an-location-field small { font-size:11px; } .an-location-field strong { font-size:14px; } .an-stats { grid-template-columns:1fr 1fr; } .an-metric strong { font-size:15px; } .an-card-head { flex-direction:column; } .an-card-head a { min-height:44px; display:flex; align-items:center; } .an-chart { height:250px; margin-left:-8px; } .an-factor-list article { align-items:flex-start; flex-direction:column; } .an-correlation { min-width:0; text-align:left; } }
  @media (max-width:360px) { .an-stats { grid-template-columns:1fr; } }
`;
