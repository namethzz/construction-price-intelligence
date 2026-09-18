import React, { useMemo } from "react";
import { BarChart3, CheckCircle2, Clock3, Database, Info, Link2, TriangleAlert } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { materialCatalog, priceData } from "../data.js";
import { PageHeader } from "../components/Shared.jsx";

const OFFICIAL_PRICE_URL = "https://index.tpso.go.th/construction-material-prices/prices-building-materials";
const TARGET_MONTHS = 120;
const FACTORS = [
  { id: "oil", label: "น้ำมัน/พลังงาน", keys: ["oil", "oilPrice", "oil_price", "diesel", "energyPrice", "energy_price"] },
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

function sourceStatus() {
  const records = [...priceData, materialCatalog[0]].filter(Boolean);
  const sourceText = records.map((item) => [item?.source, item?.sourceName, item?.source_url, item?.sourceUrl].filter(Boolean).join(" ")).join(" ").toLowerCase();
  const mock = records.some((item) => item?.isMock === true || item?.status === "mock" || item?.dataStatus === "mock");
  const official = /tpso|สนค|สำนักงานนโยบายและยุทธศาสตร์การค้า/.test(sourceText) && !mock;
  return official ? { ready: true, label: "มี metadata แหล่งข้อมูลภาครัฐ" } : { ready: false, label: "ยังไม่พบ metadata ยืนยันแหล่งข้อมูล" };
}

function buildQuality() {
  const expected = materialCatalog.length * priceData.length;
  const catalogIds = new Set(materialCatalog.map((material) => material.id));
  const available = priceData.reduce((sum, row) => sum + Object.entries(row?.prices || {}).filter(([id, value]) => catalogIds.has(id) && numeric(value) !== null).length, 0);
  const seen = new Set();
  let duplicates = 0;
  priceData.forEach((row, index) => {
    const key = row?.key ?? row?.month ?? `missing-${index}`;
    if (seen.has(key)) duplicates += 1;
    seen.add(key);
  });
  return { expected, available, missing: Math.max(0, expected - available), completeness: expected ? (available / expected) * 100 : 0, duplicates, uniqueMonths: seen.size };
}

function buildCategoryCoverage() {
  const groups = new Map();
  const availableIds = priceData.map((row) => new Set(Object.entries(row?.prices || {}).filter(([, value]) => numeric(value) !== null).map(([id]) => id)));
  materialCatalog.forEach((material) => {
    const name = material?.category || "ไม่ระบุหมวด";
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(material);
  });
  return [...groups.entries()].map(([name, items]) => {
    const expected = items.length * priceData.length;
    const available = availableIds.reduce((sum, ids) => sum + items.filter((item) => ids.has(item.id)).length, 0);
    return { name, records: available, coverage: expected ? Number(((available / expected) * 100).toFixed(1)) : 0 };
  }).sort((a, b) => a.coverage - b.coverage);
}

export default function DataStats() {
  const quality = useMemo(buildQuality, []);
  const categoryCoverage = useMemo(buildCategoryCoverage, []);
  const source = useMemo(sourceStatus, []);
  const factorCoverage = useMemo(() => FACTORS.map((factor) => {
    const available = priceData.filter((row) => factorValue(row, factor.keys) !== null).length;
    return { ...factor, available, coverage: priceData.length ? (available / priceData.length) * 100 : 0 };
  }), []);
  const availableFactors = factorCoverage.filter((factor) => factor.available > 0);
  const analysisReady = quality.uniqueMonths >= 12 && quality.completeness >= 90 && quality.duplicates === 0;
  const mlReady = quality.uniqueMonths >= TARGET_MONTHS && quality.completeness >= 95 && quality.duplicates === 0 && availableFactors.length > 0 && source.ready;
  const monthProgress = Math.min(100, TARGET_MONTHS ? (quality.uniqueMonths / TARGET_MONTHS) * 100 : 0);
  const firstPeriod = priceData[0]?.month ?? "—";
  const lastPeriod = priceData.at(-1)?.month ?? "—";

  return (
    <>
      <style>{DATA_STYLES}</style>
      <PageHeader eyebrow="THAI เท • DATA QUALITY" title="คุณภาพและความพร้อมของข้อมูล" description="ตรวจความครบถ้วน แหล่งที่มา ระยะเวลาย้อนหลัง และปัจจัยก่อนนำไปวิเคราะห์หรือฝึก ML" />

      <div className="ds-notice"><Info size={18} /><div><strong>ไฟล์ปัจจุบันมีราคาจริง 1 งวด ส่วนเป้าหมายของ ML คือรายเดือนย้อนหลัง 10 ปี ({TARGET_MONTHS} เดือน)</strong><span>ระบบไม่สร้างข้อมูลย้อนหลังจำลอง ความพร้อมสำหรับ ML จึงพิจารณาทั้งจำนวนเดือน ค่าที่หาย เดือนซ้ำ แหล่งข้อมูล และปัจจัยเศรษฐกิจ</span></div></div>

      <div className="ds-stats">
        <DataMetric icon={<Database size={17} />} label="งวดข้อมูลไม่ซ้ำ" value={`${quality.uniqueMonths} เดือน`} note={`${firstPeriod} – ${lastPeriod}`} />
        <DataMetric icon={<BarChart3 size={17} />} label="ความครบถ้วนราคา" value={`${quality.completeness.toFixed(1)}%`} note={`ขาด ${quality.missing.toLocaleString("th-TH")} ค่า`} />
        <DataMetric icon={<Clock3 size={17} />} label="ความคืบหน้า 10 ปี" value={`${monthProgress.toFixed(0)}%`} note={`${quality.uniqueMonths}/${TARGET_MONTHS} เดือน`} />
        <DataMetric icon={mlReady ? <CheckCircle2 size={17} /> : <TriangleAlert size={17} />} label="สถานะ ML" value={mlReady ? "พร้อมเบื้องต้น" : "ยังไม่พร้อม"} note={availableFactors.length ? `${availableFactors.length} ปัจจัยที่มีข้อมูล` : "ยังไม่มีข้อมูลปัจจัย"} />
      </div>

      <div className="ds-readiness-grid">
        <section className={`card ds-readiness ${analysisReady ? "ready" : "waiting"}`}><div><span>DESCRIPTIVE ANALYSIS</span><strong>{analysisReady ? "พร้อมวิเคราะห์ย้อนหลัง" : "ยังต้องปรับข้อมูล"}</strong><p>ต้องมีอย่างน้อย 12 เดือน ความครบถ้วน ≥ 90% และไม่มีเดือนซ้ำ</p></div>{analysisReady ? <CheckCircle2 size={25} /> : <TriangleAlert size={25} />}</section>
        <section className={`card ds-readiness ${mlReady ? "ready" : "waiting"}`}><div><span>MACHINE LEARNING</span><strong>{mlReady ? "ผ่านเกณฑ์เบื้องต้น" : "ยังไม่ผ่านเกณฑ์เบื้องต้น"}</strong><p>เป้าหมาย 120 เดือน ความครบถ้วน ≥ 95% ไม่มีเดือนซ้ำ มีปัจจัย และระบุแหล่งข้อมูล</p></div>{mlReady ? <CheckCircle2 size={25} /> : <TriangleAlert size={25} />}</section>
      </div>

      <section className="card ds-progress-card">
        <div className="ds-card-head"><div><h2>ระยะเวลาข้อมูลย้อนหลัง</h2><p>เปรียบเทียบจำนวนเดือนที่มีอยู่กับเป้าหมาย 10 ปี</p></div><strong>{quality.uniqueMonths}/{TARGET_MONTHS} เดือน</strong></div>
        <div className="ds-progress"><i style={{ width: `${monthProgress}%` }} /></div><div className="ds-progress-labels"><span>0 เดือน</span><span>เป้าหมาย {TARGET_MONTHS} เดือน</span></div>
      </section>

      <div className="ds-main-grid">
        <section className="card ds-chart-card">
          <div className="ds-card-head"><div><h2>ความครบถ้วนแยกตามหมวด</h2><p>เปอร์เซ็นต์ช่องราคาที่มีค่าตัวเลขในแต่ละหมวด</p></div></div>
          {categoryCoverage.length ? <div className="ds-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryCoverage} layout="vertical" margin={{ top: 4, right: 20, left: 25, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} /><YAxis type="category" dataKey="name" width={105} tickLine={false} axisLine={false} /><Tooltip formatter={(value) => [`${value}%`, "ความครบถ้วน"]} /><Bar dataKey="coverage" fill="#2563eb" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></div> : <EmptyData text="ยังไม่มีรายการวัสดุสำหรับคำนวณความครบถ้วน" />}
        </section>

        <aside className="card ds-checklist">
          <h2>รายการที่ต้องผ่านก่อนใช้ ML</h2>
          <CheckRow ok={quality.uniqueMonths >= TARGET_MONTHS} label="ข้อมูลย้อนหลัง 10 ปี" value={`${quality.uniqueMonths}/${TARGET_MONTHS} เดือน`} />
          <CheckRow ok={quality.completeness >= 95} label="ความครบถ้วน ≥ 95%" value={`${quality.completeness.toFixed(1)}%`} />
          <CheckRow ok={quality.duplicates === 0} label="ไม่มีงวดข้อมูลซ้ำ" value={`${quality.duplicates} งวดซ้ำ`} />
          <CheckRow ok={availableFactors.length > 0} label="มีข้อมูลปัจจัยภายนอก" value={`${availableFactors.length}/${FACTORS.length} ปัจจัย`} />
          <CheckRow ok={source.ready} label="ระบุแหล่งข้อมูล" value={source.label} />
        </aside>
      </div>

      <section className="card ds-factors">
        <div className="ds-card-head"><div><h2>ความครอบคลุมของปัจจัย</h2><p>ระบบตรวจจาก fields ใน factors/externalFactors และชื่อคอลัมน์มาตรฐาน</p></div></div>
        <div className="ds-factor-grid">{factorCoverage.map((factor) => <article key={factor.id} className={factor.available ? "available" : "missing"}><div><strong>{factor.label}</strong><span>{factor.available}/{priceData.length} เดือน</span></div><b>{factor.coverage.toFixed(0)}%</b></article>)}</div>
      </section>

      <section className={`ds-source-card ${source.ready ? "ready" : "warning"}`}><Link2 size={19} /><div><strong>{source.label}</strong><span>ราคาส่วนกลางแบบเงินสด ไม่รวม VAT และค่าขนส่ง พร้อมเก็บ source, sourceUrl, retrievedAt และพื้นที่ราคาไว้ตรวจสอบย้อนกลับ</span></div><a href={OFFICIAL_PRICE_URL} target="_blank" rel="noreferrer">เว็บไซต์ราคาวัสดุก่อสร้างภาครัฐ</a></section>
    </>
  );
}

function DataMetric({ icon, label, value, note }) {
  return <article className="card ds-metric"><i>{icon}</i><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function CheckRow({ ok, label, value }) {
  return <div className={`ds-check ${ok ? "ok" : "pending"}`}>{ok ? <CheckCircle2 size={16} /> : <TriangleAlert size={16} />}<span><strong>{label}</strong><small>{value}</small></span></div>;
}

function EmptyData({ text }) {
  return <div className="ds-empty"><Database size={23} /><span>{text}</span></div>;
}

const DATA_STYLES = `
  .ds-notice { display:flex; align-items:flex-start; gap:10px; margin-bottom:14px; padding:12px 14px; border-radius:11px; background:rgba(59,130,246,.07); color:#1d4ed8; font-size:12px; line-height:1.55; } .ds-notice svg { flex:0 0 auto; margin-top:2px; } .ds-notice strong,.ds-notice span { display:block; } .ds-notice span { margin-top:2px; opacity:.78; }
  .ds-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-bottom:14px; } .ds-metric { position:relative; padding:14px !important; } .ds-metric > i { position:absolute; top:12px; right:12px; color:#2563eb; opacity:.68; } .ds-metric > span,.ds-metric small { display:block; font-size:11px; opacity:.65; } .ds-metric strong { display:block; margin:6px 0 4px; font-size:17px; }
  .ds-readiness-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px; } .ds-readiness { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; } .ds-readiness > div { min-width:0; } .ds-readiness span { font-size:10px; font-weight:800; letter-spacing:.08em; opacity:.65; } .ds-readiness strong { display:block; margin:6px 0 4px; font-size:15px; } .ds-readiness p { margin:0; font-size:11px; line-height:1.5; opacity:.66; } .ds-readiness > svg { flex:0 0 auto; } .ds-readiness.ready { border-color:rgba(5,150,105,.25); } .ds-readiness.ready > svg { color:#059669; } .ds-readiness.waiting { border-color:rgba(217,119,6,.22); } .ds-readiness.waiting > svg { color:#d97706; }
  .ds-progress-card { margin-bottom:14px; } .ds-card-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:13px; } .ds-card-head h2 { margin:0; font-size:15px; } .ds-card-head p { margin:4px 0 0; font-size:11px; opacity:.65; } .ds-card-head > strong { font-size:13px; }
  .ds-progress { height:10px; overflow:hidden; border-radius:999px; background:rgba(148,163,184,.13); } .ds-progress i { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,#2563eb,#06b6d4); } .ds-progress-labels { display:flex; justify-content:space-between; margin-top:6px; font-size:10px; opacity:.62; }
  .ds-main-grid { display:grid; grid-template-columns:minmax(0,1.5fr) minmax(280px,.5fr); gap:14px; margin-bottom:14px; } .ds-chart { height:330px; } .ds-checklist h2 { margin:0 0 12px; font-size:15px; } .ds-check { display:flex; align-items:flex-start; gap:8px; padding:9px 0; border-top:1px solid rgba(148,163,184,.12); } .ds-check:first-of-type { border-top:0; } .ds-check svg { flex:0 0 auto; margin-top:1px; } .ds-check.ok svg { color:#059669; } .ds-check.pending svg { color:#d97706; } .ds-check strong,.ds-check small { display:block; } .ds-check strong { font-size:12px; } .ds-check small { margin-top:2px; font-size:10px; line-height:1.35; opacity:.65; }
  .ds-factors { margin-bottom:14px; } .ds-factor-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; } .ds-factor-grid article { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:11px; border:1px solid rgba(148,163,184,.14); border-radius:9px; } .ds-factor-grid article.available { border-color:rgba(5,150,105,.2); background:rgba(5,150,105,.035); } .ds-factor-grid article.missing { opacity:.73; } .ds-factor-grid strong,.ds-factor-grid span { display:block; } .ds-factor-grid strong { font-size:12px; } .ds-factor-grid span { margin-top:2px; font-size:10px; opacity:.65; } .ds-factor-grid b { font-size:13px; }
  .ds-source-card { display:flex; align-items:center; gap:10px; padding:12px 14px; border-radius:11px; font-size:12px; } .ds-source-card.ready { background:rgba(5,150,105,.07); color:#047857; } .ds-source-card.warning { background:rgba(217,119,6,.07); color:#92400e; } .ds-source-card svg { flex:0 0 auto; } .ds-source-card div { min-width:0; flex:1; } .ds-source-card strong,.ds-source-card span { display:block; } .ds-source-card span { margin-top:2px; opacity:.76; } .ds-source-card a { color:inherit; font-weight:750; text-decoration:none; white-space:nowrap; }
  .ds-empty { min-height:180px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px; border:1px dashed rgba(148,163,184,.23); border-radius:10px; font-size:11px; opacity:.65; }
  @media (max-width:900px) { .ds-stats { grid-template-columns:1fr 1fr; } .ds-main-grid { grid-template-columns:1fr; } }
  @media (max-width:620px) { .ds-stats,.ds-readiness-grid { grid-template-columns:1fr 1fr; } .ds-metric { padding:11px !important; } .ds-metric > span,.ds-metric small,.ds-readiness span,.ds-readiness p,.ds-card-head p,.ds-progress-labels,.ds-check small,.ds-factor-grid span,.ds-empty { font-size:12px; } .ds-metric strong { font-size:15px; } .ds-readiness-grid { grid-template-columns:1fr; } .ds-chart { height:300px; margin-left:-10px; } .ds-factor-grid { grid-template-columns:1fr; } .ds-source-card { align-items:flex-start; flex-wrap:wrap; } .ds-source-card a { width:100%; min-height:44px; display:flex; align-items:center; padding-left:29px; white-space:normal; } }
  @media (max-width:370px) { .ds-stats { grid-template-columns:1fr; } }
`;
