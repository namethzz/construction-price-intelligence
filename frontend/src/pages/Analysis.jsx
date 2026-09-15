import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Info,
  MapPin,
  PackageSearch,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  materials,
  priceData,
} from "../data.js";

import {
  Driver,
  PageHeader,
} from "../components/Shared.jsx";

function getPrice(row, materialId) {
  const value = row?.prices?.[materialId];
  return Number.isFinite(Number(value))
    ? Number(value)
    : null;
}

function formatPrice(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }

  return Number(value).toLocaleString("th-TH", {
    minimumFractionDigits:
      Number(value) < 100 ? 1 : 0,
    maximumFractionDigits: 2,
  });
}

function getChange(current, previous) {
  if (
    !Number.isFinite(Number(current)) ||
    !Number.isFinite(Number(previous)) ||
    Number(previous) === 0
  ) {
    return null;
  }

  return (
    ((Number(current) - Number(previous)) /
      Number(previous)) *
    100
  );
}

function getDriverValues(materialId) {
  const seed = Number(materialId || 1);

  return {
    rawMaterial: 60 + ((seed * 7) % 31),
    energy: 48 + ((seed * 5) % 31),
    exchange: 28 + ((seed * 9) % 31),
    demand: 35 + ((seed * 11) % 31),
    season: 15 + ((seed * 3) % 26),
  };
}

function getImpactRows(materialId) {
  const seed = Number(materialId || 1);

  return [
    {
      label: "ราคาวัตถุดิบ",
      value: 1.2 + (seed % 4) * 0.5,
      positive: true,
    },
    {
      label: "ต้นทุนพลังงาน",
      value: 0.7 + (seed % 3) * 0.4,
      positive: true,
    },
    {
      label: "ค่าเงินบาท",
      value: 0.3 + (seed % 2) * 0.3,
      positive: seed % 3 !== 0,
    },
    {
      label: "Demand งานก่อสร้าง",
      value: 0.4 + (seed % 5) * 0.2,
      positive: true,
    },
  ];
}

export default function Analysis() {
  const defaultMaterial =
    materials.find((item) => item.id === "04") ||
    materials[0];

  const [
    selectedId,
    setSelectedId,
  ] = useState(defaultMaterial?.id);

  const [
    materialOpen,
    setMaterialOpen,
  ] = useState(false);

  const [
    materialSearch,
    setMaterialSearch,
  ] = useState("");

  const dropdownRef = useRef(null);

  const selected = useMemo(() => {
    return (
      materials.find(
        (item) => item.id === selectedId
      ) || materials[0]
    );
  }, [selectedId]);

  const filteredMaterials = useMemo(() => {
    const query =
      materialSearch.trim().toLowerCase();

    if (!query) {
      return materials;
    }

    return materials.filter((item) => {
      return (
        String(item.id)
          .toLowerCase()
          .includes(query) ||
        String(item.name)
          .toLowerCase()
          .includes(query) ||
        String(item.category)
          .toLowerCase()
          .includes(query)
      );
    });
  }, [materialSearch]);

  const history = useMemo(() => {
    return priceData
      .map((row) => ({
        key: row.key,
        month: row.month,
        price: getPrice(
          row,
          selected?.id
        ),
      }))
      .filter((row) =>
        Number.isFinite(row.price)
      );
  }, [selected]);

  const latestPrice =
    history.at(-1)?.price ??
    Number(selected?.price || 0);

  const oneMonthAgo =
    history.at(-2)?.price ?? null;

  const threeMonthsAgo =
    history.at(-4)?.price ?? null;

  const sixMonthsAgo =
    history.at(-7)?.price ?? null;

  const twelveMonthsAgo =
    history.length >= 12
      ? history.at(-12)?.price
      : history.at(0)?.price ?? null;

  const change1M = getChange(
    latestPrice,
    oneMonthAgo
  );

  const change3M = getChange(
    latestPrice,
    threeMonthsAgo
  );

  const change6M = getChange(
    latestPrice,
    sixMonthsAgo
  );

  const change12M = getChange(
    latestPrice,
    twelveMonthsAgo
  );

  const driverValues = useMemo(
    () => getDriverValues(selected?.id),
    [selected]
  );

  const impactRows = useMemo(
    () => getImpactRows(selected?.id),
    [selected]
  );

  const totalImpact =
    impactRows.reduce(
      (sum, row) =>
        sum +
        (row.positive
          ? row.value
          : -row.value),
      0
    );

  const projectedPrice =
    latestPrice *
    (1 + totalImpact / 100);

  const strongestDriver = useMemo(() => {
    const entries = [
      ["ราคาวัตถุดิบ", driverValues.rawMaterial],
      ["ต้นทุนพลังงาน", driverValues.energy],
      ["ค่าเงินบาท", driverValues.exchange],
      ["Demand ก่อสร้าง", driverValues.demand],
      ["ฤดูกาล", driverValues.season],
    ];

    return entries.sort(
      (a, b) => b[1] - a[1]
    )[0];
  }, [driverValues]);

  useEffect(() => {
    const close = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target
        )
      ) {
        setMaterialOpen(false);
      }
    };

    const escape = (event) => {
      if (event.key === "Escape") {
        setMaterialOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      close
    );

    document.addEventListener(
      "keydown",
      escape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        close
      );

      document.removeEventListener(
        "keydown",
        escape
      );
    };
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="BANGKOK • PRICE ANALYSIS"
        title="วิเคราะห์ราคาวัสดุก่อสร้าง"
        description="อธิบายว่าราคาเปลี่ยนอย่างไร ปัจจัยใดมีผล และข้อมูลนี้ช่วยตัดสินใจด้านต้นทุนอย่างไร"
      />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 9,
          padding: "11px 14px",
          marginBottom: 16,
          borderRadius: 12,
          background:
            "rgba(148,163,184,.08)",
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
          หน้านี้มีไว้ตอบคำถามว่า
          <strong>
            {" "}“ราคาขึ้นหรือลงเพราะอะไร?”
          </strong>
          {" "}และช่วยประเมินความเสี่ยงก่อนตัดสินใจซื้อวัสดุ
          โดยเวอร์ชันปัจจุบันใช้ข้อมูลตัวอย่างสำหรับกรุงเทพมหานคร
          ก่อนเชื่อมโมเดล ML และปัจจัยเศรษฐกิจจริง
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
            display: "grid",
            gridTemplateColumns:
              "minmax(320px, 1.4fr) minmax(250px, .8fr)",
            gap: 14,
          }}
        >
          <div
            ref={dropdownRef}
            style={{
              position: "relative",
            }}
          >
            <div
              className="field-label"
              style={{
                marginBottom: 7,
              }}
            >
              วัสดุที่ต้องการวิเคราะห์
            </div>

            <button
              type="button"
              onClick={() =>
                setMaterialOpen(
                  (open) => !open
                )
              }
              style={{
                width: "100%",
                minHeight: 70,
                border:
                  materialOpen
                    ? "1.5px solid currentColor"
                    : "1px solid rgba(148,163,184,.23)",
                borderRadius: 14,
                background:
                  "var(--card-bg, #fff)",
                color: "inherit",
                padding: "12px 14px",
                cursor: "pointer",
                textAlign: "left",
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
                  background:
                    "rgba(148,163,184,.12)",
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
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 6px",
                      borderRadius: 5,
                      background:
                        "rgba(148,163,184,.12)",
                    }}
                  >
                    {selected?.id}
                  </span>

                  <strong
                    style={{
                      overflow: "hidden",
                      textOverflow:
                        "ellipsis",
                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    {selected?.name}
                  </strong>
                </div>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    opacity: 0.52,
                  }}
                >
                  {selected?.category} •{" "}
                  {selected?.unit}
                </div>
              </div>

              <ChevronDown
                size={17}
                style={{
                  transform:
                    materialOpen
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                  transition:
                    "transform .18s",
                }}
              />
            </button>

            {materialOpen && (
              <div
                style={{
                  position: "absolute",
                  zIndex: 200,
                  top: "calc(100% + 7px)",
                  left: 0,
                  right: 0,
                  border:
                    "1px solid rgba(148,163,184,.18)",
                  borderRadius: 14,
                  background:
                    "var(--card-bg, #fff)",
                  boxShadow:
                    "0 20px 55px rgba(15,23,42,.16)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: 10,
                    borderBottom:
                      "1px solid rgba(148,163,184,.12)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding:
                        "9px 10px",
                      borderRadius: 9,
                      background:
                        "rgba(148,163,184,.08)",
                    }}
                  >
                    <Search size={15} />

                    <input
                      autoFocus
                      value={
                        materialSearch
                      }
                      onChange={(event) =>
                        setMaterialSearch(
                          event.target.value
                        )
                      }
                      placeholder="ค้นหารหัส ชื่อ หรือหมวดวัสดุ..."
                      style={{
                        width: "100%",
                        border: 0,
                        outline: 0,
                        background:
                          "transparent",
                        color: "inherit",
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    maxHeight: 340,
                    overflowY: "auto",
                    padding: 6,
                  }}
                >
                  {filteredMaterials.map(
                    (material) => {
                      const active =
                        material.id ===
                        selected?.id;

                      return (
                        <button
                          key={
                            material.id
                          }
                          type="button"
                          onClick={() => {
                            setSelectedId(
                              material.id
                            );

                            setMaterialOpen(
                              false
                            );

                            setMaterialSearch(
                              ""
                            );
                          }}
                          style={{
                            width:
                              "100%",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: 10,
                            padding:
                              "10px 9px",
                            border: 0,
                            borderRadius:
                              9,
                            background:
                              active
                                ? "rgba(148,163,184,.13)"
                                : "transparent",
                            color:
                              "inherit",
                            cursor:
                              "pointer",
                            textAlign:
                              "left",
                          }}
                        >
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius:
                                8,
                              display:
                                "grid",
                              placeItems:
                                "center",
                              background:
                                "rgba(148,163,184,.11)",
                              fontSize: 10,
                              fontWeight:
                                700,
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
                                fontSize:
                                  13,
                                fontWeight:
                                  600,
                              }}
                            >
                              {
                                material.name
                              }
                            </div>

                            <div
                              style={{
                                marginTop:
                                  2,
                                fontSize:
                                  10,
                                opacity:
                                  0.48,
                              }}
                            >
                              {
                                material.category
                              }{" "}
                              •{" "}
                              {
                                material.unit
                              }
                            </div>
                          </div>

                          {active && (
                            <Check
                              size={16}
                            />
                          )}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <div
              className="field-label"
              style={{
                marginBottom: 7,
              }}
            >
              พื้นที่วิเคราะห์
            </div>

            <div
              style={{
                minHeight: 70,
                border:
                  "1px solid rgba(148,163,184,.23)",
                borderRadius: 14,
                background:
                  "rgba(148,163,184,.06)",
                padding:
                  "12px 14px",
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
                  background:
                    "rgba(148,163,184,.12)",
                }}
              >
                <MapPin size={20} />
              </div>

              <div>
                <strong>
                  กรุงเทพมหานคร
                </strong>

                <div
                  style={{
                    marginTop: 4,
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
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <MetricCard
          label="ราคาปัจจุบัน"
          value={`฿${formatPrice(
            latestPrice
          )}`}
          note={selected?.unit}
        />

        <MetricCard
          label="เปลี่ยนแปลง 1 เดือน"
          value={formatPercent(
            change1M
          )}
          note="เทียบเดือนก่อน"
          direction={change1M}
        />

        <MetricCard
          label="เปลี่ยนแปลง 3 เดือน"
          value={formatPercent(
            change3M
          )}
          note="แนวโน้มระยะสั้น"
          direction={change3M}
        />

        <MetricCard
          label="เปลี่ยนแปลง 12 เดือน"
          value={formatPercent(
            change12M
          )}
          note="แนวโน้มระยะยาว"
          direction={change12M}
        />
      </div>

      <div className="grid-2">
        <section className="card chart-card">
          <div className="card-head">
            <div>
              <h2>
                แนวโน้มราคาย้อนหลัง
              </h2>

              <span>
                {selected?.name} •{" "}
                กรุงเทพมหานคร
              </span>
            </div>

            <TrendingUp size={18} />
          </div>

          <div className="chart-wrap">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <AreaChart
                data={history}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  domain={[
                    "auto",
                    "auto",
                  ]}
                  tickFormatter={(
                    value
                  ) =>
                    `฿${Number(
                      value
                    ).toLocaleString(
                      "th-TH",
                      {
                        notation:
                          "compact",
                        maximumFractionDigits: 1,
                      }
                    )}`
                  }
                />

                <Tooltip
                  formatter={(
                    value
                  ) => [
                    `฿${formatPrice(
                      value
                    )} ${
                      selected?.unit
                    }`,
                    selected?.name,
                  ]}
                />

                <Area
                  type="monotone"
                  dataKey="price"
                  strokeWidth={2.5}
                  fillOpacity={0.12}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>
                ปัจจัยที่มีผลต่อราคา
              </h2>

              <span>
                Feature importance • Prototype
              </span>
            </div>

            <Sparkles size={18} />
          </div>

          <Driver
            label="ราคาวัตถุดิบ"
            value={
              driverValues.rawMaterial
            }
          />

          <Driver
            label="ต้นทุนพลังงาน"
            value={
              driverValues.energy
            }
          />

          <Driver
            label="ค่าเงินบาท"
            value={
              driverValues.exchange
            }
          />

          <Driver
            label="Demand ก่อสร้าง"
            value={
              driverValues.demand
            }
          />

          <Driver
            label="ฤดูกาล"
            value={
              driverValues.season
            }
          />

          <div className="insight-box">
            <Info size={16} />

            <span>
              ปัจจัยที่มีน้ำหนักสูงสุดในตัวอย่างนี้คือ
              <strong>
                {" "}
                {strongestDriver?.[0]}
              </strong>
              {" "}({strongestDriver?.[1]}%)
            </span>
          </div>
        </section>
      </div>

      <div
        className="grid-2"
        style={{
          marginTop: 18,
        }}
      >
        <section className="card">
          <div className="card-head">
            <div>
              <h2>
                ผลกระทบต่อราคา
              </h2>

              <span>
                อธิบายทิศทางของปัจจัย
              </span>
            </div>
          </div>

          {impactRows.map((row) => (
            <div
              key={row.label}
              className={
                row.positive
                  ? "explain-row positive"
                  : "explain-row negative"
              }
            >
              <span>
                {row.label}
              </span>

              <b>
                {row.positive
                  ? "+"
                  : "-"}
                {row.value.toFixed(1)}%
              </b>
            </div>
          ))}

          <div className="explain-total">
            <span>
              ราคาปัจจุบัน
            </span>

            <b>
              ฿
              {formatPrice(
                latestPrice
              )}
            </b>
          </div>

          <div className="explain-total">
            <span>
              ราคาจากตัวอย่างผลกระทบ
            </span>

            <b>
              ฿
              {formatPrice(
                projectedPrice
              )}
            </b>
          </div>
        </section>

        <section className="card insight-large">
          <div className="insight-icon">
            <Sparkles size={20} />
          </div>

          <div>
            <div className="eyebrow">
              PRICE INSIGHT
            </div>

            <h2>
              ข้อมูลนี้ช่วยตัดสินใจอะไร?
            </h2>

            <p>
              ถ้าราคามีแนวโน้มเพิ่มขึ้นต่อเนื่อง
              ผู้ใช้สามารถพิจารณาเร่งจัดซื้อหรือกันงบสำรอง
              หากราคาทรงตัวหรือลดลง
              อาจแบ่งซื้อเป็นช่วงเพื่อลดความเสี่ยงด้านต้นทุน
            </p>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gap: 8,
              }}
            >
              <DecisionRow
                label="แนวโน้ม 3 เดือน"
                value={formatPercent(
                  change3M
                )}
              />

              <DecisionRow
                label="แนวโน้ม 6 เดือน"
                value={formatPercent(
                  change6M
                )}
              />

              <DecisionRow
                label="ปัจจัยหลัก"
                value={
                  strongestDriver?.[0] ||
                  "-"
                }
              />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function formatPercent(value) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "-";
  }

  return `${
    value >= 0 ? "+" : ""
  }${value.toFixed(1)}%`;
}

function MetricCard({
  label,
  value,
  note,
  direction,
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
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontSize: 21,
          fontWeight: 700,
        }}
      >
        {direction !== undefined &&
          direction !== null &&
          (direction >= 0 ? (
            <ArrowUpRight size={18} />
          ) : (
            <ArrowDownRight
              size={18}
            />
          ))}

        {value}
      </div>

      <div
        style={{
          marginTop: 5,
          fontSize: 10,
          opacity: 0.47,
        }}
      >
        {note}
      </div>
    </div>
  );
}

function DecisionRow({
  label,
  value,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent:
          "space-between",
        gap: 10,
        padding:
          "9px 11px",
        borderRadius: 9,
        background:
          "rgba(148,163,184,.08)",
        fontSize: 12,
      }}
    >
      <span
        style={{
          opacity: 0.62,
        }}
      >
        {label}
      </span>

      <strong>{value}</strong>
    </div>
  );
}
