import React, { useMemo, useState } from "react";
import {
  Download,
  Search,
  ChevronDown,
  PackageSearch,
  TrendingUp,
  TrendingDown,
  MapPin,
  RotateCcw,
} from "lucide-react";

import { materials } from "../data.js";
import { PageHeader, StatCard } from "../components/Shared.jsx";

/*
  หมายเหตุ:
  ตัวคูณราคาแต่ละภูมิภาคด้านล่างเป็น MOCK DATA
  ใช้สำหรับทดสอบ Frontend ก่อนเชื่อม Dataset จริง

  เมื่อมีข้อมูลราคาจริงแยกจังหวัด/ภูมิภาค
  ให้เอา multiplier ออก แล้วใช้ราคาจาก API/Dataset จริงแทน
*/

const REGIONS = [
  {
    id: "all",
    name: "ทั้งประเทศ",
    multiplier: 1,
  },
  {
    id: "bangkok",
    name: "กรุงเทพฯและปริมณฑล",
    multiplier: 1.035,
  },
  {
    id: "central",
    name: "ภาคกลาง",
    multiplier: 1.015,
  },
  {
    id: "north",
    name: "ภาคเหนือ",
    multiplier: 1.025,
  },
  {
    id: "northeast",
    name: "ภาคตะวันออกเฉียงเหนือ",
    multiplier: 1.018,
  },
  {
    id: "east",
    name: "ภาคตะวันออก",
    multiplier: 1.03,
  },
  {
    id: "west",
    name: "ภาคตะวันตก",
    multiplier: 1.012,
  },
  {
    id: "south",
    name: "ภาคใต้",
    multiplier: 1.045,
  },
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

function calculateRegionalPrice(price, multiplier) {
  const result = Number(price) * multiplier;

  if (result >= 10000) {
    return Math.round(result / 10) * 10;
  }

  if (result >= 1000) {
    return Math.round(result);
  }

  if (result >= 100) {
    return Math.round(result);
  }

  return Math.round(result * 10) / 10;
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
  const [selectedCategory, setSelectedCategory] =
    useState("all");

  const [selectedRegion, setSelectedRegion] =
    useState("all");

  const [sortBy, setSortBy] = useState("name");

  /*
    สร้างรายการหมวดหมู่อัตโนมัติจาก data.js
    เวลาเพิ่มวัสดุใหม่ ไม่ต้องมาแก้ dropdown ตรงนี้
  */
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

  const currentRegion =
    REGIONS.find(
      (region) => region.id === selectedRegion
    ) ?? REGIONS[0];

  /*
    เพิ่มราคาตามภูมิภาคเข้าไปในข้อมูลแต่ละแถว
  */
  const dataWithRegionalPrice = useMemo(() => {
    return materials.map((material) => {
      const regionalPrice =
        selectedRegion === "all"
          ? material.price
          : calculateRegionalPrice(
              material.price,
              currentRegion.multiplier
            );

      const difference =
        material.price > 0
          ? ((regionalPrice - material.price) /
              material.price) *
            100
          : 0;

      return {
        ...material,
        regionalPrice,
        regionalDifference: difference,
      };
    });
  }, [selectedRegion, currentRegion]);

  /*
    Search + Category filter
  */
  const filteredMaterials = useMemo(() => {
    const normalizedQuery = query
      .trim()
      .toLowerCase();

    let result = dataWithRegionalPrice.filter(
      (material) => {
        const matchSearch =
          normalizedQuery === "" ||
          material.name
            .toLowerCase()
            .includes(normalizedQuery) ||
          material.category
            .toLowerCase()
            .includes(normalizedQuery) ||
          String(material.id || "")
            .toLowerCase()
            .includes(normalizedQuery);

        const matchCategory =
          selectedCategory === "all" ||
          material.category === selectedCategory;

        return matchSearch && matchCategory;
      }
    );

    /*
      Sorting
    */
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "price-high":
          return b.regionalPrice - a.regionalPrice;

        case "price-low":
          return a.regionalPrice - b.regionalPrice;

        case "change-high":
          return (
            parseFloat(b.change) -
            parseFloat(a.change)
          );

        case "change-low":
          return (
            parseFloat(a.change) -
            parseFloat(b.change)
          );

        case "category":
          return a.category.localeCompare(
            b.category,
            "th"
          );

        case "name":
        default:
          return a.name.localeCompare(
            b.name,
            "th"
          );
      }
    });

    return result;
  }, [
    dataWithRegionalPrice,
    query,
    selectedCategory,
    sortBy,
  ]);

  /*
    Summary
  */
  const summary = useMemo(() => {
    if (filteredMaterials.length === 0) {
      return {
        total: 0,
        average: 0,
        positive: 0,
        negative: 0,
      };
    }

    const totalPrice =
      filteredMaterials.reduce(
        (sum, item) =>
          sum + Number(item.regionalPrice || 0),
        0
      );

    const positive =
      filteredMaterials.filter(
        (item) => item.positive
      ).length;

    const negative =
      filteredMaterials.filter(
        (item) => !item.positive
      ).length;

    return {
      total: filteredMaterials.length,
      average:
        totalPrice / filteredMaterials.length,
      positive,
      negative,
    };
  }, [filteredMaterials]);

  /*
    Export เฉพาะข้อมูลที่ผู้ใช้กำลัง filter อยู่
  */
  const exportCSV = () => {
    const headers = [
      "รหัส",
      "วัสดุ",
      "หมวดหมู่",
      "ภูมิภาค",
      "ราคากลาง",
      "ราคาในพื้นที่",
      "หน่วย",
      "การเปลี่ยนแปลง",
      "เทียบราคากลาง",
    ];

    const rows = filteredMaterials.map(
      (material) => [
        material.id,
        material.name,
        material.category,
        currentRegion.name,
        material.price,
        material.regionalPrice,
        material.unit,
        material.change,
        `${
          material.regionalDifference >= 0
            ? "+"
            : ""
        }${material.regionalDifference.toFixed(2)}%`,
      ]
    );

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row.map(escapeCSV).join(",")
      )
      .join("\n");

    /*
      BOM ทำให้ Excel เปิดภาษาไทยได้ถูก
    */
    const blob = new Blob(
      ["\uFEFF" + csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `construction-material-price-${selectedRegion}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setQuery("");
    setSelectedCategory("all");
    setSelectedRegion("all");
    setSortBy("name");
  };

  return (
    <>
      <PageHeader
        eyebrow="PRICE MONITOR"
        title="ราคาวัสดุก่อสร้าง"
        description="ติดตามราคา เปรียบเทียบภูมิภาค ค้นหา และกรองวัสดุก่อสร้างแต่ละประเภท"
        action={
          <button
            className="outline-btn"
            onClick={exportCSV}
          >
            <Download size={15} />
            Export CSV
          </button>
        }
      />

      {/* SUMMARY */}

      <div className="stats-grid">
        <StatCard
          label="วัสดุที่แสดง"
          value={`${summary.total} รายการ`}
          change={`${materials.length} รายการทั้งหมด`}
          note="หลังจากกรองข้อมูล"
          positive
        />

        <StatCard
          label="ภูมิภาค"
          value={currentRegion.name}
          change={
            selectedRegion === "all"
              ? "ราคากลาง"
              : `${(
                  (currentRegion.multiplier - 1) *
                  100
                ).toFixed(1)}%`
          }
          note="พื้นที่ที่กำลังดู"
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
          value={
            selectedCategory === "all"
              ? "ทุกหมวด"
              : selectedCategory
          }
          change={`${categories.length - 1} หมวดทั้งหมด`}
          note="ประเภทวัสดุก่อสร้าง"
          positive
        />
      </div>

      {/* FILTER TOOLBAR */}

      <section
        className="card"
        style={{
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {/* SEARCH */}

          <div
            className="search"
            style={{
              flex: "1 1 260px",
              minWidth: 220,
            }}
          >
            <Search size={17} />

            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="ค้นหาชื่อวัสดุ หมวด หรือรหัส..."
            />
          </div>

          {/* CATEGORY */}

          <div
            style={{
              position: "relative",
            }}
          >
            <select
              className="select-btn"
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(
                  event.target.value
                )
              }
              style={{
                appearance: "auto",
                minWidth: 190,
              }}
            >
              {categories.map((category) => (
                <option
                  key={category}
                  value={category}
                >
                  {category === "all"
                    ? "ทุกหมวด"
                    : category}
                </option>
              ))}
            </select>
          </div>

          {/* REGION */}

          <div
            style={{
              position: "relative",
            }}
          >
            <MapPin
              size={14}
              style={{
                position: "absolute",
                left: 11,
                top: "50%",
                transform:
                  "translateY(-50%)",
                pointerEvents: "none",
                zIndex: 2,
              }}
            />

            <select
              className="select-btn"
              value={selectedRegion}
              onChange={(event) =>
                setSelectedRegion(
                  event.target.value
                )
              }
              style={{
                appearance: "auto",
                minWidth: 220,
                paddingLeft: 34,
              }}
            >
              {REGIONS.map((region) => (
                <option
                  key={region.id}
                  value={region.id}
                >
                  {region.name}
                </option>
              ))}
            </select>
          </div>

          {/* SORT */}

          <select
            className="select-btn"
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value)
            }
            style={{
              appearance: "auto",
              minWidth: 180,
            }}
          >
            <option value="name">
              เรียงตามชื่อ
            </option>

            <option value="category">
              เรียงตามหมวด
            </option>

            <option value="price-high">
              ราคาสูง → ต่ำ
            </option>

            <option value="price-low">
              ราคาต่ำ → สูง
            </option>

            <option value="change-high">
              % เพิ่มมาก → น้อย
            </option>

            <option value="change-low">
              % ลดมาก → น้อย
            </option>
          </select>

          {/* RESET */}

          <button
            className="outline-btn"
            onClick={resetFilters}
          >
            <RotateCcw size={15} />
            ล้างตัวกรอง
          </button>
        </div>
      </section>

      {/* RESULT INFO */}

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

          <strong>
            พบ {filteredMaterials.length} รายการ
          </strong>

          {selectedCategory !== "all" && (
            <span
              style={{
                opacity: 0.65,
              }}
            >
              • {selectedCategory}
            </span>
          )}
        </div>

        <div
          style={{
            fontSize: 13,
            opacity: 0.65,
          }}
        >
          ราคาพื้นที่: {currentRegion.name}
        </div>
      </div>

      {/* TABLE */}

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
              minWidth: 1050,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: 14,
                  }}
                >
                  รหัส
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: 14,
                  }}
                >
                  วัสดุ
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: 14,
                  }}
                >
                  หมวด
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: 14,
                  }}
                >
                  ภูมิภาค
                </th>

                <th
                  style={{
                    textAlign: "right",
                    padding: 14,
                  }}
                >
                  ราคากลาง
                </th>

                <th
                  style={{
                    textAlign: "right",
                    padding: 14,
                  }}
                >
                  ราคาในพื้นที่
                </th>

                <th
                  style={{
                    textAlign: "right",
                    padding: 14,
                  }}
                >
                  เทียบราคากลาง
                </th>

                <th
                  style={{
                    textAlign: "right",
                    padding: 14,
                  }}
                >
                  เดือนก่อน
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredMaterials.map(
                (material) => {
                  const regionDifference =
                    material.regionalDifference;

                  return (
                    <tr
                      key={material.id}
                      style={{
                        borderTop:
                          "1px solid rgba(148, 163, 184, 0.15)",
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

                      <td
                        style={{
                          padding: 14,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 600,
                          }}
                        >
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

                      <td
                        style={{
                          padding: 14,
                        }}
                      >
                        <span
                          style={{
                            display:
                              "inline-flex",
                            padding:
                              "5px 9px",
                            borderRadius: 999,
                            background:
                              "rgba(148, 163, 184, 0.12)",
                            fontSize: 12,
                          }}
                        >
                          {material.category}
                        </span>
                      </td>

                      <td
                        style={{
                          padding: 14,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            alignItems:
                              "center",
                          }}
                        >
                          <MapPin
                            size={14}
                          />

                          {
                            currentRegion.name
                          }
                        </div>
                      </td>

                      <td
                        style={{
                          padding: 14,
                          textAlign:
                            "right",
                        }}
                      >
                        ฿
                        {formatPrice(
                          material.price
                        )}
                      </td>

                      <td
                        style={{
                          padding: 14,
                          textAlign:
                            "right",
                        }}
                      >
                        <strong>
                          ฿
                          {formatPrice(
                            material.regionalPrice
                          )}
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
                          textAlign:
                            "right",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                          }}
                        >
                          {regionDifference >
                          0
                            ? "+"
                            : ""}
                          {regionDifference.toFixed(
                            1
                          )}
                          %
                        </span>
                      </td>

                      <td
                        style={{
                          padding: 14,
                          textAlign:
                            "right",
                        }}
                      >
                        <span
                          style={{
                            display:
                              "inline-flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "flex-end",
                            gap: 4,
                            fontWeight: 600,
                          }}
                        >
                          {material.positive ? (
                            <TrendingUp
                              size={15}
                            />
                          ) : (
                            <TrendingDown
                              size={15}
                            />
                          )}

                          {material.change}
                        </span>
                      </td>
                    </tr>
                  );
                }
              )}
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

            <h3>
              ไม่พบวัสดุที่ค้นหา
            </h3>

            <p
              style={{
                opacity: 0.6,
              }}
            >
              ลองเปลี่ยนคำค้นหา
              หมวดหมู่ หรือภูมิภาค
            </p>

            <button
              className="outline-btn"
              onClick={resetFilters}
              style={{
                marginTop: 12,
              }}
            >
              <RotateCcw size={15} />
              ล้างตัวกรอง
            </button>
          </div>
        )}
      </section>

      {/* DATA NOTICE */}

      <div
        style={{
          marginTop: 14,
          fontSize: 12,
          opacity: 0.58,
          lineHeight: 1.7,
        }}
      >
        * ราคาภูมิภาคในเวอร์ชันนี้เป็นข้อมูลจำลองสำหรับทดสอบระบบ
        เมื่อเชื่อม Dataset จริง
        ระบบจะแสดงราคาจริงแยกตามพื้นที่
      </div>
    </>
  );
}