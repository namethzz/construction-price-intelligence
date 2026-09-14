import React from "react";
import { ChevronDown, RefreshCw, Sparkles, ArrowUpRight, Info } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { priceData } from "../data.js";
import { PageHeader, StatCard, Driver, MaterialTable } from "../components/Shared.jsx";

export default function Overview({ navigate }) {
  return (
    <>
      <PageHeader
        eyebrow="MARKET OVERVIEW • 14 SEP 2026"
        title="ตลาดวัสดุก่อสร้างวันนี้"
        description="ภาพรวมราคา แนวโน้ม และสัญญาณที่มีผลต่อราคาวัสดุก่อสร้างในประเทศไทย"
        action={<button className="outline-btn" onClick={() => navigate("data")}><RefreshCw size={15}/> อัปเดตข้อมูล</button>}
      />

      <div className="stats-grid">
        <StatCard label="ดัชนีราคาวัสดุ" value="112.4" change="+1.8%" note="เทียบเดือนก่อน" positive/>
        <StatCard label="ราคาเหล็กเส้น" value="฿22,400" change="+3.2%" note="บาท/ตัน" positive/>
        <StatCard label="ราคาเฉลี่ยปูน" value="฿105" change="+1.8%" note="บาท/ถุง" positive/>
        <StatCard label="Market Signal" value="BULLISH" change="สูง" note="แนวโน้ม 3 เดือน" positive/>
      </div>

      <div className="grid-2">
        <section className="card chart-card">
          <div className="card-head">
            <div>
              <h2>แนวโน้มราคาเหล็กเส้น</h2>
              <span>บาท/ตัน • 9 เดือนล่าสุด</span>
            </div>
            <button className="select-btn">9 เดือน <ChevronDown size={14}/></button>
          </div>
          <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%">
            <AreaChart data={priceData}>
              <defs><linearGradient id="steelFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopOpacity=".22"/><stop offset="100%" stopOpacity="0"/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="month" tickLine={false} axisLine={false}/>
              <YAxis tickLine={false} axisLine={false} domain={["dataMin - 500", "dataMax + 500"]} tickFormatter={v => `฿${(v/1000).toFixed(0)}k`}/>
              <Tooltip formatter={(v) => [`฿${v.toLocaleString()}`, "ราคา"]}/>
              <Area type="monotone" dataKey="steel" strokeWidth={2.5} fill="url(#steelFill)" fillOpacity={1}/>
            </AreaChart>
          </ResponsiveContainer></div>
        </section>

        <section className="card">
          <div className="card-head">
            <div><h2>Market Drivers</h2><span>ปัจจัยที่ Model ให้น้ำหนัก</span></div>
            <Sparkles size={18}/>
          </div>
          <Driver label="ราคาวัตถุดิบ" value={82}/>
          <Driver label="ต้นทุนพลังงาน" value={68}/>
          <Driver label="ค่าเงินบาท" value={47}/>
          <Driver label="Demand ก่อสร้าง" value={41}/>
          <Driver label="ฤดูกาล" value={19}/>
          <div className="insight-box"><Info size={16}/><span>วัตถุดิบและพลังงานเป็นแรงขับหลักของราคาเหล็กในช่วงนี้</span></div>
        </section>
      </div>

      <section className="card table-card">
        <div className="card-head"><div><h2>วัสดุที่ติดตาม</h2><span>ราคาล่าสุดจาก Dataset</span></div><button className="text-btn" onClick={() => navigate("prices")}>ดูทั้งหมด <ArrowUpRight size={15}/></button></div>
        <MaterialTable compact/>
      </section>
    </>
  );
}
