import React, { useState } from "react";
import { Download, Search, ChevronDown } from "lucide-react";
import { materials } from "../data.js";
import { PageHeader, MaterialTable } from "../components/Shared.jsx";

export default function Prices() {
  const [query, setQuery] = useState("");
  // Note: `materials` filter kept in MaterialTable for now; local filtered var
  // preserved for future wiring into MaterialTable via props if needed.
  const filtered = materials.filter(m => m.name.includes(query) || m.category.includes(query));

  return (
    <>
      <PageHeader
        eyebrow="PRICE MONITOR"
        title="ราคาวัสดุ"
        description="ติดตามราคาปัจจุบันและการเปลี่ยนแปลงของวัสดุแต่ละประเภท"
        action={<button className="outline-btn"><Download size={15}/> Export CSV</button>}
      />
      <div className="toolbar">
        <div className="search">
          <Search size={17}/>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ค้นหาวัสดุ..."/>
        </div>
        <button className="select-btn">ทุกหมวด <ChevronDown size={14}/></button>
        <button className="select-btn">ภาคกลาง <ChevronDown size={14}/></button>
      </div>
      <section className="card table-card"><MaterialTable/></section>
    </>
  );
}
