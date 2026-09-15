import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  CalendarRange,
  MapPin,
  PackageSearch,
  Sparkles,
  Gauge,
  Info,
  TrendingUp,
  ChevronDown,
  Search,
  Check,
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

import { materials } from "../data.js";
import { PageHeader } from "../components/Shared.jsx";

const FORECAST_HORIZONS = [
  { months: 1, label: "1 เดือน", description: "ระยะสั้น" },
  { months: 3, label: "3 เดือน", description: "แนะนำ" },
  { months: 6, label: "6 เดือน", description: "ระยะกลาง" },
  { months: 12, label: "12 เดือน", description: "ระยะยาว" },
];

const THAI_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

function formatPrice(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }

  return Number(value).toLocaleString("th-TH", {
    minimumFractionDigits: Number(value) < 100 ? 1 : 0,
    maximumFractionDigits: 2,
  });
}

function roundPrice(value) {
  if (value >= 10000) return Math.round(value / 10) * 10;
  if (value >= 1000) return Math.round(value);
  if (value >= 100) return Math.round(value);
  return Math.round(value * 10) / 10;
}

function getMonthLabel(offset) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);

  const month = THAI_MONTHS[date.getMonth()];
  const thaiYear = (date.getFullYear() + 543)
    .toString()
    .slice(-2);

  return `${month} ${thaiYear}`;
}

function generateForecast(material, currentPrice, months) {
  if (!material) return [];

  const materialNumber = Number(material.id || 1);

  const monthlyRate =
    0.0045 +
    (materialNumber % 7) * 0.0011;

  const data = [];

  for (let offset = -2; offset <= 0; offset++) {
    const actual =
      currentPrice /
      Math.pow(1 + monthlyRate, Math.abs(offset));

    data.push({
      index: offset,
      month: getMonthLabel(offset),
      actual: roundPrice(actual),
      forecast:
        offset === 0
          ? roundPrice(currentPrice)
          : null,
      low: null,
      high: null,
    });
  }

  for (let i = 1; i <= months; i++) {
    const forecast =
      currentPrice *
      Math.pow(1 + monthlyRate, i);

    const uncertainty =
      0.012 +
      i * 0.0028;

    data.push({
      index: i,
      month: getMonthLabel(i),
      actual: null,
      forecast: roundPrice(forecast),
      low: roundPrice(
        forecast *
          (1 - uncertainty)
      ),
      high: roundPrice(
        forecast *
          (1 + uncertainty)
      ),
    });
  }

  return data;
}

export default function Forecast() {
  const defaultMaterial =
    materials.find((material) => material.id === "04") ||
    materials[0];

  const [selectedId, setSelectedId] = useState(defaultMaterial?.id);
  const [forecastMonths, setForecastMonths] = useState(3);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");
  const [lastRun, setLastRun] = useState(new Date());

  const materialDropdownRef = useRef(null);

  const selected = useMemo(() => {
    return (
      materials.find((material) => material.id === selectedId) ||
      materials[0]
    );
  }, [selectedId]);

  const filteredMaterials = useMemo(() => {
    const query = materialSearch.trim().toLowerCase();

    if (!query) return materials;

    return materials.filter((material) => {
      const id = String(material.id || "").toLowerCase();
      const name = String(material.name || "").toLowerCase();
      const category = String(material.category || "").toLowerCase();

      return (
        id.includes(query) ||
        name.includes(query) ||
        category.includes(query)
      );
    });
  }, [materialSearch]);

  const currentPrice = useMemo(() => {
    return roundPrice(Number(selected?.price || 0));
  }, [selected]);

  const chartData = useMemo(() => {
    return generateForecast(
      selected,
      currentPrice,
      forecastMonths
    );
  }, [
    selected,
    currentPrice,
    forecastMonths,
    lastRun,
  ]);

  const futureData = chartData.filter((row) => row.index > 0);
  const finalForecast = futureData.at(-1);

  const forecastPrice =
    finalForecast?.forecast ||
    currentPrice;

  const changePercent =
    currentPrice > 0
      ? ((forecastPrice - currentPrice) / currentPrice) * 100
      : 0;

  const directionUp = changePercent >= 0;

  const confidence =
    78 +
    (Number(selected?.id || 1) % 9);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        materialDropdownRef.current &&
        !materialDropdownRef.current.contains(event.target)
      ) {
        setMaterialOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMaterialOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const runForecast = () => {
    setLastRun(new Date());
  };

  return (
    <>
      <PageHeader
        eyebrow="BANGKOK PILOT • MACHINE LEARNING"
        title="พยากรณ์ราคาวัสดุก่อสร้างในกรุงเทพมหานคร"
        description="เลือกวัสดุและช่วงเวลาที่ต้องการ เพื่อดูแนวโน้มราคาในอนาคตสำหรับพื้นที่กรุงเทพมหานคร"
        action={
          <button className="outline-btn" onClick={runForecast}>
            <RefreshCw size={15} />
            คำนวณใหม่
          </button>
        }
      />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 9,
          padding: "11px 14px",
          marginBottom: 16,
          borderRadius: 12,
          background: "rgba(148,163,184,.08)",
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        <Info
          size={16}
          style={{
            marginTop: 2,
            flexShrink: 0,
          }}
        />

        <span>
          Prototype Forecast สำหรับกรุงเทพมหานครเท่านั้น —
          รายการวัสดุและราคาปัจจุบันมาจาก data.js
          ส่วนค่าพยากรณ์ยังเป็นข้อมูลจำลองก่อนเชื่อมโมเดล Machine Learning จริง
        </span>
      </div>

      <section
        className="card"
        style={{
          marginBottom: 18,
          overflow: "visible",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <PackageSearch size={19} />
              <h2 style={{ margin: 0 }}>
                ตั้งค่าการพยากรณ์
              </h2>
            </div>

            <div
              style={{
                marginTop: 5,
                fontSize: 13,
                opacity: 0.58,
              }}
            >
              เลือกวัสดุที่ต้องการวิเคราะห์ในกรุงเทพมหานคร
            </div>
          </div>

          <span
            style={{
              fontSize: 11,
              opacity: 0.5,
              fontWeight: 600,
            }}
          >
            STEP 1 OF 3
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(300px, 1.5fr) minmax(260px, 1fr)",
            gap: 14,
          }}
        >
          <div
            ref={materialDropdownRef}
            style={{
              position: "relative",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                opacity: 0.58,
                marginBottom: 7,
              }}
            >
              วัสดุที่ต้องการพยากรณ์
            </div>

            <button
              type="button"
              onClick={() => setMaterialOpen((open) => !open)}
              style={{
                width: "100%",
                border: materialOpen
                  ? "1.5px solid currentColor"
                  : "1px solid rgba(148,163,184,.23)",
                borderRadius: 14,
                background: "var(--card-bg, #fff)",
                color: "inherit",
                padding: 0,
                cursor: "pointer",
                overflow: "hidden",
                textAlign: "left",
                transition: "all .18s ease",
                boxShadow: materialOpen
                  ? "0 0 0 3px rgba(148,163,184,.08)"
                  : "none",
              }}
            >
              <div
                style={{
                  padding: "14px 15px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    background: "rgba(148,163,184,.12)",
                  }}
                >
                  <PackageSearch size={20} />
                </div>

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 6px",
                        borderRadius: 5,
                        background: "rgba(148,163,184,.12)",
                      }}
                    >
                      {selected?.id}
                    </span>

                    <strong
                      style={{
                        fontSize: 14,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {selected?.name}
                    </strong>
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      opacity: 0.52,
                    }}
                  >
                    {selected?.category} • {selected?.unit}
                  </div>
                </div>

                <ChevronDown
                  size={17}
                  style={{
                    flexShrink: 0,
                    transition: "transform .18s",
                    transform: materialOpen
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                  }}
                />
              </div>
            </button>

            {materialOpen && (
              <div
                style={{
                  position: "absolute",
                  zIndex: 200,
                  top: "calc(100% + 7px)",
                  left: 0,
                  right: 0,
                  border: "1px solid rgba(148,163,184,.18)",
                  borderRadius: 14,
                  background: "var(--card-bg, #fff)",
                  boxShadow: "0 20px 55px rgba(15,23,42,.16)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: 10,
                    borderBottom: "1px solid rgba(148,163,184,.12)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "9px 10px",
                      borderRadius: 9,
                      background: "rgba(148,163,184,.08)",
                    }}
                  >
                    <Search size={15} />

                    <input
                      autoFocus
                      value={materialSearch}
                      onChange={(event) =>
                        setMaterialSearch(event.target.value)
                      }
                      placeholder="ค้นหารหัส ชื่อ หรือหมวดวัสดุ..."
                      style={{
                        width: "100%",
                        border: 0,
                        outline: 0,
                        background: "transparent",
                        color: "inherit",
                        font: "inherit",
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    padding: "8px 11px",
                    fontSize: 10,
                    opacity: 0.45,
                  }}
                >
                  พบ {filteredMaterials.length} รายการ
                </div>

                <div
                  style={{
                    maxHeight: 340,
                    overflowY: "auto",
                    padding: "0 6px 6px",
                  }}
                >
                  {filteredMaterials.map((material) => {
                    const active =
                      material.id === selected?.id;

                    return (
                      <button
                        key={material.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(material.id);
                          setMaterialOpen(false);
                          setMaterialSearch("");
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 9px",
                          border: 0,
                          borderRadius: 9,
                          background: active
                            ? "rgba(148,163,184,.13)"
                            : "transparent",
                          color: "inherit",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            display: "grid",
                            placeItems: "center",
                            flexShrink: 0,
                            fontSize: 10,
                            fontWeight: 700,
                            background: "rgba(148,163,184,.11)",
                          }}
                        >
                          {material.id}
                        </div>

                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                            }}
                          >
                            {material.name}
                          </div>

                          <div
                            style={{
                              marginTop: 2,
                              fontSize: 10,
                              opacity: 0.48,
                            }}
                          >
                            {material.category} • {material.unit}
                          </div>
                        </div>

                        {active && <Check size={16} />}
                      </button>
                    );
                  })}

                  {filteredMaterials.length === 0 && (
                    <div
                      style={{
                        padding: "28px 15px",
                        textAlign: "center",
                        opacity: 0.5,
                        fontSize: 12,
                      }}
                    >
                      ไม่พบวัสดุที่ค้นหา
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                opacity: 0.58,
                marginBottom: 7,
              }}
            >
              พื้นที่วิเคราะห์
            </div>

            <div
              style={{
                minHeight: 70,
                padding: "14px 15px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                borderRadius: 14,
                border: "1px solid rgba(148,163,184,.23)",
                background: "rgba(148,163,184,.06)",
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  background: "rgba(148,163,184,.12)",
                }}
              >
                <MapPin size={20} />
              </div>

              <div>
                <strong
                  style={{
                    display: "block",
                    fontSize: 14,
                    marginBottom: 4,
                  }}
                >
                  กรุงเทพมหานคร
                </strong>

                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.52,
                  }}
                >
                  พื้นที่นำร่องของระบบ
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            padding: "12px 14px",
            borderRadius: 11,
            background: "rgba(148,163,184,.06)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              opacity: 0.58,
            }}
          >
            ราคาปัจจุบันในกรุงเทพฯ
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 6,
            }}
          >
            <strong style={{ fontSize: 18 }}>
              ฿{formatPrice(currentPrice)}
            </strong>

            <span
              style={{
                fontSize: 11,
                opacity: 0.48,
              }}
            >
              {selected?.unit}
            </span>
          </div>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CalendarRange size={19} />

              <h2 style={{ margin: 0 }}>
                ระยะเวลาพยากรณ์
              </h2>
            </div>

            <div
              style={{
                marginTop: 5,
                fontSize: 13,
                opacity: 0.58,
              }}
            >
              เลือกช่วงเวลาที่ต้องการใช้วางแผนต้นทุน
            </div>
          </div>

          <span
            style={{
              fontSize: 11,
              opacity: 0.5,
              fontWeight: 600,
            }}
          >
            STEP 2 OF 3
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(135px, 1fr))",
            gap: 10,
          }}
        >
          {FORECAST_HORIZONS.map((item) => {
            const active =
              forecastMonths === item.months;

            return (
              <button
                key={item.months}
                type="button"
                onClick={() => setForecastMonths(item.months)}
                style={{
                  minHeight: 72,
                  padding: "11px 13px",
                  borderRadius: 11,
                  border: active
                    ? "1.5px solid currentColor"
                    : "1px solid rgba(148,163,184,.2)",
                  background: active
                    ? "rgba(148,163,184,.12)"
                    : "transparent",
                  color: "inherit",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all .15s ease",
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  {item.label}
                </div>

                <div
                  style={{
                    marginTop: 5,
                    fontSize: 10,
                    opacity: 0.48,
                  }}
                >
                  {item.description}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="forecast-hero" style={{ marginBottom: 18 }}>
        <div>
          <div
            className="eyebrow"
            style={{ marginBottom: 8 }}
          >
            BANGKOK • {selected?.id} • {selected?.name?.toUpperCase()} •{" "}
            {forecastMonths} MONTH FORECAST
          </div>

          <div
            style={{
              fontSize: 13,
              opacity: 0.6,
              marginBottom: 4,
            }}
          >
            ราคาคาดการณ์ในอีก {forecastMonths} เดือน
          </div>

          <div className="big-number">
            ฿{formatPrice(forecastPrice)}
          </div>

          <div
            className="forecast-change"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginTop: 9,
            }}
          >
            {directionUp ? (
              <ArrowUpRight size={18} />
            ) : (
              <ArrowDownRight size={18} />
            )}

            {changePercent >= 0 ? "+" : ""}
            {changePercent.toFixed(1)}% จากราคาปัจจุบัน
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              opacity: 0.5,
            }}
          >
            กรุงเทพมหานคร • {selected?.unit}
          </div>
        </div>

        <div className="confidence">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Gauge size={14} />
            <span>MODEL CONFIDENCE</span>
          </div>

          <b>{confidence}%</b>
          <small>Prototype Model</small>

          <div
            style={{
              marginTop: 4,
              fontSize: 10,
              opacity: 0.48,
            }}
          >
            จะแทนด้วยค่าจริงจาก ML
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(185px, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <SummaryCard
          label="ราคาปัจจุบัน"
          value={`฿${formatPrice(currentPrice)}`}
          note={selected?.unit}
        />

        <SummaryCard
          label={`ราคาอีก ${forecastMonths} เดือน`}
          value={`฿${formatPrice(forecastPrice)}`}
          note={selected?.unit}
        />

        <SummaryCard
          label="การเปลี่ยนแปลง"
          value={`${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(1)}%`}
          note={
            directionUp
              ? "มีแนวโน้มเพิ่มขึ้น"
              : "มีแนวโน้มลดลง"
          }
        />

        <SummaryCard
          label="พื้นที่"
          value="กรุงเทพฯ"
          note="พื้นที่นำร่อง"
        />
      </div>

      <section
        className="card chart-card"
        style={{ marginBottom: 18 }}
      >
        <div className="card-head">
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <TrendingUp size={18} />
              <h2>แนวโน้มราคาคาดการณ์</h2>
            </div>

            <span>
              {selected?.name} • {selected?.unit} • กรุงเทพมหานคร
            </span>
          </div>

          <span className="legend">
            <i />
            ราคาย้อนหลัง
            <i className="forecast-dot" />
            Forecast
          </span>
        </div>

        <div className="chart-wrap tall">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 15,
                right: 20,
                left: 5,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />

              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                width={75}
                domain={["auto", "auto"]}
                tickFormatter={(value) =>
                  `฿${Number(value).toLocaleString("th-TH", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  })}`
                }
              />

              <Tooltip
                formatter={(value, name) => {
                  if (value === null || value === undefined) {
                    return ["—"];
                  }

                  const labels = {
                    actual: "ราคาย้อนหลัง",
                    forecast: "ราคาคาดการณ์",
                  };

                  return [
                    `฿${formatPrice(value)} ${selected?.unit}`,
                    labels[name] || name,
                  ];
                }}
              />

              <Area
                type="monotone"
                dataKey="actual"
                strokeWidth={2.5}
                fill="none"
                connectNulls
              />

              <Area
                type="monotone"
                dataKey="forecast"
                strokeWidth={2.5}
                fill="none"
                strokeDasharray="7 5"
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card table-card">
        <div className="card-head">
          <div>
            <h2>Forecast รายเดือน</h2>
            <span>
              ราคาคาดการณ์และช่วงความไม่แน่นอนสำหรับกรุงเทพมหานคร
            </span>
          </div>

          <Sparkles size={18} />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 720,
            }}
          >
            <thead>
              <tr>
                <TableHead left>เดือน</TableHead>
                <TableHead>ราคาคาดการณ์</TableHead>
                <TableHead>ช่วงต่ำ</TableHead>
                <TableHead>ช่วงสูง</TableHead>
                <TableHead>เปลี่ยนจากปัจจุบัน</TableHead>
              </tr>
            </thead>

            <tbody>
              {futureData.map((row) => {
                const percent =
                  currentPrice > 0
                    ? ((row.forecast - currentPrice) / currentPrice) * 100
                    : 0;

                return (
                  <tr
                    key={row.index}
                    style={{
                      borderTop: "1px solid rgba(148,163,184,.14)",
                    }}
                  >
                    <TableCell>
                      <strong>{row.month}</strong>
                    </TableCell>

                    <TableCell right>
                      <strong>
                        ฿{formatPrice(row.forecast)}
                      </strong>

                      <div
                        style={{
                          marginTop: 2,
                          fontSize: 10,
                          opacity: 0.45,
                        }}
                      >
                        {selected?.unit}
                      </div>
                    </TableCell>

                    <TableCell right>
                      ฿{formatPrice(row.low)}
                    </TableCell>

                    <TableCell right>
                      ฿{formatPrice(row.high)}
                    </TableCell>

                    <TableCell right>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontWeight: 600,
                        }}
                      >
                        {percent >= 0 ? (
                          <ArrowUpRight size={14} />
                        ) : (
                          <ArrowDownRight size={14} />
                        )}

                        {percent >= 0 ? "+" : ""}
                        {percent.toFixed(1)}%
                      </span>
                    </TableCell>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function SummaryCard({
  label,
  value,
  note,
}) {
  return (
    <div
      className="card"
      style={{
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          opacity: 0.52,
          marginBottom: 7,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 21,
          fontWeight: 700,
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: 10,
          opacity: 0.47,
          marginTop: 5,
        }}
      >
        {note}
      </div>
    </div>
  );
}

function TableHead({
  children,
  left = false,
}) {
  return (
    <th
      style={{
        padding: 13,
        textAlign: left ? "left" : "right",
        fontSize: 11,
        opacity: 0.52,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function TableCell({
  children,
  right = false,
}) {
  return (
    <td
      style={{
        padding: 14,
        textAlign: right ? "right" : "left",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}
