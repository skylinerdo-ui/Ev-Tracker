import { useState, useMemo, useEffect } from "react";
import { Zap, Home, Building2, Plug, Plus, X, Gauge, Wallet, Route, Calendar, TrendingDown, Search, Pencil, Trash2, ArrowLeft, Check, Settings, Clock, BarChart2, FileText, Battery } from "lucide-react";

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
const SK = "ev-charging-log:entries";
const CK = "ev-charging-log:car";
const load = k => { try { const r=window.localStorage.getItem(k); return r?JSON.parse(r):null; } catch { return null; } };
const save = (k,v) => { try { window.localStorage.setItem(k,JSON.stringify(v)); } catch {} };
const fmt = (n,d=1) => Number.isFinite(n)?n.toLocaleString("th-TH",{minimumFractionDigits:d,maximumFractionDigits:d}):"—";
const startOfDay   = d => { const x=new Date(d); x.setHours(0,0,0,0); return x; };
const startOfWeek  = d => { const x=startOfDay(d); x.setDate(x.getDate()-x.getDay()); return x; };
const startOfMonth = d => { const x=startOfDay(d); x.setDate(1); return x; };
const TH_M=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const TH_D=["อา.","จ.","อ.","พ.","พฤ.","ศ.","ส."];
const fmtS = iso => { const d=new Date(iso); return `${d.getDate()} ${TH_M[d.getMonth()]}`; };
const fmtF = iso => { const d=new Date(iso); return `${TH_D[d.getDay()]} ${d.getDate()} ${TH_M[d.getMonth()]} ${d.getFullYear()}`; };
const fmtMins = m => { if(!m||m<=0) return "—"; const h=Math.floor(m/60),mn=m%60; return h>0?`${h}ชม. ${mn}น.`:`${mn}น.`; };

const EV_BRANDS = [
  { id:"byd",      name:"BYD",          bat:60.5, logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/BYD_Auto_logo.svg/512px-BYD_Auto_logo.svg.png" },
  { id:"tesla",    name:"Tesla",         bat:75,   logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Tesla_T_symbol.svg/512px-Tesla_T_symbol.svg.png" },
  { id:"mg",       name:"MG",            bat:51,   logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/MG_Motor_logo.svg/512px-MG_Motor_logo.svg.png" },
  { id:"neta",     name:"NETA",          bat:40,   logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Neta_auto_logo.svg/512px-Neta_auto_logo.svg.png" },
  { id:"ora",      name:"ORA",           bat:48,   logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/ORA_logo.svg/512px-ORA_logo.svg.png" },
  { id:"gac",      name:"GAC Aion",      bat:70,   logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/GAC_Motor_logo.svg/512px-GAC_Motor_logo.svg.png" },
  { id:"volvo",    name:"Volvo",         bat:78,   logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Volvo_logo.svg/512px-Volvo_logo.svg.png" },
  { id:"bmw",      name:"BMW",           bat:83.9, logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/BMW.svg/512px-BMW.svg.png" },
  { id:"mercedes", name:"Mercedes-Benz", bat:90,   logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Mercedes-Logo.svg/512px-Mercedes-Logo.svg.png" },
  { id:"audi",     name:"Audi",          bat:95,   logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Audi-Logo_2016.svg/512px-Audi-Logo_2016.svg.png" },
  { id:"hyundai",  name:"Hyundai",       bat:77.4, logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Hyundai_Motor_Company_logo.svg/512px-Hyundai_Motor_Company_logo.svg.png" },
  { id:"kia",      name:"Kia",           bat:77.4, logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Kia-logo.svg/512px-Kia-logo.svg.png" },
  { id:"zeekr",    name:"ZEEKR",         bat:100,  logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Zeekr_logo.svg/512px-Zeekr_logo.svg.png" },
  { id:"nio",      name:"NIO",           bat:100,  logo:"https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/NIO_logo.svg/512px-NIO_logo.svg.png" },
  { id:"other",    name:"อื่นๆ",         bat:null, logo:null },
];

const S_BG="#0EA5E9", S_BD="#0369A1", S_TX="#0C1A27";
const U_BG="#FFFFFF", U_BD="#CBD5E1", U_TX="#64748B";

const LOCS=[
  {id:"home",  label:"บ้าน",         icon:Home},
  {id:"work",  label:"ที่ทำงาน",     icon:Building2},
  {id:"public",label:"สถานีสาธารณะ",icon:Plug},
];
const CTYPES=[{id:"AC",label:"AC",sub:"ชาร์จช้า"},{id:"DC",label:"DC",sub:"ชาร์จเร็ว"}];
const RL={day:"วันนี้",week:"สัปดาห์นี้",month:"เดือนนี้",all:"ทั้งหมด"};

const seed=()=>{
  const now=new Date(),rows=[];let odo=12450;
  for(let i=14;i>=0;i--){
    if(Math.random()>0.55)continue;
    const d=new Date(now);d.setDate(d.getDate()-i);
    const kwh=8+Math.random()*22,dist=60+Math.random()*180;odo+=dist;
    const loc=LOCS[Math.floor(Math.random()*LOCS.length)];
    const type=loc.id==="home"?"AC":Math.random()>0.4?"DC":"AC";
    const ppu=loc.id==="home"?4.2:type==="DC"?9.5:6.8;
    const mins=type==="DC"?Math.round(20+Math.random()*40):Math.round(60+Math.random()*120);
    rows.push({id:uid(),date:d.toISOString(),kwh:+kwh.toFixed(2),cost:+(kwh*ppu).toFixed(2),odometer:Math.round(odo),location:loc.id,chargeType:type,note:"",mins});
  }
  return rows.sort((a,b)=>new Date(b.date)-new Date(a.date));
};

function Sparkline({values,color="#0EA5E9",height=28}){
  if(!values||values.length<2)return<div style={{height}} className="w-full"/>;
  const max=Math.max(...values,0.0001),min=Math.min(...values,0),r=max-min||1;
  const w=100,h=height,step=w/(values.length-1);
  const pts=values.map((v,i)=>[i*step,h-((v-min)/r)*(h-4)-2]);
  const path=pts.map(([x,y],i)=>`${i===0?"M":"L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  return(
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full" style={{height}}>
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i===pts.length-1?2:0} fill={color}/>)}
    </svg>
  );
}

function Ring({value,max,label,unit}){
  const r=62,c=2*Math.PI*r,off=c*(1-Math.max(0,Math.min(1,max>0?value/max:0)));
  return(
    <div className="relative flex items-center justify-center">
      <svg width="156" height="156" viewBox="0 0 156 156" className="-rotate-90">
        <circle cx="78" cy="78" r={r} fill="none" stroke="#E2E8F0" strokeWidth="12"/>
        <circle cx="78" cy="78" r={r} fill="none" stroke={S_BG} strokeWidth="12"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          style={{transition:"stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)"}}/>
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-3xl font-bold tabular-nums text-[#0C1A27]">{fmt(value,value>=100?0:1)}</span>
        <span className="text-xs text-[#64748B] mt-0.5">{unit}</span>
        <span className="text-[10px] text-[#94A3B8] mt-1 uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
}

function ToggleBtn({active,onClick,icon:Icon,label,sub}){
  return(
    <button onClick={onClick}
      style={{background:active?S_BG:U_BG,borderColor:active?S_BD:U_BD,color:active?S_TX:U_TX}}
      className={`relative flex flex-col items-center justify-center gap-1 py-3.5 rounded-2xl border-2 font-bold text-xs transition-all w-full ${active?"shadow-[0_4px_14px_-2px_rgba(14,165,233,0.55)]":""}`}>
      {Icon&&<Icon size={22} strokeWidth={active?2.5:2} style={{color:active?S_TX:U_TX}}/>}
      <span className="text-[13px] font-bold leading-tight">{label}</span>
      {sub&&<span className="text-[10px] font-normal opacity-80">{sub}</span>}
      {active&&(
        <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
          style={{background:S_BD,border:"2px solid white"}}>
          <Check size={11} strokeWidth={3.5} color="white"/>
        </span>
      )}
    </button>
  );
}

function Pill({active,onClick,icon:Icon,label}){
  return(
    <button onClick={onClick}
      style={{background:active?S_BG:U_BG,borderColor:active?S_BD:U_BD,color:active?S_TX:U_TX}}
      className={`relative shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full border-2 text-[12px] font-bold transition-all ${active?"shadow-[0_2px_8px_-1px_rgba(14,165,233,0.5)] pr-7":""}`}>
      {Icon&&<Icon size={12} strokeWidth={active?2.5:2}/>}
      {label}
      {active&&(
        <span className="absolute top-1/2 -translate-y-1/2 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{background:S_BD}}>
          <Check size={8} strokeWidth={4} color="white"/>
        </span>
      )}
    </button>
  );
}

function RangeTab({active,onClick,label}){
  return(
    <button onClick={onClick}
      style={{background:active?S_BG:U_BG,color:active?S_TX:U_TX,border:`2px solid ${active?S_BD:"transparent"}`}}
      className={`relative flex-1 py-2.5 rounded-xl text-[12px] font-extrabold transition-all ${active?"shadow-[0_3px_10px_-2px_rgba(14,165,233,0.55)]":""}`}>
      {label}
      {active&&(
        <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center shadow"
          style={{background:S_BD,border:"2px solid white"}}>
          <Check size={10} strokeWidth={3.5} color="white"/>
        </span>
      )}
    </button>
  );
}

function SuccessOverlay({message}){
  return(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0C1A27]/40 backdrop-blur-sm">
      <style>{`@keyframes pop{0%{transform:scale(0.6);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1);opacity:1}}@keyframes cd{from{stroke-dashoffset:24}to{stroke-dashoffset:0}}`}</style>
      <div className="flex flex-col items-center gap-3" style={{animation:"pop 0.35s ease-out"}}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(14,165,233,0.5)]" style={{background:S_BG}}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="24" strokeDashoffset="24" style={{animation:"cd 0.4s ease-out 0.15s forwards"}}/>
          </svg>
        </div>
        <p className="text-white text-sm font-bold drop-shadow">{message}</p>
      </div>
    </div>
  );
}

function MonthlyChart({entries}){
  const months=useMemo(()=>{
    const now=new Date();
    return Array.from({length:6},(_,i)=>{
      const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);
      const e2=new Date(d.getFullYear(),d.getMonth()+1,1);
      const b=entries.filter(e=>{const dd=new Date(e.date);return dd>=d&&dd<e2;});
      return{label:`${TH_M[d.getMonth()]}`,kwh:+b.reduce((s,e)=>s+e.kwh,0).toFixed(1),cost:+b.reduce((s,e)=>s+e.cost,0).toFixed(0),count:b.length};
    });
  },[entries]);
  const [view,setView]=useState("cost");
  const vals=months.map(m=>view==="cost"?m.cost:m.kwh);
  const maxVal=Math.max(...vals,1);
  return(
    <div className="bg-white rounded-2xl p-4 border-2 border-[#E2E8F0] shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <BarChart2 size={15} color={S_BG}/>
          <span className="text-[12px] font-extrabold text-[#334155] uppercase tracking-wider">แนวโน้ม 6 เดือน</span>
        </div>
        <div className="flex gap-1">
          {[{k:"cost",l:"฿"},{k:"kwh",l:"kWh"}].map(t=>(
            <button key={t.k} onClick={()=>setView(t.k)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold border-2 transition-all"
              style={{background:view===t.k?S_BG:U_BG,borderColor:view===t.k?S_BD:U_BD,color:view===t.k?S_TX:U_TX}}>
              {t.l}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-end gap-1.5 h-28">
        {months.map((m,i)=>{
          const v=view==="cost"?m.cost:m.kwh;
          const pct=maxVal>0?v/maxVal:0;
          const isLast=i===months.length-1;
          return(
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] font-bold text-[#94A3B8]">{v>0?(view==="cost"?`฿${v>999?Math.round(v/100)/10+"K":v}`:`${v}`):""}</span>
              <div className="w-full rounded-t-lg transition-all duration-500"
                style={{height:`${Math.max(pct*80,v>0?6:2)}px`,background:isLast?S_BG:"#BAE6FD",border:isLast?`2px solid ${S_BD}`:"none",minHeight:v>0?"6px":"2px"}}/>
              <span className="text-[10px] font-bold text-[#64748B]">{m.label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 mt-3 pt-3 border-t border-[#F1F5F9]">
        {[
          {l:"รวม 6 เดือน",v:view==="cost"?`${fmt(months.reduce((s,m)=>s+m.cost,0),0)} ฿`:`${fmt(months.reduce((s,m)=>s+m.kwh,0),1)} kWh`},
          {l:"เฉลี่ย/เดือน",v:view==="cost"?`${fmt(months.reduce((s,m)=>s+m.cost,0)/6,0)} ฿`:`${fmt(months.reduce((s,m)=>s+m.kwh,0)/6,1)} kWh`},
          {l:"ครั้งทั้งหมด",v:`${months.reduce((s,m)=>s+m.count,0)} ครั้ง`},
        ].map(({l,v})=>(
          <div key={l} className="flex-1 text-center">
            <p className="font-mono text-[13px] font-bold text-[#0C1A27]">{v}</p>
            <p className="text-[9px] text-[#94A3B8] mt-0.5">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function exportPDF(entries,car,month){
  const carBrand=EV_BRANDS.find(b=>b.id===car?.brand);
  const carName=car?.brand==="other"?car?.customName||"EV":carBrand?.name||"EV";
  const targetDate=month?new Date(month+"-01"):new Date();
  const y=targetDate.getFullYear(),m=targetDate.getMonth();
  const rows=entries.filter(e=>{const d=new Date(e.date);return d.getFullYear()===y&&d.getMonth()===m;}).sort((a,b)=>new Date(a.date)-new Date(b.date));
  if(rows.length===0){alert("ไม่มีข้อมูลในเดือนที่เลือก");return;}
  const totalKwh=rows.reduce((s,e)=>s+e.kwh,0);
  const totalCost=rows.reduce((s,e)=>s+e.cost,0);
  const totalMins=rows.reduce((s,e)=>s+(e.mins||0),0);
  const fmtD=iso=>{const d=new Date(iso);return`${d.getDate()} ${TH_M[d.getMonth()]} ${d.getFullYear()+543}`;};
  const locLabel=id=>LOCS.find(l=>l.id===id)?.label||id;
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>รายงานการชาร์จ ${TH_M[m]} ${y+543}</title>
<style>body{font-family:sans-serif;margin:0;padding:32px;color:#1e293b;font-size:13px}h1{font-size:20px;font-weight:800;color:#0369A1;margin:0 0 4px}.sub{color:#64748B;font-size:12px;margin-bottom:20px}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}.card{background:#F0F9FF;border:2px solid #BAE6FD;border-radius:12px;padding:12px;text-align:center}.card-val{font-size:22px;font-weight:800;color:#0369A1;font-family:monospace}.card-lab{font-size:10px;color:#64748B;margin-top:4px;text-transform:uppercase}table{width:100%;border-collapse:collapse}th{background:#0EA5E9;color:white;padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase}td{padding:7px 10px;border-bottom:1px solid #E2E8F0;font-size:12px}tr:nth-child(even) td{background:#F8FAFC}.total td{background:#F0F9FF;font-weight:800}.footer{margin-top:24px;padding-top:12px;border-top:1px solid #E2E8F0;color:#94A3B8;font-size:10px;text-align:center}@media print{body{padding:16px}}</style></head><body>
<h1>รายงานการชาร์จพลังงาน EV</h1>
<div class="sub">${carName}${car?.plate?" · "+car.plate:""} | ${TH_M[m]} ${y+543} | ${rows.length} ครั้ง</div>
<div class="summary"><div class="card"><div class="card-val">${totalKwh.toFixed(1)}</div><div class="card-lab">kWh รวม</div></div><div class="card"><div class="card-val">${totalCost.toFixed(0)} ฿</div><div class="card-lab">ค่าไฟรวม</div></div><div class="card"><div class="card-val">${totalKwh>0?(totalCost/totalKwh).toFixed(2):"—"} ฿</div><div class="card-lab">เฉลี่ย/kWh</div></div></div>
<table><tr><th>วันที่</th><th>สถานที่</th><th>ประเภท</th><th>kWh</th><th>เวลา</th><th>ค่าไฟ (฿)</th><th>ไมล์ (กม.)</th><th>หมายเหตุ</th></tr>
${rows.map(e=>`<tr><td>${fmtD(e.date)}</td><td>${locLabel(e.location)}</td><td>${e.chargeType}</td><td>${e.kwh}</td><td>${e.mins?fmtMins(e.mins):"—"}</td><td>${e.cost.toFixed(0)}</td><td>${e.odometer.toLocaleString()}</td><td>${e.note||""}</td></tr>`).join("")}
<tr class="total"><td colspan="3">รวม</td><td>${totalKwh.toFixed(1)}</td><td>${fmtMins(totalMins)}</td><td>${totalCost.toFixed(0)}</td><td colspan="2"></td></tr></table>
<div class="footer">EV Tracker · ${new Date().toLocaleDateString("th-TH")}</div></body></html>`;
  const blob=new Blob([html],{type:"text/html;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=`ev-report-${TH_M[m]}-${y+543}.html`;
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);URL.revokeObjectURL(url);
}

function CarSetupScreen({initial,onSave}){
  const [brand,setBrand]=useState(initial?.brand??"");
  const [plate,setPlate]=useState(initial?.plate??"");
  const [customName,setCustomName]=useState(initial?.customName??"");
  const [customBat,setCustomBat]=useState(initial?.customBat??"");
  const [logoError,setLogoError]=useState({});
  const isEdit=!!initial?.brand;
  const sel=EV_BRANDS.find(b=>b.id===brand);
  return(
    <div className="fixed inset-0 z-50 flex flex-col" style={{background:"rgba(244,246,249,0.99)"}}>
      <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b-2 border-[#E2E8F0] bg-white shrink-0">
        {isEdit&&<button onClick={()=>onSave(initial)} className="w-9 h-9 rounded-full flex items-center justify-center bg-[#F1F5F9]"><ArrowLeft size={18} color="#334155"/></button>}
        <h2 className="flex-1 text-[#0C1A27] font-bold text-lg flex items-center gap-2"><Zap size={18} color={S_BG}/>{isEdit?"แก้ไขข้อมูลรถ":"ตั้งค่ารถของคุณ"}</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 max-w-md mx-auto flex flex-col gap-5 pb-10">
          {!isEdit&&<div className="bg-[#F0F9FF] border-2 border-[#BAE6FD] rounded-2xl px-4 py-3"><p className="text-[#0369A1] text-sm font-bold">ยินดีต้อนรับ! 👋</p><p className="text-[#0369A1] text-xs mt-0.5">ระบุข้อมูลรถของคุณก่อนเริ่มใช้งาน</p></div>}
          <div>
            <label className="text-xs font-bold text-[#475569] mb-2 block uppercase tracking-wider">ยี่ห้อรถ EV</label>
            <div className="grid grid-cols-3 gap-2.5">
              {EV_BRANDS.map(b=>{
                const active=brand===b.id;
                return(
                  <button key={b.id} onClick={()=>{setBrand(b.id);setLogoError(p=>({...p,[b.id]:false}));}}
                    style={{background:active?S_BG:U_BG,borderColor:active?S_BD:U_BD,color:active?S_TX:U_TX}}
                    className={`relative flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl border-2 transition-all ${active?"shadow-[0_4px_14px_-2px_rgba(14,165,233,0.55)]":""}`}>
                    {b.logo&&!logoError[b.id]?(<img src={b.logo} alt={b.name} onError={()=>setLogoError(p=>({...p,[b.id]:true}))} className="w-8 h-8 object-contain" style={{filter:active?"none":"grayscale(30%)"}}/>):(<div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black" style={{background:active?"rgba(255,255,255,0.3)":"#F1F5F9",color:active?S_TX:U_TX}}>{b.name.slice(0,2)}</div>)}
                    <span className="text-[10px] font-bold leading-tight text-center">{b.name}</span>
                    {b.bat&&<span className="text-[9px] text-center opacity-70">{b.bat} kWh</span>}
                    {active&&(<span className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-md" style={{background:S_BD,border:"2px solid white"}}><Check size={11} strokeWidth={3.5} color="white"/></span>)}
                  </button>
                );
              })}
            </div>
          </div>
          {brand==="other"&&(
            <div className="flex flex-col gap-3">
              <div><label className="text-xs font-bold text-[#475569] mb-1.5 block uppercase tracking-wider">ระบุยี่ห้อ</label><input type="text" placeholder="เช่น Wuling, Leapmotor..." value={customName} onChange={e=>setCustomName(e.target.value)} className="w-full bg-white border-2 border-[#CBD5E1] rounded-xl px-4 py-3 text-[#0C1A27] text-sm font-medium focus:outline-none focus:border-[#0EA5E9]"/></div>
              <div><label className="text-xs font-bold text-[#475569] mb-1.5 block uppercase tracking-wider">ขนาดแบตเตอรี่ (kWh)</label><input type="number" inputMode="decimal" placeholder="เช่น 60.5" value={customBat} onChange={e=>setCustomBat(e.target.value)} className="w-full bg-white border-2 border-[#CBD5E1] rounded-xl px-4 py-3 text-[#0C1A27] text-sm font-medium focus:outline-none focus:border-[#0EA5E9] font-mono"/></div>
            </div>
          )}
          {brand&&brand!=="other"&&sel?.bat&&(<div className="bg-[#F0F9FF] border-2 border-[#BAE6FD] rounded-xl px-4 py-2.5 flex items-center gap-2"><Battery size={16} color={S_BG}/><p className="text-[#0369A1] text-sm font-bold">ขนาดแบต: <span className="font-mono">{sel.bat} kWh</span></p></div>)}
          <div><label className="text-xs font-bold text-[#475569] mb-1.5 block uppercase tracking-wider">ทะเบียนรถ</label><input type="text" placeholder="เช่น กข 1234 กรุงเทพมหานคร" value={plate} onChange={e=>setPlate(e.target.value)} className="w-full bg-white border-2 border-[#CBD5E1] rounded-xl px-4 py-3 text-[#0C1A27] text-sm font-medium focus:outline-none focus:border-[#0EA5E9] uppercase tracking-widest"/></div>
          {(brand||plate)&&(<div className="bg-white border-2 border-[#E2E8F0] rounded-2xl px-4 py-3 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-[#F0F9FF] border border-[#BAE6FD] flex items-center justify-center shrink-0">{sel?.logo?(<img src={sel.logo} alt="" className="w-7 h-7 object-contain"/>):<Zap size={18} color={S_BG}/>}</div><div><p className="font-extrabold text-base leading-tight" style={{color:S_BG}}>{brand==="other"?customName||"EV ของฉัน":sel?.name||"—"}</p><p className="text-[#475569] text-xs font-bold tracking-wider mt-0.5">{plate||"ยังไม่ระบุทะเบียน"}</p></div></div>)}
          <button onClick={()=>{if(!brand)return;onSave({brand,plate:plate.toUpperCase(),customName:brand==="other"?customName:"",customBat:brand==="other"?Number(customBat)||null:null});}} disabled={!brand} className="w-full py-4 rounded-2xl text-[15px] font-extrabold flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-40" style={{background:S_BG,color:S_TX,border:`2px solid ${S_BD}`,boxShadow:"0 8px 24px -6px rgba(14,165,233,0.5)"}}>
            <Check size={18} strokeWidth={3}/>{isEdit?"บันทึก":"เริ่มใช้งาน"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EntryForm({onSave,onClose,onDelete,lastOdometer,initialEntry,batKwh}){
  const isEdit=!!initialEntry;
  const mkDate=src=>{const d=src?new Date(src):new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16);};
  const [date,setDate]=useState(()=>mkDate(initialEntry?.date));
  const [kwh,setKwh]=useState(initialEntry?String(initialEntry.kwh):"");
  const [cost,setCost]=useState(initialEntry?String(initialEntry.cost):"");
  const [odo,setOdo]=useState(initialEntry?String(initialEntry.odometer):lastOdometer?String(lastOdometer):"");
  const [loc,setLoc]=useState(initialEntry?.location??"home");
  const [ctype,setCtype]=useState(initialEntry?.chargeType??"AC");
  const [mins,setMins]=useState(initialEntry?.mins?String(initialEntry.mins):"");
  const [note,setNote]=useState(initialEntry?.note??"");
  const [error,setError]=useState("");
  const ppu=Number(kwh)>0&&Number(cost)>0?Number(cost)/Number(kwh):null;
  const batPct=batKwh&&Number(kwh)>0?Math.min(100,(Number(kwh)/batKwh)*100):null;
  const avgKw=Number(kwh)>0&&Number(mins)>0?(Number(kwh)/(Number(mins)/60)):null;
  const submit=()=>{
    if(!kwh||Number(kwh)<=0)return setError("กรอกจำนวนพลังงาน (kWh) ให้ถูกต้อง");
    if(!cost||Number(cost)<0)return setError("กรอกจำนวนเงินให้ถูกต้อง");
    if(!odo||Number(odo)<=0)return setError("กรอกเลขไมล์สะสมให้ถูกต้อง");
    if(!isEdit&&lastOdometer&&Number(odo)<lastOdometer)return setError(`เลขไมล์ต้องไม่น้อยกว่าครั้งก่อน (${fmt(lastOdometer,0)} กม.)`);
    setError("");
    onSave({id:initialEntry?.id??uid(),date:new Date(date).toISOString(),kwh:Number(kwh),cost:Number(cost),odometer:Number(odo),location:loc,chargeType:ctype,mins:Number(mins)||0,note:note.trim()});
  };
  const inp="w-full bg-white border-2 border-[#CBD5E1] rounded-xl px-4 py-3 text-[#0C1A27] text-sm font-medium focus:outline-none focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/30";
  return(
    <div className="fixed inset-0 z-50 flex flex-col" style={{background:"rgba(244,246,249,0.98)"}}>
      <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b-2 border-[#E2E8F0] bg-white shrink-0">
        <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center bg-[#F1F5F9] hover:bg-[#E2E8F0] transition active:scale-95"><ArrowLeft size={18} color="#334155"/></button>
        <h2 className="flex-1 text-[#0C1A27] font-bold text-lg flex items-center gap-2"><Zap size={18} color={S_BG}/>{isEdit?"แก้ไขรายการ":"บันทึกการชาร์จ"}</h2>
        <button onClick={onClose}><X size={20} color="#94A3B8"/></button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 flex flex-col gap-5 max-w-md mx-auto pb-10">
          <div><label className="text-xs font-bold text-[#475569] mb-1.5 block uppercase tracking-wider">วันและเวลา</label><input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} className={inp}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-[#475569] mb-1.5 block uppercase tracking-wider">พลังงาน (kWh)</label><input type="number" inputMode="decimal" placeholder="0.0" value={kwh} onChange={e=>setKwh(e.target.value)} className={`${inp} font-mono`}/></div>
            <div><label className="text-xs font-bold text-[#475569] mb-1.5 block uppercase tracking-wider">จำนวนเงิน (฿)</label><input type="number" inputMode="decimal" placeholder="0.0" value={cost} onChange={e=>setCost(e.target.value)} className={`${inp} font-mono`}/></div>
          </div>
          {ppu!==null&&<p className="text-[11px] text-[#94A3B8] -mt-3">≈ {fmt(ppu,2)} บาท/kWh</p>}
          <div>
            <label className="text-xs font-bold text-[#475569] mb-1.5 block uppercase tracking-wider flex items-center gap-1"><Clock size={11}/>เวลาชาร์จ (นาที)</label>
            <input type="number" inputMode="numeric" placeholder="เช่น 45" value={mins} onChange={e=>setMins(e.target.value)} className={`${inp} font-mono`}/>
            {avgKw!==null&&<p className="text-[11px] text-[#94A3B8] mt-1">⚡ กำลังชาร์จเฉลี่ย {fmt(avgKw,1)} kW</p>}
          </div>
          {batPct!==null&&(
            <div className="bg-[#F0F9FF] border-2 border-[#BAE6FD] rounded-xl px-4 py-2.5">
              <div className="flex items-center justify-between mb-1.5"><span className="text-[11px] font-bold text-[#0369A1] flex items-center gap-1"><Battery size={12}/>ชาร์จเพิ่ม</span><span className="font-mono text-[13px] font-bold text-[#0369A1]">+{fmt(batPct,1)}%</span></div>
              <div className="w-full h-2 bg-[#BAE6FD] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{width:`${Math.min(batPct,100)}%`,background:S_BG}}/></div>
              <p className="text-[10px] text-[#64748B] mt-1">{fmt(kwh,1)} kWh จากแบต {batKwh} kWh</p>
            </div>
          )}
          <div><label className="text-xs font-bold text-[#475569] mb-1.5 block uppercase tracking-wider">เลขไมล์สะสม (กม.)</label><input type="number" inputMode="numeric" placeholder={lastOdometer?`ครั้งก่อน ${fmt(lastOdometer,0)}`:"0"} value={odo} onChange={e=>setOdo(e.target.value)} className={`${inp} font-mono`}/></div>
          <div><label className="text-xs font-bold text-[#475569] mb-2 block uppercase tracking-wider">สถานที่ชาร์จ</label><div className="grid grid-cols-3 gap-2.5">{LOCS.map(l=><ToggleBtn key={l.id} active={loc===l.id} onClick={()=>setLoc(l.id)} icon={l.icon} label={l.label}/>)}</div></div>
          <div><label className="text-xs font-bold text-[#475569] mb-2 block uppercase tracking-wider">ประเภทการชาร์จ</label><div className="grid grid-cols-2 gap-2.5">{CTYPES.map(t=><ToggleBtn key={t.id} active={ctype===t.id} onClick={()=>setCtype(t.id)} label={t.label} sub={t.sub}/>)}</div></div>
          <div><label className="text-xs font-bold text-[#475569] mb-1.5 block uppercase tracking-wider">หมายเหตุ</label><input type="text" placeholder="เช่น ชาร์จระหว่างเดินทาง" value={note} onChange={e=>setNote(e.target.value)} className={inp}/></div>
          {error&&<p className="text-[#DC2626] text-xs font-semibold bg-red-50 rounded-xl px-3 py-2">{error}</p>}
          <div className="flex gap-3 mt-1">
            {isEdit&&<button onClick={()=>onDelete(initialEntry.id)} className="px-5 py-3.5 rounded-xl text-sm font-bold text-[#DC2626] border-2 border-[#DC2626]/30 hover:bg-red-50">ลบ</button>}
            <button onClick={submit} className="flex-1 py-3.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 active:scale-[0.98]" style={{background:S_BG,color:S_TX,border:`2px solid ${S_BD}`,boxShadow:"0 6px 20px -4px rgba(14,165,233,0.5)"}}>
              <Check size={17} strokeWidth={3}/>{isEdit?"บันทึกการแก้ไข":"บันทึก"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EVTracker(){
  const [entries,setEntries]=useState(()=>load(SK)??seed());
  const [car,setCar]=useState(()=>load(CK));
  const [showCarSetup,setCarSetup]=useState(false);
  const [showForm,setShowForm]=useState(false);
  const [editing,setEditing]=useState(null);
  const [range,setRange]=useState("week");
  const [q,setQ]=useState("");
  const [locF,setLocF]=useState("all");
  const [toast,setToast]=useState("");
  const [success,setSuccess]=useState("");
  const [confirmClear,setCC]=useState(false);
  const [logoErr,setLogoErr]=useState({});
  const [exportMonth,setExportMonth]=useState(()=>{const n=new Date();return`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`;});
  useEffect(()=>{save(SK,entries);},[entries]);
  useEffect(()=>{save(CK,car);},[car]);
  useEffect(()=>{if(showForm||showCarSetup){const p=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=p;};}},[showForm,showCarSetup]);
  useEffect(()=>{if(!car)setCarSetup(true);},[]);
  const sorted=useMemo(()=>[...entries].sort((a,b)=>new Date(b.date)-new Date(a.date)),[entries]);
  const lastOdo=sorted[0]?.odometer;
  const showToast=m=>{setToast(m);setTimeout(()=>setToast(""),2200);};
  const flash=m=>{setSuccess(m);setTimeout(()=>setSuccess(""),1100);};
  const saveEntry=entry=>{setEntries(p=>p.some(e=>e.id===entry.id)?p.map(e=>e.id===entry.id?entry:e):[...p,entry]);setShowForm(false);setEditing(null);flash(editing?"แก้ไขรายการสำเร็จ":"บันทึกข้อมูลสำเร็จ");};
  const delEntry=id=>{setEntries(p=>p.filter(e=>e.id!==id));setShowForm(false);setEditing(null);showToast("ลบรายการแล้ว");};
  const now=new Date();
  const rangeStart=useMemo(()=>{if(range==="day")return startOfDay(now);if(range==="week")return startOfWeek(now);if(range==="month")return startOfMonth(now);return new Date(0);},[range]);
  const filtered=useMemo(()=>sorted.filter(e=>new Date(e.date)>=rangeStart),[sorted,rangeStart]);
  const displayed=useMemo(()=>{const sq=q.trim().toLowerCase();return filtered.filter(e=>{if(locF!=="all"&&e.location!==locF)return false;if(!sq)return true;const ll=LOCS.find(l=>l.id===e.location)?.label??"";return`${ll} ${e.chargeType} ${e.note??""} ${fmtF(e.date)}`.toLowerCase().includes(sq);});},[filtered,q,locF]);
  const totalKwh=filtered.reduce((s,e)=>s+e.kwh,0);
  const totalCost=filtered.reduce((s,e)=>s+e.cost,0);
  const avgPrice=totalKwh>0?totalCost/totalKwh:0;
  const totalMins=filtered.reduce((s,e)=>s+(e.mins||0),0);
  const dist=useMemo(()=>{const all=sorted.slice().reverse();let km=0,kw=0;for(let i=1;i<all.length;i++){const c=all[i];if(new Date(c.date)>=rangeStart){const d=c.odometer-all[i-1].odometer;if(d>0){km+=d;kw+=c.kwh;}}}return{km,kw};},[sorted,rangeStart]);
  const eff=dist.km>0?(dist.kw/dist.km)*100:null;
  const sparks=useMemo(()=>Array.from({length:7},(_,i)=>{const idx=6-i;let s,e2;if(range==="day"){s=new Date(now);s.setDate(s.getDate()-idx);s=startOfDay(s);e2=new Date(s);e2.setDate(e2.getDate()+1);}else if(range==="month"){s=new Date(now.getFullYear(),now.getMonth()-idx,1);e2=new Date(now.getFullYear(),now.getMonth()-idx+1,1);}else{s=startOfWeek(now);s.setDate(s.getDate()-idx*7);e2=new Date(s);e2.setDate(e2.getDate()+7);}const b=sorted.filter(e=>{const d=new Date(e.date);return d>=s&&d<e2;});return{kwh:b.reduce((s,e)=>s+e.kwh,0),cost:b.reduce((s,e)=>s+e.cost,0)};}),[sorted,range]);
  const carBrand=EV_BRANDS.find(b=>b.id===car?.brand);
  const carName=car?.brand==="other"?car?.customName||"EV ของฉัน":carBrand?.name||"";
  const carLogo=carBrand?.logo;
  const batKwh=car?.brand==="other"?car?.customBat:carBrand?.bat;
  return(
    <div className="min-h-screen bg-[#F1F5F9] text-[#0C1A27]" style={{fontFamily:"Inter,system-ui,sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap');.font-mono{font-family:'JetBrains Mono',monospace}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px}`}</style>
      <div className="px-5 pt-5 pb-4 flex items-center justify-between bg-white border-b-2 border-[#E2E8F0]">
        <button onClick={()=>setCarSetup(true)} className="flex items-center gap-2.5 active:opacity-70 transition">
          <div className="w-11 h-11 rounded-xl border-2 flex items-center justify-center shrink-0 overflow-hidden" style={{background:"#F0F9FF",borderColor:S_BD}}>
            {carLogo&&!logoErr[car?.brand]?(<img src={carLogo} alt={carName} className="w-8 h-8 object-contain" onError={()=>setLogoErr(p=>({...p,[car.brand]:true}))}/>):<Zap size={20} color={S_BG} strokeWidth={2.5}/>}
          </div>
          <div className="text-left">
            <p className="font-black text-[17px] leading-tight" style={{color:S_BG,letterSpacing:"-0.02em"}}>{carName||"ตั้งค่ารถของฉัน"}</p>
            {car?.plate&&<p className="text-[11px] font-bold text-[#475569] tracking-widest mt-0.5 uppercase">{car.plate}</p>}
            {batKwh&&<p className="text-[10px] text-[#94A3B8] flex items-center gap-0.5"><Battery size={9}/>{batKwh} kWh</p>}
          </div>
        </button>
        <div className="flex items-center gap-1">
          <button onClick={()=>setCarSetup(true)} className="p-2 rounded-xl hover:bg-[#F1F5F9]"><Settings size={17} color="#94A3B8"/></button>
          {confirmClear?(<div className="flex items-center gap-1.5"><button onClick={()=>{setEntries([]);setCC(false);showToast("ล้างข้อมูลแล้ว");}} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#DC2626] text-white">ยืนยัน</button><button onClick={()=>setCC(false)} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#64748B] bg-[#F1F5F9]">ยกเลิก</button></div>):(<button onClick={()=>setCC(true)} className="p-2 rounded-xl hover:bg-[#FEF2F2]"><Trash2 size={17} color="#94A3B8"/></button>)}
        </div>
      </div>
      <div className="px-5 mt-4">
        <button onClick={()=>{setEditing(null);setShowForm(true);}} className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-[15px] font-extrabold transition active:scale-[0.98]" style={{background:S_BG,color:S_TX,border:`2px solid ${S_BD}`,boxShadow:"0 8px 24px -6px rgba(14,165,233,0.55)"}}>
          <Plus size={20} strokeWidth={3}/>บันทึกการชาร์จ
        </button>
      </div>
      <div className="px-5 mt-4"><div className="flex gap-2 p-1.5 rounded-2xl bg-[#E2E8F0]">{["day","week","month","all"].map(r=><RangeTab key={r} active={range===r} onClick={()=>setRange(r)} label={RL[r]}/>)}</div></div>
      <div className="flex justify-center mt-6 mb-2"><Ring value={totalKwh} max={Math.max(totalKwh,40)} label={`พลังงาน · ${RL[range]}`} unit="kWh"/></div>
      <div className="px-5 grid grid-cols-3 gap-2 mt-2">
        {[{icon:Wallet,label:"ค่าไฟรวม",val:`${fmt(totalCost,0)}฿`,color:"#2563EB"},{icon:Gauge,label:"฿/kWh",val:avgPrice?`${fmt(avgPrice,2)}`:"—",color:S_BG},{icon:Clock,label:"เวลารวม",val:fmtMins(totalMins),color:"#7C3AED"}].map(({icon:Icon,label,val,color})=>(
          <div key={label} className="bg-white rounded-xl p-3 border-2 border-[#E2E8F0] shadow-sm flex flex-col gap-1">
            <div className="flex items-center gap-1"><Icon size={12} color={color}/><span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider leading-tight">{label}</span></div>
            <span className="font-mono text-base font-bold tabular-nums text-[#0C1A27] leading-tight">{val}</span>
          </div>
        ))}
      </div>
      <div className="px-5 grid grid-cols-2 gap-3 mt-3">
        <div className="bg-white rounded-2xl p-4 border-2 border-[#E2E8F0] shadow-sm flex flex-col gap-2"><div className="flex items-center gap-1.5"><Zap size={14} color={S_BG}/><span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">พลังงาน</span></div><span className="font-mono text-xl font-bold tabular-nums">{fmt(totalKwh,1)} kWh</span><Sparkline values={sparks.map(b=>b.kwh)} color={S_BG}/></div>
        <div className="bg-white rounded-2xl p-4 border-2 border-[#E2E8F0] shadow-sm flex flex-col gap-2"><div className="flex items-center gap-1.5"><Wallet size={14} color="#2563EB"/><span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">ค่าใช้จ่าย</span></div><span className="font-mono text-xl font-bold tabular-nums">{fmt(totalCost,0)} ฿</span><Sparkline values={sparks.map(b=>b.cost)} color="#2563EB"/></div>
      </div>
      <div className="px-5 mt-3 flex flex-col gap-2">
        <div className="bg-white rounded-2xl p-4 flex items-center justify-between border-2 border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-2"><TrendingDown size={16} color="#64748B"/><div><p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">อัตราสิ้นเปลือง</p><p className="text-[10px] text-[#94A3B8] mt-0.5"><Route size={10} className="inline mr-1 -mt-0.5"/>{fmt(dist.km,0)} กม. ใน{RL[range]}</p></div></div>
          <div className="text-right"><span className="font-mono text-2xl font-bold tabular-nums">{eff!==null?fmt(eff,1):"—"}</span><span className="text-[11px] text-[#64748B] ml-1">kWh/100กม.</span></div>
        </div>
        <div className="bg-white rounded-2xl p-4 flex items-center justify-between border-2 border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-2"><Wallet size={16} color="#64748B"/><div><p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">ต้นทุนต่อกิโลเมตร</p><p className="text-[10px] text-[#94A3B8] mt-0.5">คำนวณจากค่าไฟ ÷ ระยะทาง</p></div></div>
          <div className="text-right"><span className="font-mono text-2xl font-bold tabular-nums">{dist.km>0&&totalCost>0?fmt(totalCost/dist.km,2):"—"}</span><span className="text-[11px] text-[#64748B] ml-1">฿/กม.</span></div>
        </div>
      </div>
      <div className="px-5 mt-3"><MonthlyChart entries={entries}/></div>
      <div className="px-5 mt-3">
        <div className="bg-white rounded-2xl p-4 border-2 border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-1.5 mb-3"><FileText size={15} color={S_BG}/><span className="text-[12px] font-extrabold text-[#334155] uppercase tracking-wider">Export รายงาน PDF</span></div>
          <div className="flex gap-2">
            <input type="month" value={exportMonth} onChange={e=>setExportMonth(e.target.value)} className="flex-1 bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm font-medium text-[#0C1A27] focus:outline-none focus:border-[#0EA5E9]"/>
            <button onClick={()=>exportPDF(entries,car,exportMonth)} className="px-4 py-2.5 rounded-xl text-sm font-extrabold flex items-center gap-1.5 active:scale-[0.98] transition" style={{background:S_BG,color:S_TX,border:`2px solid ${S_BD}`}}>
              <FileText size={14}/>Export
            </button>
          </div>
          <p className="text-[10px] text-[#94A3B8] mt-2">เปิดไฟล์ .html ที่โหลดมา → กด Print → Save as PDF</p>
        </div>
      </div>
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-extrabold text-[#334155] flex items-center gap-1.5"><Calendar size={15}/>ประวัติการชาร์จ</h2><span className="text-[11px] font-semibold text-[#94A3B8]">{displayed.length} รายการ</span></div>
        <div className="relative mb-3"><Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" color="#94A3B8"/><input type="text" value={q} onChange={e=>setQ(e.target.value)} placeholder="ค้นหาวันที่ หมายเหตุ หรือประเภท" className="w-full bg-white border-2 border-[#E2E8F0] rounded-xl pl-10 pr-3 py-2.5 text-sm text-[#0C1A27] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0EA5E9] font-medium"/></div>
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">{[{id:"all",label:"ทั้งหมด",icon:null},...LOCS].map(l=>(<Pill key={l.id} active={locF===l.id} onClick={()=>setLocF(l.id)} icon={l.icon} label={l.label}/>))}</div>
        {displayed.length===0?(<div className="bg-white rounded-2xl p-8 text-center border-2 border-[#E2E8F0]"><Zap size={28} color="#CBD5E1" className="mx-auto mb-2"/><p className="text-sm font-semibold text-[#64748B]">{q||locF!=="all"?"ไม่พบรายการที่ตรงกับการค้นหา":"ยังไม่มีรายการช่วงนี้"}</p></div>):(
          <div className="flex flex-col gap-2.5 pb-10">
            {displayed.map(e=>{
              const l=LOCS.find(x=>x.id===e.location),LI=l?.icon??Plug;
              return(
                <button key={e.id} onClick={()=>{setEditing(e);setShowForm(true);}} className="w-full text-left bg-white rounded-2xl p-4 flex items-center gap-3 border-2 border-[#E2E8F0] active:bg-[#F8FAFC] transition shadow-sm">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{background:e.chargeType==="DC"?"#EFF6FF":"#F0F9FF"}}><LI size={18} color={e.chargeType==="DC"?"#2563EB":S_BG} strokeWidth={2}/></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-sm font-bold">{l?.label}</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg" style={{background:e.chargeType==="DC"?"#DBEAFE":"#E0F2FE",color:e.chargeType==="DC"?"#1D4ED8":"#0369A1"}}>{e.chargeType}</span>
                      {e.mins>0&&<span className="text-[10px] text-[#94A3B8] flex items-center gap-0.5"><Clock size={9}/>{fmtMins(e.mins)}</span>}
                    </div>
                    <p className="text-[11px] text-[#94A3B8]">{fmtS(e.date)} · {fmt(e.odometer,0)} กม.{e.note?` · ${e.note}`:""}</p>
                  </div>
                  <div className="text-right shrink-0"><p className="font-mono text-sm font-bold tabular-nums">{fmt(e.kwh,1)} kWh</p><p className="font-mono text-[11px] tabular-nums text-[#64748B]">{fmt(e.cost,0)} ฿</p></div>
                  <Pencil size={13} color="#CBD5E1"/>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {showCarSetup&&<CarSetupScreen initial={car} onSave={c=>{setCar(c);setCarSetup(false);}}/>}
      {showForm&&<EntryForm onSave={saveEntry} onDelete={delEntry} onClose={()=>{setShowForm(false);setEditing(null);}} lastOdometer={lastOdo} initialEntry={editing} batKwh={batKwh}/>}
      {success&&<SuccessOverlay message={success}/>}
      {toast&&(<div className="fixed top-5 left-1/2 -translate-x-1/2 bg-white border-2 border-[#E2E8F0] text-[#0C1A27] text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg z-50 flex items-center gap-1.5"><Check size={13} color={S_BG}/>{toast}</div>)}
    </div>
  );
                               }
