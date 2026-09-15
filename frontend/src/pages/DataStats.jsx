import React, { useMemo } from "react";

import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  Info,
  MapPin,
  TriangleAlert,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  materialCatalog,
  priceData,
} from "../data.js";

import {
  PageHeader,
  StatCard,
  Source,
} from "../components/Shared.jsx";

function calculateQuality() {
  const totalExpected =
    materialCatalog.length *
    priceData.length;

  let available = 0;

  priceData.forEach((row) => {
    materialCatalog.forEach(
      (material) => {
        const value =
          row?.prices?.[
            material.id
          ];

        if (
          value !== null &&
          value !== undefined &&
          value !== "" &&
          Number.isFinite(
            Number(value)
          )
        ) {
          available += 1;
        }
      }
    );
  });

  const missing =
    totalExpected - available;

  const completeness =
    totalExpected > 0
      ? (available /
          totalExpected) *
        100
      : 0;

  return {
    totalExpected,
    available,
    missing,
    completeness,
  };
}

function buildCategoryCoverage() {
  const categoryMap =
    new Map();

  materialCatalog.forEach(
    (material) => {
      const current =
        categoryMap.get(
          material.category
        ) || {
          name:
            material.category,
          materials: [],
        };

      current.materials.push(
        material
      );

      categoryMap.set(
        material.category,
        current
      );
    }
  );

  return Array.from(
    categoryMap.values()
  ).map((group) => {
    const expected =
      group.materials.length *
      priceData.length;

    let available = 0;

    priceData.forEach((row) => {
      group.materials.forEach(
        (material) => {
          const value =
            row?.prices?.[
              material.id
            ];

          if (
            value !== null &&
            value !== undefined &&
            value !== "" &&
            Number.isFinite(
              Number(value)
            )
          ) {
            available += 1;
          }
        }
      );
    });

    return {
      name: group.name,
      records: available,
      coverage:
        expected > 0
          ? Number(
              (
                (available /
                  expected) *
                100
              ).toFixed(1)
            )
          : 0,
    };
  });
}

function findDuplicateMonthKeys() {
  const seen = new Set();
  let duplicates = 0;

  priceData.forEach((row) => {
    if (seen.has(row.key)) {
      duplicates += 1;
    } else {
      seen.add(row.key);
    }
  });

  return duplicates;
}

export default function DataStats() {
  const quality = useMemo(
    () => calculateQuality(),
    []
  );

  const categoryCoverage =
    useMemo(
      () =>
        buildCategoryCoverage(),
      []
    );

  const duplicateMonths =
    useMemo(
      () =>
        findDuplicateMonthKeys(),
      []
    );

  const firstPeriod =
    priceData[0]?.month || "-";

  const lastPeriod =
    priceData.at(-1)?.month ||
    "-";

  return (
    <>
      <PageHeader
        eyebrow="BANGKOK • DATA QUALITY"
        title="ข้อมูลและคุณภาพ Dataset"
        description="ตรวจสอบว่าข้อมูลที่ใช้วิเคราะห์และพยากรณ์ราคาวัสดุก่อสร้างในกรุงเทพมหานครมีความครอบคลุมและพร้อมใช้งานเพียงใด"
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
          หน้านี้ไม่ได้ใช้ทำนายราคาโดยตรง
          แต่ใช้ตรวจสอบ
          <strong>
            {" "}“คุณภาพของข้อมูล”
          </strong>
          {" "}ก่อนส่งเข้า Analysis และ Machine Learning
          เพื่อให้รู้ว่าข้อมูลขาดหายหรือไม่
          ครอบคลุมวัสดุครบหรือยัง
          และแหล่งข้อมูลใดพร้อมใช้งาน
        </span>
      </div>

      <div className="stats-grid">
        <StatCard
          label="วัสดุที่ติดตาม"
          value={`${materialCatalog.length} กลุ่ม`}
          change="01–21"
          note="วัสดุก่อสร้างในระบบ"
          positive
        />

        <StatCard
          label="พื้นที่ข้อมูล"
          value="กรุงเทพฯ"
          change="Pilot Area"
          note="ขอบเขตปัจจุบัน"
          positive
        />

        <StatCard
          label="ช่วงข้อมูล"
          value={`${priceData.length} เดือน`}
          change={`${firstPeriod} – ${lastPeriod}`}
          note="ความถี่รายเดือน"
          positive
        />

        <StatCard
          label="Data completeness"
          value={`${quality.completeness.toFixed(
            1
          )}%`}
          change={
            quality.completeness >= 95
              ? "GOOD"
              : "CHECK"
          }
          note={`${quality.available}/${quality.totalExpected} values`}
          positive={
            quality.completeness >=
            95
          }
        />
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>
                Dataset coverage
              </h2>

              <span>
                จำนวนข้อมูลตามหมวดวัสดุ
              </span>
            </div>

            <BarChart3 size={18} />
          </div>

          <div
            className="chart-wrap tall"
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={
                  categoryCoverage
                }
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 30,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={70}
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip
                  formatter={(
                    value,
                    name
                  ) => [
                    value,
                    name ===
                    "records"
                      ? "records"
                      : name,
                  ]}
                />

                <Bar
                  dataKey="records"
                  radius={[
                    5,
                    5,
                    0,
                    0,
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card source-card">
          <div className="card-head">
            <div>
              <h2>
                Data sources
              </h2>

              <span>
                แหล่งข้อมูลที่ระบบต้องใช้
              </span>
            </div>

            <Database size={18} />
          </div>

          <Source
            name="ราคาวัสดุก่อสร้าง • กรุงเทพมหานคร"
            status="Mock / Local"
          />

          <Source
            name="ราคาน้ำมัน"
            status="Planned"
          />

          <Source
            name="USD / THB"
            status="Planned"
          />

          <Source
            name="CPI / PPI"
            status="Planned"
          />

          <Source
            name="ดัชนีราคาวัสดุก่อสร้าง"
            status="Planned"
          />

          <div
            className="insight-box"
            style={{
              marginTop: 14,
            }}
          >
            <Info size={16} />

            <span>
              สถานะถูกระบุเป็น
              Mock/Planned ตามระบบปัจจุบัน
              เพื่อไม่ให้เข้าใจผิดว่าได้เชื่อม API จริงแล้ว
            </span>
          </div>
        </section>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginTop: 18,
        }}
      >
        <QualityCard
          icon={
            <CheckCircle2
              size={18}
            />
          }
          label="ข้อมูลที่ใช้ได้"
          value={
            quality.available
          }
          note="ค่าที่พร้อมนำไปใช้"
        />

        <QualityCard
          icon={
            quality.missing === 0 ? (
              <CheckCircle2
                size={18}
              />
            ) : (
              <TriangleAlert
                size={18}
              />
            )
          }
          label="Missing values"
          value={quality.missing}
          note="ค่าที่ขาดหาย"
        />

        <QualityCard
          icon={
            duplicateMonths ===
            0 ? (
              <CheckCircle2
                size={18}
              />
            ) : (
              <TriangleAlert
                size={18}
              />
            )
          }
          label="Duplicate periods"
          value={
            duplicateMonths
          }
          note="เดือนที่ซ้ำใน Dataset"
        />

        <QualityCard
          icon={<Clock3 size={18} />}
          label="Frequency"
          value="Monthly"
          note="ข้อมูลรายเดือน"
        />
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
              ความพร้อมก่อนเข้า ML
            </h2>

            <span>
              Checklist สำหรับ Dataset กรุงเทพมหานคร
            </span>
          </div>

          <MapPin size={18} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 10,
          }}
        >
          <CheckItem
            done={
              materialCatalog.length ===
              21
            }
            title="วัสดุครบ 21 กลุ่ม"
            description={`${materialCatalog.length}/21 กลุ่ม`}
          />

          <CheckItem
            done={
              quality.completeness >=
              95
            }
            title="Completeness ≥ 95%"
            description={`${quality.completeness.toFixed(
              1
            )}%`}
          />

          <CheckItem
            done={
              duplicateMonths === 0
            }
            title="ไม่มีเดือนซ้ำ"
            description={`${duplicateMonths} duplicate`}
          />

          <CheckItem
            done={false}
            title="External factors"
            description="รอเชื่อม Oil / FX / CPI / PPI"
          />

          <CheckItem
            done={false}
            title="ข้อมูลจริงกรุงเทพฯ"
            description="ปัจจุบันยังเป็น Mock Dataset"
          />
        </div>
      </section>
    </>
  );
}

function QualityCard({
  icon,
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
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          gap: 10,
        }}
      >
        <div
          style={{
            fontSize: 11,
            opacity: 0.52,
          }}
        >
          {label}
        </div>

        {icon}
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 22,
          fontWeight: 700,
        }}
      >
        {Number.isFinite(
          Number(value)
        )
          ? Number(
              value
            ).toLocaleString(
              "th-TH"
            )
          : value}
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

function CheckItem({
  done,
  title,
  description,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: 12,
        borderRadius: 11,
        background:
          "rgba(148,163,184,.07)",
      }}
    >
      {done ? (
        <CheckCircle2
          size={18}
          style={{
            flexShrink: 0,
            marginTop: 1,
          }}
        />
      ) : (
        <Clock3
          size={18}
          style={{
            flexShrink: 0,
            marginTop: 1,
          }}
        />
      )}

      <div>
        <strong
          style={{
            fontSize: 12,
          }}
        >
          {title}
        </strong>

        <div
          style={{
            marginTop: 3,
            fontSize: 10,
            opacity: 0.5,
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
}
