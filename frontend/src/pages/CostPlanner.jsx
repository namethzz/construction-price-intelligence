import React, { useMemo, useState } from "react";
import { Download, Calculator } from "lucide-react";
import { materials } from "../data.js";
import { PageHeader } from "../components/Shared.jsx";

export default function CostPlanner() {
  const [items, setItems] = useState([
    { name: "เหล็กเส้น DB12", qty: 2000 },
    { name: "ปูนซีเมนต์ปอร์ตแลนด์", qty: 500 },
    { name: "ทรายก่อสร้าง", qty: 20 }
  ]);

  const update = (i, k, v) => setItems(items.map((x, n) => n === i ? { ...x, [k]: k === "qty" ? Number(v) : v } : x));
  const total = useMemo(() => items.reduce((sum, i) => {
    const m = materials.find(x => x.name === i.name) || materials[0];
    return sum + i.qty * m.price;
  }, 0), [items]);

  return (
    <>
      <PageHeader
        eyebrow="DECISION SUPPORT"
        title="วางแผนต้นทุน"
        description="เลือกวัสดุเชิงพาณิชย์ ใส่ปริมาณ และประเมินต้นทุนตาม Forecast"
        action={<button className="outline-btn"><Download size={15}/> Export plan</button>}
      />

      <div className="cost-layout">
        <section className="card">
          <div className="card-head">
            <div><h2>รายการวัสดุ</h2><span>Bill of Materials • Commercial Construction</span></div>
            <button className="text-btn" onClick={()=>setItems([...items,{name:materials[8].name,qty:1000}])}>+ เพิ่มรายการ</button>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>วัสดุ</th><th>จำนวน</th><th>หน่วย</th><th>ราคาต่อหน่วย</th><th>รวม</th></tr>
              </thead>
              <tbody>
                {items.map((i, index) => {
                  const m = materials.find(x => x.name === i.name) || materials[0];
                  return (
                    <tr key={index}>
                      <td>
                        <select className="table-select" value={i.name} onChange={e=>update(index,"name",e.target.value)}>
                          {materials.map(x=><option key={x.name} value={x.name}>{x.name}</option>)}
                        </select>
                      </td>
                      <td><input className="qty-input" type="number" min="0" value={i.qty} onChange={e=>update(index,"qty",e.target.value)}/></td>
                      <td>{m.unit.replace("บาท/","")}</td>
                      <td>฿{m.price.toLocaleString()}</td>
                      <td className="price">฿{Math.round(i.qty*m.price).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="cost-summary">
          <div className="eyebrow">COST ESTIMATE</div>
          <h3>ต้นทุนวันนี้</h3>
          <div className="cost-number">฿{Math.round(total).toLocaleString()}</div>
          <div className="summary-line"><span>Forecast +3.8%</span><b>฿{Math.round(total*1.038).toLocaleString()}</b></div>
          <div className="summary-line muted"><span>ส่วนต่างโดยประมาณ</span><b>+฿{Math.round(total*.038).toLocaleString()}</b></div>
          <button className="primary-btn"><Calculator size={16}/> คำนวณต้นทุนในอนาคต</button>
        </aside>
      </div>

      <div className="timeline">
        <div><span>วันนี้</span><b>฿{Math.round(total).toLocaleString()}</b></div>
        <div className="timeline-line"/>
        <div><span>3 เดือน</span><b>฿{Math.round(total*1.038).toLocaleString()}</b></div>
        <div className="timeline-line"/>
        <div><span>6 เดือน</span><b>฿{Math.round(total*1.069).toLocaleString()}</b></div>
      </div>
    </>
  );
}
