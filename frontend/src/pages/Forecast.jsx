import React, { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarRange, Database, Info, MapPin, Sparkles, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { materials, priceData } from "../data.js";
import MaterialPicker from "../components/MaterialPicker.jsx";
import { PageHeader } from "../components/Shared.jsx";

const OFFICIAL_PRICE_URL = "https://index.tpso.go.th/construction-material-prices/prices-building-materials";

function numeric(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPrice(value) {
  const parsed = numeric(value);
  if (parsed === null) return "—";
  return parsed.toLocaleString("th-TH", { minimumFractionDigits: parsed < 100 ? 1 : 0, maximumFractionDigits: 2 });
}

function getHistoricalPrice(row, materialId) {
  return numeric(row?.prices?.[materialId]);
}

function formatHorizon(months) {
  if (months <= 0) return "ปัจจุบัน";
  const years = Math.floor(months / 12);
  const remaining = months % 12;
  if (!years) return `${remaining} เดือน`;
  if (!remaining) return `${years} ปี`;
  return `${years} ปี ${remaining} เดือน`;
}

function targetMonth(months) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  return date.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
}

function forecastMonthLabel(months) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  return date.toLocaleDateString("th-TH", { month: "short", year: "2-digit" });
}

function normalizeConfidence(value) {
  const parsed = numeric(value);
  if (parsed === null) return null;
  return parsed <= 1 ? parsed * 100 : parsed;
}

function normalizeForecastSeries(material) {
  const raw = material?.forecasts ?? material?.predictions ?? material?.forecast;
  const rows = Array.isArray(raw)
    ? raw.map((entry) => ({ key: null, entry }))
    : raw && typeof raw === "object"
      ? Object.entries(raw).map(([key, entry]) => ({ key, entry }))
      : [];

  return rows.map(({ key, entry }) => {
    const value = typeof entry === "object" ? entry : { price: entry };
    const months = numeric(value?.months ?? value?.horizonMonths ?? value?.horizon_months ?? key);
    const price = numeric(value?.price ?? value?.predictedPrice ?? value?.predicted_price ?? value?.value);
    if (months === null || price === null) return null;
    return {
      months: Math.round(months),
      price,
      low: numeric(value?.low ?? value?.lower ?? value?.lowerBound ?? value?.lower_bound),
      high: numeric(value?.high ?? value?.upper ?? value?.upperBound ?? value?.upper_bound),
      confidence: normalizeConfidence(value?.confidence ?? value?.confidenceScore ?? value?.confidence_score),
      label: value?.month ?? value?.period ?? value?.date ?? forecastMonthLabel(Math.round(months)),
    };
  }).filter(Boolean).sort((a, b) => a.months - b.months);
}

function modelName(material) {
  return material?.model?.name ?? material?.modelName ?? material?.model_name ?? material?.forecastMetadata?.model ?? null;
}

function modelUpdatedAt(material) {
  return material?.model?.updatedAt ?? material?.forecastUpdatedAt ?? material?.forecast_updated_at ?? material?.forecastMetadata?.updatedAt ?? null;
}

export default function Forecast() {
  const defaultMaterial = materials[0];
  const [selectedId, setSelectedId] = useState(defaultMaterial?.id ?? "");
  const [horizonValue, setHorizonValue] = useState(1);
  const [horizonUnit, setHorizonUnit] = useState("year");

  const selected = useMemo(() => materials.find((item) => String(item.id) === String(selectedId)) || materials[0], [selectedId]);
  const horizonMonths = Math.max(0, Math.round((numeric(horizonValue) ?? 0) * (horizonUnit === "year" ? 12 : 1)));
  const forecastSeries = useMemo(() => normalizeForecastSeries(selected), [selected]);

  const history = useMemo(() => priceData.map((row) => ({ key: row?.key, label: row?.month ?? row?.key, price: getHistoricalPrice(row, selected?.id) })).filter((row) => row.price !== null), [selected]);
  const currentPrice = history.at(-1)?.price ?? numeric(selected?.price);
  const forecastPoint = horizonMonths === 0
    ? { months: 0, price: currentPrice, low: currentPrice, high: currentPrice, confidence: 100 }
    : forecastSeries.find((entry) => entry.months === horizonMonths) ?? null;
  const changePercent = forecastPoint && currentPrice ? ((forecastPoint.price - currentPrice) / currentPrice) * 100 : null;

  const chartData = useMemo(() => {
    const historical = history.slice(-12).map((row, index, rows) => ({ period: row.label, actual: row.price, forecast: index === rows.length - 1 ? row.price : null }));
    const future = forecastSeries.filter((entry) => entry.months <= horizonMonths).map((entry) => ({ period: entry.label, actual: null, forecast: entry.price }));
    return [...historical, ...future];
  }, [history, forecastSeries, horizonMonths]);

  const hasForecast = forecastSeries.length > 0;
  const exactForecastAvailable = forecastPoint?.price !== null && forecastPoint?.price !== undefined;
  const updatedAt = modelUpdatedAt(selected);

  return (
    <>
      <style>{FORECAST_STYLES}</style>
      <PageHeader
        eyebrow="THAI เท • ML FORECAST"
        title="พยากรณ์ราคาวัสดุก่อสร้าง"
        description="เลือกวัสดุและกำหนดช่วงเวลาเอง ระบบจะแสดงเฉพาะผลที่ได้รับจากโมเดล ML"
        action={<span className={`fc-status ${hasForecast ? "ready" : "waiting"}`}><Sparkles size={15} />{hasForecast ? "มีผล ML" : "รอเชื่อม ML"}</span>}
      />

      <div className={`fc-notice ${hasForecast ? "ready" : "waiting"}`}>
        {hasForecast ? <Database size={18} /> : <Info size={18} />}
        <div><strong>{hasForecast ? "ผลลัพธ์มาจากข้อมูลพยากรณ์ที่เชื่อมเข้าระบบ" : "หน้านี้ไม่สร้างราคาพยากรณ์จำลอง"}</strong><span>{hasForecast ? "เลือกช่วงเวลาที่มีผลโมเดลเพื่อดูราคาและช่วงความไม่แน่นอน" : "เมื่อ ML ส่งผล predictions/forecasts เข้ามา หน้านี้จะแสดงผลโดยอัตโนมัติ ระหว่างนี้ยังคงดูราคาย้อนหลังได้"}</span></div>
      </div>

      <section className="card fc-controls">
        <div className="fc-section-head"><div className="fc-step">1</div><div><h2>เลือกวัสดุและช่วงเวลา</h2><p>ระยะเวลาไม่จำกัดเฉพาะ 12 เดือน</p></div></div>
        <div className="fc-control-grid">
          <div className="fc-picker-field"><MaterialPicker materials={materials} value={selected?.id ?? ""} onChange={setSelectedId} label="วัสดุที่ต้องการพยากรณ์" /></div>
          <label className="fc-field"><span>พื้นที่วิเคราะห์</span><div className="readonly"><MapPin size={17} /><strong>กรุงเทพมหานคร (อ้างอิงราคาส่วนกลาง)</strong></div></label>
          <div className="fc-field"><span>ต้องการดูราคาในอีก</span><div className="fc-period"><CalendarRange size={17} /><input inputMode="numeric" type="number" min="0" step="1" value={horizonValue} onChange={(event) => setHorizonValue(event.target.value)} /><select value={horizonUnit} onChange={(event) => setHorizonUnit(event.target.value)}><option value="month">เดือน</option><option value="year">ปี</option></select></div></div>
        </div>
        <div className="fc-target"><span>ช่วงที่เลือก</span><strong>{formatHorizon(horizonMonths)}</strong><i /><span>เดือนเป้าหมาย</span><strong>{targetMonth(horizonMonths)}</strong></div>
      </section>

      <section className={`fc-result ${exactForecastAvailable ? "available" : "empty"}`}>
        <div><span className="eyebrow">{selected?.id} • {selected?.name}</span><p>{exactForecastAvailable ? `ราคาคาดการณ์ในอีก ${formatHorizon(horizonMonths)}` : `ยังไม่มีผล ML สำหรับระยะ ${formatHorizon(horizonMonths)}`}</p><div className="fc-big-number">{exactForecastAvailable ? `฿${formatPrice(forecastPoint.price)}` : "รอผลโมเดล"}</div><small>{selected?.unit} • เป้าหมาย {targetMonth(horizonMonths)}</small>{changePercent !== null && <div className={`fc-change ${changePercent >= 0 ? "up" : "down"}`}>{changePercent >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}{changePercent >= 0 ? "+" : ""}{changePercent.toFixed(1)}% จากราคาล่าสุดใน Dataset</div>}</div>
        <div className="fc-model-card"><span>ข้อมูลโมเดล</span><strong>{modelName(selected) || "ยังไม่ระบุชื่อโมเดล"}</strong><dl><div><dt>Confidence</dt><dd>{forecastPoint?.confidence !== null && forecastPoint?.confidence !== undefined ? `${forecastPoint.confidence.toFixed(1)}%` : "ไม่ระบุ"}</dd></div><div><dt>อัปเดตโมเดล</dt><dd>{updatedAt ? new Date(updatedAt).toLocaleDateString("th-TH") : "ไม่ระบุ"}</dd></div></dl></div>
      </section>

      <div className="fc-summary-grid">
        <ForecastSummary label="ราคาล่าสุดใน Dataset" value={currentPrice === null ? "—" : `฿${formatPrice(currentPrice)}`} note={history.at(-1)?.label || "ยังไม่มีประวัติราคา"} />
        <ForecastSummary label={`ราคาอีก ${formatHorizon(horizonMonths)}`} value={exactForecastAvailable ? `฿${formatPrice(forecastPoint.price)}` : "รอ ML"} note={selected?.unit || "—"} />
        <ForecastSummary label="ช่วงต่ำ–สูง" value={forecastPoint?.low !== null && forecastPoint?.low !== undefined && forecastPoint?.high !== null && forecastPoint?.high !== undefined ? `฿${formatPrice(forecastPoint.low)} – ฿${formatPrice(forecastPoint.high)}` : "ไม่ระบุ"} note="แสดงเมื่อโมเดลส่งช่วงความไม่แน่นอน" />
        <ForecastSummary label="ผลที่มีในระบบ" value={`${forecastSeries.length} ช่วงเวลา`} note={hasForecast ? "เลือกช่วงที่ตรงกับผลโมเดล" : "รอเชื่อม predictions"} />
      </div>

      <section className="card fc-chart-card">
        <div className="fc-card-head"><div><h2><TrendingUp size={18} /> ประวัติราคาและผลพยากรณ์</h2><p>{selected?.name} • {selected?.unit}</p></div><a href={OFFICIAL_PRICE_URL} target="_blank" rel="noreferrer">แหล่งราคาภาครัฐ</a></div>
        {chartData.length ? <div className="fc-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 12, right: 14, left: 2, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="period" tickLine={false} axisLine={false} /><YAxis width={64} tickLine={false} axisLine={false} tickFormatter={(value) => `฿${Number(value).toLocaleString("th-TH", { notation: "compact", maximumFractionDigits: 1 })}`} /><Tooltip formatter={(value, name) => [`฿${formatPrice(value)} ${selected?.unit || ""}`, name === "actual" ? "ราคาย้อนหลัง" : name === "forecast" ? "ผล ML" : name]} /><Area type="monotone" dataKey="actual" stroke="#2563eb" fill="rgba(37,99,235,.10)" strokeWidth={2.5} connectNulls /><Area type="monotone" dataKey="forecast" stroke="#d97706" fill="none" strokeDasharray="7 5" strokeWidth={2.5} connectNulls /></AreaChart></ResponsiveContainer></div> : <EmptyState text="ยังไม่มีประวัติราคาสำหรับวัสดุนี้" />}
      </section>

      <section className="card fc-series-card">
        <div className="fc-card-head"><div><h2>ผลพยากรณ์ที่โมเดลส่งมา</h2><p>แสดงตามช่วงเวลาที่มีอยู่จริงใน Dataset</p></div><Sparkles size={18} /></div>
        {forecastSeries.length ? <div className="fc-series-list">{forecastSeries.map((row) => { const percent = currentPrice ? ((row.price - currentPrice) / currentPrice) * 100 : null; return <article key={row.months}><div><span>{formatHorizon(row.months)}</span><small>{row.label}</small></div><strong>฿{formatPrice(row.price)}</strong><div><span>{row.low !== null && row.high !== null ? `฿${formatPrice(row.low)} – ฿${formatPrice(row.high)}` : "ไม่ระบุช่วง"}</span><small>{percent === null ? "—" : `${percent >= 0 ? "+" : ""}${percent.toFixed(1)}%`}</small></div></article>; })}</div> : <EmptyState text="ยังไม่มี predictions/forecasts จาก ML กรุณาเชื่อมผลโมเดลก่อนใช้งานพยากรณ์" />}
      </section>
    </>
  );
}

function ForecastSummary({ label, value, note }) {
  return <article className="card fc-summary"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function EmptyState({ text }) {
  return <div className="fc-empty"><Database size={23} /><strong>รอข้อมูล</strong><span>{text}</span></div>;
}

const FORECAST_STYLES = `
  .fc-status { min-height:38px; display:inline-flex; align-items:center; gap:7px; padding:0 12px; border-radius:999px; font-size:11px; font-weight:750; }
  .fc-status.ready { background:rgba(5,150,105,.1); color:#047857; } .fc-status.waiting { background:rgba(217,119,6,.1); color:#b45309; }
  .fc-notice { display:flex; align-items:flex-start; gap:10px; margin-bottom:16px; padding:12px 14px; border-radius:12px; font-size:11px; line-height:1.55; }
  .fc-notice.ready { background:rgba(5,150,105,.07); color:#047857; } .fc-notice.waiting { background:rgba(217,119,6,.07); color:#92400e; }
  .fc-notice svg { flex:0 0 auto; margin-top:2px; } .fc-notice strong,.fc-notice span { display:block; } .fc-notice span { margin-top:2px; opacity:.82; }
  .fc-controls { margin-bottom:16px; overflow:visible; } .fc-section-head { display:flex; align-items:flex-start; gap:10px; margin-bottom:15px; } .fc-step { width:32px; height:32px; display:grid; place-items:center; flex:0 0 auto; border-radius:9px; background:#2563eb; color:#fff; font-weight:800; }
  .fc-section-head h2 { margin:0 0 3px; font-size:16px; } .fc-section-head p { margin:0; font-size:12px; opacity:.65; }
  .fc-control-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:11px; } .fc-picker-field { grid-column:1/-1; min-width:0; } .fc-field { min-width:0; } .fc-field > span { display:block; margin-bottom:6px; font-size:12px; font-weight:700; opacity:.7; }
  .fc-field > div { min-height:46px; display:flex; align-items:center; gap:8px; padding:0 11px; border:1px solid rgba(148,163,184,.24); border-radius:10px; background:rgba(148,163,184,.035); }
  .fc-field svg { flex:0 0 auto; opacity:.68; } .fc-field input,.fc-field select { width:100%; min-width:0; border:0; outline:0; background:transparent; color:inherit; font:inherit; } .fc-field .readonly { opacity:.8; }
  .fc-field .fc-period input { max-width:130px; font-size:17px; font-weight:800; } .fc-field .fc-period select { width:auto; min-width:78px; padding-left:10px; border-left:1px solid rgba(148,163,184,.2); }
  .fc-target { display:flex; align-items:center; gap:8px; margin-top:12px; padding:10px 12px; border-radius:9px; background:rgba(59,130,246,.06); font-size:12px; } .fc-target span { opacity:.68; } .fc-target i { width:1px; height:15px; margin:0 4px; background:rgba(148,163,184,.25); }
  .fc-result { display:grid; grid-template-columns:minmax(0,1.4fr) minmax(240px,.6fr); gap:20px; align-items:center; margin-bottom:16px; padding:22px; border-radius:16px; color:#f8fafc; background:linear-gradient(145deg,#17243a,#0f172a); }
  .fc-result.empty { background:linear-gradient(145deg,#334155,#1e293b); } .fc-result .eyebrow { opacity:.68; } .fc-result p { margin:9px 0 4px; font-size:12px; opacity:.75; }
  .fc-big-number { font-size:34px; line-height:1.1; font-weight:850; letter-spacing:-1px; } .fc-result small { display:block; margin-top:6px; opacity:.65; }
  .fc-change { display:inline-flex; align-items:center; gap:5px; margin-top:11px; font-size:11px; font-weight:750; } .fc-change.up { color:#f87171; } .fc-change.down { color:#34d399; }
  .fc-model-card { padding:14px; border:1px solid rgba(255,255,255,.11); border-radius:12px; background:rgba(255,255,255,.06); } .fc-model-card > span { display:block; font-size:11px; opacity:.65; } .fc-model-card > strong { display:block; margin:5px 0 10px; font-size:13px; }
  .fc-model-card dl { display:grid; gap:7px; margin:0; } .fc-model-card dl div { display:flex; justify-content:space-between; gap:8px; font-size:11px; } .fc-model-card dt { opacity:.65; } .fc-model-card dd { margin:0; font-weight:700; }
  .fc-summary-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-bottom:16px; } .fc-summary { padding:14px !important; } .fc-summary span,.fc-summary small { display:block; font-size:11px; opacity:.65; } .fc-summary strong { display:block; margin:6px 0 4px; font-size:16px; overflow-wrap:anywhere; }
  .fc-chart-card,.fc-series-card { margin-bottom:16px; } .fc-card-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:13px; } .fc-card-head h2 { display:flex; align-items:center; gap:7px; margin:0; font-size:15px; } .fc-card-head p { margin:4px 0 0; font-size:11px; opacity:.65; } .fc-card-head a { font-size:11px; color:#2563eb; font-weight:700; text-decoration:none; }
  .fc-chart { height:310px; } .fc-series-list { display:grid; gap:7px; } .fc-series-list article { display:grid; grid-template-columns:1fr auto minmax(170px,.7fr); align-items:center; gap:14px; padding:11px 12px; border:1px solid rgba(148,163,184,.13); border-radius:9px; }
  .fc-series-list span,.fc-series-list small { display:block; } .fc-series-list span { font-size:12px; } .fc-series-list small { margin-top:2px; font-size:10px; opacity:.65; } .fc-series-list > article > div:last-child { text-align:right; }
  .fc-empty { min-height:160px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; padding:20px; text-align:center; border:1px dashed rgba(148,163,184,.25); border-radius:11px; } .fc-empty svg { opacity:.58; } .fc-empty strong { font-size:12px; } .fc-empty span { max-width:520px; font-size:11px; line-height:1.55; opacity:.65; }
  @media (max-width:820px) { .fc-result { grid-template-columns:1fr; } .fc-summary-grid { grid-template-columns:1fr 1fr; } }
  @media (max-width:560px) { .fc-status { min-height:36px; } .fc-control-grid { grid-template-columns:1fr; } .fc-controls { padding:15px !important; } .fc-field > div { min-height:46px; } .fc-field input,.fc-field select { font-size:16px; } .fc-target { flex-wrap:wrap; } .fc-target i { display:none; } .fc-target span:nth-of-type(2) { width:100%; margin-top:2px; } .fc-result { gap:15px; padding:17px; } .fc-big-number { font-size:28px; } .fc-summary-grid { grid-template-columns:1fr 1fr; } .fc-summary strong { font-size:14px; } .fc-card-head { align-items:flex-start; flex-direction:column; } .fc-chart { height:255px; margin-left:-8px; } .fc-series-list article { grid-template-columns:1fr auto; gap:8px; } .fc-series-list > article > div:last-child { grid-column:1/-1; display:flex; justify-content:space-between; text-align:left; } }
  @media (max-width:360px) { .fc-summary-grid { grid-template-columns:1fr; } }
`;