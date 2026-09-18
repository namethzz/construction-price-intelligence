import React, { useMemo, useState } from "react";

import {
  AlertTriangle,
  Building2,
  Calculator,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Info,
  MapPin,
  RotateCcw,
  Save,
  Settings2,
  TrendingUp,
} from "lucide-react";

import { materials } from "../data.js";
import { PageHeader } from "../components/Shared.jsx";

const COST_TYPES = { material: "ค่าวัสดุ", labor: "ค่าแรง", equipment: "เครื่องจักร/ขนส่ง" };
const TYPE_COLORS = { material: "#2563eb", labor: "#059669", equipment: "#d97706" };
const BOQ_DISCIPLINES = {
  structure: "หมวดงานโครงสร้าง",
  architecture: "หมวดงานสถาปัตย์",
  system: "หมวดงานระบบ",
};
const OFFICIAL_PRICE_URL = "https://index.tpso.go.th/construction-material-prices/prices-building-materials";
const OFFICIAL_PRICE_NOTE = "ราคาวัสดุที่แสดงเป็นราคากลางหรือข้อมูลอ้างอิงจากภาครัฐ ไม่ใช่ราคาขายปลีก ใบเสนอราคา หรือราคาที่ผู้รับเหมาซื้อได้จริง ราคาหน้าร้านอาจแตกต่างตามพื้นที่ ยี่ห้อ ปริมาณซื้อ ค่าขนส่ง และเงื่อนไขการค้า กรุณาขอใบเสนอราคาจากร้านค้าก่อนจัดซื้อหรือยื่นราคา";
const DRAFT_STORAGE_KEY = "thai-the-structural-boq-professional-v1";
const number = (value) => Math.max(0, Number(value) || 0);

function formatPrice(value) {
  return number(value).toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatQty(value) {
  return number(value).toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

function optionalPrice(value) {
  return value === null || value === undefined ? "รอข้อมูล" : `฿${formatPrice(value)}`;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function loadDraft() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function formatForecastPeriod(months) {
  if (months <= 0) return "ปัจจุบัน";
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (!years) return `${remainingMonths} เดือน`;
  if (!remainingMonths) return `${years} ปี`;
  return `${years} ปี ${remainingMonths} เดือน`;
}

function forecastDate(months) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
}

function escapeCSV(value) {
  const text = String(value ?? "");
  return /[,"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function materialResource(key, name, unit, coefficient, keywords = [], wastePct = 0) {
  return { key, name, unit, coefficient, keywords, wastePct, type: "material" };
}

function laborResource(key, name, unit, coefficient) {
  return { key, name, unit, coefficient, type: "labor", wastePct: 0 };
}

function equipmentResource(key, name, unit, coefficient) {
  return { key, name, unit, coefficient, type: "equipment", wastePct: 0 };
}

function manualTradeResources(id, name, unit, keywords = [], includeEquipment = false) {
  return [
    materialResource(`${id}_material`, `วัสดุ${name}`, unit, 1, keywords, 0),
    laborResource(`${id}_labor`, `ค่าแรง${name}`, unit, 1),
    ...(includeEquipment ? [equipmentResource(`${id}_equipment`, `เครื่องมือ/เครื่องจักร${name}`, unit, 1)] : []),
  ];
}

function manualTradeItem({ id, code, name, unit, hint, keywords = [], includeEquipment = false }) {
  return { id, code, name, unit, hint, resources: manualTradeResources(id, name, unit, keywords, includeEquipment) };
}

function reinforcedConcreteResources({ rebarKg, formworkSqm }) {
  return [
    materialResource("ready_concrete", "คอนกรีตผสมเสร็จสำหรับงานโครงสร้าง", "ลบ.ม.", 1, ["คอนกรีตผสมเสร็จ", "คอนกรีต"], 3),
    materialResource("rebar", "เหล็กเสริม RB/DB", "กก.", rebarKg, ["เหล็กข้ออ้อย", "เหล็กเส้นกลม", "เหล็กเส้น"], 5),
    materialResource("binding_wire", "ลวดผูกเหล็ก", "กก.", rebarKg * 0.015, ["ลวดผูกเหล็ก"], 5),
    materialResource("formwork", "ไม้อัดสำหรับงานแบบหล่อ", "แผ่น", formworkSqm / 2.9768 / 3, ["ไม้อัดยาง", "ไม้อัด", "แบบหล่อ"], 10),
    materialResource("formwork_nails", "ตะปูสำหรับงานแบบ", "กก.", formworkSqm * 0.18, ["ตะปู"], 5),
    laborResource("concrete_labor", "ค่าแรงเทและบ่มคอนกรีต", "ลบ.ม.", 1),
    laborResource("rebar_labor", "ค่าแรงตัด ดัด และผูกเหล็ก", "กก.", rebarKg),
    laborResource("formwork_labor", "ค่าแรงประกอบและรื้อแบบ", "ตร.ม.", formworkSqm),
    equipmentResource("concrete_pump", "ปั๊มคอนกรีตและเครื่องมือ", "ลบ.ม.", 1),
  ];
}

const BOQ_SECTIONS = [
  {
    id: "earthwork", code: "A", title: "งานดิน", discipline: "structure",
    items: [
      {
        id: "site_clearance", code: "A01", name: "เคลียร์พื้นที่และปรับระดับ", unit: "ตร.ม.", hint: "พื้นที่อาคารและพื้นที่ทำงานโดยรอบ",
        resources: [laborResource("clearance_labor", "ค่าแรงเคลียร์พื้นที่", "ตร.ม.", 1), equipmentResource("clearance_equipment", "เครื่องจักรปรับพื้นที่", "ตร.ม.", 1)],
      },
      {
        id: "excavation", code: "A02", name: "ขุดดินฐานรากและคานคอดิน", unit: "ลบ.ม.", hint: "ปริมาตรดินขุดตามแบบรวมพื้นที่ทำงาน",
        resources: [laborResource("excavation_labor", "ค่าแรงขุดและแต่งก้นหลุม", "ลบ.ม.", 1), equipmentResource("excavator", "รถขุดและขนย้ายดิน", "ลบ.ม.", 1)],
      },
      {
        id: "sand_fill", code: "A03", name: "ทรายถมบดอัด", unit: "ลบ.ม.", hint: "ปริมาตรหลังบดอัด ระบบเผื่อยุบตัวให้แล้ว",
        resources: [materialResource("sand", "ทรายถม", "ลบ.ม.", 1, ["ทรายถม", "ทราย"], 15), laborResource("sand_fill_labor", "ค่าแรงเกลี่ยและบดอัด", "ลบ.ม.", 1), equipmentResource("compactor", "เครื่องตบดิน/น้ำบดอัด", "ลบ.ม.", 1)],
      },
      {
        id: "stone_fill", code: "A04", name: "หินคลุกหรือหินรองพื้นบดอัด", unit: "ลบ.ม.", hint: "ปริมาตรหลังบดอัด",
        resources: [materialResource("crushed_stone", "หินคลุก", "ลบ.ม.", 1, ["หินคลุก", "หิน"], 12), laborResource("stone_fill_labor", "ค่าแรงเกลี่ยและบดอัด", "ลบ.ม.", 1), equipmentResource("stone_compactor", "เครื่องจักรบดอัด", "ลบ.ม.", 1)],
      },
      {
        id: "lean_concrete", code: "A05", name: "คอนกรีตหยาบรองฐาน", unit: "ลบ.ม.", hint: "คอนกรีต Lean 1:3:5 ใต้ฐานราก",
        resources: [materialResource("lean_concrete", "คอนกรีตหยาบ", "ลบ.ม.", 1, ["คอนกรีตหยาบ", "คอนกรีตผสมเสร็จ", "คอนกรีต"], 5), laborResource("lean_labor", "ค่าแรงเทและปรับระดับ", "ลบ.ม.", 1), equipmentResource("lean_tools", "เครื่องมือและขนส่ง", "ลบ.ม.", 1)],
      },
    ],
  },
  {
    id: "foundation", code: "B", title: "งานเสาเข็มและฐานราก", discipline: "structure",
    items: [
      {
        id: "concrete_pile", code: "B01", name: "เสาเข็มคอนกรีตอัดแรงพร้อมตอก", unit: "ม.", hint: "ใส่ความยาวเสาเข็มรวมทุกต้น",
        resources: [materialResource("concrete_pile", "เสาเข็มคอนกรีตอัดแรง", "ม.", 1, ["เสาเข็มคอนกรีตอัดแรง", "เสาเข็ม"], 3), laborResource("pile_labor", "ค่าแรงติดตั้งและเชื่อมหัวเข็ม", "ม.", 1), equipmentResource("pile_driver", "เครื่องตอกเสาเข็ม", "ม.", 1)],
      },
      { id: "footing", code: "B02", name: "ฐานรากคอนกรีตเสริมเหล็ก", unit: "ลบ.ม.", hint: "กว้าง × ยาว × หนา รวมทุกฐาน", resources: reinforcedConcreteResources({ rebarKg: 95, formworkSqm: 5.5 }) },
      { id: "pile_cap", code: "B03", name: "หัวเสาเข็ม/ฐานหัวเข็ม ค.ส.ล.", unit: "ลบ.ม.", hint: "ปริมาตร Pile cap รวมทั้งหมด", resources: reinforcedConcreteResources({ rebarKg: 125, formworkSqm: 6 }) },
      { id: "pedestal", code: "B04", name: "ตอม่อคอนกรีตเสริมเหล็ก", unit: "ลบ.ม.", hint: "ปริมาตรตอม่อจากฐานถึงคานคอดิน", resources: reinforcedConcreteResources({ rebarKg: 170, formworkSqm: 10 }) },
      { id: "ground_beam", code: "B05", name: "คานคอดินคอนกรีตเสริมเหล็ก", unit: "ลบ.ม.", hint: "หน้ากว้าง × ความลึก × ความยาวรวม", resources: reinforcedConcreteResources({ rebarKg: 185, formworkSqm: 9 }) },
    ],
  },
  {
    id: "superstructure", code: "C", title: "งานคอนกรีต แบบหล่อ และเหล็กเสริม", discipline: "structure",
    items: [
      { id: "column", code: "C01", name: "เสาคอนกรีตเสริมเหล็ก", unit: "ลบ.ม.", hint: "กว้าง × ลึก × สูง รวมทุกต้นและทุกชั้น", resources: reinforcedConcreteResources({ rebarKg: 210, formworkSqm: 13 }) },
      { id: "beam", code: "C02", name: "คานคอนกรีตเสริมเหล็ก", unit: "ลบ.ม.", hint: "หน้ากว้าง × ความลึก × ความยาวรวมทุกชั้น", resources: reinforcedConcreteResources({ rebarKg: 205, formworkSqm: 11 }) },
      { id: "slab_ground", code: "C03", name: "พื้นคอนกรีตเสริมเหล็กบนดิน", unit: "ลบ.ม.", hint: "พื้นที่พื้น × ความหนา", resources: reinforcedConcreteResources({ rebarKg: 90, formworkSqm: 1.2 }) },
      { id: "slab_suspended", code: "C04", name: "พื้นคอนกรีตเสริมเหล็กยกระดับ", unit: "ลบ.ม.", hint: "พื้นที่พื้น × ความหนา รวมทุกชั้น", resources: reinforcedConcreteResources({ rebarKg: 135, formworkSqm: 9 }) },
      { id: "stair", code: "C05", name: "บันไดและชานพักคอนกรีตเสริมเหล็ก", unit: "ลบ.ม.", hint: "ปริมาตรท้องบันได ขั้น และชานพัก", resources: reinforcedConcreteResources({ rebarKg: 165, formworkSqm: 12 }) },
      { id: "lintel_canopy", code: "C06", name: "เอ็นคานทับหลัง กันสาด และงาน ค.ส.ล. ย่อย", unit: "ลบ.ม.", hint: "รวมปริมาตรโครงสร้างย่อยทั้งหมด", resources: reinforcedConcreteResources({ rebarKg: 180, formworkSqm: 14 }) },
    ],
  },
  {
    id: "precast", code: "D", title: "งานแผ่นพื้นสำเร็จรูป", discipline: "structure",
    items: [
      manualTradeItem({ id: "precast_slab", code: "D01", name: "แผ่นพื้นคอนกรีตสำเร็จรูปพร้อมติดตั้ง", unit: "ตร.ม.", hint: "พื้นที่แผ่นพื้นรวมช่องเปิดและระยะวางพาดตามแบบ", keywords: ["แผ่นพื้นสำเร็จรูป", "แผ่นพื้น"] }),
      manualTradeItem({ id: "precast_topping", code: "D02", name: "คอนกรีตทับหน้าแผ่นพื้น", unit: "ลบ.ม.", hint: "พื้นที่พื้น × ความหนาคอนกรีตทับหน้า", keywords: ["คอนกรีตผสมเสร็จ", "คอนกรีต"] }),
      manualTradeItem({ id: "precast_mesh", code: "D03", name: "ตะแกรงเหล็กไวร์เมช", unit: "ตร.ม.", hint: "พื้นที่ไวร์เมชรวมระยะทาบ", keywords: ["ไวร์เมช", "ตะแกรงเหล็ก"] }),
      { id: "precast_bracing", code: "D04", name: "ค้ำยันและเครื่องมือประกอบแผ่นพื้น", unit: "ตร.ม.", hint: "พื้นที่ที่ต้องค้ำยันระหว่างติดตั้ง", resources: [laborResource("precast_bracing_labor", "ค่าแรงค้ำยันแผ่นพื้น", "ตร.ม.", 1), equipmentResource("precast_bracing_equipment", "ค่าเช่าค้ำยันและเครื่องมือ", "ตร.ม.", 1)] },
    ],
  },
  {
    id: "structural_steel", code: "E", title: "งานเหล็กรูปพรรณ", discipline: "structure",
    items: [
      {
        id: "roof_steel", code: "E01", name: "โครงหลังคาเหล็กรูปพรรณ", unit: "กก.", hint: "น้ำหนักเหล็กรวมตามแบบ Shop drawing",
        resources: [
          materialResource("structural_steel", "เหล็กรูปพรรณ", "กก.", 1, ["เหล็กรูปพรรณ", "เหล็กกล่อง", "เหล็กตัวซี", "เหล็ก"], 5),
          materialResource("welding", "ลวดเชื่อม", "กก.", 0.015, ["ลวดเชื่อม"], 5),
          materialResource("steel_paint", "สีรองพื้นกันสนิม", "แกลลอน", 0.0013, ["สีรองพื้นกันสนิม", "สีรองพื้น"], 5),
          laborResource("steel_fabrication", "ค่าแรงผลิตและติดตั้ง", "กก.", 1),
          equipmentResource("steel_lifting", "เครื่องมือเชื่อมและยกติดตั้ง", "กก.", 1),
        ],
      },
      manualTradeItem({ id: "misc_structural_steel", code: "E02", name: "โครงสร้างเหล็กและงานเหล็กประกอบอื่นๆ", unit: "กก.", hint: "น้ำหนักเหล็กรวมจากรายการตัดและ Shop drawing", keywords: ["เหล็กรูปพรรณ", "เหล็กกล่อง", "เหล็ก"] , includeEquipment: true }),
    ],
  },
  {
    id: "architectural_roof", code: "F", title: "งานหลังคาและวัสดุหลังคา", discipline: "architecture",
    items: [
      manualTradeItem({ id: "roof_covering", code: "F01", name: "วัสดุมุงหลังคาพร้อมอุปกรณ์ยึด", unit: "ตร.ม.", hint: "พื้นที่หลังคาตามความลาด รวมระยะซ้อนทับ", keywords: ["กระเบื้องหลังคา", "วัสดุมุงหลังคา", "เมทัลชีท"] }),
      manualTradeItem({ id: "roof_insulation", code: "F02", name: "ฉนวนกันความร้อนใต้หลังคา", unit: "ตร.ม.", hint: "พื้นที่ติดตั้งฉนวนจริง", keywords: ["ฉนวนกันความร้อน", "ฉนวน"] }),
      manualTradeItem({ id: "roof_flashing", code: "F03", name: "ครอบหลังคา แผ่นปิดรอยต่อ และ Flashing", unit: "ม.", hint: "ความยาวรวมตามแนวสัน ตะเข้ และรอยต่อ", keywords: ["ครอบหลังคา", "แผ่นปิดรอยต่อ"] }),
      manualTradeItem({ id: "roof_gutter", code: "F04", name: "รางน้ำฝนและท่อระบายน้ำฝน", unit: "ม.", hint: "ความยาวรางและท่อรวมทั้งหมด", keywords: ["รางน้ำฝน", "ท่อพีวีซี", "ท่อ"] }),
      manualTradeItem({ id: "fascia_board", code: "F05", name: "เชิงชายและปั้นลม", unit: "ม.", hint: "ความยาวติดตั้งรวม", keywords: ["ไม้เชิงชาย", "เชิงชาย"] }),
    ],
  },
  {
    id: "architectural_wall", code: "G", title: "งานผนังก่อและฉาบ", discipline: "architecture",
    items: [
      manualTradeItem({ id: "masonry_wall", code: "G01", name: "ผนังก่ออิฐมอญ/อิฐบล็อก/อิฐมวลเบา", unit: "ตร.ม.", hint: "พื้นที่ผนังสุทธิหักช่องเปิด", keywords: ["อิฐมอญ", "อิฐบล็อก", "อิฐมวลเบา", "อิฐ"] }),
      manualTradeItem({ id: "internal_plaster", code: "G02", name: "ฉาบปูนผนังภายใน", unit: "ตร.ม.", hint: "พื้นที่ฉาบจริงรวมเสาและคานที่ต้องฉาบ", keywords: ["ปูนฉาบ", "ปูนซีเมนต์"] }),
      manualTradeItem({ id: "external_plaster", code: "G03", name: "ฉาบปูนผนังภายนอก", unit: "ตร.ม.", hint: "พื้นที่ฉาบภายนอกสุทธิ", keywords: ["ปูนฉาบ", "ปูนซีเมนต์"] }),
      manualTradeItem({ id: "wall_lintel", code: "G04", name: "เอ็นและทับหลังผนัง", unit: "ม.", hint: "ความยาวเอ็นและทับหลังรอบช่องเปิด", keywords: ["เหล็กเส้น", "คอนกรีต"] }),
    ],
  },
  {
    id: "architectural_ceiling", code: "H", title: "งานฝ้าเพดาน", discipline: "architecture",
    items: [
      manualTradeItem({ id: "gypsum_ceiling", code: "H01", name: "ฝ้ายิปซัมฉาบเรียบพร้อมโครงคร่าว", unit: "ตร.ม.", hint: "พื้นที่ฝ้าภายในสุทธิ", keywords: ["แผ่นยิปซัม", "ยิปซัม", "โครงคร่าว"] }),
      manualTradeItem({ id: "eaves_ceiling", code: "H02", name: "ฝ้าชายคาภายนอกพร้อมโครงคร่าว", unit: "ตร.ม.", hint: "พื้นที่ฝ้าชายคาและภายนอก", keywords: ["แผ่นไฟเบอร์ซีเมนต์", "ฝ้าชายคา"] }),
      manualTradeItem({ id: "ceiling_access", code: "H03", name: "ช่องเปิดเซอร์วิสและอุปกรณ์ฝ้า", unit: "ชุด", hint: "จำนวนช่องเซอร์วิสและอุปกรณ์ประกอบ", keywords: ["ช่องเซอร์วิส", "อุปกรณ์ฝ้า"] }),
    ],
  },
  {
    id: "architectural_finish", code: "I", title: "งานผิวตกแต่งพื้นและผนัง", discipline: "architecture",
    items: [
      manualTradeItem({ id: "floor_tile", code: "I01", name: "กระเบื้องพื้นพร้อมปูนกาวและยาแนว", unit: "ตร.ม.", hint: "พื้นที่ปูจริง รวมเศษตัดตามรูปแบบการปู", keywords: ["กระเบื้องปูพื้น", "กระเบื้อง", "ปูนกาว"] }),
      manualTradeItem({ id: "wall_tile", code: "I02", name: "กระเบื้องผนังพร้อมปูนกาวและยาแนว", unit: "ตร.ม.", hint: "พื้นที่กรุผนังจริง", keywords: ["กระเบื้องบุผนัง", "กระเบื้อง", "ปูนกาว"] }),
      manualTradeItem({ id: "vinyl_laminate_floor", code: "I03", name: "พื้นลามิเนต/ไวนิล/วัสดุปูพื้นอื่น", unit: "ตร.ม.", hint: "พื้นที่ติดตั้งสุทธิ", keywords: ["พื้นลามิเนต", "กระเบื้องยาง", "ไวนิล"] }),
      manualTradeItem({ id: "skirting", code: "I04", name: "บัวเชิงผนังและวัสดุปิดขอบ", unit: "ม.", hint: "ความยาวติดตั้งรวม", keywords: ["บัวเชิงผนัง", "บัว"] }),
      manualTradeItem({ id: "floor_screed", code: "I05", name: "ปูนปรับระดับและงานเตรียมผิว", unit: "ตร.ม.", hint: "พื้นที่ปรับระดับก่อนปูผิวสำเร็จ", keywords: ["ปูนปรับระดับ", "ปูนซีเมนต์"] }),
    ],
  },
  {
    id: "architectural_sanitary", code: "J", title: "งานสุขภัณฑ์", discipline: "architecture",
    items: [
      manualTradeItem({ id: "toilet_fixture", code: "J01", name: "โถสุขภัณฑ์พร้อมอุปกรณ์", unit: "ชุด", hint: "จำนวนชุดที่ติดตั้งครบพร้อมใช้งาน", keywords: ["โถสุขภัณฑ์", "สุขภัณฑ์"] }),
      manualTradeItem({ id: "wash_basin", code: "J02", name: "อ่างล้างหน้าพร้อมก๊อกและอุปกรณ์", unit: "ชุด", hint: "จำนวนชุดอ่างล้างหน้า", keywords: ["อ่างล้างหน้า", "ก๊อกน้ำ"] }),
      manualTradeItem({ id: "shower_set", code: "J03", name: "ฝักบัวและชุดก๊อกอาบน้ำ", unit: "ชุด", hint: "จำนวนชุดฝักบัวและก๊อก", keywords: ["ฝักบัว", "ก๊อกน้ำ"] }),
      manualTradeItem({ id: "bathroom_accessory", code: "J04", name: "อุปกรณ์ประกอบห้องน้ำ", unit: "ชุด", hint: "กระจก ราวแขวน ที่ใส่กระดาษ และอุปกรณ์อื่น", keywords: ["อุปกรณ์ห้องน้ำ"] }),
    ],
  },
  {
    id: "architectural_opening", code: "K", title: "งานประตูหน้าต่าง", discipline: "architecture",
    items: [
      manualTradeItem({ id: "solid_door", code: "K01", name: "ประตูบานทึบพร้อมวงกบและอุปกรณ์", unit: "ชุด", hint: "จำนวนชุดประตูพร้อม Hardware", keywords: ["ประตู", "วงกบ"] }),
      manualTradeItem({ id: "aluminium_door", code: "K02", name: "ประตูอะลูมิเนียมและกระจก", unit: "ตร.ม.", hint: "พื้นที่กรอบและกระจกรวม", keywords: ["อะลูมิเนียม", "กระจก", "ประตู"] }),
      manualTradeItem({ id: "aluminium_window", code: "K03", name: "หน้าต่างอะลูมิเนียมและกระจก", unit: "ตร.ม.", hint: "พื้นที่ช่องหน้าต่างรวมกรอบ", keywords: ["อะลูมิเนียม", "กระจก", "หน้าต่าง"] }),
      manualTradeItem({ id: "door_hardware", code: "K04", name: "อุปกรณ์ประตูและหน้าต่างเพิ่มเติม", unit: "ชุด", hint: "ลูกบิด กุญแจ บานพับ มือจับ และอุปกรณ์พิเศษ", keywords: ["บานพับ", "ลูกบิด", "มือจับ"] }),
    ],
  },
  {
    id: "architectural_paint", code: "L", title: "งานสี", discipline: "architecture",
    items: [
      manualTradeItem({ id: "internal_paint", code: "L01", name: "สีผนังและฝ้าภายใน", unit: "ตร.ม.", hint: "พื้นที่ทาสีรวมรองพื้นและสีทับหน้า", keywords: ["สีทาภายใน", "สีรองพื้น", "สี"] }),
      manualTradeItem({ id: "external_paint", code: "L02", name: "สีผนังภายนอก", unit: "ตร.ม.", hint: "พื้นที่ทาสีภายนอกรวมรองพื้น", keywords: ["สีทาภายนอก", "สีรองพื้น", "สี"] }),
      manualTradeItem({ id: "steel_wood_paint", code: "L03", name: "สีงานเหล็กและงานไม้", unit: "ตร.ม.", hint: "พื้นที่ผิวที่ต้องทาสีหรือเคลือบ", keywords: ["สีรองพื้นกันสนิม", "สีน้ำมัน", "สี"] }),
    ],
  },
  {
    id: "architectural_other", code: "M", title: "งานตกแต่งทางสถาปัตยกรรมอื่นๆ", discipline: "architecture",
    items: [
      manualTradeItem({ id: "built_in", code: "M01", name: "งานบิลต์อินและเคาน์เตอร์", unit: "ม.", hint: "ความยาวหรือปริมาณตามแบบตกแต่ง", keywords: ["ไม้อัด", "ลามิเนต"] }),
      manualTradeItem({ id: "handrail", code: "M02", name: "ราวกันตกและราวบันได", unit: "ม.", hint: "ความยาวราวรวมทั้งหมด", keywords: ["ราวกันตก", "สแตนเลส", "เหล็ก"] }),
      manualTradeItem({ id: "architectural_misc", code: "M03", name: "งานตกแต่งและงานสถาปัตยกรรมอื่น", unit: "งาน", hint: "กรอกจำนวนงานและกำหนดราคาวัสดุ/ค่าแรงเอง", keywords: [] }),
    ],
  },
  {
    id: "system_electrical", code: "N", title: "งานไฟฟ้า", discipline: "system",
    items: [
      manualTradeItem({ id: "lighting_point", code: "N01", name: "จุดแสงสว่างและการเดินสาย", unit: "จุด", hint: "จำนวนจุดตามแบบไฟฟ้า", keywords: ["สายไฟ", "ท่อร้อยสาย"] }),
      manualTradeItem({ id: "socket_point", code: "N02", name: "จุดเต้ารับและการเดินสาย", unit: "จุด", hint: "จำนวนจุดเต้ารับทั้งหมด", keywords: ["เต้ารับ", "สายไฟ", "ท่อร้อยสาย"] }),
      manualTradeItem({ id: "switch_point", code: "N03", name: "สวิตช์และอุปกรณ์ควบคุม", unit: "จุด", hint: "จำนวนจุดสวิตช์และอุปกรณ์ควบคุม", keywords: ["สวิตช์", "สายไฟ"] }),
      manualTradeItem({ id: "consumer_unit", code: "N04", name: "ตู้ไฟฟ้า MDB/Consumer Unit", unit: "ชุด", hint: "จำนวนตู้พร้อมอุปกรณ์ป้องกัน", keywords: ["ตู้ไฟ", "เซอร์กิตเบรกเกอร์"] }),
      manualTradeItem({ id: "main_cable", code: "N05", name: "สายเมนและสายป้อน", unit: "ม.", hint: "ความยาวสายตามแบบและขนาดสาย", keywords: ["สายไฟ", "สายเคเบิล"] }),
      manualTradeItem({ id: "grounding_system", code: "N06", name: "ระบบสายดินและหลักดิน", unit: "ชุด", hint: "จำนวนชุดระบบสายดิน", keywords: ["สายดิน", "หลักดิน"] }),
      manualTradeItem({ id: "light_fixture", code: "N07", name: "โคมไฟและอุปกรณ์ประกอบ", unit: "ชุด", hint: "จำนวนโคมตามประเภท", keywords: ["โคมไฟ", "หลอดไฟ"] }),
    ],
  },
  {
    id: "system_plumbing", code: "O", title: "งานประปา", discipline: "system",
    items: [
      manualTradeItem({ id: "water_supply_pipe", code: "O01", name: "ท่อน้ำดีพร้อมข้อต่อ", unit: "ม.", hint: "ความยาวแยกตามชนิดและขนาดท่อ", keywords: ["ท่อน้ำดี", "ท่อพีวีซี", "ท่อ"] }),
      manualTradeItem({ id: "water_valve", code: "O02", name: "วาล์วและอุปกรณ์ควบคุมน้ำ", unit: "ชุด", hint: "จำนวนวาล์วและอุปกรณ์", keywords: ["วาล์ว", "ประตูน้ำ"] }),
      manualTradeItem({ id: "water_pump", code: "O03", name: "ปั๊มน้ำพร้อมอุปกรณ์ติดตั้ง", unit: "ชุด", hint: "จำนวนชุดปั๊มน้ำตามกำลังและสเปก", keywords: ["ปั๊มน้ำ"] }),
      manualTradeItem({ id: "water_tank", code: "O04", name: "ถังเก็บน้ำพร้อมฐานและอุปกรณ์", unit: "ใบ", hint: "จำนวนและความจุถังเก็บน้ำ", keywords: ["ถังเก็บน้ำ", "ถังน้ำ"] }),
    ],
  },
  {
    id: "system_sanitary", code: "P", title: "งานสุขาภิบาลและระบายน้ำ", discipline: "system",
    items: [
      manualTradeItem({ id: "waste_pipe", code: "P01", name: "ท่อน้ำทิ้งพร้อมข้อต่อ", unit: "ม.", hint: "ความยาวแยกตามชนิดและขนาดท่อ", keywords: ["ท่อน้ำทิ้ง", "ท่อพีวีซี", "ท่อ"] }),
      manualTradeItem({ id: "soil_pipe", code: "P02", name: "ท่อโสโครกและท่ออากาศ", unit: "ม.", hint: "ความยาวท่อรวมตามแบบสุขาภิบาล", keywords: ["ท่อโสโครก", "ท่อพีวีซี", "ท่อ"] }),
      manualTradeItem({ id: "floor_drain", code: "P03", name: "ตะแกรงรับน้ำและ Floor Drain", unit: "จุด", hint: "จำนวนจุดระบายน้ำ", keywords: ["ตะแกรงระบายน้ำ", "ฟลอร์เดรน"] }),
      manualTradeItem({ id: "inspection_chamber", code: "P04", name: "บ่อพักและบ่อระบายน้ำ", unit: "บ่อ", hint: "จำนวนบ่อตามแบบและขนาด", keywords: ["บ่อพัก", "ฝาบ่อ"] }),
      manualTradeItem({ id: "treatment_tank", code: "P05", name: "ถังบำบัดน้ำเสีย/บ่อเกรอะ", unit: "ชุด", hint: "จำนวนชุดและความจุตามแบบ", keywords: ["ถังบำบัด", "ถังบำบัดน้ำเสีย"] }),
      manualTradeItem({ id: "drainage_channel", code: "P06", name: "รางระบายน้ำและงานระบายน้ำภายนอก", unit: "ม.", hint: "ความยาวรางระบายน้ำรวม", keywords: ["รางระบายน้ำ", "ท่อระบายน้ำ"] }),
    ],
  },
];

const ALL_ITEMS = BOQ_SECTIONS.flatMap((section) => section.items.map((item) => ({
  ...item,
  sectionId: section.id,
  sectionTitle: section.title,
  discipline: section.discipline,
  disciplineTitle: BOQ_DISCIPLINES[section.discipline],
})));
const REBAR_RESOURCE_KEYS = new Set(["rebar", "binding_wire", "rebar_labor"]);
const EXPORT_CATEGORIES = [
  { discipline: "structure", title: "งานดิน" },
  { discipline: "structure", title: "งานเสาเข็มและฐานราก" },
  { discipline: "structure", title: "งานคอนกรีตและแบบหล่อ" },
  { discipline: "structure", title: "งานเหล็กเสริม" },
  { discipline: "structure", title: "งานแผ่นพื้นสำเร็จรูป" },
  { discipline: "structure", title: "งานเหล็กรูปพรรณ" },
  { discipline: "architecture", title: "งานหลังคาและวัสดุหลังคา" },
  { discipline: "architecture", title: "งานผนังก่อและฉาบ" },
  { discipline: "architecture", title: "งานฝ้าเพดาน" },
  { discipline: "architecture", title: "งานผิวตกแต่งพื้นและผนัง" },
  { discipline: "architecture", title: "งานสุขภัณฑ์" },
  { discipline: "architecture", title: "งานประตูหน้าต่าง" },
  { discipline: "architecture", title: "งานสี" },
  { discipline: "architecture", title: "งานตกแต่งทางสถาปัตยกรรมอื่นๆ" },
  { discipline: "system", title: "งานไฟฟ้า" },
  { discipline: "system", title: "งานประปา" },
  { discipline: "system", title: "งานสุขาภิบาลและระบายน้ำ" },
];

function exportCategoryFor(item, resource) {
  if (item.discipline !== "structure") return item.sectionTitle;
  if (item.sectionId === "earthwork") return "งานดิน";
  if (item.sectionId === "precast") return "งานแผ่นพื้นสำเร็จรูป";
  if (item.sectionId === "structural_steel") return "งานเหล็กรูปพรรณ";
  if (item.sectionId === "foundation") return "งานเสาเข็มและฐานราก";
  if (REBAR_RESOURCE_KEYS.has(resource.key)) return "งานเหล็กเสริม";
  if (item.sectionId === "superstructure") return "งานคอนกรีตและแบบหล่อ";
  return item.sectionTitle;
}
const SAMPLE_QUANTITIES = { site_clearance: 180, excavation: 42, sand_fill: 28, stone_fill: 12, lean_concrete: 2.8, concrete_pile: 216, footing: 12.5, pile_cap: 7.2, pedestal: 2.4, ground_beam: 16.8, column: 13.5, beam: 25.8, slab_ground: 18, slab_suspended: 21, stair: 4.2, lintel_canopy: 3.4, roof_steel: 2850 };
const SAMPLE_EXACT_TAKEOFF = {
  footing: { concrete: 12.5, rebar: 1188, formwork: 69 },
  pile_cap: { concrete: 7.2, rebar: 900, formwork: 43 },
  pedestal: { concrete: 2.4, rebar: 408, formwork: 24 },
  ground_beam: { concrete: 16.8, rebar: 3108, formwork: 151 },
  column: { concrete: 13.5, rebar: 2835, formwork: 176 },
  beam: { concrete: 25.8, rebar: 5289, formwork: 284 },
  slab_ground: { concrete: 18, rebar: 1620, formwork: 22 },
  slab_suspended: { concrete: 21, rebar: 2835, formwork: 189 },
  stair: { concrete: 4.2, rebar: 693, formwork: 50 },
  lintel_canopy: { concrete: 3.4, rebar: 612, formwork: 48 },
};

function normalizeUnit(unit = "") {
  return String(unit)
    .replace(/บาท\s*\//g, "")
    .replace(/บาทต่อ/g, "")
    .replace(/\s/g, "")
    .toLowerCase();
}

function materialId(material) {
  return String(
    material?.id ??
      material?.code ??
      material?.material_id ??
      material?.name ??
      material?.material_name ??
      ""
  );
}

function materialName(material) {
  return String(material?.name ?? material?.material_name ?? material?.title ?? "ไม่ระบุชื่อวัสดุ");
}

function materialUnit(material) {
  return String(material?.unit ?? material?.price_unit ?? material?.unit_name ?? "");
}

function materialPrice(material) {
  return number(
    material?.price ??
      material?.currentPrice ??
      material?.current_price ??
      material?.latestPrice ??
      material?.latest_price
  );
}

function canonicalUnit(unit = "") {
  const value = normalizeUnit(unit).replace(/[()]/g, "");
  if (value.includes("ลูกบาศก์เมตร") || value.includes("ลบ.ม") || value.includes("m3") || value.includes("ม³")) return "m3";
  if (value.includes("ตารางเมตร") || value.includes("ตร.ม") || value.includes("m2") || value.includes("ม²")) return "m2";
  if (value.includes("กิโลกรัม") || value.includes("กก") || value.includes("kg")) return "kg";
  if (value.includes("เมตริกตัน") || value.includes("ตัน")) return "ton";
  if (value.includes("แกลลอน")) return "gallon";
  if (value.includes("ลิตร")) return "litre";
  if (value.includes("แผ่น")) return "sheet";
  if (value.includes("ถุง")) return "bag";
  if (value.includes("เส้น")) return "bar";
  if (value.includes("ท่อน")) return "piece";
  if (value.includes("เมตร") || value === "ม." || value === "ม") return "m";
  return value.replace(/\./g, "");
}

function convertedOfficialPrice(material, targetUnit) {
  const source = canonicalUnit(materialUnit(material));
  const target = canonicalUnit(targetUnit);
  const officialPrice = materialPrice(material);
  if (!officialPrice || !source || !target) return null;
  if (source === target) return officialPrice;
  if (source === "ton" && target === "kg") return officialPrice / 1000;
  if (source === "kg" && target === "ton") return officialPrice * 1000;
  return null;
}

function compatibleMaterials(resource) {
  if (!Array.isArray(materials)) return [];
  return materials.filter((material) => convertedOfficialPrice(material, resource.unit) !== null);
}

function materialMatchScore(resource, material) {
  const name = materialName(material).toLowerCase();
  return resource.keywords.reduce(
    (score, keyword) => score + (name.includes(keyword.toLowerCase()) ? keyword.length : 0),
    0
  );
}

function selectableMaterials(resource) {
  const compatible = compatibleMaterials(resource);
  const related = compatible
    .map((material) => ({ material, score: materialMatchScore(resource, material) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.material);
  return related.length ? related : compatible;
}

function catalogPriceFor(resource, selectedMaterialId) {
  const compatible = compatibleMaterials(resource);
  if (!compatible.length) return null;

  const selected = selectedMaterialId
    ? compatible.find((material) => materialId(material) === String(selectedMaterialId))
    : null;

  const candidate = selected || selectableMaterials(resource).find(
    (material) => materialMatchScore(resource, material) > 0
  );

  if (!candidate) return null;
  return {
    price: convertedOfficialPrice(candidate, resource.unit),
    material: candidate,
    originalPrice: materialPrice(candidate),
    originalUnit: materialUnit(candidate),
    manuallySelected: Boolean(selected),
  };
}

// ML-ready contract: each material can expose forecasts/predictions as
// [{ months, price }] or { [months]: price }. No fallback forecast is invented.
function modelForecastPrice(material, months) {
  if (!material || months <= 0) return months <= 0 ? materialPrice(material) : null;

  const series = material.forecasts ?? material.predictions ?? material.forecast;
  if (Array.isArray(series)) {
    const exact = series.find((entry) =>
      number(entry?.months ?? entry?.horizonMonths ?? entry?.horizon_months) === months
    );
    const price = exact?.price ?? exact?.predictedPrice ?? exact?.predicted_price ?? exact?.value;
    return price === undefined || price === null ? null : number(price);
  }

  if (series && typeof series === "object") {
    const value = series[months] ?? series[String(months)];
    const price = typeof value === "object"
      ? value?.price ?? value?.predictedPrice ?? value?.predicted_price ?? value?.value
      : value;
    return price === undefined || price === null ? null : number(price);
  }

  return null;
}

function convertedModelForecastPrice(material, targetUnit, months) {
  const price = modelForecastPrice(material, months);
  if (price === null) return null;
  const source = canonicalUnit(materialUnit(material));
  const target = canonicalUnit(targetUnit);
  if (source === target) return price;
  if (source === "ton" && target === "kg") return price / 1000;
  if (source === "kg" && target === "ton") return price * 1000;
  return null;
}

function isReinforcedConcreteItem(item) {
  const keys = new Set(item.resources.map((resource) => resource.key));
  return keys.has("ready_concrete") && keys.has("rebar") && keys.has("formwork");
}

function professionalResourceQuantity(item, resource, exact, assumptions) {
  if (!isReinforcedConcreteItem(item)) return null;
  const concrete = number(exact?.concrete);
  const rebar = number(exact?.rebar);
  const formwork = number(exact?.formwork);

  switch (resource.key) {
    case "ready_concrete": return concrete;
    case "rebar": return rebar;
    case "binding_wire": return rebar * (number(assumptions.bindingWirePct) / 100);
    case "formwork": return formwork / Math.max(number(assumptions.plywoodCoverage), 0.001) / Math.max(number(assumptions.plywoodReuse), 1);
    case "formwork_nails": return formwork * number(assumptions.nailsPerSqm);
    case "concrete_labor":
    case "concrete_pump": return concrete;
    case "rebar_labor": return rebar;
    case "formwork_labor": return formwork;
    default: return 0;
  }
}

function calculateItem({
  item,
  qty,
  forecastMonths,
  materialSelections,
  takeoffMode,
  exactTakeoff,
  assumptions,
  quantityOverrides,
  currentRateOverrides,
  futureRateOverrides,
  wasteOverrides,
}) {
  const resources = item.resources.map((resource) => {
    const catalog = resource.type === "material"
      ? catalogPriceFor(resource, materialSelections[resource.key])
      : null;
    const resourceKey = `${item.id}:${resource.key}`;
    const hasCurrentOverride = hasOwn(currentRateOverrides, resource.key);
    const hasFutureOverride = resource.type === "material" && hasOwn(futureRateOverrides, resource.key);
    const currentUnitPrice = hasCurrentOverride
      ? number(currentRateOverrides[resource.key])
      : resource.type === "material"
        ? (catalog?.price ?? 0)
        : 0;
    const currentRateSource = hasCurrentOverride
      ? "manual"
      : resource.type === "material" && catalog
        ? "official"
        : "missing";
    const officialPriceMissing = resource.type === "material" && !catalog && !hasCurrentOverride;
    const rateMissing = currentUnitPrice <= 0;

    const defaultWaste = number(resource.wastePct);
    const wastePct = hasOwn(wasteOverrides, resource.key)
      ? number(wasteOverrides[resource.key])
      : defaultWaste;
    const professionalQty = professionalResourceQuantity(item, resource, exactTakeoff[item.id], assumptions);
    const baseQty = takeoffMode === "professional" && professionalQty !== null
      ? professionalQty
      : qty * resource.coefficient;
    const defaultCalculatedQty = baseQty * (1 + wastePct / 100);
    const calculatedQty = hasOwn(quantityOverrides, resourceKey)
      ? number(quantityOverrides[resourceKey])
      : defaultCalculatedQty;

    const modelPrice = resource.type === "material"
      ? (forecastMonths <= 0 ? currentUnitPrice : convertedModelForecastPrice(catalog?.material, resource.unit, forecastMonths))
      : currentUnitPrice;
    const futureUnitPrice = hasFutureOverride
      ? number(futureRateOverrides[resource.key])
      : modelPrice;
    const futureRateSource = hasFutureOverride
      ? "manual"
      : resource.type === "material"
        ? (modelPrice === null ? "missing" : "model")
        : "current";
    const futurePriceMissing = calculatedQty > 0 && (
      futureUnitPrice === null ||
      futureUnitPrice === undefined ||
      !Number.isFinite(Number(futureUnitPrice)) ||
      Number(futureUnitPrice) <= 0
    );
    return {
      ...resource,
      catalogMaterial: catalog?.material || null,
      officialOriginalPrice: catalog?.originalPrice ?? null,
      officialOriginalUnit: catalog?.originalUnit || "",
      officialPriceMissing,
      rateMissing,
      currentRateSource,
      futureRateSource,
      futurePriceMissing,
      wastePct,
      defaultCalculatedQty,
      calculatedQty,
      currentUnitPrice,
      futureUnitPrice,
      currentTotal: calculatedQty * currentUnitPrice,
      futureTotal: futurePriceMissing ? null : calculatedQty * futureUnitPrice,
    };
  });
  const currentComplete = resources.every((resource) => resource.calculatedQty <= 0 || !resource.rateMissing);
  const futureComplete = currentComplete && resources.every((resource) => !resource.futurePriceMissing);
  return {
    ...item,
    qty,
    resources,
    currentComplete,
    futureComplete,
    currentTotal: resources.reduce((sum, resource) => sum + resource.currentTotal, 0),
    futureTotal: futureComplete
      ? resources.reduce((sum, resource) => sum + (resource.futureTotal || 0), 0)
      : null,
  };
}

function applyMarkup(base, rates) {
  const overhead = base * (number(rates.overhead) / 100);
  const profit = (base + overhead) * (number(rates.profit) / 100);
  const contingency = (base + overhead + profit) * (number(rates.contingency) / 100);
  const beforeVat = base + overhead + profit + contingency;
  const vat = beforeVat * (number(rates.vat) / 100);
  return { base, overhead, profit, contingency, beforeVat, vat, grandTotal: beforeVat + vat };
}

export default function CostPlanner() {
  const [initialDraft] = useState(loadDraft);
  const [priceMode, setPriceMode] = useState(initialDraft.priceMode === "future" ? "future" : "current");
  const [takeoffMode, setTakeoffMode] = useState(initialDraft.takeoffMode || "professional");
  const [quantities, setQuantities] = useState(initialDraft.quantities || {});
  const [exactTakeoff, setExactTakeoff] = useState(initialDraft.exactTakeoff || {});
  const [materialSelections, setMaterialSelections] = useState(initialDraft.materialSelections || {});
  const [quantityOverrides, setQuantityOverrides] = useState(initialDraft.quantityOverrides || {});
  const [currentRateOverrides, setCurrentRateOverrides] = useState(initialDraft.currentRateOverrides || {});
  const [futureRateOverrides, setFutureRateOverrides] = useState(initialDraft.futureRateOverrides || {});
  const [wasteOverrides, setWasteOverrides] = useState(initialDraft.wasteOverrides || {});
  const [itemNotes, setItemNotes] = useState(initialDraft.itemNotes || {});
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [collapsedSections, setCollapsedSections] = useState(new Set());
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [forecastValue, setForecastValue] = useState(initialDraft.forecastValue ?? 1);
  const [forecastUnit, setForecastUnit] = useState(initialDraft.forecastUnit || "year");
  const [project, setProject] = useState(initialDraft.project || { name: "บ้านพักอาศัย", owner: "", location: "กรุงเทพมหานคร (ราคาส่วนกลาง)" });
  const [rates, setRates] = useState(initialDraft.rates || { overhead: 0, profit: 0, contingency: 0, vat: 7 });
  const [assumptions, setAssumptions] = useState(initialDraft.assumptions || {
    bindingWirePct: 1.5,
    plywoodCoverage: 2.9768,
    plywoodReuse: 3,
    nailsPerSqm: 0.18,
  });
  const [savedAt, setSavedAt] = useState(initialDraft.savedAt || "");

  const requestedForecastMonths = Math.max(1, Math.round(number(forecastValue) * (forecastUnit === "year" ? 12 : 1)));
  const forecastMonths = priceMode === "future" ? requestedForecastMonths : 0;
  const forecastLabel = formatForecastPeriod(forecastMonths);
  const comparisonLabel = forecastMonths > 0 ? `อีก ${forecastLabel}` : "ราคาปัจจุบัน";
  const comparisonPriceLabel = forecastMonths > 0 ? `ราคาอีก ${forecastLabel}` : "ราคาปัจจุบัน";
  const targetDateLabel = forecastDate(forecastMonths);
  const todayLabel = new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
  const selectedPriceLabel = priceMode === "future" ? `ราคาคาดการณ์ในอีก ${forecastLabel}` : "ราคาปัจจุบัน";
  const selectedDateLabel = priceMode === "future" ? targetDateLabel : todayLabel;

  const calculatedItems = useMemo(
    () => ALL_ITEMS.map((item) => calculateItem({
      item,
      qty: number(quantities[item.id]),
      forecastMonths,
      materialSelections,
      takeoffMode,
      exactTakeoff,
      assumptions,
      quantityOverrides,
      currentRateOverrides,
      futureRateOverrides,
      wasteOverrides,
    })),
    [quantities, forecastMonths, materialSelections, takeoffMode, exactTakeoff, assumptions, quantityOverrides, currentRateOverrides, futureRateOverrides, wasteOverrides]
  );
  const currentDirect = calculatedItems.reduce((sum, item) => sum + item.currentTotal, 0);
  const currentSummary = applyMarkup(currentDirect, rates);
  const activeItems = calculatedItems.filter((item) => item.resources.some((resource) => resource.calculatedQty > 0));
  const currentComplete = activeItems.length > 0 && activeItems.every((item) => item.currentComplete);
  const futureComplete = activeItems.length > 0 && activeItems.every((item) => item.futureComplete);
  const futureDirect = futureComplete
    ? activeItems.reduce((sum, item) => sum + (item.futureTotal || 0), 0)
    : null;
  const futureSummary = futureDirect === null ? null : applyMarkup(futureDirect, rates);
  const selectedSummary = priceMode === "future" ? futureSummary : currentSummary;
  const selectedComplete = priceMode === "future" ? futureComplete : currentComplete;
  const selectedDirect = priceMode === "future" ? futureDirect : currentDirect;
  const difference = futureSummary ? futureSummary.grandTotal - currentSummary.grandTotal : null;
  const differencePercent = difference !== null && currentSummary.grandTotal > 0
    ? (difference / currentSummary.grandTotal) * 100
    : null;
  const missingOfficialResources = activeItems.flatMap((item) =>
    item.resources.filter((resource) => resource.officialPriceMissing)
  );
  const uniqueMissingMaterialKeys = [...new Set(missingOfficialResources.map((resource) => resource.key))];
  const missingCurrentRates = [...new Set(activeItems.flatMap((item) =>
    item.resources.filter((resource) => resource.calculatedQty > 0 && resource.rateMissing).map((resource) => resource.key)
  ))];
  const missingForecastRates = [...new Set(activeItems.flatMap((item) =>
    item.resources.filter((resource) => resource.calculatedQty > 0 && (resource.futurePriceMissing || resource.rateMissing)).map((resource) => resource.key)
  ))];

  const totalsByType = useMemo(() => {
    const totals = { material: 0, labor: 0, equipment: 0 };
    calculatedItems.forEach((item) => item.resources.forEach((resource) => {
      const value = priceMode === "future" ? resource.futureTotal : resource.currentTotal;
      if (value !== null && value !== undefined) totals[resource.type] += value;
    }));
    return totals;
  }, [calculatedItems, priceMode]);

  const updateQuantity = (id, value) => setQuantities((current) => ({ ...current, [id]: value === "" ? "" : number(value) }));
  const updateExactTakeoff = (id, key, value) => {
    setExactTakeoff((current) => ({
      ...current,
      [id]: { ...(current[id] || {}), [key]: value === "" ? "" : number(value) },
    }));
  };
  const updateMapValue = (setter, key, value, removeWhenBlank = false) => {
    setter((current) => {
      const next = { ...current };
      if (removeWhenBlank && value === "") delete next[key];
      else next[key] = number(value);
      return next;
    });
  };
  const selectOfficialMaterial = (resourceKey, value) => {
    setMaterialSelections((current) => {
      const next = { ...current };
      if (value) next[resourceKey] = value;
      else delete next[resourceKey];
      return next;
    });
  };
  const toggleRow = (id) => setExpandedRows((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleSection = (id) => setCollapsedSections((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const scrollToSection = (id) => {
    setCollapsedSections((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => document.getElementById(`boq-section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };
  const scrollToSummary = () => {
    if (typeof window !== "undefined") document.getElementById("boq-summary")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const loadSample = () => {
    setQuantities(SAMPLE_QUANTITIES);
    setExactTakeoff(SAMPLE_EXACT_TAKEOFF);
    setExpandedRows(new Set(["footing", "column", "beam", "slab_suspended"]));
  };
  const resetPlan = () => {
    setQuantities({});
    setExactTakeoff({});
    setMaterialSelections({});
    setQuantityOverrides({});
    setCurrentRateOverrides({});
    setFutureRateOverrides({});
    setWasteOverrides({});
    setItemNotes({});
    setExpandedRows(new Set());
  };
  const saveDraft = () => {
    if (typeof window === "undefined") return;
    const nextSavedAt = new Date().toISOString();
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
      takeoffMode,
      quantities,
      exactTakeoff,
      materialSelections,
      quantityOverrides,
      currentRateOverrides,
      futureRateOverrides,
      wasteOverrides,
      itemNotes,
      priceMode,
      forecastValue,
      forecastUnit,
      project,
      rates,
      assumptions,
      savedAt: nextSavedAt,
    }));
    setSavedAt(nextSavedAt);
  };

  const exportBOQ = () => {
    const showFuture = priceMode === "future";
    const columnCount = showFuture ? 21 : 18;
    const blankRow = () => Array(columnCount).fill("");
    const formatSource = (resource, future = false) => {
      const source = future ? resource.futureRateSource : resource.currentRateSource;
      if (source === "official") return "ราคากลางวัสดุภาครัฐ";
      if (source === "model") return "ML จากข้อมูลราคาวัสดุ";
      if (source === "manual") return "ผู้ใช้กำหนด/ใบเสนอราคา";
      if (source === "current") return "คงอัตราปัจจุบัน (ไม่ใช่ ML)";
      return "ยังไม่ระบุ";
    };
    const makeDetailRow = ({
      sequence = "", discipline = "", section = "", code = "", name = "",
      workQty = "", workUnit = "", materialQty = "", materialUnit = "",
      materialRate = "", materialTotal = "", laborQty = "", laborUnit = "",
      laborRate = "", laborTotal = "", currentTotal = "", futureMaterialRate = "",
      futureMaterialTotal = "", futureTotal = "", source = "", note = "",
    }) => [
      sequence, discipline, section, code, name, workQty, workUnit,
      materialQty, materialUnit, materialRate, materialTotal,
      laborQty, laborUnit, laborRate, laborTotal, currentTotal,
      ...(showFuture ? [futureMaterialRate, futureMaterialTotal, futureTotal] : []),
      source, note,
    ];
    const makeTotalRow = (label, currentValue, futureValue = "") => {
      const row = blankRow();
      row[4] = label;
      row[15] = currentValue;
      if (showFuture) row[18] = futureValue;
      return row;
    };
    const rows = [
      ["บัญชีรายการก่อสร้าง (BOQ)"],
      ["ชื่อโครงการ", project.name],
      ["เจ้าของโครงการ", project.owner],
      ["สถานที่", project.location],
      ["วิธีคำนวณปริมาณ", takeoffMode === "professional" ? "กรอกจากแบบก่อสร้าง - ปริมาณตรวจสอบแล้ว" : "ประมาณงบเบื้องต้น - ใช้สัมประสิทธิ์"],
      ["ฐานราคาที่เลือก", selectedPriceLabel],
      ["วันที่/เดือนเป้าหมาย", selectedDateLabel],
      ...(priceMode === "future" ? [["ระยะวางแผน", forecastLabel]] : []),
      ["แหล่งราคาวัสดุ", OFFICIAL_PRICE_URL],
      ["คำเตือนสำคัญ", OFFICIAL_PRICE_NOTE],
      ["ขอบเขต ML", "ระบบพยากรณ์เฉพาะราคาวัสดุก่อสร้าง ค่าแรงและเครื่องจักรคงอัตราปัจจุบันหรือใช้ค่าที่ผู้ใช้กรอก ไม่ใช่ผลพยากรณ์จาก ML"],
      ["หมายเหตุรูปแบบ", "CSV ไม่รองรับการรวมเซลล์ เส้นตาราง หรือสีเหมือนไฟล์ Excel แต่จัดลำดับคอลัมน์ตามรูปแบบ BOQ มาตรฐาน"],
      [],
      [
        "ลำดับ", "หมวดหลัก", "หมวดงาน", "รหัส", "รายการ", "ปริมาณงาน", "",
        "วัสดุ", "", "", "", "แรงงาน/เครื่องจักร", "", "", "", "รวมปัจจุบัน",
        ...(showFuture ? ["วัสดุอนาคต (ML/ผู้ใช้กำหนด)", "", "รวมอนาคต"] : []),
        "แหล่งราคา", "หมายเหตุ",
      ],
      [
        "", "", "", "", "", "จำนวน", "หน่วย",
        "จำนวน", "หน่วย", "บาท/หน่วย", "รวม",
        "จำนวน", "หน่วย", "บาท/หน่วย", "รวม", "วัสดุ+แรงงาน/เครื่องจักร",
        ...(showFuture ? ["บาท/หน่วย", "รวมวัสดุ", "วัสดุคาดการณ์+ค่าแรง/เครื่องจักรเดิม"] : []),
        "", "",
      ],
    ];

    let sequence = 0;
    Object.entries(BOQ_DISCIPLINES).forEach(([disciplineKey, disciplineTitle]) => {
      const disciplineItems = activeItems.filter((item) => item.discipline === disciplineKey);
      if (!disciplineItems.length) return;

      const disciplineHeader = blankRow();
      disciplineHeader[1] = disciplineTitle;
      disciplineHeader[4] = `รายละเอียด${disciplineTitle}`;
      rows.push([], disciplineHeader);

      EXPORT_CATEGORIES.filter((category) => category.discipline === disciplineKey).forEach((category) => {
        const categoryItems = disciplineItems
          .map((item) => ({
            item,
            resources: item.resources.filter((resource) => resource.calculatedQty > 0 && exportCategoryFor(item, resource) === category.title),
          }))
          .filter((entry) => entry.resources.length > 0);
        if (!categoryItems.length) return;

        const categoryHeader = blankRow();
        categoryHeader[2] = category.title;
        categoryHeader[4] = category.title;
        rows.push(categoryHeader);

        categoryItems.forEach(({ item, resources }) => {
          sequence += 1;
          const materialResources = resources.filter((resource) => resource.type === "material");
          const laborResources = resources.filter((resource) => resource.type !== "material");
          const materialCurrent = materialResources.reduce((sum, resource) => sum + resource.currentTotal, 0);
          const laborCurrent = laborResources.reduce((sum, resource) => sum + resource.currentTotal, 0);
          const categoryFutureComplete = resources.every((resource) => !resource.futurePriceMissing);
          const materialFutureComplete = materialResources.every((resource) => !resource.futurePriceMissing);
          const materialFuture = materialFutureComplete
            ? materialResources.reduce((sum, resource) => sum + (resource.futureTotal || 0), 0)
            : "";
          const exact = exactTakeoff[item.id] || {};
          const isExactConcrete = takeoffMode === "professional" && isReinforcedConcreteItem(item);
          const workQty = isExactConcrete
            ? category.title === "งานเหล็กเสริม" ? (exact.rebar ?? "") : (exact.concrete ?? "")
            : item.qty;
          const workUnit = isExactConcrete
            ? category.title === "งานเหล็กเสริม" ? "กก. (เหล็กจากแบบ/BBS)" : "ลบ.ม. (คอนกรีตจากแบบ)"
            : item.unit;
          const categoryCurrent = resources.reduce((sum, resource) => sum + resource.currentTotal, 0);
          const categoryFuture = categoryFutureComplete
            ? resources.reduce((sum, resource) => sum + (resource.futureTotal || 0), 0)
            : "";

          rows.push(makeDetailRow({
            sequence,
            discipline: disciplineTitle,
            section: category.title,
            code: item.code,
            name: item.name,
            workQty,
            workUnit,
            materialTotal: materialCurrent || "",
            laborTotal: laborCurrent || "",
            currentTotal: categoryCurrent,
            futureMaterialTotal: materialFuture,
            futureTotal: categoryFuture,
            source: "สรุปจากรายละเอียดทรัพยากรด้านล่าง",
            note: itemNotes[item.id] || "",
          }));

          resources.forEach((resource, resourceIndex) => {
            const isMaterial = resource.type === "material";
            const resourceDisplayName = resource.catalogMaterial
              ? materialName(resource.catalogMaterial)
              : resource.name;
            rows.push(makeDetailRow({
              sequence: `${sequence}.${resourceIndex + 1}`,
              discipline: disciplineTitle,
              section: category.title,
              code: item.code,
              name: `↳ ${resourceDisplayName}`,
              materialQty: isMaterial ? resource.calculatedQty : "",
              materialUnit: isMaterial ? resource.unit : "",
              materialRate: isMaterial && !resource.rateMissing ? resource.currentUnitPrice : "",
              materialTotal: isMaterial && !resource.rateMissing ? resource.currentTotal : "",
              laborQty: !isMaterial ? resource.calculatedQty : "",
              laborUnit: !isMaterial ? resource.unit : "",
              laborRate: !isMaterial && !resource.rateMissing ? resource.currentUnitPrice : "",
              laborTotal: !isMaterial && !resource.rateMissing ? resource.currentTotal : "",
              currentTotal: resource.rateMissing ? "" : resource.currentTotal,
              futureMaterialRate: isMaterial ? (resource.futureUnitPrice ?? "") : "",
              futureMaterialTotal: isMaterial ? (resource.futureTotal ?? "") : "",
              futureTotal: resource.futureTotal ?? "",
              source: showFuture && isMaterial ? `${formatSource(resource)} → ${formatSource(resource, true)}` : formatSource(resource),
              note: isMaterial
                ? `เผื่อสูญเสีย ${formatQty(resource.wastePct)}%${resource.currentRateSource === "official" ? " • ราคากลางภาครัฐ ไม่ใช่ราคาขายปลีก" : ""}`
                : "ค่าแรง/เครื่องจักรเป็นค่าที่ผู้ใช้กรอกและไม่ถูกพยากรณ์ด้วย ML",
            }));
          });
        });

        const categoryResources = categoryItems.flatMap((entry) => entry.resources);
        const categoryMaterialCurrent = categoryResources.filter((resource) => resource.type === "material").reduce((sum, resource) => sum + resource.currentTotal, 0);
        const categoryLaborCurrent = categoryResources.filter((resource) => resource.type !== "material").reduce((sum, resource) => sum + resource.currentTotal, 0);
        const categoryCurrent = categoryResources.reduce((sum, resource) => sum + resource.currentTotal, 0);
        const categoryFutureComplete = categoryResources.every((resource) => !resource.futurePriceMissing);
        const categoryFutureMaterial = categoryFutureComplete
          ? categoryResources.filter((resource) => resource.type === "material").reduce((sum, resource) => sum + (resource.futureTotal || 0), 0)
          : "";
        const categoryFuture = categoryFutureComplete ? categoryResources.reduce((sum, resource) => sum + (resource.futureTotal || 0), 0) : "";
        rows.push(makeDetailRow({
          name: `รวม${category.title}`,
          materialTotal: categoryMaterialCurrent,
          laborTotal: categoryLaborCurrent,
          currentTotal: categoryCurrent,
          futureMaterialTotal: categoryFutureMaterial,
          futureTotal: categoryFuture,
          note: "ยอดรวมหมวดงาน",
        }));
      });

      const disciplineMaterial = disciplineItems.reduce((sum, item) => sum + item.resources.filter((resource) => resource.type === "material").reduce((resourceSum, resource) => resourceSum + resource.currentTotal, 0), 0);
      const disciplineLabor = disciplineItems.reduce((sum, item) => sum + item.resources.filter((resource) => resource.type !== "material").reduce((resourceSum, resource) => resourceSum + resource.currentTotal, 0), 0);
      const disciplineCurrent = disciplineItems.reduce((sum, item) => sum + item.currentTotal, 0);
      const disciplineFutureComplete = disciplineItems.every((item) => item.futureComplete);
      const disciplineFutureMaterial = disciplineFutureComplete
        ? disciplineItems.reduce((sum, item) => sum + item.resources.filter((resource) => resource.type === "material").reduce((resourceSum, resource) => resourceSum + (resource.futureTotal || 0), 0), 0)
        : "";
      const disciplineFuture = disciplineFutureComplete ? disciplineItems.reduce((sum, item) => sum + (item.futureTotal || 0), 0) : "";
      rows.push(makeDetailRow({
        discipline: disciplineTitle,
        name: `รวม${disciplineTitle}`,
        materialTotal: disciplineMaterial,
        laborTotal: disciplineLabor,
        currentTotal: disciplineCurrent,
        futureMaterialTotal: disciplineFutureMaterial,
        futureTotal: disciplineFuture,
        note: "ยอดรวมหมวดหลัก",
      }));
    });

    rows.push(
      [],
      ["สถานะราคาปัจจุบัน", currentComplete ? "ครบพร้อมใช้งาน" : `ยังขาดอัตราราคา ${missingCurrentRates.length} ประเภท`],
      ...(priceMode === "future" ? [["สถานะราคาคาดการณ์", futureComplete ? "ครบพร้อมเปรียบเทียบ" : `รอข้อมูล ML/ราคาเป้าหมาย ${missingForecastRates.length} ประเภท`]] : []),
      makeTotalRow("รวมต้นทุนตรง", currentSummary.base, futureSummary?.base ?? ""),
      makeTotalRow(`ค่าอำนวยการ ${rates.overhead}%`, currentSummary.overhead, futureSummary?.overhead ?? ""),
      makeTotalRow(`กำไรผู้รับเหมา ${rates.profit}%`, currentSummary.profit, futureSummary?.profit ?? ""),
      makeTotalRow(`เงินสำรอง ${rates.contingency}%`, currentSummary.contingency, futureSummary?.contingency ?? ""),
      makeTotalRow(`VAT ${rates.vat}%`, currentSummary.vat, futureSummary?.vat ?? ""),
      makeTotalRow("รวมทั้งโครงการ", currentSummary.grandTotal, futureSummary?.grandTotal ?? ""),
      [],
      ["คำเตือนท้ายเอกสาร", OFFICIAL_PRICE_NOTE]
    );
    const csv = rows.map((row) => row.map(escapeCSV).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = priceMode === "future" ? `boq-all-works-forecast-${forecastMonths}m.csv` : "boq-all-works-current.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const selectedMissingRates = priceMode === "future" ? missingForecastRates : missingCurrentRates;
  const riskLevel = priceMode === "current" ? "ไม่ใช้การคาดการณ์" : differencePercent === null ? "รอข้อมูล ML" : differencePercent >= 8 ? "สูง" : differencePercent >= 4 ? "ปานกลาง" : "ต่ำ";

  return (
    <>
      <style>{BOQ_STYLES}</style>
      <PageHeader
        eyebrow="THAI เท • CONSTRUCTION BOQ"
        title="ประมาณราคาและจัดทำ BOQ งานก่อสร้าง"
        description="ครอบคลุมงานโครงสร้าง งานสถาปัตย์ และงานระบบ พร้อมแยกค่าวัสดุ ค่าแรง และเครื่องจักร"
        action={
          <div className="boq-header-actions">
            <button className="outline-btn" onClick={saveDraft}><Save size={16} /> บันทึก</button>
            <button className="outline-btn" onClick={exportBOQ} disabled={!activeItems.length}><Download size={16} /> ดาวน์โหลด BOQ</button>
          </div>
        }
      />

      <nav className="boq-flow" aria-label="ขั้นตอนการทำ BOQ">
        <div className="active"><b>1</b><span>ตั้งค่าโครงการ</span></div>
        <i />
        <div><b>2</b><span>กรอกปริมาณ</span></div>
        <i />
        <div><b>3</b><span>ตรวจราคาและสรุป</span></div>
      </nav>

      <div className="boq-notice" role="note" aria-label="คำเตือนเกี่ยวกับราคาวัสดุ">
        <AlertTriangle size={19} />
        <div>
          <strong>ราคานี้ไม่ใช่ราคาขายปลีกหรือราคาซื้อจริง</strong>
          <span>{OFFICIAL_PRICE_NOTE}</span>
          <span className="boq-ml-scope"><b>ขอบเขต ML:</b> พยากรณ์เฉพาะราคาวัสดุก่อสร้าง ค่าแรงและเครื่องจักรใช้ค่าปัจจุบันหรือค่าที่ผู้ใช้กรอกเอง</span>
          <a href={OFFICIAL_PRICE_URL} target="_blank" rel="noreferrer">ดูแหล่งราคาภาครัฐ</a>
        </div>
      </div>

      <section className="card boq-project-card">
        <div className="boq-step-head">
          <div className="boq-step-number">1</div>
          <div><h2>ตั้งค่าโครงการ</h2><p>ข้อมูลนี้จะแสดงในไฟล์ BOQ ที่ดาวน์โหลด</p></div>
        </div>
        <div className="boq-project-grid">
          <TextField label="ชื่อโครงการ" value={project.name} onChange={(value) => setProject({ ...project, name: value })} />
          <TextField label="เจ้าของโครงการ" value={project.owner} placeholder="ชื่อเจ้าของ/ผู้ว่าจ้าง" onChange={(value) => setProject({ ...project, owner: value })} />
          <TextField label="สถานที่ก่อสร้าง" value={project.location} onChange={(value) => setProject({ ...project, location: value })} icon={<MapPin size={15} />} />
        </div>

        <div className="boq-mode-row">
          <div className="boq-mode-copy">
            <div className="field-label">คุณมีปริมาณจากแบบแล้วหรือยัง?</div>
            <p>เลือกให้ตรงกับข้อมูลที่มี ระบบจะเปลี่ยนช่องกรอกให้เหมาะสม</p>
          </div>
          <div className="boq-mode-switch">
            <button type="button" className={takeoffMode === "professional" ? "active" : ""} onClick={() => setTakeoffMode("professional")}>
              <span className="boq-mode-icon"><CheckCircle2 size={19} /></span>
              <span><strong>มีแบบก่อสร้างแล้ว</strong><small>กรอกคอนกรีต เหล็ก และแบบหล่อตามแบบ</small></span>
              <em>แนะนำสำหรับ BOQ</em>
            </button>
            <button type="button" className={takeoffMode === "quick" ? "active estimate" : ""} onClick={() => setTakeoffMode("quick")}>
              <span className="boq-mode-icon"><Calculator size={19} /></span>
              <span><strong>ยังไม่มีปริมาณละเอียด</strong><small>กรอกปริมาตรงานหลักเพื่อประมาณงบก่อน</small></span>
              <em>งบเบื้องต้น</em>
            </button>
          </div>
        </div>

        <div className={`boq-mode-explainer ${takeoffMode === "quick" ? "estimate" : "exact"}`}>
          {takeoffMode === "professional" ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
          <span>{takeoffMode === "professional"
            ? "ระบบใช้ปริมาณที่กรอกโดยตรง งาน ค.ส.ล. กรอกคอนกรีต เหล็ก และแบบหล่อจากแบบ/BBS ส่วนงานสถาปัตย์และงานระบบกรอกปริมาณของแต่ละรายการเอง"
            : "เฉพาะงาน ค.ส.ล. ระบบจะประมาณเหล็กและแบบหล่อด้วยสัมประสิทธิ์ ส่วนงานสถาปัตย์และงานระบบยังต้องกรอกปริมาณเอง ก่อนเสนอราคาต้องตรวจจากแบบอีกครั้ง"}</span>
        </div>

        <button type="button" className="boq-settings-btn" onClick={() => setShowAssumptions((value) => !value)} aria-expanded={showAssumptions}>
          <Settings2 size={16} /> {showAssumptions ? "ซ่อนค่าการคำนวณขั้นสูง" : "ค่าการคำนวณขั้นสูง"} {showAssumptions ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        {showAssumptions && (
          <div className="boq-assumptions">
            <AssumptionField label="ลวดผูกเหล็ก" value={assumptions.bindingWirePct} unit="% ของน้ำหนักเหล็ก" onChange={(value) => setAssumptions({ ...assumptions, bindingWirePct: value })} />
            <AssumptionField label="พื้นที่ไม้อัด/แผ่น" value={assumptions.plywoodCoverage} unit="ตร.ม." onChange={(value) => setAssumptions({ ...assumptions, plywoodCoverage: value })} />
            <AssumptionField label="จำนวนรอบใช้แบบ" value={assumptions.plywoodReuse} unit="รอบ" onChange={(value) => setAssumptions({ ...assumptions, plywoodReuse: value })} />
            <AssumptionField label="ตะปูต่อพื้นที่แบบ" value={assumptions.nailsPerSqm} unit="กก./ตร.ม." onChange={(value) => setAssumptions({ ...assumptions, nailsPerSqm: value })} />
          </div>
        )}

        <div className="boq-planning-panel">
          <div className="boq-planning-head">
            <div>
              <div className="field-label">ฐานราคาที่ใช้ประเมิน</div>
              <strong>ต้องการคำนวณด้วยราคาช่วงใด?</strong>
              <p>เลือกใช้ราคาปัจจุบัน หรือให้โมเดลประเมินเฉพาะราคาวัสดุในอนาคต ค่าแรงและเครื่องจักรจะไม่ถูกพยากรณ์</p>
            </div>
            <div className="boq-toolbar-actions">
              <button type="button" className="outline-btn" onClick={loadSample}><FileSpreadsheet size={15} /> ตัวอย่างบ้าน 2 ชั้น</button>
              <button type="button" className="boq-icon-btn" onClick={resetPlan} title="ล้างปริมาณทั้งหมด" aria-label="ล้างปริมาณทั้งหมด"><RotateCcw size={17} /></button>
            </div>
          </div>

          <div className="boq-price-mode" role="radiogroup" aria-label="เลือกฐานราคาที่ใช้ประเมิน">
            <button type="button" role="radio" aria-checked={priceMode === "current"} className={priceMode === "current" ? "active" : ""} onClick={() => setPriceMode("current")}>
              <CheckCircle2 size={18} />
              <span><strong>ราคาปัจจุบัน</strong><small>ใช้ราคากลางภาครัฐล่าสุดในฐานข้อมูล</small></span>
            </button>
            <button type="button" role="radio" aria-checked={priceMode === "future"} className={priceMode === "future" ? "active" : ""} onClick={() => setPriceMode("future")}>
              <TrendingUp size={18} />
              <span><strong>ราคาในอนาคต</strong><small>ML ปรับเฉพาะค่าวัสดุ ส่วนค่าแรงและเครื่องจักรคงเดิม</small></span>
            </button>
          </div>

          {priceMode === "current" ? (
            <div className="boq-current-selection">
              <div className="boq-time-icon"><CalendarRange size={19} /></div>
              <div><span>ฐานราคาที่เลือก</span><strong>ราคาปัจจุบัน</strong><small>วันที่ประเมิน {todayLabel} • ใช้ข้อมูลล่าสุดที่มีในฐานข้อมูล</small></div>
              <b>฿{formatPrice(currentSummary.grandTotal)}</b>
            </div>
          ) : (
            <>
              <div className="boq-plan-grid">
                <div className="boq-period-card">
                  <div className="boq-time-icon"><CalendarRange size={19} /></div>
                  <div>
                    <label htmlFor="boq-forecast-value">ระยะเวลาก่อนเริ่มก่อสร้าง</label>
                    <div className="boq-custom-period">
                      <input
                        id="boq-forecast-value"
                        type="number"
                        inputMode="numeric"
                        min="1"
                        step="1"
                        value={forecastValue}
                        aria-label="จำนวนช่วงเวลาในอนาคต"
                        onChange={(event) => setForecastValue(event.target.value)}
                      />
                      <select value={forecastUnit} onChange={(event) => setForecastUnit(event.target.value)} aria-label="หน่วยช่วงเวลา">
                        <option value="month">เดือน</option>
                        <option value="year">ปี</option>
                      </select>
                    </div>
                    <small>คาดว่าจะเริ่มประมาณ <b>{targetDateLabel}</b> ({forecastMonths.toLocaleString("th-TH")} เดือน)</small>
                  </div>
                </div>

                <div className="boq-compare-card">
                  <div>
                    <span>ราคาปัจจุบัน</span>
                    <small>{todayLabel}</small>
                    <strong>฿{formatPrice(currentSummary.grandTotal)}</strong>
                  </div>
                  <TrendingUp size={18} />
                  <div>
                    <span>ราคาในอีก {forecastLabel}</span>
                    <small>{targetDateLabel}</small>
                    <strong>{optionalPrice(futureSummary?.grandTotal)}</strong>
                  </div>
                  {!futureSummary && <p>ราคาฝั่งอนาคตจะแสดงเมื่อวัสดุมีผลพยากรณ์ ML หรือกรอกราคาเป้าหมายครบ ค่าแรงและเครื่องจักรจะใช้อัตราปัจจุบัน</p>}
                </div>
              </div>

              {forecastMonths >= 24 && (
                <div className="boq-long-term-note">
                  <Info size={14} /> ระยะวางแผน {forecastLabel} มีความไม่แน่นอนสูงกว่าระยะสั้น ควรเผื่องบสำรองและทบทวนราคาเป็นระยะ
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="card boq-work-head">
        <div className="boq-step-head">
          <div className="boq-step-number">2</div>
          <div>
            <h2>{takeoffMode === "professional" ? "กรอกปริมาณจากแบบก่อสร้าง" : "กรอกปริมาณงานเพื่อประมาณงบ"}</h2>
            <p>{takeoffMode === "professional" ? "เลือกหมวดแล้วกรอกปริมาณจริง งาน ค.ส.ล. ให้แยกคอนกรีต เหล็กเสริม และแบบหล่อ" : "กรอกปริมาณของแต่ละงาน ระบบช่วยแตกทรัพยากรเฉพาะรายการที่กำหนดไว้"}</p>
          </div>
        </div>
        <div className="boq-discipline-overview" aria-label="หมวดหลักของ BOQ">
          {Object.entries(BOQ_DISCIPLINES).map(([disciplineKey, disciplineTitle]) => {
            const sections = BOQ_SECTIONS.filter((section) => section.discipline === disciplineKey);
            const itemCount = sections.reduce((sum, section) => sum + section.items.length, 0);
            return (
              <button type="button" key={disciplineKey} onClick={() => scrollToSection(sections[0].id)}>
                <Building2 size={17} />
                <span><strong>{disciplineTitle}</strong><small>{sections.length} หมวดงาน • {itemCount} รายการ</small></span>
              </button>
            );
          })}
        </div>
        <div className="boq-category-nav" aria-label="เลือกหมวดงาน">
          {BOQ_SECTIONS.map((section) => (
            <button type="button" key={section.id} onClick={() => scrollToSection(section.id)}>
              <b>{section.code}</b><span>{section.title.replace("งาน", "")}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="boq-layout">
        <main>
          {BOQ_SECTIONS.map((section) => {
            const sectionItems = calculatedItems.filter((item) => item.sectionId === section.id);
            const sectionActiveItems = sectionItems.filter((item) => item.resources.some((resource) => resource.calculatedQty > 0));
            const sectionCurrentTotal = sectionItems.reduce((sum, item) => sum + item.currentTotal, 0);
            const sectionFutureComplete = sectionActiveItems.every((item) => item.futureComplete);
            const sectionFutureTotal = sectionFutureComplete
              ? sectionActiveItems.reduce((sum, item) => sum + (item.futureTotal || 0), 0)
              : null;
            const sectionSelectedTotal = priceMode === "future" ? sectionFutureTotal : sectionCurrentTotal;
            return (
            <section className="card boq-section" key={section.id} id={`boq-section-${section.id}`}>
              <button type="button" className="boq-section-head" onClick={() => toggleSection(section.id)} aria-expanded={!collapsedSections.has(section.id)}>
                <div className="boq-section-title">
                  <div className="boq-section-code">{section.code}</div>
                  <div><span className="boq-discipline-label">{BOQ_DISCIPLINES[section.discipline]}</span><h2>{section.title}</h2><span>{section.items.length} รายการงาน</span></div>
                </div>
                <div className="boq-section-totals">
                  <span>{selectedPriceLabel} <b>{priceMode === "future" ? optionalPrice(sectionSelectedTotal) : `฿${formatPrice(sectionSelectedTotal)}`}</b></span>
                  {collapsedSections.has(section.id) ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </div>
              </button>
              {!collapsedSections.has(section.id) && <>
              <div className="boq-mobile-items">
                {section.items.map((sourceItem) => {
                  const item = calculatedItems.find((candidate) => candidate.id === sourceItem.id);
                  const expanded = expandedRows.has(item.id);
                  const hasValue = item.resources.some((resource) => resource.calculatedQty > 0);
                  return (
                    <article className={`boq-mobile-item ${hasValue ? "has-value" : ""}`} key={`mobile-${item.id}`}>
                      <div className="boq-mobile-item-head">
                        <div><span className="boq-code">{item.code}</span><h3>{item.name}</h3><p>{item.hint}</p></div>
                        <strong>{priceMode === "future" ? optionalPrice(item.futureTotal) : `฿${formatPrice(item.currentTotal)}`}</strong>
                      </div>

                      <div className="boq-mobile-quantity">
                        {takeoffMode === "professional" && isReinforcedConcreteItem(item) ? (
                          <ExactTakeoffInputs
                            value={exactTakeoff[item.id] || {}}
                            onChange={(key, value) => updateExactTakeoff(item.id, key, value)}
                          />
                        ) : (
                          <label className="boq-single-qty">
                            <span>{takeoffMode === "professional" ? "ปริมาณตามแบบ" : "ปริมาณงานเบื้องต้น"}</span>
                            <div><input inputMode="decimal" type="number" min="0" step="any" value={quantities[item.id] ?? ""} placeholder="0.000" onChange={(event) => updateQuantity(item.id, event.target.value)} /><i>{item.unit}</i></div>
                          </label>
                        )}
                      </div>

                      {!item.currentComplete && hasValue && <div className="boq-item-warning"><AlertTriangle size={14} /> ยังขาดอัตราราคาบางรายการ</div>}
                      <button type="button" className="boq-detail-btn mobile" onClick={() => toggleRow(item.id)}>
                        <Settings2 size={16} /> {expanded ? "ซ่อนรายละเอียดราคา" : "ตรวจวัสดุและราคา"} {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      {expanded && (
                        <ResourceBreakdown
                          item={item}
                          comparisonLabel={comparisonLabel}
                          showFuture={priceMode === "future"}
                          materialSelections={materialSelections}
                          onMaterialSelect={selectOfficialMaterial}
                          quantityOverrides={quantityOverrides}
                          currentRateOverrides={currentRateOverrides}
                          futureRateOverrides={futureRateOverrides}
                          wasteOverrides={wasteOverrides}
                          note={itemNotes[item.id] || ""}
                          onNoteChange={(value) => setItemNotes((current) => ({ ...current, [item.id]: value }))}
                          onQuantityOverride={(key, value) => updateMapValue(setQuantityOverrides, key, value, true)}
                          onCurrentRateOverride={(key, value) => updateMapValue(setCurrentRateOverrides, key, value, true)}
                          onFutureRateOverride={(key, value) => updateMapValue(setFutureRateOverrides, key, value, true)}
                          onWasteOverride={(key, value) => updateMapValue(setWasteOverrides, key, value, true)}
                        />
                      )}
                    </article>
                  );
                })}
              </div>
              <div className="boq-table-scroll">
                <table className="boq-table">
                  <thead><tr><th>รหัส</th><th>รายการงาน</th><th>ปริมาณงาน</th><th>หน่วย</th><th>ราคาปัจจุบัน</th>{priceMode === "future" && <th>{comparisonLabel}</th>}<th>รายละเอียด</th></tr></thead>
                  <tbody>
                    {section.items.map((sourceItem) => {
                      const item = calculatedItems.find((candidate) => candidate.id === sourceItem.id);
                      const expanded = expandedRows.has(item.id);
                      return (
                        <React.Fragment key={item.id}>
                          <tr className={item.resources.some((resource) => resource.calculatedQty > 0) ? "has-value" : ""}>
                            <td><span className="boq-code">{item.code}</span></td>
                            <td><strong className="boq-item-name">{item.name}</strong><small>{item.hint}</small></td>
                            <td>
                              {takeoffMode === "professional" && isReinforcedConcreteItem(item) ? (
                                <ExactTakeoffInputs
                                  value={exactTakeoff[item.id] || {}}
                                  onChange={(key, value) => updateExactTakeoff(item.id, key, value)}
                                />
                              ) : (
                                <input className="boq-qty-input" type="number" min="0" step="any" value={quantities[item.id] ?? ""} placeholder="0.000" onChange={(event) => updateQuantity(item.id, event.target.value)} />
                              )}
                            </td>
                            <td>{takeoffMode === "professional" && isReinforcedConcreteItem(item) ? "ตามแบบ" : item.unit}</td>
                            <td className="boq-price">
                              ฿{formatPrice(item.currentTotal)}
                              {!item.currentComplete && item.resources.some((resource) => resource.calculatedQty > 0) && <small className="boq-price-missing">ยังขาดอัตราราคา</small>}
                            </td>
                            {priceMode === "future" && <td className="boq-price boq-future-price">{optionalPrice(item.futureTotal)}</td>}
                            <td><button type="button" className="boq-detail-btn" onClick={() => toggleRow(item.id)}>{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}{expanded ? "ซ่อน" : "ดูการคำนวณ"}</button></td>
                          </tr>
                          {expanded && (
                            <tr className="boq-breakdown-row">
                              <td colSpan={priceMode === "future" ? 7 : 6}>
                                <ResourceBreakdown
                                  item={item}
                                  comparisonLabel={comparisonLabel}
                                  showFuture={priceMode === "future"}
                                  materialSelections={materialSelections}
                                  onMaterialSelect={selectOfficialMaterial}
                                  quantityOverrides={quantityOverrides}
                                  currentRateOverrides={currentRateOverrides}
                                  futureRateOverrides={futureRateOverrides}
                                  wasteOverrides={wasteOverrides}
                                  note={itemNotes[item.id] || ""}
                                  onNoteChange={(value) => setItemNotes((current) => ({ ...current, [item.id]: value }))}
                                  onQuantityOverride={(key, value) => updateMapValue(setQuantityOverrides, key, value, true)}
                                  onCurrentRateOverride={(key, value) => updateMapValue(setCurrentRateOverrides, key, value, true)}
                                  onFutureRateOverride={(key, value) => updateMapValue(setFutureRateOverrides, key, value, true)}
                                  onWasteOverride={(key, value) => updateMapValue(setWasteOverrides, key, value, true)}
                                />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>}
            </section>
            );
          })}
        </main>

        <aside className="boq-summary-wrap" id="boq-summary">
          <div className="boq-summary">
            <div className="boq-summary-step"><b>3</b><span>ตรวจราคาและสรุปผล</span></div>
            <div className="eyebrow">CONSTRUCTION COST ESTIMATE</div>
            <h3>BOQ {selectedPriceLabel}</h3>
            <div className="boq-grand-total">{optionalPrice(selectedSummary?.grandTotal)}</div>
            <div className="boq-summary-caption">{!activeItems.length ? "กรอกปริมาณจากแบบเพื่อเริ่มคำนวณ" : selectedComplete ? `ฐานราคา ${selectedDateLabel} • ตรวจอัตราราคาครบแล้ว` : priceMode === "future" ? "รอผลพยากรณ์หรือราคาเป้าหมายให้ครบ" : "ยอดชั่วคราวเฉพาะรายการที่มีอัตราราคา"}</div>
            <div className={`boq-validation ${selectedComplete ? "ready" : "incomplete"}`}>
              {selectedComplete ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
              <span>
                {!activeItems.length
                  ? "ยังไม่มีรายการที่กรอกปริมาณ"
                  : selectedComplete
                  ? `BOQ ${selectedPriceLabel} ครบพร้อมตรวจทาน`
                  : `ยังขาดอัตราราคา ${selectedMissingRates.length} ประเภท กรุณาเปิดรายละเอียดแต่ละรายการ`}
              </span>
            </div>
            {uniqueMissingMaterialKeys.length > 0 && <div className="boq-summary-subnote">วัสดุที่ยังจับคู่ราคาภาครัฐไม่ได้ {uniqueMissingMaterialKeys.length} ประเภท สามารถกรอกราคาใบเสนอราคาแทนได้</div>}
            <div className="boq-cost-split">
              {Object.entries(COST_TYPES).map(([type, label]) => <div key={type}><span><i style={{ background: TYPE_COLORS[type] }} />{label}</span><b>{priceMode === "future" && !futureComplete ? "—" : `฿${formatPrice(totalsByType[type])}`}</b></div>)}
            </div>
            <div className="boq-markups">
              <RateField label="ค่าอำนวยการ" value={rates.overhead} onChange={(value) => setRates({ ...rates, overhead: value })} amount={selectedSummary?.overhead} />
              <RateField label="กำไรผู้รับเหมา" value={rates.profit} onChange={(value) => setRates({ ...rates, profit: value })} amount={selectedSummary?.profit} />
              <RateField label="เงินสำรอง" value={rates.contingency} onChange={(value) => setRates({ ...rates, contingency: value })} amount={selectedSummary?.contingency} />
              <RateField label="VAT" value={rates.vat} onChange={(value) => setRates({ ...rates, vat: value })} amount={selectedSummary?.vat} />
            </div>
            {priceMode === "future" && <div className="boq-future-box">
              <span>เปรียบเทียบกับ BOQ ราคาปัจจุบัน</span>
              <strong>฿{formatPrice(currentSummary.grandTotal)}</strong>
              <em>ราคาปัจจุบัน ณ {todayLabel}</em>
              {difference === null ? (
                <small className="waiting">รอผลพยากรณ์ราคาวัสดุจาก ML หรือกรอกราคาวัสดุเป้าหมายให้ครบ ค่าแรงและเครื่องจักรคงอัตราปัจจุบัน</small>
              ) : (
                <small className={difference >= 0 ? "up" : "down"}>{difference >= 0 ? "+" : "-"}฿{formatPrice(Math.abs(difference))} ({differencePercent >= 0 ? "+" : ""}{differencePercent.toFixed(1)}%)</small>
              )}
            </div>}
            <div className="boq-official-disclaimer"><AlertTriangle size={14} /><span><b>ราคากลางภาครัฐ ไม่ใช่ราคาขายปลีก</b> ใช้เพื่อประมาณและเปรียบเทียบแนวโน้มเท่านั้น ต้องขอใบเสนอราคาจากร้านค้าก่อนนำไปจัดซื้อหรือเสนอราคาจริง<br /><b>ML พยากรณ์เฉพาะราคาวัสดุ</b> ค่าแรงและเครื่องจักรเป็นค่าที่ผู้ใช้กรอกและคงอัตราปัจจุบัน</span></div>
            <button className="primary-btn" onClick={exportBOQ} disabled={!activeItems.length}><Calculator size={16} /> {selectedComplete ? "ดาวน์โหลด BOQ แบบละเอียด" : "ดาวน์โหลด BOQ ฉบับร่าง"}</button>
            {savedAt && <div className="boq-saved-at">บันทึกล่าสุด {new Date(savedAt).toLocaleString("th-TH")}</div>}
          </div>
        </aside>
      </div>

      <section className="card boq-insights">
        <div className="card-head"><div><h2>สรุปเพื่อวางแผนโครงการ</h2><span>คำนวณจาก {activeItems.length} รายการที่กรอกปริมาณแล้ว</span></div><TrendingUp size={18} /></div>
        <div className="boq-insight-grid">
          <InsightCard icon={<Building2 size={17} />} label={`ต้นทุนตรง • ${selectedPriceLabel}`} value={selectedDirect === null ? "รอข้อมูล" : `฿${formatPrice(selectedDirect)}`} />
          <InsightCard icon={<CalendarRange size={17} />} label={`รวมโครงการ • ${selectedDateLabel}`} value={optionalPrice(selectedSummary?.grandTotal)} />
          <InsightCard icon={<TrendingUp size={17} />} label="ความเสี่ยงจากราคา" value={riskLevel} />
          <InsightCard icon={<Calculator size={17} />} label="งบสำรองจากราคา" value={priceMode === "current" ? "ยังไม่รวมการคาดการณ์" : difference === null ? "รอข้อมูล ML" : difference > 0 ? `฿${formatPrice(difference)}` : "ยังไม่เพิ่ม"} />
        </div>
      </section>

      <div className="boq-mobile-total-bar">
        <div><span>{selectedPriceLabel}</span><strong>{optionalPrice(selectedSummary?.grandTotal)}</strong></div>
        <button type="button" onClick={scrollToSummary}>ดูสรุป <ChevronUp size={16} /></button>
      </div>
    </>
  );
}

function TextField({ label, value, onChange, placeholder, icon }) {
  return <label className="boq-field"><span className="field-label">{label}</span><div className="boq-input-wrap">{icon}<input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></div></label>;
}

function RateField({ label, value, onChange, amount }) {
  return <div className="boq-rate-row"><span>{label}</span><label><input type="number" min="0" step="0.5" value={value} onChange={(event) => onChange(number(event.target.value))} /><i>%</i></label><b>{amount === null || amount === undefined ? "—" : `฿${formatPrice(amount)}`}</b></div>;
}

function AssumptionField({ label, value, unit, onChange }) {
  return (
    <label className="boq-assumption-field">
      <span>{label}</span>
      <div><input type="number" min="0" step="any" value={value} onChange={(event) => onChange(number(event.target.value))} /><small>{unit}</small></div>
    </label>
  );
}

function ExactTakeoffInputs({ value, onChange }) {
  return (
    <div className="boq-exact-inputs">
      <label><span>คอนกรีตจากแบบ</span><div><input inputMode="decimal" type="number" min="0" step="any" value={value.concrete ?? ""} placeholder="0.000" onChange={(event) => onChange("concrete", event.target.value)} /><i>ลบ.ม.</i></div></label>
      <label><span>เหล็กเสริมจากแบบ/BBS</span><div><input inputMode="decimal" type="number" min="0" step="any" value={value.rebar ?? ""} placeholder="0.00" onChange={(event) => onChange("rebar", event.target.value)} /><i>กก.</i></div></label>
      <label><span>พื้นที่แบบหล่อ</span><div><input inputMode="decimal" type="number" min="0" step="any" value={value.formwork ?? ""} placeholder="0.00" onChange={(event) => onChange("formwork", event.target.value)} /><i>ตร.ม.</i></div></label>
    </div>
  );
}

function ResourceBreakdown({
  item,
  comparisonLabel,
  showFuture,
  materialSelections,
  onMaterialSelect,
  quantityOverrides,
  currentRateOverrides,
  futureRateOverrides,
  wasteOverrides,
  note,
  onNoteChange,
  onQuantityOverride,
  onCurrentRateOverride,
  onFutureRateOverride,
  onWasteOverride,
}) {
  return (
    <div className="boq-resource-box">
      <div className="boq-formula-note">
        ตรวจรายการ วัสดุ ปริมาณสูญเสีย และราคาต่อหน่วย ช่องที่เว้นว่างจะใช้ค่าจากระบบ โดย ML จะเปลี่ยนเฉพาะราคาวัสดุเท่านั้น
      </div>
      <label className="boq-item-note">
        <span>หมายเหตุรายการ (จะแสดงในไฟล์ BOQ)</span>
        <input value={note} placeholder="เช่น ยี่ห้อ รุ่น ขนาด สเปก หรือขอบเขตงาน" onChange={(event) => onNoteChange(event.target.value)} />
      </label>
      <div className="boq-resource-cards">
        {item.resources.map((resource, index) => {
          const options = resource.type === "material" ? selectableMaterials(resource) : [];
          const explicitSelection = materialSelections[resource.key] || "";
          const quantityKey = `${item.id}:${resource.key}`;
          const quantityOverride = hasOwn(quantityOverrides, quantityKey) ? quantityOverrides[quantityKey] : "";
          const currentRateOverride = hasOwn(currentRateOverrides, resource.key) ? currentRateOverrides[resource.key] : "";
          const futureRateOverride = hasOwn(futureRateOverrides, resource.key) ? futureRateOverrides[resource.key] : "";
          const wasteOverride = hasOwn(wasteOverrides, resource.key) ? wasteOverrides[resource.key] : "";
          return (
            <article className={`boq-resource-card ${resource.rateMissing && resource.calculatedQty > 0 ? "missing" : ""}`} key={`card-${resource.key}-${index}`}>
              <div className="boq-resource-head">
                <div><span className="boq-type" style={{ color: TYPE_COLORS[resource.type] }}>{COST_TYPES[resource.type]}</span><h4>{resource.name}</h4></div>
                <div><small>รวมปัจจุบัน</small><strong>{resource.rateMissing ? "—" : `฿${formatPrice(resource.currentTotal)}`}</strong></div>
              </div>

              {resource.type === "material" && (
                <label className="boq-card-field full">
                  <span>รายการวัสดุจากฐานราคา</span>
                  <select className="boq-material-select" value={explicitSelection} onChange={(event) => onMaterialSelect(resource.key, event.target.value)} disabled={!options.length}>
                    <option value="">
                      {resource.catalogMaterial ? `อัตโนมัติ: ${materialName(resource.catalogMaterial)}` : options.length ? "เลือกรายการวัสดุภาครัฐ" : `ไม่พบรายการหน่วย ${resource.unit}`}
                    </option>
                    {options.map((material) => <option key={materialId(material)} value={materialId(material)}>{materialName(material)} — {formatPrice(materialPrice(material))} บาท/{materialUnit(material)}</option>)}
                  </select>
                  {resource.catalogMaterial
                    ? <small className="boq-official-source">ราคากลางภาครัฐ ฿{formatPrice(resource.officialOriginalPrice)}/{resource.officialOriginalUnit} • ไม่ใช่ราคาขายปลีก</small>
                    : <small className="boq-price-missing">ไม่พบราคาภาครัฐ กรุณากรอกราคาเอง</small>}
                </label>
              )}

              {resource.type !== "material" && <p className="boq-resource-help">กรอกอัตราจากค่าแรงหรือใบเสนอราคาเครื่องจักรของโครงการ</p>}

              <div className="boq-resource-fields">
                <label className="boq-card-field"><span>เผื่อสูญเสีย</span><div><input inputMode="decimal" type="number" min="0" step="any" value={wasteOverride} placeholder={String(resource.wastePct)} onChange={(event) => onWasteOverride(resource.key, event.target.value)} /><i>%</i></div></label>
                <label className="boq-card-field"><span>ปริมาณคิดราคา</span><div><input inputMode="decimal" type="number" min="0" step="any" value={quantityOverride} placeholder={formatQty(resource.defaultCalculatedQty)} onChange={(event) => onQuantityOverride(quantityKey, event.target.value)} /><i>{resource.unit}</i></div></label>
                <label className="boq-card-field"><span>ราคาปัจจุบัน/หน่วย</span><div className={resource.rateMissing ? "missing" : ""}><i>฿</i><input inputMode="decimal" type="number" min="0" step="any" value={currentRateOverride} placeholder={resource.currentUnitPrice > 0 ? formatPrice(resource.currentUnitPrice) : "กรอกราคา"} onChange={(event) => onCurrentRateOverride(resource.key, event.target.value)} /></div><small>{resource.currentRateSource === "official" ? "ราคากลางภาครัฐ • ไม่ใช่ราคาขายปลีก" : resource.currentRateSource === "manual" ? "ราคาที่กำหนดเอง" : "ยังไม่ระบุราคา"}</small></label>
                {showFuture && resource.type === "material" && <label className="boq-card-field"><span>{comparisonLabel.startsWith("อีก") ? `ราคา${comparisonLabel}/หน่วย` : `${comparisonLabel}/หน่วย`}</span><div className={resource.futurePriceMissing ? "missing" : ""}><i>฿</i><input inputMode="decimal" type="number" min="0" step="any" value={futureRateOverride} placeholder={resource.futureUnitPrice !== null && resource.futureUnitPrice !== undefined ? formatPrice(resource.futureUnitPrice) : "รอ ML"} onChange={(event) => onFutureRateOverride(resource.key, event.target.value)} /></div><small>{resource.futureRateSource === "model" ? "พยากรณ์ราคาวัสดุจาก ML" : resource.futureRateSource === "manual" ? "ราคาวัสดุที่กำหนดเอง" : "ยังไม่มีราคาวัสดุคาดการณ์"}</small></label>}
                {showFuture && resource.type !== "material" && <div className="boq-card-field boq-static-rate"><span>อัตราในอนาคต/หน่วย</span><div><i>฿</i><b>{resource.currentUnitPrice > 0 ? formatPrice(resource.currentUnitPrice) : "—"}</b></div><small>คงอัตราปัจจุบัน • ไม่พยากรณ์ด้วย ML</small></div>}
              </div>

              {showFuture && <div className="boq-resource-future"><span>รวม{comparisonLabel}</span><strong>{optionalPrice(resource.futureTotal)}</strong></div>}
            </article>
          );
        })}
      </div>
      <div className="boq-resource-scroll">
        <table>
          <thead><tr><th>ประเภท</th><th>รายการและแหล่งราคา</th><th>สูญเสีย %</th><th>ปริมาณคิดราคา</th><th>หน่วย</th><th>ราคาปัจจุบัน/หน่วย</th><th>รวมปัจจุบัน</th>{showFuture && <><th>ราคา{comparisonLabel}/หน่วย</th><th>รวม{comparisonLabel}</th></>}</tr></thead>
          <tbody>
            {item.resources.map((resource, index) => {
              const options = resource.type === "material" ? selectableMaterials(resource) : [];
              const explicitSelection = materialSelections[resource.key] || "";
              const quantityKey = `${item.id}:${resource.key}`;
              const quantityOverride = hasOwn(quantityOverrides, quantityKey) ? quantityOverrides[quantityKey] : "";
              const currentRateOverride = hasOwn(currentRateOverrides, resource.key) ? currentRateOverrides[resource.key] : "";
              const futureRateOverride = hasOwn(futureRateOverrides, resource.key) ? futureRateOverrides[resource.key] : "";
              const wasteOverride = hasOwn(wasteOverrides, resource.key) ? wasteOverrides[resource.key] : "";
              return (
                <tr key={`${resource.key}-${index}`} className={resource.rateMissing && resource.calculatedQty > 0 ? "boq-missing-row" : ""}>
                  <td><span className="boq-type" style={{ color: TYPE_COLORS[resource.type] }}>{COST_TYPES[resource.type]}</span></td>
                  <td>
                    {resource.type === "material" ? (
                      <>
                        <div className="boq-resource-purpose">{resource.name}</div>
                        <select
                          className="boq-material-select"
                          value={explicitSelection}
                          onChange={(event) => onMaterialSelect(resource.key, event.target.value)}
                          disabled={!options.length}
                        >
                          <option value="">
                            {resource.catalogMaterial
                              ? `อัตโนมัติ: ${materialName(resource.catalogMaterial)}`
                              : options.length
                                ? "เลือกรายการวัสดุภาครัฐ"
                                : `ไม่พบรายการหน่วย ${resource.unit}`}
                          </option>
                          {options.map((material) => (
                            <option key={materialId(material)} value={materialId(material)}>
                              {materialName(material)} — {formatPrice(materialPrice(material))} บาท/{materialUnit(material)}
                            </option>
                          ))}
                        </select>
                        {resource.catalogMaterial ? (
                          <small className="boq-official-source">
                            ราคากลางภาครัฐ: ฿{formatPrice(resource.officialOriginalPrice)}/{resource.officialOriginalUnit}
                            {canonicalUnit(resource.officialOriginalUnit) !== canonicalUnit(resource.unit) ? ` • แปลงเป็นบาท/${resource.unit}` : ""}
                            {" • ไม่ใช่ราคาขายปลีก"}
                          </small>
                        ) : (
                          <small className="boq-price-missing">ไม่พบราคาภาครัฐ — กรอกราคาใบเสนอราคาได้</small>
                        )}
                      </>
                    ) : (
                      <>{resource.name}<small>กรอกอัตราค่าแรง/เครื่องจักรของผู้รับเหมา</small></>
                    )}
                  </td>
                  <td><input className="boq-grid-input small" type="number" min="0" step="any" value={wasteOverride} placeholder={String(resource.wastePct)} onChange={(event) => onWasteOverride(resource.key, event.target.value)} /></td>
                  <td><input className="boq-grid-input" type="number" min="0" step="any" value={quantityOverride} placeholder={formatQty(resource.defaultCalculatedQty)} onChange={(event) => onQuantityOverride(quantityKey, event.target.value)} /></td>
                  <td>{resource.unit}</td>
                  <td>
                    <input className={`boq-grid-input rate ${resource.rateMissing ? "missing" : ""}`} type="number" min="0" step="any" value={currentRateOverride} placeholder={resource.currentUnitPrice > 0 ? formatPrice(resource.currentUnitPrice) : "กรอกราคา"} onChange={(event) => onCurrentRateOverride(resource.key, event.target.value)} />
                    <small>{resource.currentRateSource === "official" ? "ภาครัฐ" : resource.currentRateSource === "manual" ? "กำหนดเอง" : "ยังไม่ระบุ"}</small>
                  </td>
                  <td className="boq-price">{resource.rateMissing ? "—" : `฿${formatPrice(resource.currentTotal)}`}</td>
                  {showFuture && <td>
                    {resource.type === "material" ? (
                      <>
                        <input className={`boq-grid-input rate ${resource.futurePriceMissing ? "missing" : ""}`} type="number" min="0" step="any" value={futureRateOverride} placeholder={resource.futureUnitPrice !== null && resource.futureUnitPrice !== undefined ? formatPrice(resource.futureUnitPrice) : "รอ ML"} onChange={(event) => onFutureRateOverride(resource.key, event.target.value)} />
                        <small>{resource.futureRateSource === "model" ? "ML เฉพาะวัสดุ" : resource.futureRateSource === "manual" ? "กำหนดเอง" : "รอข้อมูลวัสดุ"}</small>
                      </>
                    ) : (
                      <><b>{resource.currentUnitPrice > 0 ? `฿${formatPrice(resource.currentUnitPrice)}` : "—"}</b><small>คงอัตราปัจจุบัน • ไม่ใช่ ML</small></>
                    )}
                  </td>}
                  {showFuture && <td className="boq-price">{optionalPrice(resource.futureTotal)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InsightCard({ icon, label, value }) {
  return <div className="boq-insight-card">{icon}<div><span>{label}</span><strong>{value}</strong></div></div>;
}

const BOQ_STYLES = `
  .boq-header-actions { display:flex; align-items:center; gap:8px; }
  .boq-notice { display:flex; align-items:flex-start; gap:10px; padding:13px 14px; margin-bottom:16px; border:1px solid rgba(217,119,6,.24); border-radius:12px; background:rgba(245,158,11,.08); font-size:11px; line-height:1.6; }
  .boq-notice svg { margin-top:2px; flex:0 0 auto; color:#d97706; }
  .boq-notice > div { min-width:0; }
  .boq-notice strong, .boq-notice span { display:block; }
  .boq-notice strong { margin-bottom:2px; color:#b45309; font-size:12px; }
  .boq-notice span { opacity:.74; }
  .boq-notice .boq-ml-scope { margin-top:5px; padding-top:5px; border-top:1px solid rgba(217,119,6,.16); color:#92400e; opacity:.92; }
  .boq-notice .boq-ml-scope b { display:inline; color:inherit; }
  .boq-notice a { display:inline-block; margin-top:4px; color:#b45309; font-weight:750; text-decoration:none; }
  .boq-project-card { margin-bottom:18px; }
  .boq-project-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
  .boq-field { display:block; } .boq-field > span { display:block; margin-bottom:7px; }
  .boq-input-wrap { min-height:42px; display:flex; align-items:center; gap:8px; padding:0 11px; border:1px solid rgba(148,163,184,.24); border-radius:10px; background:rgba(148,163,184,.045); }
  .boq-input-wrap svg { opacity:.55; flex:0 0 auto; } .boq-input-wrap input { width:100%; border:0; outline:0; background:transparent; color:inherit; font:inherit; }
  .boq-mode-row { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; margin-top:16px; padding-top:15px; border-top:1px solid rgba(148,163,184,.14); }
  .boq-mode-switch { display:flex; flex-wrap:wrap; gap:7px; margin-top:7px; }
  .boq-mode-switch button, .boq-settings-btn { display:inline-flex; align-items:center; gap:6px; padding:9px 12px; border:1px solid rgba(148,163,184,.24); border-radius:9px; background:transparent; color:inherit; cursor:pointer; font-size:11px; font-weight:700; }
  .boq-mode-switch button.active { border-color:#059669; background:rgba(5,150,105,.09); color:#059669; }
  .boq-mode-switch button.active.estimate { border-color:#d97706; background:rgba(217,119,6,.09); color:#b45309; }
  .boq-estimate-warning { display:flex; align-items:flex-start; gap:7px; margin-top:10px; padding:9px 11px; border:1px solid rgba(217,119,6,.18); border-radius:9px; background:rgba(217,119,6,.07); color:#b45309; font-size:10px; line-height:1.5; }
  .boq-assumptions { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:9px; margin-top:11px; padding:12px; border-radius:10px; background:rgba(148,163,184,.06); }
  .boq-assumption-field > span { display:block; margin-bottom:5px; font-size:9px; opacity:.56; }
  .boq-assumption-field > div { display:flex; align-items:center; border:1px solid rgba(148,163,184,.2); border-radius:8px; overflow:hidden; }
  .boq-assumption-field input { min-width:0; width:100%; padding:7px 8px; border:0; outline:0; background:transparent; color:inherit; font-weight:700; }
  .boq-assumption-field small { padding-right:8px; white-space:nowrap; font-size:8px; opacity:.5; }
  .boq-planning-panel { margin-top:18px; padding-top:16px; border-top:1px solid rgba(148,163,184,.14); }
  .boq-planning-head { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:13px; }
  .boq-planning-head strong { display:block; margin-top:4px; font-size:13px; }
  .boq-price-mode { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-bottom:10px; }
  .boq-price-mode button { min-height:68px; display:flex; align-items:center; gap:10px; padding:12px 14px; border:1px solid rgba(148,163,184,.22); border-radius:12px; background:rgba(148,163,184,.035); color:inherit; cursor:pointer; text-align:left; }
  .boq-price-mode button > svg { flex:0 0 auto; color:#64748b; }
  .boq-price-mode button span { min-width:0; }
  .boq-price-mode button strong, .boq-price-mode button small { display:block; }
  .boq-price-mode button strong { margin-bottom:3px; font-size:12px; }
  .boq-price-mode button small { font-size:9px; line-height:1.4; opacity:.52; }
  .boq-price-mode button.active { border-color:rgba(37,99,235,.58); background:rgba(37,99,235,.075); box-shadow:0 0 0 2px rgba(37,99,235,.07); }
  .boq-price-mode button.active > svg { color:#2563eb; }
  .boq-current-selection { min-height:82px; display:grid; grid-template-columns:38px minmax(0,1fr) auto; align-items:center; gap:11px; padding:14px; border:1px solid rgba(59,130,246,.25); border-radius:13px; background:rgba(59,130,246,.045); }
  .boq-current-selection span, .boq-current-selection small { display:block; font-size:9px; opacity:.52; }
  .boq-current-selection strong { display:block; margin:2px 0; font-size:13px; }
  .boq-current-selection > b { font-size:18px; white-space:nowrap; }
  .boq-time-compare { display:grid; grid-template-columns:minmax(0,1fr) 36px minmax(0,1.25fr); align-items:stretch; gap:8px; }
  .boq-time-card { min-height:108px; display:flex; align-items:center; gap:11px; padding:15px; border:1px solid rgba(148,163,184,.18); border-radius:13px; background:rgba(148,163,184,.045); }
  .boq-time-card.current > b { margin-left:auto; font-size:17px; white-space:nowrap; }
  .boq-time-card.future { display:block; border-color:rgba(59,130,246,.32); background:linear-gradient(135deg,rgba(59,130,246,.09),rgba(59,130,246,.025)); }
  .boq-time-card-top { display:flex; align-items:center; gap:11px; }
  .boq-time-icon { width:36px; height:36px; display:grid; place-items:center; flex:0 0 auto; border-radius:10px; background:rgba(59,130,246,.12); color:#3b82f6; }
  .boq-time-card span { display:block; margin-bottom:3px; font-size:9px; opacity:.5; }
  .boq-time-card h3 { margin:0 0 4px; font-size:14px; }
  .boq-time-card small { font-size:9px; opacity:.5; }
  .boq-time-arrow { display:grid; place-items:center; color:#3b82f6; opacity:.65; }
  .boq-custom-period { display:flex; align-items:stretch; margin-top:5px; border:1px solid rgba(59,130,246,.35); border-radius:9px; overflow:hidden; background:var(--card-bg,#fff); }
  .boq-custom-period input { width:92px; padding:8px 10px; border:0; outline:0; background:transparent; color:inherit; font-size:17px; font-weight:800; text-align:right; }
  .boq-custom-period select { min-width:76px; padding:0 9px; border:0; border-left:1px solid rgba(148,163,184,.2); outline:0; background:transparent; color:inherit; font-weight:700; }
  .boq-target-result { display:flex; align-items:flex-end; justify-content:space-between; gap:10px; margin-top:10px; padding-top:9px; border-top:1px solid rgba(59,130,246,.13); }
  .boq-target-result span { margin:0; }
  .boq-target-result b { font-size:17px; white-space:nowrap; }
  .boq-long-term-note { display:flex; align-items:center; gap:7px; margin-top:9px; padding:8px 10px; border-radius:8px; background:rgba(245,158,11,.08); color:#b45309; font-size:10px; }
  .boq-toolbar-actions { display:flex; align-items:center; gap:8px; } .boq-icon-btn { width:38px; height:38px; display:grid; place-items:center; border:1px solid rgba(148,163,184,.22); border-radius:9px; background:transparent; color:inherit; cursor:pointer; }
  .boq-layout { display:grid; grid-template-columns:minmax(0,1fr) 320px; gap:18px; align-items:start; }
  .boq-section { margin-bottom:14px; padding:0 !important; overflow:hidden; }
  .boq-section-head { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:15px 17px; border-bottom:1px solid rgba(148,163,184,.14); }
  .boq-section-title { display:flex; align-items:center; gap:11px; }
  .boq-section-code { width:34px; height:34px; display:grid; place-items:center; border-radius:9px; background:rgba(59,130,246,.12); color:#3b82f6; font-weight:800; }
  .boq-section-head h2 { margin:0; font-size:15px; } .boq-section-head span { display:block; margin-top:3px; font-size:10px; opacity:.48; }
  .boq-section-totals { display:flex; align-items:center; gap:16px; }
  .boq-section-totals span { margin:0; text-align:right; }
  .boq-section-totals b { display:block; margin-top:3px; font-size:11px; opacity:1; }
  .boq-table-scroll, .boq-resource-scroll { overflow-x:auto; } .boq-table { width:100%; min-width:980px; border-collapse:collapse; }
  .boq-table th { padding:10px 12px; text-align:left; font-size:10px; font-weight:650; opacity:.55; background:rgba(148,163,184,.045); }
  .boq-table td { padding:11px 12px; border-top:1px solid rgba(148,163,184,.10); font-size:12px; vertical-align:middle; }
  .boq-table tbody tr.has-value > td { background:rgba(59,130,246,.025); } .boq-code { font-size:10px; font-weight:750; opacity:.62; } .boq-item-name { display:block; font-size:12px; }
  .boq-table td small, .boq-resource-box td small { display:block; margin-top:3px; font-size:9px; line-height:1.35; opacity:.48; }
  .boq-qty-input { width:112px; padding:8px 9px; border:1px solid rgba(148,163,184,.28); border-radius:8px; outline:0; background:rgba(148,163,184,.055); color:inherit; font:inherit; font-weight:700; text-align:right; }
  .boq-exact-inputs { display:grid; grid-template-columns:repeat(3,112px); gap:6px; }
  .boq-exact-inputs label > span { display:block; margin-bottom:3px; font-size:8px; opacity:.5; }
  .boq-exact-inputs label > div { display:flex; align-items:center; border:1px solid rgba(148,163,184,.28); border-radius:8px; background:rgba(148,163,184,.055); overflow:hidden; }
  .boq-exact-inputs input { min-width:0; width:64px; padding:7px 4px 7px 7px; border:0; outline:0; background:transparent; color:inherit; font-weight:700; text-align:right; }
  .boq-exact-inputs i { padding-right:6px; font-size:8px; font-style:normal; opacity:.5; white-space:nowrap; }
  .boq-qty-input:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.1); } .boq-price { white-space:nowrap; font-weight:750; }
  .boq-future-price { color:#2563eb; }
  .boq-detail-btn { display:inline-flex; align-items:center; gap:4px; border:0; background:transparent; color:#3b82f6; cursor:pointer; white-space:nowrap; font-size:11px; font-weight:650; }
  .boq-breakdown-row > td { padding:0 12px 13px !important; background:rgba(15,23,42,.025) !important; }
  .boq-resource-box { padding:10px; border:1px solid rgba(148,163,184,.16); border-radius:10px; background:rgba(148,163,184,.045); } .boq-formula-note { margin-bottom:8px; font-size:10px; opacity:.58; }
  .boq-resource-box table { width:100%; min-width:1280px; border-collapse:collapse; } .boq-resource-box th { padding:7px 8px; font-size:9px; text-align:left; opacity:.48; } .boq-resource-box td { padding:7px 8px; border-top:1px solid rgba(148,163,184,.1); font-size:10px; vertical-align:top; }
  .boq-resource-purpose { margin-bottom:5px; font-weight:700; }
  .boq-material-select { width:280px; max-width:100%; padding:7px 8px; border:1px solid rgba(148,163,184,.25); border-radius:7px; background:var(--card-bg, #fff); color:inherit; font-size:10px; }
  .boq-material-select:disabled { opacity:.55; }
  .boq-grid-input { width:92px; padding:7px 7px; border:1px solid rgba(148,163,184,.24); border-radius:7px; outline:0; background:rgba(148,163,184,.045); color:inherit; font-size:10px; text-align:right; }
  .boq-grid-input.small { width:58px; }
  .boq-grid-input.rate { width:104px; }
  .boq-grid-input:focus { border-color:#3b82f6; box-shadow:0 0 0 2px rgba(59,130,246,.09); }
  .boq-grid-input.missing { border-color:rgba(220,38,38,.4); background:rgba(220,38,38,.035); }
  .boq-official-source { color:#059669; opacity:1 !important; }
  .boq-price-missing { color:#dc2626; font-weight:700; opacity:1 !important; }
  .boq-missing-row td { background:rgba(220,38,38,.025); }
  .boq-type { font-weight:700; white-space:nowrap; } .boq-summary-wrap { position:sticky; top:16px; }
  .boq-summary { padding:19px; border-radius:14px; color:#f8fafc; background:linear-gradient(145deg,#152238,#0f172a); box-shadow:0 15px 35px rgba(15,23,42,.18); }
  .boq-summary .eyebrow { opacity:.48; } .boq-summary h3 { margin:8px 0 3px; font-size:15px; } .boq-grand-total { margin-top:12px; font-size:28px; line-height:1; font-weight:850; letter-spacing:-1px; } .boq-summary-caption { margin-top:6px; font-size:9px; opacity:.45; }
  .boq-validation { display:flex; align-items:flex-start; gap:7px; margin-top:11px; padding:9px 10px; border-radius:8px; font-size:9px; line-height:1.45; }
  .boq-validation.ready { border:1px solid rgba(52,211,153,.25); background:rgba(52,211,153,.1); color:#6ee7b7; }
  .boq-validation.incomplete { border:1px solid rgba(251,191,36,.28); background:rgba(251,191,36,.1); color:#fde68a; }
  .boq-summary-subnote { margin-top:7px; font-size:8px; line-height:1.45; opacity:.6; }
  .boq-missing-summary { margin-top:11px; padding:9px 10px; border:1px solid rgba(251,191,36,.28); border-radius:8px; background:rgba(251,191,36,.1); color:#fde68a; font-size:9px; line-height:1.5; }
  .boq-cost-split { display:grid; gap:7px; margin:17px 0; padding:13px 0; border-top:1px solid rgba(255,255,255,.1); border-bottom:1px solid rgba(255,255,255,.1); }
  .boq-cost-split > div { display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:10px; } .boq-cost-split span { display:flex; align-items:center; gap:7px; opacity:.62; } .boq-cost-split i { width:7px; height:7px; border-radius:50%; }
  .boq-rate-row { display:grid; grid-template-columns:1fr 58px 90px; gap:7px; align-items:center; margin:8px 0; font-size:10px; } .boq-rate-row > span { opacity:.62; }
  .boq-rate-row label { display:flex; align-items:center; border:1px solid rgba(255,255,255,.13); border-radius:7px; overflow:hidden; } .boq-rate-row input { width:38px; padding:5px 2px 5px 6px; border:0; outline:0; background:transparent; color:#fff; font-size:10px; text-align:right; } .boq-rate-row i { padding-right:5px; font-style:normal; opacity:.5; } .boq-rate-row b { text-align:right; white-space:nowrap; }
  .boq-future-box { margin:16px 0 12px; padding:12px; border-radius:10px; background:rgba(255,255,255,.07); } .boq-future-box span, .boq-future-box small, .boq-future-box em { display:block; font-size:9px; opacity:.55; } .boq-future-box strong { display:block; margin:5px 0 3px; font-size:17px; } .boq-future-box em { margin-bottom:6px; font-style:normal; } .boq-future-box small.up { color:#fbbf24; opacity:1; } .boq-future-box small.down { color:#34d399; opacity:1; } .boq-future-box small.waiting { color:#cbd5e1; opacity:.8; }
  .boq-official-disclaimer { display:flex; align-items:flex-start; gap:7px; margin:12px 0; padding:10px; border:1px solid rgba(251,191,36,.24); border-radius:9px; background:rgba(251,191,36,.1); color:#fde68a; font-size:8px; line-height:1.5; }
  .boq-official-disclaimer svg { flex:0 0 auto; margin-top:1px; }
  .boq-official-disclaimer b { display:block; margin-bottom:2px; color:#fef3c7; }
  .boq-summary .primary-btn { width:100%; justify-content:center; } .boq-summary button:disabled, .outline-btn:disabled { opacity:.4; cursor:not-allowed; }
  .boq-saved-at { margin-top:8px; text-align:center; font-size:8px; opacity:.45; }
  .boq-insights { margin-top:18px; } .boq-insight-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; } .boq-insight-card { display:flex; align-items:flex-start; gap:10px; padding:13px; border-radius:11px; background:rgba(148,163,184,.07); } .boq-insight-card svg { flex:0 0 auto; } .boq-insight-card span { display:block; font-size:9px; opacity:.5; } .boq-insight-card strong { display:block; margin-top:4px; font-size:12px; }
  @media (max-width:1100px) { .boq-layout { grid-template-columns:1fr; } .boq-summary-wrap { position:static; } .boq-insight-grid { grid-template-columns:repeat(2,1fr); } }
  @media (max-width:760px) { .boq-header-actions { flex-wrap:wrap; } .boq-project-grid { grid-template-columns:1fr; } .boq-mode-row, .boq-planning-head { align-items:stretch; flex-direction:column; } .boq-assumptions { grid-template-columns:repeat(2,1fr); } .boq-toolbar-actions { justify-content:space-between; } .boq-time-compare { grid-template-columns:1fr; } .boq-time-arrow { transform:rotate(90deg); } .boq-time-card.current > b { font-size:14px; } .boq-section-head { align-items:flex-start; flex-direction:column; } .boq-section-totals { width:100%; justify-content:space-between; } .boq-insight-grid { grid-template-columns:1fr; } }

  /* UX refresh: clear steps, plain-language modes and touch-friendly controls */
  .boq-flow { display:grid; grid-template-columns:auto 1fr auto 1fr auto; align-items:center; gap:12px; margin:0 0 16px; padding:12px 16px; border:1px solid rgba(148,163,184,.16); border-radius:14px; background:rgba(148,163,184,.04); }
  .boq-flow > div { display:flex; align-items:center; gap:8px; min-width:0; color:#64748b; font-size:11px; font-weight:700; }
  .boq-flow b { width:27px; height:27px; display:grid; place-items:center; flex:0 0 auto; border-radius:50%; background:rgba(148,163,184,.14); color:inherit; }
  .boq-flow .active { color:#2563eb; } .boq-flow .active b { background:#2563eb; color:#fff; }
  .boq-flow i { height:1px; background:rgba(148,163,184,.25); }
  .boq-notice { align-items:flex-start; }
  .boq-step-head { display:flex; align-items:flex-start; gap:11px; margin-bottom:17px; }
  .boq-step-number { width:34px; height:34px; display:grid; place-items:center; flex:0 0 auto; border-radius:10px; background:#2563eb; color:#fff; font-size:14px; font-weight:850; box-shadow:0 7px 16px rgba(37,99,235,.2); }
  .boq-step-head h2 { margin:1px 0 3px; font-size:16px; }
  .boq-step-head p { margin:0; font-size:10px; line-height:1.5; opacity:.52; }
  .boq-project-grid { padding-bottom:17px; border-bottom:1px solid rgba(148,163,184,.13); }
  .boq-mode-row { display:block; margin-top:17px; padding:0; border:0; }
  .boq-mode-copy p { margin:4px 0 10px; font-size:10px; opacity:.52; }
  .boq-mode-switch { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin:0; }
  .boq-mode-switch button { position:relative; min-height:76px; display:grid; grid-template-columns:40px minmax(0,1fr); align-items:center; gap:10px; padding:13px; text-align:left; border:1px solid rgba(148,163,184,.23); border-radius:13px; background:rgba(148,163,184,.035); color:inherit; }
  .boq-mode-switch button > span:nth-child(2) { min-width:0; } .boq-mode-switch button strong { display:block; margin-bottom:3px; font-size:12px; }
  .boq-mode-switch button small { display:block; font-size:9px; line-height:1.45; font-weight:500; opacity:.52; }
  .boq-mode-switch button em { position:absolute; top:8px; right:9px; padding:3px 6px; border-radius:999px; background:rgba(148,163,184,.1); font-size:7px; font-style:normal; opacity:.65; }
  .boq-mode-icon { width:38px; height:38px; display:grid; place-items:center; border-radius:10px; background:rgba(148,163,184,.09); }
  .boq-mode-switch button.active { border-color:rgba(37,99,235,.6); background:rgba(37,99,235,.07); color:inherit; box-shadow:0 0 0 2px rgba(37,99,235,.08); }
  .boq-mode-switch button.active .boq-mode-icon { background:#2563eb; color:#fff; }
  .boq-mode-switch button.active em { background:rgba(37,99,235,.12); color:#2563eb; opacity:1; }
  .boq-mode-switch button.active.estimate { border-color:rgba(217,119,6,.55); background:rgba(217,119,6,.07); color:inherit; }
  .boq-mode-switch button.active.estimate .boq-mode-icon { background:#d97706; color:#fff; }
  .boq-mode-switch button.active.estimate em { background:rgba(217,119,6,.12); color:#b45309; }
  .boq-mode-explainer { display:flex; align-items:flex-start; gap:8px; margin-top:10px; padding:10px 12px; border-radius:10px; font-size:10px; line-height:1.55; }
  .boq-mode-explainer svg { flex:0 0 auto; margin-top:1px; } .boq-mode-explainer.exact { background:rgba(5,150,105,.075); color:#047857; } .boq-mode-explainer.estimate { background:rgba(217,119,6,.075); color:#b45309; }
  .boq-settings-btn { min-height:40px; margin-top:10px; }
  .boq-assumptions { margin-top:8px; }
  .boq-planning-panel { margin-top:18px; padding-top:18px; }
  .boq-planning-head p { margin:4px 0 0; font-size:9px; opacity:.48; }
  .boq-plan-grid { display:grid; grid-template-columns:minmax(280px,.8fr) minmax(0,1.2fr); gap:10px; }
  .boq-period-card { min-width:0; display:grid; grid-template-columns:38px minmax(0,1fr); align-items:start; gap:11px; padding:14px; border:1px solid rgba(59,130,246,.25); border-radius:13px; background:rgba(59,130,246,.045); }
  .boq-period-card label { display:block; margin-bottom:6px; font-size:9px; font-weight:700; opacity:.58; }
  .boq-period-card > div:last-child { min-width:0; } .boq-period-card > div > small { display:block; margin-top:7px; font-size:9px; line-height:1.45; opacity:.55; }
  .boq-period-card > div > small b { color:inherit; }
  .boq-custom-period { width:100%; max-width:230px; min-height:44px; margin:0; }
  .boq-custom-period input { min-width:0; width:100%; font-size:18px; text-align:left; }
  .boq-custom-period select { min-width:88px; }
  .boq-compare-card { display:grid; grid-template-columns:minmax(0,1fr) 28px minmax(0,1fr); align-items:center; gap:8px; padding:14px; border:1px solid rgba(148,163,184,.17); border-radius:13px; background:rgba(148,163,184,.035); }
  .boq-compare-card > svg { justify-self:center; color:#3b82f6; }
  .boq-compare-card > div { min-width:0; } .boq-compare-card span, .boq-compare-card small { display:block; font-size:9px; opacity:.5; }
  .boq-compare-card strong { display:block; margin-top:7px; overflow:hidden; font-size:16px; text-overflow:ellipsis; white-space:nowrap; }
  .boq-compare-card p { grid-column:1/-1; margin:3px 0 0; padding-top:8px; border-top:1px solid rgba(148,163,184,.13); font-size:9px; line-height:1.45; opacity:.5; }
  .boq-work-head { margin:0 0 14px; padding-bottom:13px !important; }
  .boq-work-head .boq-step-head { margin-bottom:13px; }
  .boq-discipline-overview { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:9px; margin-bottom:12px; }
  .boq-discipline-overview button { min-width:0; min-height:58px; display:flex; align-items:center; gap:9px; padding:10px 12px; border:1px solid rgba(59,130,246,.18); border-radius:11px; background:rgba(59,130,246,.045); color:inherit; cursor:pointer; text-align:left; }
  .boq-discipline-overview svg { flex:0 0 auto; color:#2563eb; }
  .boq-discipline-overview span, .boq-discipline-overview strong, .boq-discipline-overview small { display:block; min-width:0; }
  .boq-discipline-overview strong { overflow:hidden; font-size:11px; text-overflow:ellipsis; white-space:nowrap; }
  .boq-discipline-overview small { margin-top:3px; font-size:8px; opacity:.5; }
  .boq-category-nav { display:flex; gap:7px; padding-bottom:2px; overflow-x:auto; scrollbar-width:none; }
  .boq-category-nav::-webkit-scrollbar { display:none; }
  .boq-category-nav button { min-height:38px; display:flex; align-items:center; gap:7px; flex:0 0 auto; padding:7px 11px 7px 8px; border:1px solid rgba(148,163,184,.2); border-radius:999px; background:rgba(148,163,184,.035); color:inherit; cursor:pointer; font-size:9px; font-weight:650; }
  .boq-category-nav b { width:24px; height:24px; display:grid; place-items:center; border-radius:50%; background:rgba(59,130,246,.12); color:#2563eb; }
  .boq-section { scroll-margin-top:12px; }
  .boq-section-head { width:100%; border:0; border-bottom:1px solid rgba(148,163,184,.14); background:transparent; color:inherit; cursor:pointer; text-align:left; }
  .boq-section-head:hover { background:rgba(148,163,184,.025); }
  .boq-discipline-label { margin:0 0 2px !important; color:#2563eb; font-size:7px !important; font-weight:750; letter-spacing:.03em; opacity:.85 !important; }
  .boq-section-totals svg { flex:0 0 auto; opacity:.5; }
  .boq-mobile-items, .boq-resource-cards, .boq-mobile-total-bar { display:none; }
  .boq-summary-step { display:flex; align-items:center; gap:8px; margin-bottom:13px; padding-bottom:12px; border-bottom:1px solid rgba(255,255,255,.1); font-size:10px; font-weight:750; }
  .boq-summary-step b { width:27px; height:27px; display:grid; place-items:center; border-radius:8px; background:#3b82f6; }
  .boq-item-note { display:block; margin:0 0 10px; }
  .boq-item-note > span { display:block; margin-bottom:5px; font-size:9px; font-weight:700; opacity:.6; }
  .boq-item-note input { width:100%; min-height:40px; padding:8px 10px; border:1px solid rgba(148,163,184,.22); border-radius:8px; outline:0; background:var(--card-bg,#fff); color:inherit; font:inherit; }
  .boq-item-note input:focus { border-color:rgba(37,99,235,.55); box-shadow:0 0 0 2px rgba(37,99,235,.08); }
  .boq-static-rate > div { padding:0 10px; }
  .boq-static-rate b { margin-left:6px; font-size:12px; }

  @media (max-width:760px) {
    .boq-header-actions { width:100%; display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .boq-header-actions .outline-btn { min-height:44px; justify-content:center; padding:9px 10px; }
    .boq-flow { gap:6px; padding:10px; }
    .boq-flow > div { display:grid; justify-items:center; gap:4px; text-align:center; font-size:8px; }
    .boq-flow b { width:25px; height:25px; } .boq-flow i { min-width:8px; }
    .boq-notice { padding:10px 11px; font-size:10px; line-height:1.55; }
    .boq-project-card { padding:15px !important; }
    .boq-project-card input, .boq-project-card select { font-size:16px; }
    .boq-step-head { margin-bottom:14px; } .boq-step-head h2 { font-size:15px; }
    .boq-project-grid { gap:11px; }
    .boq-input-wrap { min-height:46px; }
    .boq-mode-switch { grid-template-columns:1fr; }
    .boq-mode-switch button { min-height:82px; padding:12px; }
    .boq-mode-explainer { font-size:9px; }
    .boq-settings-btn { width:100%; min-height:44px; justify-content:center; }
    .boq-assumptions { grid-template-columns:1fr 1fr; padding:10px; }
    .boq-assumption-field input { min-height:38px; }
    .boq-planning-head { gap:12px; }
    .boq-price-mode { grid-template-columns:1fr; }
    .boq-price-mode button { min-height:70px; }
    .boq-current-selection { grid-template-columns:34px minmax(0,1fr); padding:12px; }
    .boq-current-selection > b { grid-column:2; font-size:16px; }
    .boq-toolbar-actions { display:grid; grid-template-columns:1fr 44px; gap:8px; }
    .boq-toolbar-actions .outline-btn { min-height:44px; justify-content:center; }
    .boq-icon-btn { width:44px; height:44px; }
    .boq-plan-grid { grid-template-columns:1fr; }
    .boq-period-card { grid-template-columns:36px minmax(0,1fr); padding:12px; }
    .boq-custom-period { max-width:none; }
    .boq-compare-card { padding:12px; }
    .boq-compare-card strong { font-size:14px; }
    .boq-work-head { padding:14px !important; }
    .boq-discipline-overview { grid-template-columns:1fr; gap:7px; }
    .boq-discipline-overview button { min-height:54px; }
    .boq-category-nav { margin:0 -14px -2px; padding:0 14px 3px; }
    .boq-category-nav button { min-height:42px; }
    .boq-layout { display:block; }
    .boq-section { margin-bottom:11px; }
    .boq-section-head { align-items:center; flex-direction:row; padding:13px; }
    .boq-section-title { min-width:0; gap:9px; } .boq-section-code { width:32px; height:32px; }
    .boq-section-head h2 { font-size:13px; } .boq-section-head span { font-size:8px; }
    .boq-section-totals { width:auto; gap:9px; } .boq-section-totals > span:nth-child(2) { display:none; }
    .boq-section-totals > span { white-space:nowrap; font-size:8px; } .boq-section-totals b { font-size:10px; }
    .boq-table-scroll { display:none; }
    .boq-mobile-items { display:block; }
    .boq-mobile-item { padding:15px 13px; border-top:1px solid rgba(148,163,184,.12); }
    .boq-mobile-item:first-child { border-top:0; }
    .boq-mobile-item.has-value { background:rgba(59,130,246,.02); }
    .boq-mobile-item-head { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
    .boq-mobile-item-head > div { min-width:0; } .boq-mobile-item-head h3 { margin:3px 0; font-size:13px; line-height:1.35; }
    .boq-mobile-item-head p { margin:0; font-size:9px; line-height:1.45; opacity:.48; }
    .boq-mobile-item-head > strong { flex:0 0 auto; padding-top:2px; color:#2563eb; font-size:12px; }
    .boq-mobile-quantity { margin-top:12px; }
    .boq-exact-inputs { grid-template-columns:1fr; gap:8px; }
    .boq-exact-inputs label > span { margin-bottom:5px; font-size:9px; }
    .boq-exact-inputs label > div { min-height:44px; }
    .boq-exact-inputs input { width:100%; min-height:42px; padding:8px 5px 8px 10px; font-size:16px; text-align:left; }
    .boq-exact-inputs i { padding-right:10px; font-size:10px; }
    .boq-single-qty > span { display:block; margin-bottom:5px; font-size:9px; opacity:.58; }
    .boq-single-qty > div { min-height:44px; display:flex; align-items:center; border:1px solid rgba(148,163,184,.28); border-radius:9px; background:rgba(148,163,184,.045); overflow:hidden; }
    .boq-single-qty input { width:100%; min-width:0; min-height:42px; padding:8px 5px 8px 10px; border:0; outline:0; background:transparent; color:inherit; font-size:16px; font-weight:750; }
    .boq-single-qty i { padding-right:10px; font-size:10px; font-style:normal; opacity:.55; }
    .boq-item-warning { display:flex; align-items:center; gap:6px; margin-top:8px; color:#dc2626; font-size:9px; font-weight:700; }
    .boq-detail-btn.mobile { width:100%; min-height:44px; justify-content:center; margin-top:10px; border:1px solid rgba(59,130,246,.2); border-radius:9px; background:rgba(59,130,246,.06); }
    .boq-resource-box { margin-top:10px; padding:9px; }
    .boq-formula-note { margin-bottom:9px; font-size:9px; line-height:1.5; }
    .boq-item-note input { min-height:44px; font-size:16px; }
    .boq-resource-scroll { display:none; }
    .boq-resource-cards { display:grid; gap:9px; }
    .boq-resource-card { padding:11px; border:1px solid rgba(148,163,184,.17); border-radius:10px; background:var(--card-bg,#fff); }
    .boq-resource-card.missing { border-color:rgba(220,38,38,.25); }
    .boq-resource-head { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
    .boq-resource-head > div:first-child { min-width:0; } .boq-resource-head h4 { margin:3px 0 0; font-size:11px; line-height:1.35; }
    .boq-resource-head > div:last-child { flex:0 0 auto; text-align:right; } .boq-resource-head small { display:block; font-size:7px; opacity:.48; } .boq-resource-head strong { font-size:10px; }
    .boq-resource-help { margin:7px 0 0; font-size:8px; line-height:1.4; opacity:.48; }
    .boq-card-field { display:block; min-width:0; }
    .boq-card-field.full { margin-top:9px; }
    .boq-card-field > span { display:block; min-height:22px; margin-bottom:4px; font-size:8px; line-height:1.3; opacity:.58; }
    .boq-card-field > div { min-height:43px; display:flex; align-items:center; border:1px solid rgba(148,163,184,.24); border-radius:8px; overflow:hidden; }
    .boq-card-field > div.missing { border-color:rgba(220,38,38,.4); background:rgba(220,38,38,.035); }
    .boq-card-field input { width:100%; min-width:0; min-height:41px; padding:7px 8px; border:0; outline:0; background:transparent; color:inherit; font-size:16px; font-weight:700; }
    .boq-card-field i { padding:0 0 0 8px; font-size:9px; font-style:normal; opacity:.5; white-space:nowrap; }
    .boq-card-field input + i { padding:0 8px 0 0; }
    .boq-card-field > small { display:block; margin-top:4px; font-size:7px; line-height:1.35; }
    .boq-material-select { width:100%; min-height:44px; font-size:16px; }
    .boq-resource-fields { display:grid; grid-template-columns:1fr 1fr; gap:9px 8px; margin-top:10px; }
    .boq-resource-future { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:10px; padding-top:9px; border-top:1px solid rgba(148,163,184,.12); }
    .boq-resource-future span { font-size:8px; opacity:.5; } .boq-resource-future strong { color:#2563eb; font-size:11px; }
    .boq-summary-wrap { margin-top:14px; scroll-margin-top:12px; }
    .boq-summary { padding:17px; border-radius:13px; }
    .boq-grand-total { font-size:26px; }
    .boq-rate-row { grid-template-columns:1fr 70px minmax(80px,auto); gap:6px; }
    .boq-rate-row label { min-height:38px; } .boq-rate-row input { width:48px; min-height:36px; font-size:16px; }
    .boq-summary .primary-btn { min-height:46px; }
    .boq-insights { margin-bottom:90px; }
    .boq-insight-grid { grid-template-columns:1fr 1fr; }
    .boq-insight-card { min-width:0; padding:11px; } .boq-insight-card strong { overflow-wrap:anywhere; }
    .boq-mobile-total-bar { position:fixed; z-index:40; left:0; right:0; bottom:0; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:9px max(14px,env(safe-area-inset-left)) calc(9px + env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-right)); border-top:1px solid rgba(148,163,184,.2); background:var(--card-bg,#fff); color:inherit; box-shadow:0 -10px 28px rgba(15,23,42,.12); }
    .boq-mobile-total-bar span { display:block; font-size:8px; opacity:.55; } .boq-mobile-total-bar strong { display:block; margin-top:2px; font-size:16px; }
    .boq-mobile-total-bar button { min-height:42px; display:flex; align-items:center; gap:5px; padding:0 14px; border:0; border-radius:10px; background:#2563eb; color:#fff; font-weight:750; }
  }

  @media (max-width:430px) {
    .boq-flow > div span { max-width:76px; line-height:1.25; }
    .boq-period-card { grid-template-columns:32px minmax(0,1fr); gap:8px; }
    .boq-time-icon { width:32px; height:32px; }
    .boq-compare-card { grid-template-columns:minmax(0,1fr) 20px minmax(0,1fr); gap:5px; }
    .boq-compare-card strong { font-size:13px; }
    .boq-section-head { gap:8px; }
    .boq-section-totals > span { display:none; }
    .boq-resource-fields { grid-template-columns:1fr 1fr; }
  }

  @media (max-width:360px) {
    .boq-resource-fields, .boq-insight-grid, .boq-assumptions { grid-template-columns:1fr; }
    .boq-mode-switch button em { display:none; }
  }

  @media print {
    .boq-header-actions, .boq-flow, .boq-category-nav, .boq-mobile-total-bar, .boq-detail-btn, .boq-toolbar-actions { display:none !important; }
  }
`;
