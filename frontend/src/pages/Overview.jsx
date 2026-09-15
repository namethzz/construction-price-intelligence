import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  Info,
  Check,
  MapPin,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { priceData, materialCatalog } from "../data.js";
import {
  PageHeader,
  StatCard,
  Driver,
  MaterialTable,
} from "../components/Shared.jsx";

function getMaterialPrice(row, materialId) {
  const value = row?.prices?.[materialId];
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function formatPrice(value) {
  if (!Number.isFinite(value)) return "-";

  return `฿${value.toLocaleString("th-TH", {
    maximumFractionDigits: 2,
  })}`;
}

export default function Overview({ navigate }) {
  const [selectedMaterialId, setSelectedMaterialId] = useState("04");
  const [selectedMonths, setSelectedMonths] = useState(() =>
    priceData.slice(-9).map((row) => row.key)
  );
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);

  const selectedMaterial =
    materialCatalog.find((item) => item.id === selectedMaterialId) ??
    materialCatalog[0];

  const chartData = useMemo(
    () =>
      priceData
        .filter((row) => selectedMonths.includes(row.key))
        .map((row) => ({
          key: row.key,
          month: row.month,
          price: getMaterialPrice(row, selectedMaterialId),
        }))
        .filter((row) => Number.isFinite(row.price)),
    [selectedMaterialId, selectedMonths]
  );

  const latestPrice = chartData.at(-1)?.price ?? null;
  const previousPrice = chartData.at(-2)?.price ?? null;

  const priceChange =
    Number.isFinite(latestPrice) &&
    Number.isFinite(previousPrice) &&
    previousPrice !== 0
      ? ((latestPrice - previousPrice) / previousPrice) * 100
      : null;

  const toggleMonth = (monthKey) => {
    setSelectedMonths((current) =>
      current.includes(monthKey)
        ? current.filter((key) => key !== monthKey)
        : [...current, monthKey]
    );
  };

  const selectLatestMonths = (count) => {
    setSelectedMonths(priceData.slice(-count).map((row) => row.key));
  };

  return (
    <>
      <PageHeader
        eyebrow="BANGKOK PILOT • MARKET OVERVIEW"
        title="ตลาดวัสดุก่อสร้างในกรุงเทพมหานคร"
        description="ภาพรวมราคา แนวโน้ม และสัญญาณของวัสดุก่อสร้าง 21 กลุ่มในพื้นที่กรุงเทพมหานคร"
        action={
          <button className="outline-btn" onClick={() => navigate("data")}>
            <RefreshCw size={15} />
            อัปเดตข้อมูล
          </button>
        }
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 13px",
          marginBottom: 16,
          borderRadius: 12,
          background: "rgba(148,163,184,.08)",
          fontSize: 13,
        }}
      >
        <MapPin size={16} />
        <strong>พื้นที่นำร่อง:</strong>
        <span>กรุงเทพมหานคร</span>
        <span style={{ opacity: 0.55 }}>
          • ระยะปัจจุบันยังไม่รวมปริมณฑลและจังหวัดอื่น
        </span>
      </div>

      <div className="stats-grid">
        <StatCard
          label="พื้นที่วิเคราะห์"
          value="กรุงเทพฯ"
          change="Pilot Area"
          note="พื้นที่นำร่องของระบบ"
          positive
        />

        <StatCard
          label={`ราคาล่าสุด • ${selectedMaterial.name}`}
          value={formatPrice(latestPrice)}
          change={
            priceChange === null
              ? "-"
              : `${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(1)}%`
          }
          note={selectedMaterial.unit}
          positive={priceChange === null ? undefined : priceChange >= 0}
        />

        <StatCard
          label="วัสดุที่ติดตาม"
          value={`${materialCatalog.length} กลุ่ม`}
          change="01–21"
          note="วัสดุก่อสร้างเชิงพาณิชย์"
          positive
        />

        <StatCard
          label="เดือนที่เลือก"
          value={`${selectedMonths.length} เดือน`}
          change={selectedMonths.length > 1 ? "หลายเดือน" : "1 เดือน"}
          note="เลือกช่วงข้อมูลได้"
          positive
        />
      </div>

      <div className="grid-2">
        <section className="card chart-card">
          <div className="card-head">
            <div>
              <h2>แนวโน้มราคา {selectedMaterial.name}</h2>
              <span>
                กรุงเทพมหานคร • {selectedMaterial.unit} • {selectedMonths.length} เดือน
              </span>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                justifyContent: "flex-end",
                position: "relative",
              }}
            >
              <select
                className="select-btn"
                value={selectedMaterialId}
                onChange={(event) => setSelectedMaterialId(event.target.value)}
                aria-label="เลือกวัสดุก่อสร้าง"
              >
                {materialCatalog.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.id} - {material.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="select-btn"
                onClick={() => setMonthMenuOpen((open) => !open)}
              >
                เลือกเดือน ({selectedMonths.length})
                <ChevronDown size={14} />
              </button>

              {monthMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    zIndex: 30,
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: 290,
                    maxHeight: 390,
                    overflow: "auto",
                    padding: 12,
                    borderRadius: 14,
                    background: "var(--card-bg, #fff)",
                    border: "1px solid rgba(148,163,184,.25)",
                    boxShadow: "0 18px 45px rgba(15,23,42,.16)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      marginBottom: 10,
                    }}
                  >
                    <button className="text-btn" type="button" onClick={() => selectLatestMonths(3)}>
                      3 เดือนล่าสุด
                    </button>
                    <button className="text-btn" type="button" onClick={() => selectLatestMonths(6)}>
                      6 เดือนล่าสุด
                    </button>
                    <button className="text-btn" type="button" onClick={() => selectLatestMonths(9)}>
                      9 เดือนล่าสุด
                    </button>
                    <button
                      className="text-btn"
                      type="button"
                      onClick={() => setSelectedMonths(priceData.map((row) => row.key))}
                    >
                      ทั้งหมด
                    </button>
                    <button className="text-btn" type="button" onClick={() => setSelectedMonths([])}>
                      ล้าง
                    </button>
                  </div>

                  {priceData.map((row) => {
                    const checked = selectedMonths.includes(row.key);

                    return (
                      <label
                        key={row.key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          padding: "9px 8px",
                          cursor: "pointer",
                          borderRadius: 9,
                        }}
                      >
                        <span>{row.month}</span>

                        <span
                          style={{
                            width: 20,
                            height: 20,
                            display: "grid",
                            placeItems: "center",
                            borderRadius: 6,
                            border: checked
                              ? "1px solid currentColor"
                              : "1px solid rgba(148,163,184,.5)",
                          }}
                        >
                          {checked && <Check size={14} />}
                        </span>

                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMonth(row.key)}
                          style={{
                            position: "absolute",
                            opacity: 0,
                            pointerEvents: "none",
                          }}
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="chart-wrap">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="materialFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopOpacity=".22" />
                      <stop offset="100%" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} />

                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    domain={["auto", "auto"]}
                    tickFormatter={(value) =>
                      `฿${Number(value).toLocaleString("th-TH", {
                        notation: "compact",
                        maximumFractionDigits: 1,
                      })}`
                    }
                  />

                  <Tooltip
                    formatter={(value) => [
                      `${formatPrice(Number(value))} ${selectedMaterial.unit}`,
                      selectedMaterial.name,
                    ]}
                    labelFormatter={(label) => `เดือน ${label}`}
                  />

                  <Area
                    type="monotone"
                    dataKey="price"
                    strokeWidth={2.5}
                    fill="url(#materialFill)"
                    fillOpacity={1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  minHeight: 280,
                  height: "100%",
                  display: "grid",
                  placeItems: "center",
                  textAlign: "center",
                  padding: 24,
                }}
              >
                <div>
                  <strong>ยังไม่ได้เลือกเดือน</strong>
                  <div style={{ marginTop: 6, opacity: 0.65 }}>
                    กด “เลือกเดือน” แล้วเลือกเดือนที่ต้องการแสดงบนกราฟ
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>Market Drivers</h2>
              <span>ปัจจัยที่ใช้สำหรับวิเคราะห์ราคาในกรุงเทพฯ</span>
            </div>
            <Sparkles size={18} />
          </div>

          <Driver label="ราคาวัตถุดิบ" value={82} />
          <Driver label="ต้นทุนพลังงาน" value={68} />
          <Driver label="ค่าเงินบาท" value={47} />
          <Driver label="Demand ก่อสร้างในกรุงเทพฯ" value={41} />
          <Driver label="ฤดูกาล" value={19} />

          <div className="insight-box">
            <Info size={16} />
            <span>
              ปัจจัยที่แสดงตอนนี้เป็นข้อมูลตัวอย่าง
              และจะเปลี่ยนเป็นผลจาก Model จริงเมื่อเชื่อม Dataset กรุงเทพมหานคร
            </span>
          </div>
        </section>
      </div>

      <section className="card table-card">
        <div className="card-head">
          <div>
            <h2>วัสดุที่ติดตามในกรุงเทพฯ</h2>
            <span>ราคาล่าสุดจาก Dataset</span>
          </div>

          <button className="text-btn" onClick={() => navigate("prices")}>
            ดูทั้งหมด <ArrowUpRight size={15} />
          </button>
        </div>

        <MaterialTable compact />
      </section>
    </>
  );
}
