import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { materials } from "../data.js";
import { PageHeader, Driver } from "../components/Shared.jsx";

export default function Analysis() {
  const [selected, setSelected] = useState(materials[0]);

  return (
    <>
      <PageHeader
        eyebrow="EXPLAINABLE ML"
        title="วิเคราะห์ราคา"
        description="เลือกวัสดุเพื่อดูว่าปัจจัยใดมีผลต่อการพยากรณ์ราคาของ Model"
      />

      <div className="selection-card">
        <div>
          <div className="field-label">วัสดุที่ต้องการวิเคราะห์</div>
          <select value={selected.name} onChange={e=>setSelected(materials.find(m=>m.name===e.target.value))}>
            {materials.map(m=><option key={m.name} value={m.name}>{m.name} — {m.category}</option>)}
          </select>
        </div>
        <div className="selection-meta"><span>ราคาปัจจุบัน</span><b>฿{selected.price.toLocaleString()} / {selected.unit.replace("บาท/","")}</b></div>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <div><h2>Feature importance</h2><span>{selected.name} • XGBoost</span></div>
            <Sparkles size={18}/>
          </div>
          <Driver label="ราคาวัตถุดิบ" value={82}/>
          <Driver label="ต้นทุนพลังงาน" value={68}/>
          <Driver label="ค่าเงินบาท" value={47}/>
          <Driver label="Demand ก่อสร้าง" value={41}/>
          <Driver label="ฤดูกาล" value={19}/>
        </section>

        <section className="card">
          <div className="card-head">
            <div><h2>Model explanation</h2><span>Prediction: ฿{Math.round(selected.price*1.065).toLocaleString()}</span></div>
          </div>
          <div className="explain-row positive"><span>ราคาวัตถุดิบสูงขึ้น</span><b>+3.8%</b></div>
          <div className="explain-row positive"><span>ต้นทุนพลังงานเพิ่ม</span><b>+2.5%</b></div>
          <div className="explain-row negative"><span>เงินบาทแข็งค่า</span><b>-0.8%</b></div>
          <div className="explain-row positive"><span>Demand ก่อสร้าง</span><b>+1.0%</b></div>
          <div className="explain-total"><span>Base price</span><b>฿{selected.price.toLocaleString()}</b></div>
        </section>
      </div>

      <section className="card insight-large">
        <div className="insight-icon"><Sparkles size={20}/></div>
        <div>
          <div className="eyebrow">MODEL INSIGHT</div>
          <h2>วิเคราะห์แยกตามวัสดุ ไม่จำกัดเฉพาะเหล็กเส้น</h2>
          <p>ระบบสามารถเลือกวัสดุก่อสร้างเชิงพาณิชย์แต่ละรายการเพื่อดู Feature importance และผลกระทบของปัจจัยต่าง ๆ ต่อ Forecast</p>
        </div>
      </section>
    </>
  );
}
