import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { PageHeader, StatCard, Source } from "../components/Shared.jsx";

export default function DataStats() {
  return (
    <>
      <PageHeader
        eyebrow="DATA QUALITY"
        title="ข้อมูลและสถิติ"
        description="ตรวจสอบแหล่งข้อมูล ความครอบคลุม และคุณภาพ Dataset ที่ใช้ในการวิเคราะห์"
      />

      <div className="stats-grid">
        <StatCard label="จำนวนข้อมูลราคา" value="18,420" change="+2.4%" note="records"/>
        <StatCard label="วัสดุที่ติดตาม" value="17" change="active" note="categories"/>
        <StatCard label="ช่วงข้อมูล" value="6 ปี" change="2020–2026" note="monthly"/>
        <StatCard label="Data completeness" value="97.8%" change="GOOD" note="quality score"/>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><div><h2>Dataset coverage</h2><span>จำนวน records ตามหมวดวัสดุ</span></div></div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                {name:"เหล็ก",v:4100},
                {name:"ปูน",v:3900},
                {name:"ทราย",v:3400},
                {name:"หิน",v:3100},
                {name:"PVC",v:3920}
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="name" tickLine={false} axisLine={false}/>
                <YAxis tickLine={false} axisLine={false}/>
                <Tooltip/>
                <Bar dataKey="v" radius={[5,5,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card source-card">
          <div className="card-head"><div><h2>Data sources</h2><span>แหล่งข้อมูลที่ระบบรองรับ</span></div></div>
          <Source name="ราคาวัสดุก่อสร้าง" status="Connected"/>
          <Source name="ราคาน้ำมัน" status="Connected"/>
          <Source name="USD / THB" status="Connected"/>
          <Source name="CPI / PPI" status="Connected"/>
          <Source name="Construction Index" status="Pending"/>
        </section>
      </div>
    </>
  );
}
