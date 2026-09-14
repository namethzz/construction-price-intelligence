import {
  LayoutDashboard, Boxes, TrendingUp, Calculator, Database, Activity
} from "lucide-react";

export const priceData = [
  { month: "Jan", steel: 21800, cement: 104 },
  { month: "Feb", steel: 22050, cement: 105 },
  { month: "Mar", steel: 21900, cement: 106 },
  { month: "Apr", steel: 22350, cement: 107 },
  { month: "May", steel: 22600, cement: 108 },
  { month: "Jun", steel: 22400, cement: 109 },
  { month: "Jul", steel: 22950, cement: 111 },
  { month: "Aug", steel: 23200, cement: 112 },
  { month: "Sep", steel: 23450, cement: 113 }
];

export const forecastData = [
  { month: "Sep", actual: 23450, forecast: null },
  { month: "Oct", actual: null, forecast: 23820 },
  { month: "Nov", actual: null, forecast: 24110 },
  { month: "Dec", actual: null, forecast: 24580 },
  { month: "Jan", actual: null, forecast: 24890 },
  { month: "Feb", actual: null, forecast: 25180 }
];

export const materials = [
  { name:"เหล็กเส้น DB12", category:"เหล็ก", price:22400, unit:"บาท/ตัน", change:"+3.2%", positive:true },
  { name:"เหล็กเส้น DB16", category:"เหล็ก", price:22600, unit:"บาท/ตัน", change:"+3.0%", positive:true },
  { name:"เหล็กข้ออ้อย DB20", category:"เหล็ก", price:22800, unit:"บาท/ตัน", change:"+3.4%", positive:true },
  { name:"เหล็กรูปพรรณ H-Beam", category:"เหล็ก", price:28600, unit:"บาท/ตัน", change:"+2.8%", positive:true },
  { name:"ปูนซีเมนต์ปอร์ตแลนด์", category:"ปูน", price:105, unit:"บาท/ถุง", change:"+1.8%", positive:true },
  { name:"ปูนซีเมนต์ผสม", category:"ปูน", price:98, unit:"บาท/ถุง", change:"+1.2%", positive:true },
  { name:"ทรายก่อสร้าง", category:"วัสดุมวลรวม", price:950, unit:"บาท/ลบ.ม.", change:"-0.6%", positive:false },
  { name:"หินก่อสร้าง 3/4 นิ้ว", category:"วัสดุมวลรวม", price:820, unit:"บาท/ลบ.ม.", change:"+0.4%", positive:true },
  { name:"อิฐมอญ", category:"วัสดุก่อ", price:2.8, unit:"บาท/ก้อน", change:"+0.7%", positive:true },
  { name:"อิฐมวลเบา", category:"วัสดุก่อ", price:32, unit:"บาท/ก้อน", change:"+1.1%", positive:true },
  { name:"บล็อกคอนกรีต", category:"วัสดุก่อ", price:12, unit:"บาท/ก้อน", change:"+0.3%", positive:true },
  { name:"ท่อ PVC 2 นิ้ว", category:"ระบบน้ำ", price:185, unit:"บาท/เส้น", change:"+2.1%", positive:true },
  { name:"ท่อ PVC 4 นิ้ว", category:"ระบบน้ำ", price:420, unit:"บาท/เส้น", change:"+2.4%", positive:true },
  { name:"สายไฟ THW 1x16 sq.mm.", category:"ระบบไฟฟ้า", price:68, unit:"บาท/เมตร", change:"+1.9%", positive:true },
  { name:"กระเบื้องเซรามิก", category:"งานสถาปัตย์", price:245, unit:"บาท/ตร.ม.", change:"+0.8%", positive:true },
  { name:"ยิปซัมบอร์ด 9 มม.", category:"งานสถาปัตย์", price:165, unit:"บาท/แผ่น", change:"+1.0%", positive:true },
  { name:"ไม้อัด 10 มม.", category:"ไม้และแบบ", price:390, unit:"บาท/แผ่น", change:"-0.4%", positive:false }
];

export const navItems = [
  ["overview", "ภาพรวม", LayoutDashboard],
  ["prices", "ราคาวัสดุ", Boxes],
  ["forecast", "พยากรณ์ราคา", TrendingUp],
  ["analysis", "วิเคราะห์ราคา", Activity],
  ["cost", "วางแผนต้นทุน", Calculator],
  ["data", "ข้อมูลและสถิติ", Database]
];
