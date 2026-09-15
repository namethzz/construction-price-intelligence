import React, {
  useMemo,
  useState,
} from "react";

import {
  Calculator,
  CalendarRange,
  Download,
  Info,
  MapPin,
  Plus,
  Trash2,
  TrendingUp,
} from "lucide-react";

import { materials } from "../data.js";
import { PageHeader } from "../components/Shared.jsx";

const FORECAST_OPTIONS = [
  {
    months: 1,
    label: "1 เดือน",
  },
  {
    months: 3,
    label: "3 เดือน",
  },
  {
    months: 6,
    label: "6 เดือน",
  },
  {
    months: 12,
    label: "12 เดือน",
  },
];

function roundPrice(value) {
  if (value >= 10000) {
    return Math.round(value / 10) * 10;
  }

  if (value >= 1000) {
    return Math.round(value);
  }

  if (value >= 100) {
    return Math.round(value);
  }

  return Math.round(value * 10) / 10;
}

function forecastMaterialPrice(
  material,
  months
) {
  const currentPrice =
    Number(material?.price || 0);

  const seed =
    Number(material?.id || 1);

  const monthlyRate =
    0.0045 +
    (seed % 7) * 0.0011;

  return roundPrice(
    currentPrice *
      Math.pow(
        1 + monthlyRate,
        months
      )
  );
}

function formatPrice(value) {
  return Number(
    value || 0
  ).toLocaleString("th-TH", {
    maximumFractionDigits: 2,
  });
}

function unitText(unit = "") {
  return unit.replace(
    "บาท/",
    ""
  );
}

function escapeCSV(value) {
  const text =
    String(value ?? "");

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text.replace(
      /"/g,
      '""'
    )}"`;
  }

  return text;
}

export default function CostPlanner() {
  const defaultIds = [
    "04",
    "15",
    "16",
  ];

  const [items, setItems] =
    useState(() =>
      defaultIds
        .map((id) => {
          const material =
            materials.find(
              (item) =>
                item.id === id
            );

          if (!material) {
            return null;
          }

          return {
            materialId:
              material.id,
            qty: 1,
          };
        })
        .filter(Boolean)
    );

  const [
    forecastMonths,
    setForecastMonths,
  ] = useState(3);

  const updateItem = (
    index,
    key,
    value
  ) => {
    setItems((current) =>
      current.map(
        (item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [key]:
                  key === "qty"
                    ? Math.max(
                        0,
                        Number(
                          value
                        ) || 0
                      )
                    : value,
              }
            : item
      )
    );
  };

  const addItem = () => {
    const usedIds = new Set(
      items.map(
        (item) =>
          item.materialId
      )
    );

    const nextMaterial =
      materials.find(
        (material) =>
          !usedIds.has(
            material.id
          )
      ) || materials[0];

    setItems((current) => [
      ...current,
      {
        materialId:
          nextMaterial.id,
        qty: 1,
      },
    ]);
  };

  const removeItem = (
    index
  ) => {
    setItems((current) =>
      current.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  };

  const calculatedItems =
    useMemo(() => {
      return items.map(
        (item) => {
          const material =
            materials.find(
              (candidate) =>
                candidate.id ===
                item.materialId
            ) ||
            materials[0];

          const currentUnitPrice =
            Number(
              material.price ||
                0
            );

          const futureUnitPrice =
            forecastMaterialPrice(
              material,
              forecastMonths
            );

          const currentTotal =
            item.qty *
            currentUnitPrice;

          const futureTotal =
            item.qty *
            futureUnitPrice;

          return {
            ...item,
            material,
            currentUnitPrice,
            futureUnitPrice,
            currentTotal,
            futureTotal,
            difference:
              futureTotal -
              currentTotal,
          };
        }
      );
    }, [
      items,
      forecastMonths,
    ]);

  const currentTotal =
    useMemo(
      () =>
        calculatedItems.reduce(
          (sum, item) =>
            sum +
            item.currentTotal,
          0
        ),
      [calculatedItems]
    );

  const futureTotal =
    useMemo(
      () =>
        calculatedItems.reduce(
          (sum, item) =>
            sum +
            item.futureTotal,
          0
        ),
      [calculatedItems]
    );

  const difference =
    futureTotal -
    currentTotal;

  const differencePercent =
    currentTotal > 0
      ? (difference /
          currentTotal) *
        100
      : 0;

  const exportPlan = () => {
    const headers = [
      "รหัส",
      "วัสดุ",
      "พื้นที่",
      "จำนวน",
      "หน่วย",
      "ราคาปัจจุบัน/หน่วย",
      `ราคาอีก ${forecastMonths} เดือน/หน่วย`,
      "ต้นทุนวันนี้",
      `ต้นทุนอีก ${forecastMonths} เดือน`,
      "ส่วนต่าง",
    ];

    const rows =
      calculatedItems.map(
        (item) => [
          item.material.id,
          item.material.name,
          "กรุงเทพมหานคร",
          item.qty,
          unitText(
            item.material.unit
          ),
          item.currentUnitPrice,
          item.futureUnitPrice,
          item.currentTotal,
          item.futureTotal,
          item.difference,
        ]
      );

    rows.push([
      "",
      "TOTAL",
      "กรุงเทพมหานคร",
      "",
      "",
      "",
      "",
      currentTotal,
      futureTotal,
      difference,
    ]);

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map(escapeCSV)
          .join(",")
      )
      .join("\n");

    const blob =
      new Blob(
        ["\uFEFF" + csv],
        {
          type: "text/csv;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      `bangkok-cost-plan-${forecastMonths}m.csv`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(
      url
    );
  };

  const riskLevel =
    differencePercent >= 8
      ? "สูง"
      : differencePercent >=
          4
        ? "ปานกลาง"
        : "ต่ำ";

  return (
    <>
      <PageHeader
        eyebrow="BANGKOK • DECISION SUPPORT"
        title="วางแผนต้นทุนวัสดุก่อสร้าง"
        description="เลือกวัสดุ ใส่ปริมาณ และเปรียบเทียบต้นทุนวันนี้กับต้นทุนคาดการณ์ในอนาคตสำหรับกรุงเทพมหานคร"
        action={
          <button
            className="outline-btn"
            onClick={exportPlan}
          >
            <Download size={15} />
            Export plan
          </button>
        }
      />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 9,
          padding:
            "11px 14px",
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
          เครื่องมือนี้ใช้สำหรับ
          <strong>
            {" "}ประเมินงบประมาณและความเสี่ยงด้านราคา
          </strong>
          {" "}ก่อนจัดซื้อวัสดุ
          โดยค่าราคาในอนาคตยังเป็น Prototype Forecast
          และจะเปลี่ยนเป็นผลจากโมเดลจริงในขั้นถัดไป
        </span>
      </div>

      <section
        className="card"
        style={{
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(240px, 1fr) minmax(300px, 1.5fr)",
            gap: 16,
            alignItems: "end",
          }}
        >
          <div>
            <div
              className="field-label"
              style={{
                marginBottom: 7,
              }}
            >
              พื้นที่ประเมินต้นทุน
            </div>

            <div
              style={{
                minHeight: 68,
                border:
                  "1px solid rgba(148,163,184,.23)",
                borderRadius: 14,
                padding:
                  "12px 14px",
                display: "flex",
                alignItems:
                  "center",
                gap: 12,
                background:
                  "rgba(148,163,184,.06)",
              }}
            >
              <MapPin size={20} />

              <div>
                <strong>
                  กรุงเทพมหานคร
                </strong>

                <div
                  style={{
                    marginTop: 3,
                    fontSize: 11,
                    opacity: 0.5,
                  }}
                >
                  พื้นที่นำร่อง
                </div>
              </div>
            </div>
          </div>

          <div>
            <div
              className="field-label"
              style={{
                marginBottom: 7,
              }}
            >
              เปรียบเทียบต้นทุนในอีก
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, 1fr)",
                gap: 8,
              }}
            >
              {FORECAST_OPTIONS.map(
                (option) => {
                  const active =
                    forecastMonths ===
                    option.months;

                  return (
                    <button
                      key={
                        option.months
                      }
                      type="button"
                      onClick={() =>
                        setForecastMonths(
                          option.months
                        )
                      }
                      style={{
                        minHeight:
                          68,
                        borderRadius:
                          12,
                        border:
                          active
                            ? "1.5px solid currentColor"
                            : "1px solid rgba(148,163,184,.2)",
                        background:
                          active
                            ? "rgba(148,163,184,.12)"
                            : "transparent",
                        color:
                          "inherit",
                        cursor:
                          "pointer",
                        fontWeight:
                          700,
                      }}
                    >
                      {
                        option.label
                      }
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="cost-layout">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>
                รายการวัสดุ
              </h2>

              <span>
                Bill of Materials • Bangkok
              </span>
            </div>

            <button
              className="text-btn"
              onClick={addItem}
            >
              <Plus size={15} />
              เพิ่มรายการ
            </button>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>วัสดุ</th>
                  <th>จำนวน</th>
                  <th>หน่วย</th>
                  <th>ราคาวันนี้</th>
                  <th>
                    อีก{" "}
                    {forecastMonths}{" "}
                    เดือน
                  </th>
                  <th>รวมวันนี้</th>
                  <th>
                    รวมอนาคต
                  </th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {calculatedItems.map(
                  (
                    item,
                    index
                  ) => (
                    <tr
                      key={index}
                    >
                      <td>
                        <select
                          className="table-select"
                          value={
                            item.materialId
                          }
                          onChange={(
                            event
                          ) =>
                            updateItem(
                              index,
                              "materialId",
                              event
                                .target
                                .value
                            )
                          }
                        >
                          {materials.map(
                            (
                              material
                            ) => (
                              <option
                                key={
                                  material.id
                                }
                                value={
                                  material.id
                                }
                              >
                                {
                                  material.id
                                }{" "}
                                -{" "}
                                {
                                  material.name
                                }
                              </option>
                            )
                          )}
                        </select>
                      </td>

                      <td>
                        <input
                          className="qty-input"
                          type="number"
                          min="0"
                          step="any"
                          value={
                            item.qty
                          }
                          onChange={(
                            event
                          ) =>
                            updateItem(
                              index,
                              "qty",
                              event
                                .target
                                .value
                            )
                          }
                        />
                      </td>

                      <td>
                        {unitText(
                          item.material
                            .unit
                        )}
                      </td>

                      <td>
                        ฿
                        {formatPrice(
                          item.currentUnitPrice
                        )}
                      </td>

                      <td>
                        ฿
                        {formatPrice(
                          item.futureUnitPrice
                        )}
                      </td>

                      <td className="price">
                        ฿
                        {formatPrice(
                          item.currentTotal
                        )}
                      </td>

                      <td className="price">
                        ฿
                        {formatPrice(
                          item.futureTotal
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            removeItem(
                              index
                            )
                          }
                          aria-label="ลบรายการ"
                          title="ลบรายการ"
                          style={{
                            border: 0,
                            background:
                              "transparent",
                            color:
                              "inherit",
                            cursor:
                              "pointer",
                            opacity:
                              0.6,
                          }}
                        >
                          <Trash2
                            size={16}
                          />
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {items.length === 0 && (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                opacity: 0.6,
              }}
            >
              ยังไม่มีรายการวัสดุ
              <br />

              <button
                className="text-btn"
                onClick={addItem}
                style={{
                  marginTop: 10,
                }}
              >
                <Plus size={15} />
                เพิ่มวัสดุรายการแรก
              </button>
            </div>
          )}
        </section>

        <aside className="cost-summary">
          <div className="eyebrow">
            COST ESTIMATE • BANGKOK
          </div>

          <h3>
            ต้นทุนวันนี้
          </h3>

          <div className="cost-number">
            ฿
            {formatPrice(
              currentTotal
            )}
          </div>

          <div className="summary-line">
            <span>
              อีก{" "}
              {forecastMonths}{" "}
              เดือน
            </span>

            <b>
              ฿
              {formatPrice(
                futureTotal
              )}
            </b>
          </div>

          <div className="summary-line muted">
            <span>
              ส่วนต่างโดยประมาณ
            </span>

            <b>
              {difference >= 0
                ? "+"
                : "-"}
              ฿
              {formatPrice(
                Math.abs(
                  difference
                )
              )}
            </b>
          </div>

          <div className="summary-line muted">
            <span>
              เปลี่ยนแปลง
            </span>

            <b>
              {differencePercent >=
              0
                ? "+"
                : ""}
              {differencePercent.toFixed(
                1
              )}
              %
            </b>
          </div>

          <div className="summary-line muted">
            <span>
              ความเสี่ยงต้นทุน
            </span>

            <b>{riskLevel}</b>
          </div>

          <button className="primary-btn">
            <Calculator size={16} />
            ประเมินจากแผนนี้
          </button>
        </aside>
      </div>

      <div className="timeline">
        <div>
          <span>วันนี้</span>

          <b>
            ฿
            {formatPrice(
              currentTotal
            )}
          </b>
        </div>

        <div className="timeline-line" />

        <div>
          <span>
            {forecastMonths} เดือน
          </span>

          <b>
            ฿
            {formatPrice(
              futureTotal
            )}
          </b>
        </div>

        <div className="timeline-line" />

        <div>
          <span>
            ส่วนต่าง
          </span>

          <b>
            {differencePercent >=
            0
              ? "+"
              : ""}
            {differencePercent.toFixed(
              1
            )}
            %
          </b>
        </div>
      </div>

      <section
        className="card"
        style={{
          marginTop: 18,
        }}
      >
        <div className="card-head">
          <div>
            <h2>
              ข้อสรุปเพื่อวางแผน
            </h2>

            <span>
              Decision support จากต้นทุนที่เลือก
            </span>
          </div>

          <TrendingUp size={18} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 10,
          }}
        >
          <InsightCard
            icon={
              <CalendarRange
                size={17}
              />
            }
            label="ช่วงวางแผน"
            value={`${forecastMonths} เดือน`}
          />

          <InsightCard
            icon={
              <TrendingUp
                size={17}
              />
            }
            label="งบสำรองที่ควรเผื่อ"
            value={
              difference > 0
                ? `ประมาณ ฿${formatPrice(
                    difference
                  )}`
                : "ยังไม่ต้องเพิ่ม"
            }
          />

          <InsightCard
            icon={
              <Calculator
                size={17}
              />
            }
            label="คำแนะนำเบื้องต้น"
            value={
              differencePercent >=
              5
                ? "พิจารณาเร่งจัดซื้อ"
                : "แบ่งซื้อเป็นช่วงได้"
            }
          />
        </div>
      </section>
    </>
  );
}

function InsightCard({
  icon,
  label,
  value,
}) {
  return (
    <div
      style={{
        padding: 13,
        borderRadius: 11,
        background:
          "rgba(148,163,184,.07)",
        display: "flex",
        alignItems:
          "flex-start",
        gap: 10,
      }}
    >
      {icon}

      <div>
        <div
          style={{
            fontSize: 10,
            opacity: 0.5,
          }}
        >
          {label}
        </div>

        <strong
          style={{
            display: "block",
            marginTop: 4,
            fontSize: 13,
          }}
        >
          {value}
        </strong>
      </div>
    </div>
  );
}
