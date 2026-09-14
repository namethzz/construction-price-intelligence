import {
  LayoutDashboard,
  Boxes,
  TrendingUp,
  Calculator,
  Database,
  Activity,
} from "lucide-react";

/*
  MOCK DATA สำหรับทดสอบ Frontend
  เมื่อมีข้อมูลจริง ให้แทนที่ priceData / forecastData
  ด้วยข้อมูลจาก API หรือ Dataset จริง
*/

export const materialCatalog = [
  {
    id: "01",
    name: "คอนกรีตผสมเสร็จ",
    category: "คอนกรีต",
    unit: "บาท/ลบ.ม.",
  },
  {
    id: "02",
    name: "อิฐ/บล็อก",
    category: "วัสดุก่อ",
    unit: "บาท/ก้อน",
  },
  {
    id: "03",
    name: "เสารั้วสำเร็จรูป",
    category: "คอนกรีตสำเร็จรูป",
    unit: "บาท/ต้น",
  },
  {
    id: "04",
    name: "เหล็กเส้นกลม/ข้ออ้อย",
    category: "เหล็ก",
    unit: "บาท/ตัน",
  },
  {
    id: "05",
    name: "ท่อเหล็กสี่เหลี่ยม/กลวง",
    category: "เหล็ก",
    unit: "บาท/เส้น",
  },
  {
    id: "06",
    name: "ลวดหนาม/มุ้งลวด",
    category: "โลหะ",
    unit: "บาท/ม้วน",
  },
  {
    id: "07",
    name: "ฉนวนกันความร้อน",
    category: "ฉนวน",
    unit: "บาท/ตร.ม.",
  },
  {
    id: "08",
    name: "กระเบื้องมุงหลังคา",
    category: "หลังคา",
    unit: "บาท/แผ่น",
  },
  {
    id: "09",
    name: "ไม้อัด/ซีเมนต์ใยหิน",
    category: "แผ่นวัสดุ",
    unit: "บาท/แผ่น",
  },
  {
    id: "10",
    name: "กระเบื้องปูพื้น/ผนัง",
    category: "งานสถาปัตย์",
    unit: "บาท/ตร.ม.",
  },
  {
    id: "11",
    name: "ไม้แปรรูป",
    category: "ไม้",
    unit: "บาท/ลบ.ฟุต",
  },
  {
    id: "12",
    name: "สีทาอาคาร",
    category: "สี",
    unit: "บาท/ถัง",
  },
  {
    id: "13",
    name: "กระดาษทรายขัดไม้",
    category: "วัสดุขัด",
    unit: "บาท/แผ่น",
  },
  {
    id: "14",
    name: "ประตู/วงกบประตู",
    category: "ประตู/วงกบ",
    unit: "บาท/ชุด",
  },
  {
    id: "15",
    name: "ปูนซีเมนต์ถุง",
    category: "ปูนซีเมนต์",
    unit: "บาท/ถุง",
  },
  {
    id: "16",
    name: "หิน-ดิน-ทราย คอนกรีต",
    category: "วัสดุมวลรวม",
    unit: "บาท/ลบ.ม.",
  },
  {
    id: "17",
    name: "วัสดุถม (หินคลุก/ลูกรัง)",
    category: "วัสดุถม",
    unit: "บาท/ลบ.ม.",
  },
  {
    id: "18",
    name: "สุขภัณฑ์/ก๊อกน้ำ",
    category: "สุขภัณฑ์",
    unit: "บาท/ชุด",
  },
  {
    id: "19",
    name: "ถังซีเมนต์/ถังน้ำ",
    category: "ถังเก็บน้ำ",
    unit: "บาท/ใบ",
  },
  {
    id: "20",
    name: "สายไฟ VAF/ท่อไฟ",
    category: "ระบบไฟฟ้า",
    unit: "บาท/ชุด",
  },
  {
    id: "21",
    name: "เซรามิกห้องน้ำ",
    category: "งานสถาปัตย์",
    unit: "บาท/ตร.ม.",
  },
];

const monthRows = [
  { key: "2025-10", month: "ต.ค. 68" },
  { key: "2025-11", month: "พ.ย. 68" },
  { key: "2025-12", month: "ธ.ค. 68" },
  { key: "2026-01", month: "ม.ค. 69" },
  { key: "2026-02", month: "ก.พ. 69" },
  { key: "2026-03", month: "มี.ค. 69" },
  { key: "2026-04", month: "เม.ย. 69" },
  { key: "2026-05", month: "พ.ค. 69" },
  { key: "2026-06", month: "มิ.ย. 69" },
  { key: "2026-07", month: "ก.ค. 69" },
  { key: "2026-08", month: "ส.ค. 69" },
  { key: "2026-09", month: "ก.ย. 69" },
];

/*
  ราคาด้านล่างเป็น MOCK DATA เท่านั้น
  เอาไว้ทดสอบหน้าเว็บก่อนเชื่อม Dataset จริง
*/
const latestMockPrices = {
  "01": 2150,
  "02": 12.5,
  "03": 220,
  "04": 23450,
  "05": 1450,
  "06": 520,
  "07": 185,
  "08": 22,
  "09": 420,
  "10": 285,
  "11": 680,
  "12": 1150,
  "13": 18,
  "14": 2500,
  "15": 113,
  "16": 850,
  "17": 480,
  "18": 1900,
  "19": 3200,
  "20": 980,
  "21": 320,
};

const trendFactors = [
  0.948,
  0.953,
  0.958,
  0.962,
  0.968,
  0.973,
  0.978,
  0.982,
  0.987,
  0.991,
  0.996,
  1.0,
];

function roundPrice(value) {
  if (value >= 10000) {
    return Math.round(value / 50) * 50;
  }

  if (value >= 1000) {
    return Math.round(value / 10) * 10;
  }

  if (value >= 100) {
    return Math.round(value);
  }

  return Math.round(value * 10) / 10;
}

export const priceData = monthRows.map((row, monthIndex) => {
  const prices = Object.fromEntries(
    materialCatalog.map((material, materialIndex) => {
      const base = latestMockPrices[material.id];

      const variation =
        1 +
        Math.sin(
          (monthIndex + materialIndex * 0.6) * 1.2
        ) *
          0.005;

      const price = roundPrice(
        base *
          trendFactors[monthIndex] *
          variation
      );

      return [material.id, price];
    })
  );

  return {
    ...row,

    prices,

    /*
      เก็บ field เก่าไว้
      เผื่อหน้าอื่นยังเรียก priceData.steel
      หรือ priceData.cement
    */
    steel: prices["04"],
    cement: prices["15"],
  };
});

/*
  Forecast ตอนนี้ยังเป็น mock ของเหล็กเส้น
  เดี๋ยวหน้า Forecast ค่อยปรับให้เลือกวัสดุ 01-21 ได้เหมือนกัน
*/
export const forecastData = [
  {
    month: "ก.ย. 69",
    actual: 23450,
    forecast: null,
  },
  {
    month: "ต.ค. 69",
    actual: null,
    forecast: 23820,
  },
  {
    month: "พ.ย. 69",
    actual: null,
    forecast: 24110,
  },
  {
    month: "ธ.ค. 69",
    actual: null,
    forecast: 24580,
  },
  {
    month: "ม.ค. 70",
    actual: null,
    forecast: 24890,
  },
  {
    month: "ก.พ. 70",
    actual: null,
    forecast: 25180,
  },
];

function getChange(current, previous) {
  if (!previous) {
    return {
      text: "-",
      positive: true,
    };
  }

  const percent =
    ((current - previous) / previous) * 100;

  return {
    text: `${percent >= 0 ? "+" : ""}${percent.toFixed(
      1
    )}%`,
    positive: percent >= 0,
  };
}

const latestRow =
  priceData[priceData.length - 1];

const previousRow =
  priceData[priceData.length - 2];

export const materials = materialCatalog.map(
  (material) => {
    const currentPrice =
      latestRow.prices[material.id];

    const previousPrice =
      previousRow.prices[material.id];

    const change = getChange(
      currentPrice,
      previousPrice
    );

    return {
      id: material.id,
      name: material.name,
      category: material.category,
      price: currentPrice,
      unit: material.unit,
      change: change.text,
      positive: change.positive,
    };
  }
);

export const navItems = [
  [
    "overview",
    "ภาพรวม",
    LayoutDashboard,
  ],
  [
    "prices",
    "ราคาวัสดุ",
    Boxes,
  ],
  [
    "forecast",
    "พยากรณ์ราคา",
    TrendingUp,
  ],
  [
    "analysis",
    "วิเคราะห์ราคา",
    Activity,
  ],
  [
    "cost",
    "วางแผนต้นทุน",
    Calculator,
  ],
  [
    "data",
    "ข้อมูลและสถิติ",
    Database,
  ],
];