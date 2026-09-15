import React, { useMemo, useState } from "react";
import {
  Download,
  Search,
  PackageSearch,
  TrendingUp,
  TrendingDown,
  MapPin,
  RotateCcw,
} from "lucide-react";

import { materials } from "../data.js";
import { PageHeader, StatCard } from "../components/Shared.jsx";

function formatPrice(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }

  return Number(value).toLocaleString("th-TH", {
    minimumFractionDigits: Number(value) < 100 ? 1 : 0,
    maximumFractionDigits: 2,
  });
}

function escapeCSV(value) {
  const text = String(value ?? "");

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export default function Prices() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  const categories = useMemo(() => {
    return [
      "all",
      ...new Set(
        materials
          .map((material) => material.category)
          .filter(Boolean)
      ),
    ];
  }, []);

  const filteredMaterials = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    let result = materials.filter((material) => {
      const matchSearch =
        normalizedQuery === "" ||
        material.name.toLowerCase().includes(normalizedQuery) ||
        material.category.toLowerCase().includes(normalizedQuery) ||
        String(material.id || "").toLowerCase().includes(normalizedQuery);

      const matchCategory =
        selectedCategory === "all" ||
        material.category === selectedCategory;

      return matchSearch && matchCategory;
    });

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "price-high":
          return b.price - a.price;

        case "price-low":
          return a.price - b.price;

        case "change-high":
          return parseFloat(b.change) - parseFloat(a.change);

        case "change-low":
          return parseFloat(a.change) - parseFloat(b.change);

        case "category":
          return a.category.localeCompare(b.category, "th");

        case "name":
        default:
          return a.name.localeCompare(b.name, "th");
      }
    });

    return result;
  }, [query, selectedCategory, sortBy]);

  const summary = useMemo(() => {
    const positive = filteredMaterials.filter((item) => item.positive).length;
    const negative = filteredMaterials.filter((item) => !item.positive).length;

    return {
      total: filteredMaterials.length,
      positive,
      negative,
    };
  }, [filteredMaterials]);

  const exportCSV = () => {
    const headers = [
      "รหัส",
      "วัสดุ",
      "หมวดหมู่",
      "พื้นที่",
      "ราคา",
      "หน่วย",
      "การเปลี่ยนแปลง",
    ];

    const rows = filteredMaterials.map((material) => [
      material.id,
      material.name,
      material.category,
      "กรุงเทพมหานคร",
      material.price,
      material.unit,
      material.change,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "bangkok-construction-material-prices.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setQuery("");
    setSelectedCategory("all");
    setSortBy("name");
  };

  return (
    <>
      <PageHeader
        eyebrow="BANGKOK • PRICE MONITOR"
        title="ราคาวัสดุก่อสร้างในกรุงเทพมหานคร"
        description="ค้นหา กรอง และติดตามราคาวัสดุก่อสร้าง 21 กลุ่มในพื้นที่กรุงเทพมหานคร"
        action={
          <button className="outline-btn" onClick={exportCSV}>
            <Download size={15} />
            Export CSV
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
        <strong>พื้นที่:</strong>
        <span>กรุงเทพมหานคร</span>
        <span style={{ opacity: 0.55 }}>
          • เวอร์ชันนี้ยังไม่เปิดการเลือกจังหวัด
        </span>
      </div>

      <div className="stats-grid">
        <StatCard
          label="วัสดุที่แสดง"
          value={`${summary.total} รายการ`}
          change={`${materials.length} รายการทั้งหมด`}
          note="หลังจากกรองข้อมูล"
          positive
        />

        <StatCard
          label="พื้นที่"
          value="กรุงเทพฯ"
          change="Pilot Area"
          note="พื้นที่ที่กำลังติดตาม"
          positive
        />

        <StatCard
          label="ราคาเพิ่มขึ้น"
          value={`${summary.positive} รายการ`}
          change={`${summary.negative} รายการลดลง`}
          note="เทียบเดือนก่อน"
          positive
        />

        <StatCard
          label="หมวดที่แสดง"
          value={selectedCategory === "all" ? "ทุกหมวด" : selectedCategory}
          change={`${categories.length - 1} หมวดทั้งหมด`}
          note="ประเภทวัสดุก่อสร้าง"
          positive
        />
      </div>

      <section className="card" style={{ marginBottom: 18 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div
            className="search"
            style={{
              flex: "1 1 300px",
              minWidth: 220,
            }}
          >
            <Search size={17} />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาชื่อวัสดุ หมวด หรือรหัส..."
            />
          </div>

          <select
            className="select-btn"
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            style={{
              appearance: "auto",
              minWidth: 200,
            }}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? "ทุกหมวด" : category}
              </option>
            ))}
          </select>

          <select
            className="select-btn"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            style={{
              appearance: "auto",
              minWidth: 190,
            }}
          >
            <option value="name">เรียงตามชื่อ</option>
            <option value="category">เรียงตามหมวด</option>
            <option value="price-high">ราคาสูง → ต่ำ</option>
            <option value="price-low">ราคาต่ำ → สูง</option>
            <option value="change-high">% เพิ่มมาก → น้อย</option>
            <option value="change-low">% ลดมาก → น้อย</option>
          </select>

          <button className="outline-btn" onClick={resetFilters}>
            <RotateCcw size={15} />
            ล้างตัวกรอง
          </button>
        </div>
      </section>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <PackageSearch size={18} />
          <strong>พบ {filteredMaterials.length} รายการ</strong>

          {selectedCategory !== "all" && (
            <span style={{ opacity: 0.65 }}>
              • {selectedCategory}
            </span>
          )}
        </div>

        <div style={{ fontSize: 13, opacity: 0.65 }}>
          พื้นที่ราคา: กรุงเทพมหานคร
        </div>
      </div>

      <section
        className="card table-card"
        style={{
          overflowX: "auto",
        }}
      >
        {filteredMaterials.length > 0 ? (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 850,
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 14 }}>รหัส</th>
                <th style={{ textAlign: "left", padding: 14 }}>วัสดุ</th>
                <th style={{ textAlign: "left", padding: 14 }}>หมวด</th>
                <th style={{ textAlign: "left", padding: 14 }}>พื้นที่</th>
                <th style={{ textAlign: "right", padding: 14 }}>ราคา</th>
                <th style={{ textAlign: "right", padding: 14 }}>เดือนก่อน</th>
              </tr>
            </thead>

            <tbody>
              {filteredMaterials.map((material) => (
                <tr
                  key={material.id}
                  style={{
                    borderTop: "1px solid rgba(148,163,184,.15)",
                  }}
                >
                  <td
                    style={{
                      padding: 14,
                      opacity: 0.65,
                      fontWeight: 600,
                    }}
                  >
                    {material.id}
                  </td>

                  <td style={{ padding: 14 }}>
                    <div style={{ fontWeight: 600 }}>
                      {material.name}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.55,
                        marginTop: 3,
                      }}
                    >
                      {material.unit}
                    </div>
                  </td>

                  <td style={{ padding: 14 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        padding: "5px 9px",
                        borderRadius: 999,
                        background: "rgba(148,163,184,.12)",
                        fontSize: 12,
                      }}
                    >
                      {material.category}
                    </span>
                  </td>

                  <td style={{ padding: 14 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                      }}
                    >
                      <MapPin size={14} />
                      กรุงเทพมหานคร
                    </div>
                  </td>

                  <td
                    style={{
                      padding: 14,
                      textAlign: "right",
                    }}
                  >
                    <strong>
                      ฿{formatPrice(material.price)}
                    </strong>

                    <div
                      style={{
                        fontSize: 11,
                        opacity: 0.55,
                        marginTop: 2,
                      }}
                    >
                      {material.unit}
                    </div>
                  </td>

                  <td
                    style={{
                      padding: 14,
                      textAlign: "right",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 4,
                        fontWeight: 600,
                      }}
                    >
                      {material.positive ? (
                        <TrendingUp size={15} />
                      ) : (
                        <TrendingDown size={15} />
                      )}

                      {material.change}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div
            style={{
              padding: 60,
              textAlign: "center",
            }}
          >
            <PackageSearch
              size={36}
              style={{
                marginBottom: 12,
                opacity: 0.45,
              }}
            />

            <h3>ไม่พบวัสดุที่ค้นหา</h3>

            <p style={{ opacity: 0.6 }}>
              ลองเปลี่ยนคำค้นหาหรือหมวดหมู่
            </p>

            <button
              className="outline-btn"
              onClick={resetFilters}
              style={{ marginTop: 12 }}
            >
              <RotateCcw size={15} />
              ล้างตัวกรอง
            </button>
          </div>
        )}
      </section>

      <div
        style={{
          marginTop: 14,
          fontSize: 12,
          opacity: 0.58,
          lineHeight: 1.7,
        }}
      >
        * ราคาปัจจุบันยังเป็นข้อมูลตัวอย่างสำหรับทดสอบระบบ
        เมื่อเชื่อม Dataset จริง ระบบจะแสดงราคาจริงสำหรับกรุงเทพมหานคร
      </div>
    </>
  );
}
