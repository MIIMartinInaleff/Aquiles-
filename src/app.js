/* Aquiles World Gym · sistema con datos reales (socios + pagos desde julio) */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const miles=n=>{const s=String(Math.abs(n));let o="";for(let i=s.length;i>0;i-=3)o=s.slice(Math.max(0,i-3),i)+(o?"."+o:"");return(n<0?"-":"")+o};
const ars=n=>"$"+miles(Math.round(n));
const DAY=864e5;
const d0=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate());
const iso=s=>{if(!s)return null;const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
const addD=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
const diffD=(a,b)=>Math.round((d0(a)-d0(b))/DAY);

const fmt=d=>d?p2(d.getDate())+"/"+p2(d.getMonth()+1)+"/"+d.getFullYear():"—";
const fmtS=d=>d?p2(d.getDate())+"/"+p2(d.getMonth()+1):"—";
const hhmm=d=>p2(d.getHours())+":"+p2(d.getMinutes());
const MESES=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const LOW=new Set(["de","del","la","las","los","y"]);
const title=s=>s.toLowerCase().split(" ").map((w,i)=>i&&LOW.has(w)?w:w.replace(/^./,c=>c.toUpperCase())).join(" ");
const telFmt=t=>t.length===10?`${t.slice(0,3)} ${t.slice(3,6)}-${t.slice(6)}`:t;
const dniFmt=d=>d?miles(Number(d)):"—";
const TODAY=()=>d0(new Date());
const isoStr=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const p2=n=>String(n).padStart(2,"0");
Date.prototype.toJSON=function(){if(isNaN(this))return null;const o=-this.getTimezoneOffset(),sg=o>=0?"+":"-",a=Math.abs(o);return`${this.getFullYear()}-${p2(this.getMonth()+1)}-${p2(this.getDate())}T${p2(this.getHours())}:${p2(this.getMinutes())}:${p2(this.getSeconds())}${sg}${p2(Math.floor(a/60))}:${p2(a%60)}`};
const revD=x=>{if(!x)return null;if(x instanceof Date)return d0(x);const m=/^(\d{4})-(\d{2})-(\d{2})(T00:00:00(\.000)?Z)?$/.exec(x);if(m)return new Date(+m[1],+m[2]-1,+m[3]);return d0(new Date(x))};

/* ---------- datos ---------- */
const CUOTAS=[{k:"normal",n:"Cuota básica",p:47000},{k:"f2",n:"Cuota familiar 2",p:45000},{k:"f3",n:"Cuota familiar 3+",p:43000},{k:"pers",n:"Cuota personalizado",p:70000},{k:"gratis",n:"Pase gratis",p:0}];
const PRODS=[{k:"shaker",n:"Shaker",p:9000},{k:"remera",n:"Remera Aquiles",p:18000},{k:"suple",n:"Suplemento",p:38000}];
const PCAMB=[];
const SOC=DATA.soc.map(r=>({n:r[0],raw:r[1],nom:title(r[1]),nac:iso(r[2]),dni:r[3],gen:r[4]==="M"?"Masculino":r[4]==="F"?"Femenino":"",tel:r[5],dir:title(r[6]),mail:r[7],emer:title(r[8]),temer:r[9],plan:r[10]==="PERSONALIZADO"?"Personalizado":"Básico",venc:null,ult:null}));
const BYN=new Map(SOC.map(s=>[s.n,s]));
let SEQ=0;const nid=()=>Date.now()*1000+Math.floor(Math.random()*1000);
const COB=DATA.pag.map(r=>{const f=iso(r[1]),gratis=r[2]<=1;return{id:++SEQ,n:r[0],f,h:null,items:[{n:gratis?"Pase gratis":"Cuota",p:gratis?0:r[2],cat:gratis?"gratis":"cuota"}],ef:gratis?0:r[3]==="E"?r[2]:0,tr:gratis?0:r[3]==="T"?r[2]:0,imp:true}});
COB.forEach(c=>{const s=BYN.get(c.n);if(s&&(!s.ult||c.f>=s.ult)){s.ult=c.f;s.venc=addD(c.f,30)}});
let INGRESOS=[]; // {id,n,t:Date}
/* transferencias de Mercado Pago (ejemplo) */
function cuil(dni,f){const pre=f?"27":"20",b=(pre+dni.padStart(8,"0")).split("").map(Number),w=[5,4,3,2,7,6,5,4,3,2];let s=b.reduce((a,x,i)=>a+x*w[i],0),v=11-s%11;if(v===11)v=0;if(v===10)v=9;return`${pre}-${dni.padStart(8,"0")}-${v}`}
const dniDe=c=>c?String(+c.split("-")[1]):"";
const ALIAS=new Map(); // cuil -> n° de socio (lo que el sistema "aprende")
const TRF=[];let TSEQ=0;
function identificar(t){if(t.estado!=="pend")return;const s=t.cuil&&(ALIAS.get(t.cuil)?BYN.get(ALIAS.get(t.cuil)):SOC.find(x=>x.dni&&x.dni===dniDe(t.cuil)));
  if(s){t.n=s.n;t.por=ALIAS.has(t.cuil)?"aprendido":"dni";yaCobrada(t);return}
  const byName=!t.cuil&&t.nombre&&SOC.find(x=>x.raw===t.nombre.toUpperCase());if(byName){t.n=byName.n;t.por="nombre";yaCobrada(t);return}t.n=null}
function yaCobrada(t){const c=COB.find(c=>!c.imp&&!c.trf&&!c.linked&&c.n===t.n&&c.tr===t.monto&&Math.abs(diffD(c.f,t.h))<=3);if(c){t.estado="manual";t.cob=c;c.linked=true}}
function seedTRF(){const T=TODAY(),at=(h,m)=>new Date(T.getFullYear(),T.getMonth(),T.getDate(),h,m);
  const cand=SOC.filter(s=>s.dni&&s.dni.length>=7&&["late","warn"].includes(est(s))).slice(0,4);
  const ex=[];
  if(cand[0])ex.push({h:at(8,12),monto:47000,nombre:cand[0].raw,cuil:cuil(cand[0].dni,cand[0].gen==="Femenino"),origen:"Banco Galicia"});
  if(cand[1])ex.push({h:at(9,40),monto:cand[1].plan==="Personalizado"?70000:47000,nombre:cand[1].raw,cuil:null,origen:"Mercado Pago"});
  ex.push({h:at(10,5),monto:47000,nombre:"MARIA ELENA SOTO",cuil:"27-21458903-6",origen:"Banco Nación"});
  if(cand[2])ex.push({h:at(11,30),monto:45000,nombre:cand[2].raw,cuil:cuil(cand[2].dni,cand[2].gen==="Femenino"),origen:"Banco Santander"});
  ex.push({h:at(12,18),monto:47000,nombre:"LUCAS GABRIEL PEREYRA",cuil:"20-46120887-4",origen:"Brubank"});
  const ay=addD(T,-1);ex.push({h:new Date(ay.getFullYear(),ay.getMonth(),ay.getDate(),19,40),monto:47000,nombre:"JUAN CRUZ OLIVERA",cuil:"20-45999123-0",origen:"Banco Macro"});
  ex.push({h:at(13,2),monto:38000,nombre:"SOFIA BELEN IBARRA",cuil:"27-44873120-5",origen:"Mercado Pago"});
  ex.forEach(e=>{const t={id:++TSEQ,...e,estado:"pend",n:null,por:null};identificar(t);TRF.push(t)})}
function infoVenc(s,t){const d=dias(s),nv=d!==null&&d>=0?addD(s.venc,30):addD(TODAY(),30);
  const antes=d!==null&&d>=0&&d<=7?`<span class="tag">Pagó ${d===0?"el mismo día que vence":d+" día"+(d===1?"":"s")+" antes"}</span> `:"";
  const reciente=s.ult&&diffD(d0(t.h),s.ult)>0&&diffD(d0(t.h),s.ult)<=20?`<div class="count" style="color:var(--warn)">Ojo: ya pagó el ${fmtS(s.ult)} (hace ${diffD(d0(t.h),s.ult)} días). Fijate que no sea un pago repetido.</div>`:"";
  return`<div class="count" style="margin-top:3px">${antes}Nuevo vencimiento: <b style="color:var(--ink)">${fmt(nv)}</b></div>${reciente}`}
const diaCorto=h=>{const d=diffD(TODAY(),h);return d===0?"":d===1?'<span class="count" style="display:block;font-weight:600">Ayer</span>':`<span class="count" style="display:block;font-weight:600">${fmtS(h)}</span>`};
function reidentificar(){TRF.filter(t=>t.estado==="pend"&&!t.n).forEach(identificar)}
const sinId=()=>TRF.filter(t=>t.estado==="pend"&&!t.n).length;
function cobrarTrf(t,s){if(!s){t.estado="otro";return}const cu=CUOTAS.find(c=>c.p===t.monto&&c.p),now=new Date();
  COB.push({id:nid(),trf:true,n:s?s.n:null,f:d0(t.h),h:t.h,items:[s?{n:cu?cu.n:"Cuota (otro monto)",p:t.monto,cat:"cuota"}:{n:"Otro ingreso",p:t.monto,cat:"otro"}],ef:0,tr:t.monto});
  if(s){const fp=d0(t.h),c=COB[COB.length-1];if(c.items[0].cat==="cuota"){s.venc=s.venc&&s.venc>=fp?addD(s.venc,30):addD(fp,30);c.vto=s.venc}if(!s.ult||fp>=s.ult)s.ult=fp;t.n=s.n;t.cob=c}
  t.estado=s?"ok":"otro"}
/* nombre a mostrar de una transferencia (MP a veces no manda el nombre) */
const tNom=t=>{const s=t.n?BYN.get(t.n):null;return t.nombre?title(t.nombre):s?s.nom:t.origen==="Desde otro banco"?"Transferencia desde otro banco":t.cuil?"CUIL "+t.cuil:"Sin nombre"};
/* ---- Mercado Pago en vivo ---- */
let MPDESDE=null,MP_T=null,MP_OK=null,MP_ERR="",MPMOV=[];
const ORIG={cvu:"Desde otro banco",account_money:"Mercado Pago",debin_transfer:"DEBIN"};
const fmtCuil=d=>d&&/^\d{11}$/.test(d)?`${d.slice(0,2)}-${d.slice(2,10)}-${d.slice(10)}`:null;
async function mpTraer(){const sb=window.__sb;if(!sb)return;
 if(!MPDESDE){MPDESDE=new Date().toISOString();guardar()}
 // trae el mes actual y el anterior para las estadísticas
 const dias=Math.min(62,Math.max(TODAY().getDate()+31,Math.ceil((Date.now()-new Date(MPDESDE))/864e5)+1));
 try{const{data}=await sb.auth.getSession(),tok=data.session&&data.session.access_token;
  const r=await fetch("/api/mp?dias="+dias,{headers:{Authorization:"Bearer "+tok}});const j=await r.json();if(!r.ok)throw new Error(j.error||r.status);
  MPMOV=j.pagos.map(p=>({...p,h:new Date(p.fecha)}));
  let nuevas=0;j.pagos.forEach(p=>{const h=new Date(p.fecha);if(p.dir!=="in"||h<new Date(MPDESDE)||TRF.some(t=>String(t.id)===p.id))return;
   const t={id:+p.id,h,monto:p.monto,nombre:p.nombre||"",cuil:fmtCuil(p.doc),origen:ORIG[p.metodo]||"Tarjeta",estado:"pend",n:null,por:null};identificar(t);TRF.push(t);nuevas++});
  MP_OK=new Date();MP_ERR="";if(nuevas)render(true);else if(cur==="mp"&&!$("#modal").innerHTML)render(true)}
 catch(e){console.error(e);MP_ERR=String(e.message||e);if(cur==="mp")render(true)}}
function mpIniciar(){if(!window.__sb)return;window.__mp={traer:mpTraer,desde:d=>{MPDESDE=d}};mpTraer();clearInterval(MP_T);MP_T=setInterval(()=>{if(!document.hidden)mpTraer()},60000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)mpTraer()})}
const nextNum=()=>"AWG"+String(Math.max(...SOC.map(s=>+s.n.slice(3)))+1).padStart(3,"0");

const dias=s=>s.venc?diffD(s.venc,TODAY()):null;
const est=s=>{const d=dias(s);if(d===null||d<-30)return"off";if(d<0)return"late";if(d<=7)return"warn";return"ok"};
const LBL={ok:"Activo",warn:"Por vencer",late:"Vencido",off:"Inactivo"};
const pill=s=>`<span class="pill p-${est(s)}">${LBL[est(s)]}</span>`;
const fdias=s=>{const d=dias(s);if(d===null)return s.nuevo?"Socio nuevo · todavía sin pagos":"Sin pagos desde julio";if(d===0)return`Vence hoy`;return d>0?`Vence ${fmt(s.venc)} · en ${d} día${d===1?"":"s"}`:`Venció ${fmt(s.venc)} · hace ${-d} día${d===-1?"":"s"}`};
const edad=s=>{if(!s.nac)return"";const t=TODAY();let a=t.getFullYear()-s.nac.getFullYear();if(t<new Date(t.getFullYear(),s.nac.getMonth(),s.nac.getDate()))a--;return a>0&&a<110?a:""};
const waLink=s=>{const v=s.venc,d=dias(s),n=s.nom.split(" ")[0];
  const m=d!==null&&d<0?`Hola ${n}! 💪 Te escribimos de Aquiles World Gym. Tu cuota venció el ${fmtS(v)}. Para seguir entrenando, podés abonar en efectivo o por transferencia. ¡Te esperamos!`
   :`Hola ${n}! 💪 Te recordamos que tu cuota en Aquiles World Gym ${d===0?"vence hoy":"vence el "+fmtS(v)}. ¡Gracias por ser parte de la comunidad!`;
  return `https://wa.me/549${s.tel}?text=${encodeURIComponent(m)}`};
const norm=x=>String(x||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
function coincide(s,q){const qn=norm(q).trim(),qd=qn.replace(/\D/g,"");if(!qn)return true;
 const mn=/^(awg)?\s*(\d{1,3})$/.exec(qn);if(mn)return s.n==="AWG"+mn[2].padStart(3,"0");
 if(/^awg\d+$/.test(qn))return norm(s.n).startsWith(qn);
 if(qd.length>=4&&qd===qn.replace(/[\s.\-]/g,""))return s.dni.includes(qd)||s.tel.includes(qd);
 const nm=norm(s.nom);return qn.split(/\s+/).every(w=>nm.includes(w))}
function buscar(q,lim=8){if(!q.trim()){buscar.total=0;return[]}const w0=norm(q).trim().split(/\s+/)[0];
 const ultimo=new Map();INGRESOS.forEach(i=>{const t=+i.t;if(!ultimo.has(i.n)||ultimo.get(i.n)<t)ultimo.set(i.n,t)});
 const sc=s=>{const e=est(s);let v=e==="off"?100:e==="late"?20:0;const ws=norm(s.nom).split(" ");if(!ws.some(x=>x.startsWith(w0)))v+=10;if(!ws[0].startsWith(w0))v+=3;if(ultimo.has(s.n))v-=5;return v};
 const L=SOC.filter(s=>coincide(s,q)).sort((a,b)=>sc(a)-sc(b)||a.nom.localeCompare(b.nom));buscar.total=L.length;return L.slice(0,lim)}
const masRes=lim=>buscar.total>lim?`<p class="count" style="margin-top:10px">Hay ${buscar.total-lim} más con ese nombre. Escribí también el apellido para encontrarlo.</p>`:"";

/* ---------- interfaz base ---------- */
const ICON={
inicio:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
checkin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM18 18h3v3"/></svg>',
socios:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M17 4a4 4 0 0 1 0 8M22 21c0-3-2-5-4-6"/></svg>',
cobrar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="2.5"/></svg>',
avisos:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5.1A8 8 0 1 1 21 12z"/><path d="M9 10h6M9 13.5h4"/></svg>',
fact:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
ajustes:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
mp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 7h13l-3-3M17 17H4l3 3"/></svg>',
gastos:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 18h8"/></svg>',
trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>'};
const SECS=[["inicio","Inicio"],["checkin","Check-in"],["socios","Socios"],["avisos","Avisos"],["cobrar","Cobrar"],["mp","Transferencias"],["fact","Facturación"],["gastos","Gastos"],["ajustes","Ajustes"]]
/* grupos del menú: socios (amarillo), plata (verde), ajustes (azul) */
const GRUPO=k=>["cobrar","mp","fact","gastos"].includes(k)?"din":k==="ajustes"?"cfg":"soc";;
let cur="inicio";let SYNC_TXT=window.__sb?"Conectado":"Administración";
function side(){
  const items=SECS.map(([k,l],i)=>`<button class="nav" data-k="${k}" data-g="${GRUPO(k)}"${i&&GRUPO(k)!==GRUPO(SECS[i-1][0])?" data-sep":""} aria-current="${k===cur}">${ICON[k]}<span>${l}</span>${k==="fact"||k==="gastos"?'<span class="lock">APARTE</span>':""}${k==="mp"&&sinId()?`<span class="badge">${sinId()}</span>`:""}</button>`).join("");
  $("#side").innerHTML=`<div class="brand">${window.__logo?`<img class="mark-img" src="${window.__logo}" alt="">`:'<div class="mark">A</div>'}<div><b>AQUILES</b><small>WORLD GYM</small></div></div>
   <div class="clock"><b id="clk">--:--</b><span id="fecha"></span></div>${items}
   <div class="side-foot"><div class="avatar">A</div><div><strong>Aquiles World Gym</strong><span id="sync">${SYNC_TXT}</span></div>${window.__sb?`<button id="salir" aria-label="Salir" title="Salir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg></button>`:""}</div>`;
  if($("#salir"))$("#salir").onclick=async()=>{await window.__sb.auth.signOut();location.reload()};
  const CORTO={checkin:"Ingreso",mp:"Transf.",fact:"Factur.",gastos:"Gastos"};$("#mbar").innerHTML=SECS.map(([k,l])=>`<button class="nav" data-k="${k}" data-g="${GRUPO(k)}" aria-current="${k===cur}">${ICON[k]}<span>${CORTO[k]||l}</span>${k==="mp"&&sinId()?`<span class="badge">${sinId()}</span>`:""}</button>`).join("");
  $$(".nav").forEach(b=>b.onclick=()=>go(b.dataset.k));
}
function tick(){const d=new Date();if($("#clk")){$("#clk").textContent=hhmm(d);$("#fecha").textContent=d.toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})}}
setInterval(tick,15000);
function toast(msg,undo){const w=$("#toastw");w.innerHTML=`<div class="toast" role="status">${esc(msg)}${undo?'<button id="undo">Deshacer</button>':""}</div>`;if(undo)$("#undo").onclick=()=>{undo();w.innerHTML=""};clearTimeout(toast.t);toast.t=setTimeout(()=>w.innerHTML="",5000)}
function go(k,opts){cur=k;if(opts)Object.assign(STATE,opts);render()}
const STATE={filtro:"todos",q:"",ciq:"",delAsk:null,per:"mes0",av:"por",avSel:{},C:null};
function close(){$("#modal").innerHTML=""}
function modal(html,wide){$("#modal").innerHTML=`<div class="scrim" id="scrim"><div class="sheet${wide?" wide":""}" role="dialog">${html}</div></div>`;
  $("#scrim").onclick=e=>{if(e.target.id==="scrim")close()};$$("#modal [data-x]").forEach(b=>b.onclick=close)}
document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});

/* ---------- ingresos ---------- */
function registrar(s){const i={id:Date.now()+Math.random(),n:s.n,t:new Date()};INGRESOS.unshift(i);toast(`Ingreso de ${s.nom} registrado a las ${hhmm(i.t)}`);render(true)}
const ingDia=off=>{const d=addD(TODAY(),-off);return INGRESOS.filter(i=>d0(i.t).getTime()===d.getTime())};
function ultimaVez(n){const i=INGRESOS.filter(x=>x.n===n).sort((a,b)=>b.t-a.t)[0];if(!i)return"Última vez: sin ingresos registrados";
  const d=diffD(TODAY(),i.t),c=d===0?"hoy":d===1?"ayer":`hace ${d} días (${fmtS(i.t)})`;return`Última vez: <b style="color:var(--ink)">${c} a las ${hhmm(i.t)}</b>`}
function historialDia(off){const d=addD(TODAY(),-off),L=ingDia(off).sort((a,b)=>b.t-a.t),soc=new Set(L.map(i=>i.n)).size;
  const tit=`${off===0?"Hoy":"Ayer"} · ${d.toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})}`;
  return`<div class="h2row" style="margin:${off?22:0}px 0 10px"><h3 style="margin:0;font-size:15px;font-weight:700">${tit}</h3><span class="pill ${soc?"p-ok":"p-off"}">${soc} socio${soc===1?"":"s"}${L.length>soc?` · ${L.length} ingresos`:""}</span></div>${ingresosTbl(L,off===0?"Todavía no entró nadie hoy.":"Ayer no se registraron ingresos.")}`}
function ingresosTbl(L,vacio){
  if(!L.length)return`<div class="box" style="color:var(--muted);padding:14px 18px">${vacio}</div>`;
  return`<div class="tbl"><table><thead><tr><th>Hora</th><th>Socio</th><th>Estado</th><th class="r"></th></tr></thead><tbody>${L.map(g=>{const s=BYN.get(g.n);
   const act=STATE.delAsk===g.id?`<span class="confirm">¿Eliminar? <button class="btn sm" data-yes="${g.id}">Sí</button><button class="btn ghost sm" data-no>No</button></span>`
    :`<button class="del" data-del="${g.id}" aria-label="Eliminar ingreso de ${esc(s.nom)}" title="Eliminar este ingreso">${ICON.trash}</button>`;
   return`<tr><td class="money">${hhmm(g.t)}</td><td><a href="#" data-n="${s.n}" style="color:inherit">${esc(s.nom)}</a> <span class="num">${s.n}</span></td><td>${pill(s)}</td><td class="r">${act}</td></tr>`}).join("")}</tbody></table></div>`}
const HRS=[...Array(17)].map((_,i)=>i+6);
const tipAttr=html=>`data-tip="${esc(html)}"`;
const WD=["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
function tipHora(t,L,h,v,tot,max){
  const quien=L.filter(i=>i.t.getHours()===h).map(i=>BYN.get(i.n).nom.split(" ").slice(0,2).join(" "));
  const esMes=!["Hoy","Ayer"].includes(t),diasMes=TODAY().getDate();
  let x=`<b>${h}:00 a ${h+1}:00 h</b><div class="tip-big">${v} persona${v===1?"":"s"}</div>`;
  x+=`<div>${tot?Math.round(v/tot*100):0}% de los ingresos de ${esMes?t.toLowerCase():t.toLowerCase()}</div>`;
  if(esMes)x+=`<div>Promedio: ${(v/diasMes).toFixed(1).replace(".",",")} por día</div>`;
  if(v&&v===max)x+=`<div class="tip-acc">La hora más llena</div>`;
  if(!esMes&&quien.length)x+=`<div class="tip-list">${quien.slice(0,5).map(esc).join("<br>")}${quien.length>5?`<br>y ${quien.length-5} más`:""}</div>`;
  return x}
function mini(t,L){const d=HRS.map(h=>L.filter(i=>i.t.getHours()===h).length),max=Math.max(...d),tot=L.length;
  if(!tot)return`<section class="box"><div class="h2row"><h2>${t}</h2><span class="count">0 personas</span></div><p class="count" style="margin:0">Sin ingresos todavía.</p></section>`;
  const pk=d.indexOf(max);
  return`<section class="box"><div class="h2row" style="margin-bottom:4px"><h2>${t}</h2><span class="count">${tot} persona${tot===1?"":"s"}</span></div>
  <p style="margin:0 0 14px;font-size:14px;color:var(--muted)">Más lleno: <b style="color:var(--ink)">${HRS[pk]} a ${HRS[pk]+1} h</b> · ${max}</p>
  <div class="plot" style="height:120px;gap:3px" role="img" aria-label="${t}: personas por hora">${d.map((v,i)=>`<div class="col" ${tipAttr(tipHora(t,L,HRS[i],v,tot,max))}><i style="height:${v?Math.max(v/max*100,4):0}%;background:${i===pk?"var(--firev,var(--grad))":"var(--bar)"};border-radius:3px 3px 0 0"></i></div>`).join("")}</div>
  <div style="display:flex;gap:3px;font-size:11px;color:var(--muted);margin-top:5px">${HRS.map(h=>`<span style="flex:1;text-align:center">${h%3===0?h+"h":""}</span>`).join("")}</div></section>`}

/* ---------- vistas ---------- */
const rowS=s=>`<div class="row" data-n="${s.n}"><div class="n"><strong>${esc(s.nom)}</strong><span>${s.n} · ${fdias(s)}</span></div><span class="count" aria-hidden="true">›</span></div>`;
const V={};
V.inicio=()=>{const late=SOC.filter(s=>est(s)==="late").sort((a,b)=>b.venc-a.venc),warn=SOC.filter(s=>est(s)==="warn").sort((a,b)=>a.venc-b.venc),act=SOC.filter(s=>["ok","warn"].includes(est(s))).length;
 return`<div class="head"><div><h1>Hola, Martín</h1></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn dark" data-go="checkin">Registrar ingreso</button><button class="btn" data-go="cobrar">Cobrar</button></div></div>
 ${sinId()?`<button class="alert" data-go="mp"><b>${sinId()} transferencia${sinId()===1?"":"s"} sin identificar</b><span>Revisar →</span></button>`:""}
 <div class="strip" style="--n:4"><div class="kpi"><small>Socios activos</small><b>${act}</b></div><div class="kpi"><small>Ingresos hoy</small><b>${ingDia(0).length}</b></div>
 <div class="kpi"><small>Por vencer · 7 días</small><b>${warn.length}</b></div><div class="kpi hot"><small>Vencidos sin pagar</small><b>${late.length}</b></div></div>
 <div class="grid2"><section class="box"><div class="h2row"><h2>Vencidos, hay que cobrar</h2><span class="count">${late.length}</span></div>${late.slice(0,5).map(rowS).join("")||'<p class="count">No hay vencidos.</p>'}${late.length>5?`<button class="more" data-filtro="late">Ver los ${late.length} →</button>`:""}</section>
 <section class="box"><div class="h2row"><h2>Vencen esta semana</h2><span class="count">${warn.length}</span></div>${warn.slice(0,5).map(rowS).join("")||'<p class="count">Nadie vence esta semana.</p>'}${warn.length>5?`<button class="more" data-filtro="warn">Ver los ${warn.length} →</button>`:""}</section></div>`};
V.checkin=()=>{const R=buscar(STATE.ciq,8);
 const hits=R.map(s=>{const e=est(s),bad=e==="late"||e==="off";return`<div class="ci-hit${bad?" bad":""}"><div class="n"><b>${esc(s.nom)}</b><div>${s.n} · DNI ${dniFmt(s.dni)} · ${fdias(s)}</div><div style="margin-top:2px">${ultimaVez(s.n)}</div></div>${bad?`<button class="btn ghost" data-cobrar="${s.n}">Cobrar</button><button class="btn ghost" data-reg="${s.n}">Dejar pasar igual</button>`:`<button class="btn" data-reg="${s.n}">Registrar ingreso</button>`}</div>`}).join("");
 const mes=INGRESOS.filter(i=>i.t.getMonth()===TODAY().getMonth()&&i.t.getFullYear()===TODAY().getFullYear());
 const cnt={};mes.forEach(i=>cnt[i.n]=(cnt[i.n]||0)+1);const rk=Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,10);
 return`<div class="head"><div><h1>Check-in</h1></div><button class="btn dark" id="qr">Escanear QR</button></div>
 <div class="grid-c"><div><input class="search" id="ciq" placeholder="DNI, nombre o N° de socio…" value="${esc(STATE.ciq)}" autocomplete="off">${hits?hits+masRes(8):(STATE.ciq.trim()?'<p class="count" style="margin-top:12px">No encontré a nadie con eso.</p>':"")}</div>
 <div class="strip" style="--n:2;margin:0"><div class="kpi"><small>Ingresos hoy</small><b>${ingDia(0).length}</b></div><div class="kpi"><small>Ayer</small><b>${ingDia(1).length}</b></div></div></div>
 <div class="h2row" style="margin-top:32px"><h2>Horarios más llenos</h2></div><div class="g3">${mini("Hoy",ingDia(0))}${mini("Ayer",ingDia(1))}${mini(cap(MESES[TODAY().getMonth()]),mes)}</div>
 <div class="grid2" style="margin-top:28px;align-items:start">
 <div><div class="h2row"><h2>Historial de ingresos</h2></div>${historialDia(0)}${historialDia(1)}</div>
 <div><div class="h2row"><h2>Los que más vinieron en ${MESES[TODAY().getMonth()]}</h2></div>
 ${rk.length?`<div class="tbl"><table><thead><tr><th>#</th><th>Socio</th><th class="r">Vino</th></tr></thead><tbody>${rk.map(([n,c],i)=>{const s=BYN.get(n);return`<tr class="click" data-n="${n}"><td class="money" style="${i<3?"color:var(--acc)":""}">${i+1}</td><td>${esc(s.nom)} <span class="num">${n}</span></td><td class="r"><b>${c}</b> ${c===1?"vez":"veces"}</td></tr>`}).join("")}</tbody></table></div>`:'<div class="box" style="color:var(--muted)">Se arma solo con los ingresos del mes.</div>'}</div></div>`};
V.socios=()=>{const C={todos:SOC.length,ok:0,warn:0,late:0,off:0};SOC.forEach(s=>C[est(s)]++);
 const q=STATE.q.trim().toLowerCase(),qd=q.replace(/\D/g,"");
 let L=SOC.filter(s=>STATE.filtro==="todos"||est(s)===STATE.filtro||(STATE.filtro==="ok"&&est(s)==="warn"));
 if(q)L=L.filter(s=>coincide(s,q));
 if(STATE.filtro==="late"||STATE.filtro==="warn")L.sort((a,b)=>a.venc-b.venc);
 return`<div class="head"><div><h1>Socios</h1><p class="sub">${SOC.length} inscriptos</p></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn ghost" id="exps">Exportar a Excel</button><button class="btn" id="nuevo">+ Nuevo socio</button></div></div>
 <input class="search" id="sq" placeholder="Buscar por nombre, DNI, teléfono o N° de socio" value="${esc(STATE.q)}" autocomplete="off">
 <div class="chips">${[["todos","Todos"],["ok","Activos"],["warn","Por vencer"],["late","Vencidos"],["off","Inactivos"]].map(([k,l])=>`<button class="chip" data-f="${k}" aria-pressed="${STATE.filtro===k}">${l} ${k==="ok"?C.ok+C.warn:C[k]}</button>`).join("")}</div>
 <div class="tbl" style="max-height:640px"><table><thead><tr><th>N°</th><th>Nombre y apellido</th><th class="hide-m">DNI</th><th class="hide-m">Teléfono</th><th class="hide-m">Edad</th><th>Vence</th><th>Estado</th></tr></thead><tbody>
 ${L.slice(0,STATE.lim||100).map(s=>`<tr class="click" data-n="${s.n}"><td class="num">${s.n}</td><td>${esc(s.nom)}</td><td class="hide-m">${dniFmt(s.dni)}</td><td class="hide-m">${telFmt(s.tel)||"—"}</td><td class="hide-m">${edad(s)}</td><td>${fmt(s.venc)}</td><td>${pill(s)}</td></tr>`).join("")||'<tr><td colspan="7" class="count">No hay socios con ese filtro.</td></tr>'}</tbody></table></div>
 <p class="count" style="margin-top:10px">Mostrando ${Math.min(L.length,STATE.lim||100)} de ${L.length}${L.length>(STATE.lim||100)?` · <button class="link" id="smas">Mostrar más</button>`:""}</p>`};
V.cobrar=()=>{const C=STATE.C||(STATE.C={n:null,q:"",cuota:"normal",q2:{},metodo:"transf",ef:0,venc:"auto",menu:false,nuevo:false});
 const s=C.n?BYN.get(C.n):null,cu=CUOTAS.find(c=>c.k===C.cuota);
 const tot=(cu?cu.p:0)+PRODS.reduce((a,p)=>a+p.p*(C.q2[p.k]||0),0);
 const ef=C.metodo==="efectivo"?tot:C.metodo==="transf"?0:Math.min(C.ef,tot),tr=tot-ef;
 const vencida=s&&s.venc&&dias(s)<0, base=s&&s.venc&&!vencida?s.venc:TODAY();
 const mode=C.venc==="auto"?(s&&s.venc&&!vencida?"suyo":"hoy"):C.venc;
 const fp=C.fecha?iso(C.fecha):TODAY(),nv=(mode==="suyo"||mode==="venc")&&s&&s.venc&&addD(s.venc,30)>fp?addD(s.venc,30):addD(fp,30);
 const R=!s?buscar(C.q,8):[];
 return`<div class="head"><div><h1>Cobrar</h1></div></div>
 <div class="grid-c"><div>
  <div class="field"><span class="lbl">Socio</span>${s?`<div class="ci-hit" style="margin-top:0"><div class="n"><b>${esc(s.nom)}</b><div>${s.n} · ${s.plan} · ${fdias(s)}</div></div><button class="btn ghost sm" id="cambiar">Cambiar</button></div>`
   :`<input class="input" id="csq" placeholder="Buscá por nombre, DNI o N° de socio (vacío = venta sin socio)" value="${esc(C.q)}" autocomplete="off">${R.map(x=>`<div class="row" data-pick="${x.n}"><div class="n"><strong>${esc(x.nom)}</strong><span>${x.n} · ${fdias(x)}</span></div>${pill(x)}</div>`).join("")}${R.length?masRes(8):""}`}</div>
  ${s&&TRF.some(t=>t.estado==="pend"&&t.n===s.n)?TRF.filter(t=>t.estado==="pend"&&t.n===s.n).map(t=>`<button class="alert" data-usetrf="${t.id}" style="margin-top:-4px"><span style="color:var(--ink);font-weight:500"><b>Ya transfirió ${ars(t.monto)}</b> ${diffD(TODAY(),t.h)===0?"hoy":diffD(TODAY(),t.h)===1?"ayer":"el "+fmtS(t.h)} a las ${hhmm(t.h)} (${esc(t.origen)})</span><span>Usar esa transferencia →</span></button>`).join(""):""}
  <div class="field"><span class="lbl">Cuota</span><div class="chips" style="margin:0">${[...CUOTAS.map(c=>[c.k,c.n.replace("Cuota ","").replace(/^./,x=>x.toUpperCase()),c.p?ars(c.p):"$0"]),["no","Sin cuota","Solo productos"]].map(([k,l,p])=>`<button class="chip" data-c="${k}" aria-pressed="${C.cuota===k}">${l}<small>${p}</small></button>`).join("")}</div></div>
  <div class="field"><span class="lbl">Productos</span>
   ${PRODS.filter(p=>C.q2[p.k]).length?`<div class="box" style="padding:4px 16px;margin-bottom:10px">${PRODS.filter(p=>C.q2[p.k]).map(p=>`<div class="prod"><div class="n"><strong>${esc(p.n)}</strong><span>${ars(p.p)} c/u</span></div><div class="qty"><button data-m="${p.k}" aria-label="Quitar ${esc(p.n)}">−</button><span>${C.q2[p.k]}</span><button data-p="${p.k}" aria-label="Sumar ${esc(p.n)}">+</button></div></div>`).join("")}</div>`:""}
   <div class="dd"><button class="btn ghost" id="addp" aria-expanded="${C.menu}">+ Agregar producto ▾</button>
   ${C.menu?`<div class="menu" role="menu">${PRODS.map(p=>`<button class="it" role="menuitem" data-add="${p.k}">${esc(p.n)}<span>${ars(p.p)}</span></button>`).join("")}<hr>
    ${C.nuevo?`<div class="newp"><div><label for="np1" style="font-size:12px">Nombre</label><input class="input" id="np1" placeholder="Ej: Guantes"></div><div><label for="np2" style="font-size:12px">Precio</label><input class="input" id="np2" inputmode="numeric" placeholder="$"></div><button class="btn sm" id="npok">Agregar</button></div>`:`<button class="it" role="menuitem" id="np" style="color:var(--acc)">+ Producto nuevo…</button>`}</div>`:""}</div></div>
 </div>
 <div class="box"><h2 style="margin-bottom:10px">Resumen</h2>
  ${cu?`<div class="line"><span>${cu.n}</span><span>${ars(cu.p)}</span></div>`:""}
  ${PRODS.filter(p=>C.q2[p.k]).map(p=>`<div class="line"><span>${esc(p.n)} × ${C.q2[p.k]}</span><span>${ars(p.p*C.q2[p.k])}</span></div>`).join("")}
  <div class="total"><span>Total</span><b>${ars(tot)}</b></div>
  <div class="field" style="margin-top:14px"><label for="cfecha">Fecha de pago <small>${C.fecha&&C.fecha!==isoStr(TODAY())?"· cargado después":"· hoy"}</small></label><input class="input" type="date" id="cfecha" value="${C.fecha||isoStr(TODAY())}" max="${isoStr(addD(TODAY(),30))}"></div>
  ${tot?`<div class="field"><span class="lbl">¿Cómo paga?</span><div class="seg pago">${[["transf","Transferencia"],["efectivo","Efectivo"],["mixto","Mixto"]].map(([k,l])=>`<button class="m-${k}" data-me="${k}" aria-pressed="${C.metodo===k}">${l}</button>`).join("")}</div></div>`:""}
  ${tot&&C.metodo==="mixto"?`<div class="f2"><div class="field"><label for="cef">En efectivo</label><input class="input" id="cef" inputmode="numeric" value="${ars(ef)}"></div><div class="field"><label for="ctr">Por transferencia</label><input class="input" id="ctr" value="${ars(tr)}" readonly></div></div>`:""}
  ${cu&&s?`<div class="field" style="margin-top:4px"><span class="lbl">Nuevo vencimiento: <span class="grad-t" style="font-weight:800">${fmt(nv)}</span></span><div class="seg"><button data-v="hoy" aria-pressed="${mode==="hoy"}">30 días desde el pago</button>${s.venc&&addD(s.venc,30)>fp?`<button data-v="suyo" aria-pressed="${mode==="suyo"}">Desde ${vencida?"que venció":"su vencimiento"} (${fmtS(s.venc)})</button>`:""}</div></div>`:""}
  <button class="btn big" id="guardar" ${(cu||tot)&&(s||!cu)?"":"disabled"}>${cu&&!s?"Elegí un socio":`Guardar cobro · ${ars(tot)}`}</button>
 </div></div>`};
function mpStats(){const T=TODAY(),k=STATE.mper||"mes",a=k==="hoy"?T:k==="sem"?addD(T,-6):k==="mes"?new Date(T.getFullYear(),T.getMonth(),1):new Date(T.getFullYear(),T.getMonth()-1,1),
  b=k==="ant"?addD(new Date(T.getFullYear(),T.getMonth(),1),-1):T,M=MPMOV.filter(m=>{const d=d0(m.h);return d>=a&&d<=b}),IN=M.filter(m=>m.dir==="in"),OUT=M.filter(m=>m.dir==="out");
 const sum=L=>L.reduce((x,m)=>x+m.monto,0),ti=sum(IN),to=sum(OUT),com=IN.reduce((x,m)=>x+(m.neto!=null?m.monto-m.neto:0),0);
 const nd=diffD(b,a)+1,days=[...Array(nd)].map((_,i)=>{const d=addD(a,i),f=L=>L.filter(m=>d0(m.h).getTime()===d.getTime());return{d,i:sum(f(IN)),o:sum(f(OUT)),c:f(IN).length}}),max=Math.max(1,...days.map(d=>d.i));
 const por=Object.entries(IN.reduce((o,m)=>{const g=ORIG[m.metodo]||"Tarjeta";o[g]=(o[g]||0)+m.monto;return o},{})).sort((x,y)=>y[1]-x[1]);
 const per=[["hoy","Hoy"],["sem","Últimos 7 días"],["mes",cap(MESES[T.getMonth()])],["ant",cap(MESES[new Date(T.getFullYear(),T.getMonth()-1,1).getMonth()])]];
 if(!MP_OK)return`<div class="box" style="color:var(--muted)">${MP_ERR?"No pude leer Mercado Pago. Probá con Actualizar.":"Leyendo Mercado Pago…"}</div>`;
 return`<div class="chips">${per.map(([x,l])=>`<button class="chip" data-mper="${x}" aria-pressed="${k===x}">${l}</button>`).join("")}</div>
 <div class="strip mpk" style="--n:4"><div class="kpi hot"><small>Entró a Mercado Pago</small><b>${ars(ti)}</b><em>${IN.length} cobro${IN.length===1?"":"s"}</em></div>
 <div class="kpi"><small>Salió (pagos y compras)</small><b>${ars(to)}</b><em>${OUT.length} movimiento${OUT.length===1?"":"s"}</em></div>
 <div class="kpi"><small>Quedó</small><b>${ars(ti-to)}</b><em>${com>0?"Comisiones MP: "+ars(com):"Sin comisiones"}</em></div>
 <div class="kpi"><small>Promedio por cobro</small><b>${IN.length?ars(ti/IN.length):"—"}</b><em>&nbsp;</em></div></div>
 ${nd>1?`<section class="box" style="margin-top:16px"><div class="h2row"><h2>Entró por día</h2><span class="count">Pasá el mouse por las barras</span></div>
  ${ti?`<div class="plot" style="height:170px;gap:${nd>20?3:8}px;margin-top:8px">${days.map(d=>{const tip=`<b>${cap(WD[d.d.getDay()])} ${fmtS(d.d)}</b><div class="tip-big">${ars(d.i)}</div><div>${d.c} cobro${d.c===1?"":"s"}</div>${d.o?`<div class="tip-row"><span>Salió</span><span>${ars(d.o)}</span></div>`:""}`;return`<div class="col" ${tipAttr(tip)}><i style="height:${d.i/max*82}%;background:${d.d.getTime()===T.getTime()?"var(--firev,var(--grad))":"var(--bar)"};border-radius:4px 4px 0 0"></i></div>`}).join("")}</div>
  <div style="display:flex;gap:${nd>20?3:8}px;font-size:11px;color:var(--muted);margin-top:6px">${days.map((d,i)=>`<span style="flex:1;text-align:center">${nd<=10||i%5===0||i===nd-1?d.d.getDate():""}</span>`).join("")}</div>`:'<p class="count">No entró plata en este período.</p>'}</section>`:""}
 ${por.length?`<section class="box" style="margin-top:16px"><div class="h2row"><h2>Por dónde entró</h2></div>${por.map(([g,v])=>`<div class="mp-li"><span>${g}</span><b>${ars(v)} <span class="count">· ${Math.round(v/ti*100)}%</span></b></div>`).join("")}</section>`:""}
 ${OUT.length?`<section class="box" style="margin-top:16px"><div class="h2row"><h2>Lo que salió</h2><span class="count">${OUT.length}</span></div>${[...OUT].sort((x,y)=>y.h-x.h).map(m=>`<div class="mp-li"><span><span class="count">${fmtS(m.h)} ${hhmm(m.h)}</span> · ${esc(m.desc&&m.desc!=="Varios"?m.desc:"Transferencia enviada")}</span><b style="white-space:nowrap">${ars(m.monto)}</b></div>`).join("")}</section>`:""}`}
V.mp=()=>{const vivo=!!window.__sb;const pend=TRF.filter(t=>t.estado==="pend"),id=pend.filter(t=>t.n),sin=pend.filter(t=>!t.n),hechas=TRF.filter(t=>t.estado!=="pend").sort((a,b)=>b.h-a.h).slice(0,60);
 const fila=t=>{const s=t.n?BYN.get(t.n):null;
  return`<div class="tr-row${s?"":" sin"}"><div class="tr-hora">${diaCorto(t.h)}${hhmm(t.h)}</div>
  <div class="tr-quien"><b>${esc(tNom(t))}</b><div class="count">${esc(t.origen)}${t.cuil?" · CUIL "+t.cuil:""}</div></div>
  <div class="tr-monto">${ars(t.monto)}</div>
  <div class="tr-socio">${s?`<span class="count">Es de</span> <b>${esc(s.nom)}</b> <span class="num">${s.n}</span><div class="count">${t.por==="dni"?"Reconocido por DNI":t.por==="aprendido"?"Ya lo conocía":"Reconocido por nombre"} · ${fdias(s)}</div>${infoVenc(s,t)}`:`<span class="pill p-warn">Sin identificar</span>`}</div>
  <div class="trf-a">${s?`<button class="btn sm" data-tok="${t.id}">Confirmar cobro</button><button class="btn ghost sm" data-tno="${t.id}">No es este socio</button><button class="btn ghost sm" data-tya="${t.id}" title="Ya lo cargaste en Cobrar: no se cuenta dos veces">Ya lo cargué</button>`
   :`<button class="btn sm" data-tsoc="${t.id}">Es de un socio</button><button class="btn ghost sm" data-tnew="${t.id}">Socio nuevo</button><button class="btn ghost sm" data-totro="${t.id}" title="Plata que entró a la cuenta pero no tiene que ver con el gimnasio. No suma en Facturación.">No es del gym</button><button class="btn ghost sm" data-tya="${t.id}" title="Ya lo cargaste en Cobrar: no se cuenta dos veces">Ya lo cargué</button>`}</div></div>`};
 const tabla=L=>`<div class="tr-list">${L.map(fila).join("")}</div>`;
 return`<div class="head"><div><h1>Transferencias</h1><p class="sub">Mercado Pago · ${vivo?(MP_ERR?`<span style="color:var(--warn)">No pude leer Mercado Pago (${esc(MP_ERR)})</span>`:MP_OK?`se actualiza solo · ${hhmm(MP_OK)}`:"leyendo…"):'<span class="tag">Ejemplo</span>'}</p></div>${vivo?'<button class="btn ghost" id="tact">Actualizar</button>':'<button class="btn ghost" id="tsim">Simular nueva transferencia</button>'}</div>
 ${vivo?`<div class="h2row"><h2>Para confirmar</h2><span class="count">llegadas desde el ${MPDESDE?fmtS(new Date(MPDESDE))+" "+hhmm(new Date(MPDESDE)):"hoy"}</span></div>`:""}
 ${sin.length?`<div class="h2row"><h2>Sin identificar</h2><span class="count">${sin.length}</span></div>${tabla(sin)}`:""}
 ${id.length?`<div class="h2row" style="margin-top:${sin.length?28:0}px"><h2>Identificadas, falta confirmar</h2><span class="count">${id.length}</span></div>${tabla(id)}`:""}
 ${!pend.length?`<div class="box" style="color:var(--muted)">Todo al día: no hay transferencias pendientes.</div>`:""}
 <div class="h2row" style="margin-top:28px"><h2>Ya registradas</h2></div>
 ${hechas.length?`<div class="tbl"><table><thead><tr><th>Hora</th><th>Quién transfirió</th><th>Quedó como</th><th class="r">Monto</th></tr></thead><tbody>${hechas.map(t=>{const s=t.n?BYN.get(t.n):null;return`<tr${s?` class="click" data-n="${s.n}"`:""}><td>${diaCorto(t.h)}${hhmm(t.h)}</td><td>${esc(tNom(t))}</td><td>${t.estado==="manual"?`${s?`<b>${esc(s.nom)}</b> <span class="num">${s.n}</span>`:""}<div class="count">Ya estaba cargado a mano${t.cob&&t.cob.h?` a las ${hhmm(t.cob.h)}`:""} · no se cuenta dos veces</div>`:s?`Cuota de <b>${esc(s.nom)}</b> <span class="num">${s.n}</span>`:'<span class="count">No es del gym · no suma</span>'}</td><td class="r money">${ars(t.monto)}</td></tr>`}).join("")}</tbody></table></div>`:'<p class="count">Todavía ninguna.</p>'}
 ${vivo?`<div class="h2row" style="margin-top:36px"><h2>Estadísticas de Mercado Pago</h2></div>${mpStats()}`:""}`};
/* historial de avisos: se anota cada socio incluido en un Excel descargado */
let AVI=[]; // {id,f:Date,tipo:"por"|"ven",n,venc:Date}
const avisado=(s,tipo)=>AVI.find(a=>a.n===s.n&&a.tipo===tipo&&s.venc&&a.venc&&a.venc.getTime()===s.venc.getTime());
const enPor=s=>{const d=dias(s);return d!==null&&d>=0&&d<=5},enVen=s=>{const d=dias(s);return d!==null&&d<0&&d>=-30};
V.avisos=()=>{const T=TODAY(),por=SOC.filter(s=>s.tel&&enPor(s)).sort((a,b)=>dias(a)-dias(b)),ven=SOC.filter(s=>s.tel&&enVen(s)).sort((a,b)=>dias(b)-dias(a));
 const L=STATE.av==="por"?por:ven,key=STATE.av;if(!STATE.avSel[key])STATE.avSel[key]=new Set(L.filter(s=>!avisado(s,key)).map(s=>s.n));const sel=STATE.avSel[key];
 const H=AVI.filter(a=>a.tipo===key&&diffD(T,a.f)<=30).sort((a,b)=>b.f-a.f).slice(0,150);
 return`<div class="head"><div><h1>Avisos por WhatsApp</h1></div></div>
 <div class="seg" style="max-width:560px;margin-bottom:18px"><button data-at="por" aria-pressed="${key==="por"}">Vencen en 5 días o menos · ${por.length}</button><button data-at="ven" aria-pressed="${key==="ven"}">Vencidos · ${ven.length}</button></div>
 <div class="tbl" style="max-height:600px"><table><thead><tr><th style="width:44px"><input type="checkbox" id="avall" aria-label="Seleccionar todos" ${L.length&&L.every(s=>sel.has(s.n))?"checked":""}></th><th>Nombre</th><th>Teléfono</th><th>Último pago</th><th>Vence</th><th>${key==="ven"?"Venció hace":"Faltan"}</th></tr></thead><tbody>
 ${L.map(s=>`<tr class="click" data-avi="${s.n}"><td><input type="checkbox" aria-label="Elegir a ${esc(s.nom)}" ${sel.has(s.n)?"checked":""}></td><td>${esc(s.nom)} <span class="num">${s.n}</span>${avisado(s,key)?` <span class="tag">Ya avisado ${fmtS(avisado(s,key).f)}</span>`:""}</td><td>${telFmt(s.tel)}</td><td>${fmt(s.ult)}</td><td>${fmt(s.venc)}</td><td>${dias(s)===0?'<span class="pill p-warn">Hoy</span>':Math.abs(dias(s))+(Math.abs(dias(s))===1?" día":" días")}</td></tr>`).join("")||`<tr><td colspan="6" class="count">No hay socios en esta lista hoy.</td></tr>`}</tbody></table></div>
 <div style="display:flex;gap:12px;align-items:center;justify-content:flex-end;margin-top:16px;flex-wrap:wrap"><span class="count">${L.filter(s=>sel.has(s.n)).length} elegidos</span><button class="btn" id="avx" ${L.some(s=>sel.has(s.n))?"":"disabled"}>Descargar Excel</button></div>
 <div class="h2row" style="margin-top:32px"><h2>Ya avisados · ${key==="por"?"por vencer":"vencidos"}</h2><span class="count">últimos 30 días · ${H.length}</span></div>
 ${H.length?`<div class="tbl" style="max-height:480px"><table><thead><tr><th>Avisado</th><th>Nombre</th><th>Vencía</th><th>Ahora</th></tr></thead><tbody>${H.map(a=>{const s=BYN.get(a.n);if(!s)return"";const pago=s.venc&&a.venc&&s.venc>a.venc;
  return`<tr class="click" data-n="${s.n}"><td>${fmtS(a.f)} ${hhmm(a.f)}</td><td>${esc(s.nom)} <span class="num">${s.n}</span></td><td>${fmt(a.venc)}</td><td>${pago?`<span class="pill p-ok">Ya pagó</span> <span class="count">vence ${fmtS(s.venc)}</span>`:pill(s)}</td></tr>`}).join("")}</tbody></table></div>`:'<p class="count">Todavía no se mandó ningún aviso de esta lista.</p>'}`};
const estAv=d=>d<0?"Vencido":d===0?"Vence Hoy":"Recordatorio";
function msgAv(s){const n=s.raw,f=fmtS(s.venc),d=dias(s);
 if(d<0)return`Hola ${n}! 💪\n\nTe escribimos para recordarte que tu cuota en Aquiles World Gym ya se encuentra vencida desde el ${f}.\n\nPara seguir entrenando y mantener tu acceso activo, es necesario regularizar el pago.\n\nSi ya abonaste, desestimá este mensaje 🙌\n\n¡Gracias por tu compromiso con el entrenamiento! 💪`;
 if(d===0)return`Hola ${n}! ⚠️\n\nTe recordamos que hoy vence tu cuota en Aquiles World Gym.\n\nPodés abonar durante el día para mantener tu acceso activo y continuar entrenando sin pausas.\n\nSi ya realizaste el pago, ignorá este mensaje 😊\n\n¡Gracias por seguir con nosotros!\nAnte cualquier duda, estamos disponibles.`;
 return`Hola ${n}! 💪\n\nTe recordamos que tu cuota en Aquiles World Gym vence el ${f}.\n\nPara que puedas seguir entrenando sin interrupciones, te recomendamos realizar el pago antes de esa fecha.\n\nSi ya abonaste, desestimá este mensaje 🙌\n\n¡Gracias por ser parte de la comunidad!\nConsultas o medios de pago, estamos para ayudarte.`}
function descargar(nombre,hoja,filas,anchos){if(typeof XLSX==="undefined"&&window.__sb){toast("Preparando el Excel…");const sc=document.createElement("script");sc.src="lib/xlsx.full.min.js";sc.onload=()=>descargar(nombre,hoja,filas,anchos);sc.onerror=()=>toast("No se pudo preparar el Excel. Probá de nuevo.");document.head.appendChild(sc);return}
 if(typeof XLSX==="undefined"){toast("En esta vista no se pueden bajar archivos. En el sistema publicado sí.");return}
 const ws=XLSX.utils.aoa_to_sheet(filas);if(anchos)ws["!cols"]=anchos.map(w=>({wch:w}));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,hoja);XLSX.writeFile(wb,nombre,{cellDates:true});toast("Descargado: "+nombre)}
function previewAv(){const sel=STATE.avSel[STATE.av],rows=SOC.filter(s=>sel.has(s.n)&&(STATE.av==="por"?enPor(s):enVen(s)));
 const fn=`avisos_${STATE.av==="por"?"por_vencer":"vencidos"}_${fmt(TODAY()).replace(/\//g,"-")}.xlsx`;
 modal(`<div class="sheet-h"><div><h2 style="font-size:22px">${fn}</h2><p class="sub" style="margin-top:4px">${rows.length} socios · hoja "PARA ENVIAR"</p></div><button class="btn ghost sm" data-x>Cerrar</button></div>
 <div class="tbl" style="background:var(--panel2);max-height:420px"><table><thead><tr><th>Nombre</th><th>Teléfono</th><th>Último Pago</th><th>Fecha de Vencimiento</th><th>Días Restantes</th><th>Estado</th><th>Mensaje</th></tr></thead><tbody>
 ${rows.map(s=>`<tr><td>${esc(s.raw)}</td><td>${s.tel}</td><td>${fmt(s.ult)}</td><td>${fmt(s.venc)}</td><td>${dias(s)}</td><td>${estAv(dias(s))}</td><td style="max-width:280px;overflow:hidden;text-overflow:ellipsis" title="${esc(msgAv(s))}">${esc(msgAv(s).split("\n")[2])}</td></tr>`).join("")}</tbody></table></div>
 <div style="margin-top:16px"><button class="btn big" id="dl">Descargar Excel</button></div>`,true);
 $("#dl").onclick=()=>{close();descargar(fn,"PARA ENVIAR",[["Nombre","Teléfono","Último Pago","Fecha de Vencimiento","Días Restantes","Estado","Mensaje"],...rows.map(s=>[s.raw,+s.tel,s.ult,s.venc,dias(s),estAv(dias(s)),msgAv(s)])],[34,14,12,20,15,14,60]);const hoy=fmtS(TODAY()),now=new Date(),tipo=STATE.av;rows.forEach(s=>{s.aviso=hoy;AVI.push({id:nid(),f:now,tipo,n:s.n,venc:s.venc})});
  STATE.avSel[tipo]=null;render(true)}}
function periodo(){const T=TODAY(),p=STATE.per;
 if(p==="hoy")return{a:T,b:T,l:"Hoy, "+fmt(T)};
 if(p==="sem"){const a=addD(T,-((T.getDay()+6)%7));return{a,b:T,l:`Esta semana · del ${fmtS(a)} al ${fmtS(T)}`}}
 const off=+p.slice(3),a=new Date(T.getFullYear(),T.getMonth()-off,1),b=new Date(a.getFullYear(),a.getMonth()+1,0);return{a,b,l:cap(MESES[a.getMonth()])+" "+a.getFullYear()}}
V.fact=()=>{const{a,b,l}=periodo(),mv=COB.filter(c=>c.f>=a&&c.f<=b),pagos=mv.filter(c=>c.ef+c.tr>0);
 const tot=pagos.reduce((x,c)=>x+c.ef+c.tr,0),ef=pagos.reduce((x,c)=>x+c.ef,0),tr=tot-ef,gratis=mv.filter(c=>c.items.some(i=>i.cat==="gratis")).length;
 const its=mv.flatMap(c=>c.items),cuoT=its.filter(i=>i.cat==="cuota").reduce((x,i)=>x+i.p,0),cuoN=its.filter(i=>i.cat==="cuota").length,prodT=its.filter(i=>i.cat==="prod").reduce((x,i)=>x+i.p,0);
 const nd=diffD(b,a)+1,days=[...Array(nd)].map((_,i)=>{const d=addD(a,i),ms=pagos.filter(c=>c.f.getTime()===d.getTime());return{d,t:ms.reduce((x,c)=>x+c.ef+c.tr,0),e:ms.reduce((x,c)=>x+c.ef,0),c:ms.length}});
 const prom=tot/Math.max(1,days.filter(d=>d.d<=TODAY()).length);
 const max=Math.max(1,...days.map(d=>d.t)),T=TODAY(),mo=[0,1,2,3].map(o=>new Date(T.getFullYear(),T.getMonth()-o,1));
 const hist=[...COB].sort((x,y)=>y.id-x.id).slice(0,190);
 return`<div class="head"><div><h1>Facturación</h1><p class="sub">${l}</p></div><button class="btn ghost" id="expp">Exportar pagos a Excel</button></div>
 <div class="chips">${[["hoy","Hoy"],["sem","Esta semana"],...mo.map((m,o)=>["mes"+o,cap(MESES[m.getMonth()])])].map(([k,t])=>`<button class="chip" data-per="${k}" aria-pressed="${STATE.per===k}">${t}</button>`).join("")}</div>
 <div class="strip" style="--n:4"><div class="kpi hot"><small>Total cobrado</small><b>${ars(tot)}</b><em>${pagos.length} cobros</em></div>
 <div class="kpi"><small>Efectivo</small><b>${ars(ef)}</b><em>${tot?Math.round(ef/tot*100):0}% del total</em></div>
 <div class="kpi"><small>Transferencia</small><b>${ars(tr)}</b><em>${tot?Math.round(tr/tot*100):0}% del total</em></div>
 <div class="kpi"><small>AOV · ticket promedio</small><b>${pagos.length?ars(tot/pagos.length):"—"}</b><em>${cuoN?"Solo cuotas: "+ars(cuoT/cuoN):"&nbsp;"}</em></div></div>
 <div class="grid-c"><section class="box"><div class="h2row"><h2>Cobrado por día</h2><span class="count">Pasá el mouse por las barras</span></div>
  ${tot?`<div class="plot" style="height:200px;gap:${nd>20?3:8}px;margin-top:8px">${days.map(d=>{const today=d.d.getTime()===T.getTime(),top=d.t===max;const tip=`<b>${cap(WD[d.d.getDay()])} ${fmtS(d.d)}${today?" · hoy":""}</b><div class="tip-big">${ars(d.t)}</div><div>${d.c} cobro${d.c===1?"":"s"}${d.c?" · ticket promedio "+ars(d.t/d.c):""}</div><div class="tip-row"><span>Efectivo</span><span>${ars(d.e)}</span></div><div class="tip-row"><span>Transferencia</span><span>${ars(d.t-d.e)}</span></div>${d.t?`<div class="${d.t>=prom?"tip-acc":""}">${d.t>=prom?"▲":"▼"} ${Math.round(Math.abs(d.t/prom-1)*100)}% ${d.t>=prom?"arriba":"abajo"} del promedio diario (${ars(prom)})</div>`:""}${top&&d.t?`<div class="tip-acc">El día que más se cobró</div>`:""}`;return`<div class="col" ${tipAttr(tip)}>${nd<=16&&d.t?`<span style="font-size:12px;font-weight:700;text-align:center;margin-bottom:4px;color:var(--muted)">${Math.round(d.t/1000)}k</span>`:""}<i style="height:${d.t/max*82}%;background:${today||top?"var(--firev,var(--grad))":"var(--bar)"};border-radius:4px 4px 0 0"></i></div>`}).join("")}</div>
  <div style="display:flex;gap:${nd>20?3:8}px;font-size:11px;color:var(--muted);margin-top:6px">${days.map((d,i)=>`<span style="flex:1;text-align:center">${nd<=10||i%5===0||i===nd-1?d.d.getDate():""}</span>`).join("")}</div>
  <p class="count" style="margin:10px 0 0">La barra destacada es el día que más se cobró${days.some(d=>d.d.getTime()===T.getTime())?" (y hoy)":""}.</p>`:'<p class="count">No hay cobros en este período.</p>'}</section>
 <section class="box"><h2 style="margin-bottom:6px">De dónde viene la plata</h2>
  <div class="mix"><i style="width:${tot?cuoT/tot*100:0}%;background:var(--bar)"></i><i style="width:${tot?prodT/tot*100:0}%;background:var(--fire,var(--grad))"></i></div>
  <div class="line"><span><b>Cuotas</b> · ${cuoN}</span><span class="money">${ars(cuoT)}</span></div>
  <div class="line"><span><b>Productos</b></span><span class="money">${ars(prodT)}</span></div>
  <div class="line"><span>Pases gratis</span><span>${gratis}</span></div></section></div>
 <div class="h2row" style="margin-top:28px"><h2>Últimos 190 cobros</h2><span class="count">En el orden en que se cargaron, el último arriba</span></div>
 <div class="tbl tall"><table><thead><tr><th>Fecha</th><th>Hora</th><th>N°</th><th>Socio</th><th>Concepto</th><th>Método</th><th class="r">Total</th><th></th></tr></thead><tbody>
 ${hist.map(c=>{const s=BYN.get(c.n),m=c.ef&&c.tr?"Mixto":c.ef?"Efectivo":c.tr?"Transferencia":"—";return`<tr${s?` class="click" data-n="${s.n}"`:""}><td>${fmt(c.f)}</td><td>${c.h?hhmm(c.h):"—"}</td><td class="num">${s?s.n:"—"}</td><td>${s?esc(s.nom):"Venta mostrador"}</td><td>${esc(c.items.map(i=>i.n).join(" + "))}</td><td><span class="tag">${m}</span></td><td class="r money">${ars(c.ef+c.tr)}</td><td class="r"><button class="btn ghost sm" data-stop data-edcob="${c.id}">Corregir</button></td></tr>`}).join("")}</tbody></table></div>`};
V.ajustes=()=>`<div class="head"><div><h1>Ajustes</h1></div></div>
 <div class="grid-c"><div>
 <section class="box" style="margin-bottom:20px"><div class="h2row"><h2>Cuotas</h2></div>
  ${CUOTAS.filter(c=>c.p).map(c=>`<div class="prod"><div class="n"><strong>${c.n}</strong></div><input class="input" style="width:150px;text-align:right" data-pc="${c.k}" inputmode="numeric" value="${ars(c.p)}"></div>`).join("")}</section>
 <section class="box"><div class="h2row"><h2>Productos</h2></div>
  ${PRODS.map(p=>`<div class="prod"><div class="n"><strong>${esc(p.n)}</strong></div><input class="input" style="width:150px;text-align:right" data-pp="${p.k}" inputmode="numeric" value="${ars(p.p)}"></div>`).join("")}</section>
 <div style="margin-top:16px"><button class="btn big" id="gprec">Guardar precios</button></div></div>
 <section class="box"><h2 style="margin-bottom:8px">Cambios de precio</h2><div class="hist">${PCAMB.map(h=>`<div><span>${h[0]} · ${esc(h[1])}</span><b>${h[2]}</b></div>`).join("")||'<p class="count">Todavía no cambiaste ningún precio.</p>'}</div></section></div>`;

/* ---------- gastos y ganancia ---------- */
const GCATS=["Empleados","Servicios","Impuestos","Limpieza","Mantenimiento","Equipamiento","Mercadería","Publicidad","Otros"];
let GID=0;
const GTPL=[
 {n:"Sueldos empleados",cat:"Empleados",monto:1200000,real:true},
 {n:"Monotributo",cat:"Impuestos",monto:9102,real:true},
 {n:"Luz, gas y agua",cat:"Servicios",sub:[["Luz",180000],["Gas",85000],["Agua",25000]]},
 {n:"Internet",cat:"Servicios",monto:30000},
 {n:"Limpieza",cat:"Limpieza",monto:60000},
 {n:"Mantenimiento de máquinas",cat:"Mantenimiento",monto:80000}];
const GMES={};
const mkey=d=>d.getFullYear()+"-"+d.getMonth();
function gastosDe(d){const k=mkey(d);if(!GMES[k]){const pasado=d<new Date(TODAY().getFullYear(),TODAY().getMonth(),1);
  GMES[k]=GTPL.map((t,i)=>({id:"t"+i,n:t.n,cat:t.cat,monto:t.sub?t.sub.reduce((x,y)=>x+y[1],0):t.monto,sub:t.sub?t.sub.map(x=>[...x]):null,fijo:true,ej:!t.real,pagado:pasado}));
}
 return GMES[k]}
STATE.gper=0;STATE.gadd=false;STATE.gcat="Mantenimiento";
V.gastos=()=>{const T=TODAY(),a=new Date(T.getFullYear(),T.getMonth()-STATE.gper,1),b=new Date(a.getFullYear(),a.getMonth()+1,0),mesN=MESES[a.getMonth()];
 const G=gastosDe(a),gtot=G.reduce((x,g)=>x+g.monto,0);
 const pagos=COB.filter(c=>c.f>=a&&c.f<=b&&c.ef+c.tr>0),ing=pagos.reduce((x,c)=>x+c.ef+c.tr,0),mp=pagos.reduce((x,c)=>x+c.tr,0),ef=ing-mp;
 const gan=ing-gtot,marg=ing?Math.round(gan/ing*100):0;
 const cuotas=pagos.flatMap(c=>c.items).filter(i=>i.cat==="cuota"),prom=cuotas.length?cuotas.reduce((x,i)=>x+i.p,0)/cuotas.length:CUOTAS[0].p;
 const nEq=Math.ceil(gtot/prom),act=SOC.filter(s=>["ok","warn"].includes(est(s))).length,pag=new Set(pagos.filter(c=>c.n).map(c=>c.n)).size;
 const base=STATE.gper===0?act:pag,baseL=STATE.gper===0?"socios activos hoy":"socios que pagaron en "+mesN;
 const max=Math.max(base,nEq)*1.18,dif=base-nEq;
 let acc=0,diaEq=null;for(let d=new Date(a);d<=b;d=addD(d,1)){acc+=pagos.filter(c=>c.f.getTime()===d.getTime()).reduce((x,c)=>x+c.ef+c.tr,0);if(acc>=gtot){diaEq=d;break}}
 const porCat=GCATS.map(c=>[c,G.filter(g=>g.cat===c).reduce((x,g)=>x+g.monto,0)]).filter(x=>x[1]>0).sort((x,y)=>y[1]-x[1]);
 const meses=[3,2,1,0].map(o=>{const ma=new Date(T.getFullYear(),T.getMonth()-o,1),mb=new Date(ma.getFullYear(),ma.getMonth()+1,0),i=COB.filter(c=>c.f>=ma&&c.f<=mb).reduce((x,c)=>x+c.ef+c.tr,0),g=gastosDe(ma).reduce((x,g)=>x+g.monto,0);return{o,n:cap(MESES[ma.getMonth()]),i,g,r:i-g}});
 const mmax=Math.max(...meses.map(m=>Math.max(m.i,m.g)));
 const fila=g=>`<div class="g-row"><label class="g-ok" title="Marcar como pagado"><input type="checkbox" data-gpag="${g.id}" ${g.pagado?"checked":""}><span>${g.pagado?"Pagado":"A pagar"}</span></label>
   <div class="g-n"><b>${esc(g.n)}</b> <span class="tag">${esc(g.cat)}</span></div>
   ${g.sub?`<div class="g-m g-sum">${ars(g.monto)}</div>`:`<input class="input g-m" data-gm="${g.id}" inputmode="numeric" value="${ars(g.monto)}" aria-label="Monto de ${esc(g.n)}">`}
   ${g.fijo?'<span class="g-del"></span>':`<button class="del g-del" data-gdel="${g.id}" title="Quitar este gasto" aria-label="Quitar ${esc(g.n)}">${ICON.trash}</button>`}
   ${g.sub?`<div class="g-subs">${g.sub.map(([n,v],i)=>`<label class="g-sub"><span>${n}</span><input class="input" data-gsub="${g.id}:${i}" inputmode="numeric" value="${ars(v)}" aria-label="${n}"></label>`).join("")}</div>`:""}</div>`;
 return`<div class="head"><div><h1>Gastos y ganancia</h1><p class="sub">${cap(mesN)} ${a.getFullYear()}</p></div><button class="btn" id="gnew">+ Agregar gasto</button></div>
 <div class="chips">${[0,1,2,3].map(o=>{const m=new Date(T.getFullYear(),T.getMonth()-o,1);return`<button class="chip" data-gper="${o}" aria-pressed="${STATE.gper===o}">${cap(MESES[m.getMonth()])}</button>`}).join("")}</div>
 <div class="strip" style="--n:4"><div class="kpi"><small>Entró</small><b>${ars(ing)}</b><em>Mercado Pago ${ars(mp)} · Efectivo ${ars(ef)}</em></div>
 <div class="kpi"><small>Salió (gastos)</small><b>${ars(gtot)}</b><em>${G.length} gastos</em></div>
 <div class="kpi hot"><small>${STATE.gper===0?"Ganancia hasta hoy":"Te quedó de ganancia"}</small><b>${ars(gan)}</b><em>${gan>=0?`Margen ${marg}%`:STATE.gper===0?`Faltan ${ars(-gan)} para cubrir los gastos`:"Este mes perdiste plata"}</em></div>
 <div class="kpi"><small>Mercado Pago</small><b>${ars(mp)}</b><em>${ing?Math.round(mp/ing*100):0}% de lo que entró</em></div></div>
 <section class="box eq"><div class="h2row"><h2>Punto de equilibrio</h2><span class="pill ${dif>=0?"p-ok":"p-late"}">${dif>=0?`Estás ${dif} socios arriba`:`Te faltan ${-dif} socios`}</span></div>
  <p class="eq-txt">Para pagar todos los gastos de ${mesN} necesitás <b class="grad-t">${nEq} socios</b> pagando la cuota promedio (${ars(prom)}). ${STATE.gper===0?"Hoy tenés":"En "+mesN+" pagaron"} <b>${base}</b>.</p>
  <div class="eq-bar"><div class="eq-fill" style="width:${Math.min(base/max*100,100)}%"></div><div class="eq-mark" style="left:${nEq/max*100}%"><span>Equilibrio · ${nEq}</span></div><div class="eq-you" style="left:${Math.min(base/max*100,100)}%"><span>${base} ${baseL}</span></div></div>
  <p class="count" style="margin:34px 0 0">${diaEq?`Los gastos del mes quedaron cubiertos el <b style="color:var(--ink)">${fmtS(diaEq)}</b>. Desde ese día, todo lo que entró fue ganancia.`:`Todavía no se cubrieron los gastos del mes: faltan ${ars(gtot-ing)}.`}</p></section>
 <div class="grid-c" style="margin-top:22px">
 <section class="box"><div class="h2row"><h2>Gastos de ${mesN}</h2><span class="count">Tocá un monto para cambiarlo</span></div>
  ${STATE.gadd?`<div class="g-add"><div class="f2"><div class="field"><label for="gn">¿Qué fue?</label><input class="input" id="gn" placeholder="Ej: Poleas nuevas, retapizado…"></div><div class="field"><label for="gmo">Monto</label><input class="input" id="gmo" inputmode="numeric" placeholder="$"></div></div>
   <span class="lbl">Categoría</span><div class="chips" style="margin:0 0 12px">${GCATS.filter(c=>c!=="Empleados").map(c=>`<button class="chip" data-gc="${c}" aria-pressed="${STATE.gcat===c}">${c}</button>`).join("")}</div>
   <label class="g-rep"><input type="checkbox" id="grep"> Se repite todos los meses</label>
   <div style="display:flex;gap:8px;margin-top:12px"><button class="btn" id="gok">Agregar</button><button class="btn ghost" id="gcancel">Cancelar</button></div></div>`:""}
  ${G.map(fila).join("")}
  <div class="total"><span>Total</span><b>${ars(gtot)}</b></div></section>
 <div style="display:flex;flex-direction:column;gap:22px">
 <section class="box"><h2 style="margin-bottom:12px">¿A dónde se va la plata?</h2>
  ${porCat.map(([c,v],i)=>`<div class="g-cat"><div class="g-cat-h"><span>${c}</span><span><b>${ars(v)}</b> · ${Math.round(v/gtot*100)}%</span></div><div class="g-cat-b"><i style="width:${v/porCat[0][1]*100}%;background:${i===0?"var(--fire)":"var(--bar)"}"></i></div></div>`).join("")}</section>
 <section class="box"><h2 style="margin-bottom:12px">Mes a mes</h2>
  ${meses.map(m=>`<div class="g-mm" ${tipAttr(`<b>${m.n}</b><div class="tip-row"><span>Entró</span><span>${ars(m.i)}</span></div><div class="tip-row"><span>Gastos</span><span>${ars(m.g)}</span></div><div class="tip-big">${ars(m.r)}</div><div>${m.r>=0?"de ganancia":"de pérdida"}</div>`)}><span class="g-mm-n">${m.n}</span><div class="g-mm-b"><i class="in" style="width:${m.i/mmax*100}%"></i><i class="out" style="width:${m.g/mmax*100}%"></i></div><b style="color:${m.r>=0?"var(--ok)":"var(--late)"}">${m.r>=0?"+":""}${ars(m.r)}</b></div>`).join("")}
  <div class="legend"><span><i style="background:var(--fire)"></i>Entró</span><span><i style="background:var(--bar)"></i>Gastos</span><span>· Octubre va por la mitad del mes</span></div></section></div></div>`};
function bindGastos(){
 $$("[data-gper]").forEach(b=>b.onclick=()=>{STATE.gper=+b.dataset.gper;render(true)});
 const T=TODAY(),a=new Date(T.getFullYear(),T.getMonth()-STATE.gper,1),G=gastosDe(a);
 $$("[data-gm]").forEach(i=>{i.onfocus=()=>i.select();i.onchange=()=>{const g=G.find(x=>String(x.id)===i.dataset.gm),v=+i.value.replace(/\D/g,"");g.monto=v;g.ej=false;toast(`${g.n}: ${ars(v)} en ${MESES[a.getMonth()]}`);render(true)}});
 $$("[data-gsub]").forEach(i=>{i.onfocus=()=>i.select();i.onchange=()=>{const[id,ix0]=i.dataset.gsub.split(":"),ix=+ix0,g=G.find(x=>String(x.id)===id),v=+i.value.replace(/\D/g,"");g.sub[ix][1]=v;g.monto=g.sub.reduce((x,y)=>x+y[1],0);g.ej=false;toast(`${g.sub[ix][0]}: ${ars(v)} · total ${ars(g.monto)}`);render(true)}});
 $$("[data-gpag]").forEach(c=>c.onchange=()=>{G.find(x=>String(x.id)===c.dataset.gpag).pagado=c.checked;render(true)});
 $$("[data-gdel]").forEach(b=>b.onclick=()=>{const i=G.findIndex(x=>String(x.id)===b.dataset.gdel),g=G[i];G.splice(i,1);render(true);toast(`Quitaste "${g.n}"`,()=>{G.splice(i,0,g);render(true)})});
 $("#gnew").onclick=()=>{STATE.gadd=true;render(true);$("#gn").focus()};
 if(STATE.gadd){$$("[data-gc]").forEach(b=>b.onclick=()=>{STATE.gcat=b.dataset.gc;$$("[data-gc]").forEach(x=>x.setAttribute("aria-pressed",x===b))});
  $("#gcancel").onclick=()=>{STATE.gadd=false;render(true)};
  $("#gok").onclick=()=>{const n=$("#gn").value.trim(),v=+$("#gmo").value.replace(/\D/g,"");if(!n||!v){toast("Poné qué fue y el monto");return}
   const rep=$("#grep").checked;G.push({id:String(nid()),n,cat:STATE.gcat,monto:v,fijo:rep,ej:false,pagado:true});if(rep)GTPL.push({n,cat:STATE.gcat,monto:v,real:true});
   STATE.gadd=false;toast(`${n} agregado${rep?" · se va a repetir todos los meses":""}`);render(true)}}
}

/* ---------- fichas y formularios ---------- */
/* ---------- corregir cobros ---------- */
const esCuota=c=>c.items.some(i=>i.cat==="cuota"||i.cat==="gratis");
function recalcSocio(n){const s=BYN.get(n);if(!s)return;const L=COB.filter(c=>c.n===n&&esCuota(c)).sort((a,b)=>a.f-b.f||a.id-b.id);let v=null,u=null;
 L.forEach(c=>{v=c.imp?addD(c.f,30):c.vto?revD(c.vto):(v&&v>=c.f?addD(v,30):addD(c.f,30));u=c.f});s.venc=v;s.ult=u}
function corregir(id){const c=COB.find(x=>String(x.id)===String(id));if(!c)return;
 const E={n:c.n,f:isoStr(c.f),items:c.items.map(i=>({...i})),met:c.ef&&c.tr?"mixto":c.ef?"efectivo":"transf",ef:c.ef,q:"",buscando:false,borrar:false};
 const draw=()=>{const s=E.n?BYN.get(E.n):null,tot=E.items.reduce((a,i)=>a+i.p,0),R=E.buscando?buscar(E.q,5):[];
  modal(`<div class="sheet-h"><div><h2 style="font-size:22px">Corregir cobro</h2><p class="sub" style="margin-top:4px">Cargado el ${fmt(c.h||c.f)}${c.h?" a las "+hhmm(c.h):""}</p></div><button class="btn ghost sm" data-x>Cerrar</button></div>
  <div class="field"><span class="lbl">Socio</span>${E.buscando?`<input class="input" id="eq" placeholder="Nombre, DNI o N° de socio" value="${esc(E.q)}" autocomplete="off">${R.map(x=>`<div class="row" data-eps="${x.n}"><div class="n"><strong>${esc(x.nom)}</strong><span>${x.n}</span></div></div>`).join("")}`
   :`<div class="ci-hit" style="margin-top:0"><div class="n"><b>${s?esc(s.nom):"Venta mostrador"}</b><div>${s?s.n:"Sin socio"}</div></div><button class="btn ghost sm" id="ecamb">Cambiar socio</button></div>`}</div>
  <div class="f2"><div class="field"><label for="ef">Fecha de pago</label><input class="input" type="date" id="efe" value="${E.f}"></div>
  <div class="field"><span class="lbl">¿Cómo pagó?</span><div class="seg pago">${[["transf","Transferencia"],["efectivo","Efectivo"],["mixto","Mixto"]].map(([k,l])=>`<button class="m-${k}" data-em="${k}" aria-pressed="${E.met===k}">${l}</button>`).join("")}</div></div></div>
  ${E.met==="mixto"?`<div class="field"><label for="eef">En efectivo <small>(el resto es transferencia)</small></label><input class="input" id="eef" inputmode="numeric" value="${ars(Math.min(E.ef,tot))}"></div>`:""}
  <span class="lbl">Conceptos</span>${E.items.map((i,k)=>`<div class="prod"><div class="n"><strong>${esc(i.n)}</strong></div><input class="input" style="width:150px;text-align:right" data-eit="${k}" inputmode="numeric" value="${ars(i.p)}"></div>`).join("")}
  <div class="total"><span>Total</span><b>${ars(tot)}</b></div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between;margin-top:16px">
   ${E.borrar?`<span class="confirm">¿Eliminar este cobro? <button class="btn sm" id="edelok">Sí, eliminar</button><button class="btn ghost sm" id="edelno">No</button></span>`:`<button class="btn ghost" id="edel" style="color:var(--late);border-color:rgba(255,92,92,.4)">Eliminar cobro</button>`}
   <button class="btn" id="eok">Guardar cambios</button></div>`);
  if($("#ecamb"))$("#ecamb").onclick=()=>{E.buscando=true;draw();$("#eq").focus()};
  if($("#eq"))$("#eq").oninput=e=>{E.q=e.target.value;const p=e.target.selectionStart;draw();const el=$("#eq");el.focus();el.setSelectionRange(p,p)};
  $$("[data-eps]").forEach(r=>r.onclick=()=>{E.n=r.dataset.eps;E.buscando=false;E.q="";draw()});
  $("#efe").onchange=e=>{E.f=e.target.value||E.f};
  $$("[data-em]").forEach(b=>b.onclick=()=>{E.met=b.dataset.em;draw()});
  if($("#eef"))$("#eef").onchange=e=>{E.ef=+e.target.value.replace(/\D/g,"")||0;draw()};
  $$("[data-eit]").forEach(i=>i.onchange=()=>{E.items[+i.dataset.eit].p=+i.value.replace(/\D/g,"")||0;draw()});
  if($("#edel"))$("#edel").onclick=()=>{E.borrar=true;draw()};
  if($("#edelno"))$("#edelno").onclick=()=>{E.borrar=false;draw()};
  if($("#edelok"))$("#edelok").onclick=()=>{const i=COB.indexOf(c);COB.splice(i,1);if(c.n)recalcSocio(c.n);close();toast(`Cobro eliminado${c.n&&BYN.get(c.n)?` · ${BYN.get(c.n).nom.split(" ")[0]} vence el ${fmt(BYN.get(c.n).venc)}`:""}`);render(true)};
  $("#eok").onclick=()=>{if(esCuota({items:E.items})&&!E.n){toast("Una cuota tiene que tener un socio");return}
   const viejo=c.n,nf=iso(E.f);if(nf.getTime()!==c.f.getTime()||E.n!==viejo)delete c.vto;
   c.n=E.n;c.f=nf;c.items=E.items;const tot=E.items.reduce((a,i)=>a+i.p,0);
   c.ef=E.met==="efectivo"?tot:E.met==="transf"?0:Math.min(E.ef,tot);c.tr=tot-c.ef;
   if(viejo)recalcSocio(viejo);if(c.n&&c.n!==viejo)recalcSocio(c.n);
   close();const s=c.n?BYN.get(c.n):null;toast(`Cobro corregido${s&&esCuota(c)?` · ${s.nom.split(" ")[0]} vence el ${fmt(s.venc)}`:""}`);render(true)};
 };draw()}
function ficha(n){const s=BYN.get(n),pg=COB.filter(c=>c.n===n).sort((a,b)=>b.id-a.id),ing=INGRESOS.filter(i=>i.n===n).slice(0,5);
 const kv=[["DNI",dniFmt(s.dni)],["Teléfono",telFmt(s.tel)||"—"],["Email",s.mail||"—"],["Nacimiento · edad",s.nac?`${fmt(s.nac)} · ${edad(s)} años`:"—"],["Género",s.gen||"—"],["Domicilio",s.dir||"—"],["Plan",s.plan],["Último pago",fmt(s.ult)]];
 modal(`<div class="sheet-h"><div><span class="num">${s.n}</span><h2 style="font-size:26px;margin:2px 0 8px">${esc(s.nom)}</h2>${pill(s)} <span class="count" style="margin-left:6px">${fdias(s)}</span></div><button class="btn ghost sm" data-x>Cerrar</button></div>
 <div class="actions"><button class="btn" id="fc">Cobrar</button><button class="btn ghost" id="fi">Ingreso</button><button class="btn ghost" id="fx">Cerrar</button></div>
 <div class="kv">${kv.map(([k,v])=>`<div><small>${k}</small><span style="word-break:break-word">${esc(v)}${k==="Teléfono"&&s.tel?` <a class="btn wa sm" href="${waLink(s)}" target="_blank" rel="noopener" style="margin-left:8px;vertical-align:middle;padding:5px 12px;font-size:13px">WhatsApp</a>`:""}</span></div>`).join("")}<div style="grid-column:1/-1"><small>Contacto de emergencia</small><span>${esc(s.emer||"—")}${s.temer?" · "+telFmt(s.temer):""}</span></div></div>
 <h2 style="margin-bottom:4px">Pagos desde julio</h2><div class="hist">${pg.map(c=>`<div><span>${fmt(c.f)}${c.h?" · "+hhmm(c.h):""} · ${esc(c.items.map(i=>i.n).join(" + "))}</span><b>${ars(c.ef+c.tr)} · ${c.ef&&c.tr?"Mixto":c.ef?"Efectivo":c.tr?"Transferencia":"Gratis"} <button class="link" data-edcob="${c.id}" style="margin-left:8px">Corregir</button></b></div>`).join("")||'<p class="count">Sin pagos desde julio.</p>'}
 ${ing.map(i=>`<div><span>Ingresó ${fmtS(i.t)} · ${hhmm(i.t)}</span><span></span></div>`).join("")}</div>`);
 $("#fc").onclick=()=>{close();STATE.C=null;go("cobrar");STATE.C.n=n;STATE.C.cuota=s.plan==="Personalizado"?"pers":"normal";render()};
 $("#fi").onclick=()=>{close();registrar(s)};
 $$("#modal [data-edcob]").forEach(b=>b.onclick=()=>corregir(b.dataset.edcob));$("#fx").onclick=close}
function nuevo(pre={}){const num=nextNum();
 modal(`<div class="sheet-h"><div><h2 style="font-size:26px">Nuevo socio · ${num}</h2><p class="sub" style="margin-top:4px">${pre.trf?"Nombre y DNI vienen de la transferencia. ":""}Con * es obligatorio.</p></div><button class="btn ghost sm" data-x>Cerrar</button></div>
 <div class="fsec">Datos personales</div>
 <div class="f3"><div class="field"><label for="n1">Nombre y apellido *</label><input class="input" id="n1" value="${esc(pre.nom||"")}"></div><div class="field"><label for="n3">DNI *</label><input class="input" id="n3" inputmode="numeric" value="${esc(pre.dni||"")}"></div><div class="field"><label for="n4">Fecha de nacimiento</label><input class="input" id="n4" type="date"></div></div>
 <div class="f3"><div class="field"><span class="lbl">Género</span><div class="seg" id="sx"><button aria-pressed="false" data-g="M">Masculino</button><button aria-pressed="false" data-g="F">Femenino</button></div></div><div class="field"><label for="n6">Teléfono *</label><input class="input" id="n6" inputmode="tel" placeholder="297 400-0000"></div><div class="field"><label for="n7">Email</label><input class="input" id="n7" type="email"></div></div>
 <div class="f3"><div class="field"><label for="n8">Domicilio</label><input class="input" id="n8"></div><div class="field"><label for="n9">Contacto de emergencia</label><input class="input" id="n9" placeholder="Nombre (vínculo)"></div><div class="field"><label for="n10">Tel. de emergencia</label><input class="input" id="n10" inputmode="tel"></div></div>
 <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px">${pre.trf?`<button class="btn" id="ins">Inscribir y registrar la transferencia de ${ars(pre.trf.monto)}</button>`:`<button class="btn" id="ins">Inscribir y cobrar</button><button class="btn ghost" id="ins2">Solo inscribir</button>`}</div>`,true);
 let g="";$$("#sx button").forEach(b=>b.onclick=()=>{g=b.dataset.g;$$("#sx button").forEach(x=>x.setAttribute("aria-pressed",x===b))});
 const save=cobrar=>{const nom=$("#n1").value.trim(),dni=$("#n3").value.replace(/\D/g,""),tel=$("#n6").value.replace(/\D/g,"");
  if(!nom||!dni||!tel){toast("Completá nombre, DNI y teléfono");return}
  const s={n:num,raw:nom.toUpperCase(),nom:title(nom),nac:$("#n4").value?iso($("#n4").value):null,dni,gen:g==="M"?"Masculino":g==="F"?"Femenino":"",tel,dir:title($("#n8").value.trim()),mail:$("#n7").value.trim().toLowerCase(),emer:title($("#n9").value.trim()),temer:$("#n10").value.replace(/\D/g,""),plan:"Básico",venc:null,ult:null,nuevo:true};
  SOC.push(s);BYN.set(num,s);close();if(!pre.trf)reidentificar();
  if(pre.trf){if(pre.trf.cuil)ALIAS.set(pre.trf.cuil,num);cobrarTrf(pre.trf,s);toast(`${s.nom} inscripto como ${num} y transferencia registrada`);render(true);return}
  if(cobrar){STATE.C=null;go("cobrar");STATE.C.n=num;render()}else{toast(`${s.nom} inscripto como ${num}`);render(true)}};
 $("#ins").onclick=()=>save(true);if($("#ins2"))$("#ins2").onclick=()=>save(false)}

function elegirSocio(t){let q="";const draw=()=>{const R=buscar(q,6);$("#esr").innerHTML=R.map(x=>`<div class="row" data-es="${x.n}"><div class="n"><strong>${esc(x.nom)}</strong><span>${x.n} · ${fdias(x)}</span></div>${pill(x)}</div>`).join("")||(q?'<p class="count">No encontré a nadie.</p>':"");
   $$("[data-es]").forEach(r=>r.onclick=()=>{const s=BYN.get(r.dataset.es);if(t.cuil)ALIAS.set(t.cuil,s.n);cobrarTrf(t,s);close();toast(`Listo: cuota de ${s.nom}.${t.cuil?" La próxima vez que transfiera, lo reconozco solo.":""}`);render(true)})};
 modal(`<div class="sheet-h"><div><h2 style="font-size:22px">¿De qué socio es?</h2><p class="sub" style="margin-top:4px">${esc(tNom(t))} transfirió ${ars(t.monto)} · ${fmtS(t.h)} ${hhmm(t.h)}</p></div><button class="btn ghost sm" data-x>Cerrar</button></div>
 <input class="input" id="esq" placeholder="Nombre, DNI o N° de socio" autocomplete="off"><div id="esr" style="margin-top:8px"></div>`);
 $("#esq").oninput=e=>{q=e.target.value;draw()};$("#esq").focus()}
/* ---------- render y eventos ---------- */
function render(keep){if(typeof guardar==='function')guardar();side();tick();const y=scrollY;$("#main").innerHTML=V[cur]();bind();if(keep)scrollTo(0,y);else scrollTo(0,0)}
function refocus(id,pos){const el=$("#"+id);if(el){el.focus();el.setSelectionRange(pos,pos)}}
function bind(){
 $$("#main [data-n]").forEach(r=>r.onclick=e=>{if(e.target.closest("[data-stop]"))return;e.preventDefault();ficha(r.dataset.n)});
 $$("#main [data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
 $$("#main [data-filtro]").forEach(b=>b.onclick=()=>go("socios",{filtro:b.dataset.filtro,q:""}));
 $$("[data-del]").forEach(b=>b.onclick=()=>{STATE.delAsk=+b.dataset.del;render(true)});
 $$("[data-no]").forEach(b=>b.onclick=()=>{STATE.delAsk=null;render(true)});
 $$("[data-yes]").forEach(b=>b.onclick=()=>{const g=INGRESOS.find(x=>x.id===+b.dataset.yes),i=INGRESOS.indexOf(g);INGRESOS.splice(i,1);STATE.delAsk=null;render(true);toast(`Ingreso de ${BYN.get(g.n).nom} (${hhmm(g.t)}) eliminado`,()=>{INGRESOS.splice(i,0,g);render(true)})});
 if(cur==="checkin"){$("#ciq").oninput=e=>{STATE.ciq=e.target.value;const p=e.target.selectionStart;render(true);refocus("ciq",p)};
  $$("[data-reg]").forEach(b=>b.onclick=()=>{STATE.ciq="";registrar(BYN.get(b.dataset.reg))});
  $$("[data-cobrar]").forEach(b=>b.onclick=()=>{const s=BYN.get(b.dataset.cobrar);STATE.C=null;STATE.ciq="";go("cobrar");STATE.C.n=s.n;STATE.C.cuota=s.plan==="Personalizado"?"pers":"normal";render()});
  $("#qr").onclick=()=>toast("El lector de QR funciona en el sistema publicado, con la cámara del celu o la compu.");
  if(!STATE.ciq)setTimeout(()=>$("#ciq")&&$("#ciq").focus(),0)}
 if(cur==="socios"){if($("#smas"))$("#smas").onclick=()=>{STATE.lim=(STATE.lim||100)+300;render(true)};$("#sq").oninput=e=>{STATE.q=e.target.value;STATE.lim=100;const p=e.target.selectionStart;render(true);refocus("sq",p)};
  $$("[data-f]").forEach(b=>b.onclick=()=>{STATE.filtro=b.dataset.f;render(true)});
  $("#nuevo").onclick=nuevo;$("#exps").onclick=()=>descargar(`socios_${fmt(TODAY()).replace(/\//g,"-")}.xlsx`,"SOCIOS",[["N° de socio","Nombre y apellido","Fecha de nacimiento","Edad","DNI","Género","Teléfono","Dirección","Correo","Contacto de emergencia","Teléfono de emergencia","Plan","Último pago","Vencimiento","Estado"],...SOC.map(s=>[s.n,s.raw,s.nac,edad(s),s.dni?+s.dni:"",s.gen,s.tel?+s.tel:"",s.dir,s.mail,s.emer,s.temer?+s.temer:"",s.plan,s.ult,s.venc,LBL[est(s)]])],[10,32,12,6,12,10,14,30,30,30,14,12,12,12,10])}
 if(cur==="cobrar"){const C=STATE.C;
  if($("#csq")){$("#csq").oninput=e=>{C.q=e.target.value;const p=e.target.selectionStart;render(true);refocus("csq",p)}}
  $$("[data-usetrf]").forEach(b=>b.onclick=()=>{const t=TRF.find(x=>x.id===+b.dataset.usetrf),s=BYN.get(t.n);cobrarTrf(t,s);STATE.C=null;toast(`Listo: se usó la transferencia de ${ars(t.monto)} · ${s.nom.split(" ")[0]} vence el ${fmt(s.venc)}`);render(true)});
  $$("[data-pick]").forEach(r=>r.onclick=()=>{const s=BYN.get(r.dataset.pick);C.n=s.n;C.q="";C.venc="auto";if(s.plan==="Personalizado")C.cuota="pers";render(true)});
  if($("#cambiar"))$("#cambiar").onclick=()=>{C.n=null;render(true);$("#csq")&&$("#csq").focus()};
  $$("[data-c]").forEach(b=>b.onclick=()=>{C.cuota=b.dataset.c;render(true)});
  $$("[data-me]").forEach(b=>b.onclick=()=>{C.metodo=b.dataset.me;render(true)});
  $("#cfecha").onchange=e=>{C.fecha=e.target.value||null;render(true)};
  $$("[data-v]").forEach(b=>b.onclick=()=>{C.venc=b.dataset.v;render(true)});
  $$("[data-p]").forEach(b=>b.onclick=()=>{C.q2[b.dataset.p]=(C.q2[b.dataset.p]||0)+1;render(true)});
  $$("[data-m]").forEach(b=>b.onclick=()=>{C.q2[b.dataset.m]=Math.max(0,(C.q2[b.dataset.m]||0)-1);render(true)});
  $$("[data-add]").forEach(b=>b.onclick=()=>{C.q2[b.dataset.add]=(C.q2[b.dataset.add]||0)+1;C.menu=false;render(true)});
  $("#addp").onclick=()=>{C.menu=!C.menu;C.nuevo=false;render(true)};
  if($("#np"))$("#np").onclick=()=>{C.nuevo=true;render(true);$("#np1").focus()};
  if($("#npok"))$("#npok").onclick=()=>{const n=$("#np1").value.trim(),v=+$("#np2").value.replace(/\D/g,"");if(!n||!v){toast("Poné el nombre y el precio");return}
   const k="p"+Date.now();PRODS.push({k,n,p:v});C.q2[k]=1;C.menu=false;C.nuevo=false;render(true);toast(`${n} agregado a la lista de productos`)};
  if($("#cef"))$("#cef").onchange=e=>{C.ef=+e.target.value.replace(/\D/g,"")||0;render(true)};
  $("#guardar").onclick=()=>{const s=C.n?BYN.get(C.n):null,cu=CUOTAS.find(c=>c.k===C.cuota);
   const items=[];if(cu)items.push({n:cu.n,p:cu.p,cat:cu.k==="gratis"?"gratis":"cuota"});PRODS.forEach(p=>{for(let i=0;i<(C.q2[p.k]||0);i++)items.push({n:p.n,p:p.p,cat:"prod"})});
   const tot=items.reduce((a,i)=>a+i.p,0),ef=C.metodo==="efectivo"?tot:C.metodo==="transf"?0:Math.min(C.ef,tot),now=new Date();
   const fp=C.fecha?iso(C.fecha):TODAY(),cob={id:nid(),n:s?s.n:null,f:fp,h:now,items,ef,tr:tot-ef};COB.push(cob);
   let dupMsg="";if(s&&cob.tr>0){const t=TRF.find(t=>t.estado==="pend"&&t.n===s.n&&t.monto===cob.tr);if(t){t.estado="manual";t.cob=cob;cob.linked=true;dupMsg=` · La transferencia de ${title(t.nombre)} quedó marcada como ya cobrada`}}
   if(s&&cu){const vencida=s.venc&&dias(s)<0,mode=C.venc==="auto"?(s.venc&&!vencida?"suyo":"hoy"):C.venc;const vs=s.venc&&addD(s.venc,30);s.venc=mode==="suyo"&&vs&&vs>fp?vs:addD(fp,30);cob.vto=s.venc;if(!s.ult||fp>=s.ult)s.ult=fp}
   toast(`Cobro de ${ars(tot)} guardado a las ${hhmm(now)}${s&&cu?` · ${s.nom.split(" ")[0]} vence el ${fmt(s.venc)}`:""}${dupMsg}`);STATE.C=null;render(true)}}
 if(cur==="mp"){const T=id=>TRF.find(t=>t.id===+id);
  $$("[data-tok]").forEach(b=>b.onclick=()=>{const t=T(b.dataset.tok),s=BYN.get(t.n);cobrarTrf(t,s);toast(`Cobro de ${s.nom} registrado · vence el ${fmt(s.venc)}`);render(true)});
  $$("[data-tno]").forEach(b=>b.onclick=()=>{const t=T(b.dataset.tno);t.n=null;t.por=null;render(true)});
  $$("[data-tsoc]").forEach(b=>b.onclick=()=>elegirSocio(T(b.dataset.tsoc)));
  $$("[data-tnew]").forEach(b=>b.onclick=()=>{const t=T(b.dataset.tnew);nuevo({nom:title(t.nombre),dni:t.cuil?dniDe(t.cuil):"",trf:t})});
  $$("[data-totro]").forEach(b=>b.onclick=()=>{const t=T(b.dataset.totro);cobrarTrf(t,null);toast("Marcada como \"No es del gym\": queda archivada y no suma en Facturación");render(true)});
  $$("[data-tya]").forEach(b=>b.onclick=()=>{const t=T(b.dataset.tya);t.estado="manual";toast("Listo: queda como ya cargada y no se cuenta dos veces");render(true)});
  $$("[data-mper]").forEach(b=>b.onclick=()=>{STATE.mper=b.dataset.mper;render(true)});
  if($("#tact"))$("#tact").onclick=()=>{toast("Buscando transferencias nuevas…");mpTraer()};
  if($("#tsim"))$("#tsim").onclick=()=>{const T0=new Date(),known=[...ALIAS.keys()];let e;const man=COB.find(c=>!c.imp&&!c.trf&&!c.linked&&c.n&&c.tr>0&&d0(c.f).getTime()===TODAY().getTime());
   if(man){const s=BYN.get(man.n);e={nombre:s.raw,cuil:s.dni?cuil(s.dni,s.gen==="Femenino"):null,origen:"Banco Galicia",monto:man.tr}}else
   if(known.length){const c=known[known.length-1],prev=TRF.find(t=>t.cuil===c);e={nombre:prev.nombre,cuil:c,origen:prev.origen,monto:prev.monto}}
   else{const s=SOC.find(x=>x.dni&&x.dni.length>=7&&est(x)==="late"&&!TRF.some(t=>t.n===x.n));e={nombre:s.raw,cuil:cuil(s.dni,s.gen==="Femenino"),origen:"Banco Macro",monto:47000}}
   const t={id:++TSEQ,...e,h:T0,estado:"pend",n:null,por:null};identificar(t);TRF.push(t);toast(`Nueva transferencia de ${title(t.nombre)} por ${ars(t.monto)}`);render(true)}}
 if(cur==="avisos"){const sel=STATE.avSel[STATE.av];
  $$("[data-at]").forEach(b=>b.onclick=()=>{STATE.av=b.dataset.at;render(true)});
  $$("[data-avi]").forEach(r=>r.onclick=()=>{const n=r.dataset.avi;sel.has(n)?sel.delete(n):sel.add(n);render(true)});
  $("#avall").onclick=e=>{e.stopPropagation();$$("[data-avi]").forEach(r=>e.target.checked?sel.add(r.dataset.avi):sel.delete(r.dataset.avi));render(true)};
  $("#avx").onclick=previewAv}
 $$("#main [data-edcob]").forEach(b=>b.onclick=e=>{e.stopPropagation();corregir(b.dataset.edcob)});
 if(cur==="fact"){$$("[data-per]").forEach(b=>b.onclick=()=>{STATE.per=b.dataset.per;render(true)});$("#expp").onclick=()=>{const{a,b,l}=periodo();descargar(`pagos_${l.replace(/[ ,\/]+/g,"_")}.xlsx`,"REGISTRO PAGOS",[["N° de socio","Nombre y apellido","Fecha de Pago","Hora","Monto","Efectivo","Transferencia","Método de Pago","Concepto","Mes Declarado","AÑO"],...COB.filter(c=>c.f>=a&&c.f<=b).sort((x,y)=>x.id-y.id).map(c=>{const s=BYN.get(c.n);return[c.n||"",s?s.raw:"VENTA MOSTRADOR",c.f,c.h?hhmm(c.h):"",c.ef+c.tr,c.ef,c.tr,c.ef&&c.tr?"MIXTO":c.ef?"EFECTIVO":c.tr?"TRANSFERENCIA":"PASE GRATIS",c.items.map(i=>i.n).join(" + "),MESES[c.f.getMonth()].toUpperCase(),c.f.getFullYear()]})],[10,32,12,8,10,10,12,15,24,12,6])}}
 if(cur==="gastos")bindGastos();
 if(cur==="ajustes")$("#gprec").onclick=()=>{const hoy=fmt(TODAY());
  $$("[data-pc]").forEach(i=>{const c=CUOTAS.find(x=>x.k===i.dataset.pc),v=+i.value.replace(/\D/g,"");if(v&&v!==c.p){PCAMB.unshift([hoy,c.n,ars(c.p)+" → "+ars(v)]);c.p=v}});
  $$("[data-pp]").forEach(i=>{const p=PRODS.find(x=>x.k===i.dataset.pp),v=+i.value.replace(/\D/g,"");if(v&&v!==p.p){PCAMB.unshift([hoy,p.n,ars(p.p)+" → "+ars(v)]);p.p=v}});
  render(true);toast("Precios guardados")};
}
(function(){const tp=document.createElement("div");tp.className="tip";tp.hidden=true;document.body.appendChild(tp);let on=null;
 const place=(x,y)=>{const r=tp.getBoundingClientRect(),W=innerWidth;let l=x+14,t=y-r.height-12;if(l+r.width>W-8)l=x-r.width-14;if(l<8)l=8;if(t<8)t=y+18;tp.style.left=l+"px";tp.style.top=t+"px"};
 const show=(el,x,y)=>{if(on)on.classList.remove("on");on=el;el.classList.add("on");tp.innerHTML=el.dataset.tip;tp.hidden=false;place(x,y)};
 const hide=()=>{tp.hidden=true;if(on)on.classList.remove("on");on=null};
 document.addEventListener("mousemove",e=>{const el=e.target.closest&&e.target.closest("[data-tip]");if(el)show(el,e.clientX,e.clientY);else if(on)hide()});
 document.addEventListener("click",e=>{const el=e.target.closest&&e.target.closest("[data-tip]");if(el){const r=el.getBoundingClientRect();show(el,r.left+r.width/2,r.top+20)}else hide()});
 addEventListener("scroll",hide,{passive:true})})();
const KEY="awg-estado-v1";
const rev=x=>x?new Date(x):null;
/* ---- sincronización con Supabase ---- */
const stable=v=>v===null||typeof v!=="object"?JSON.stringify(v):v instanceof Date?JSON.stringify(v):Array.isArray(v)?"["+v.map(x=>x===undefined?"null":stable(x)).join(",")+"]":"{"+Object.keys(v).filter(k=>v[k]!==undefined).sort().map(k=>JSON.stringify(k)+":"+stable(v[k])).join(",")+"}";
const plano=o=>JSON.parse(JSON.stringify(o));
let SNAP=new Map(),syncT=null,syncing=false,syncAgain=false;
function coleccion(){const m=new Map(),put=(col,id,o)=>{const j=stable(o);m.set(col+"|"+id,{col,id:String(id),get data(){return JSON.parse(j)},j})};
 SOC.forEach(s=>put("soc",s.n,s));COB.forEach(c=>put("cob",c.id,{...c,cob:undefined}));INGRESOS.forEach(i=>put("ing",i.id,i));
 Object.entries(GMES).forEach(([mes,L])=>L.forEach(g=>put("gas",mes+"|"+g.id,{...g,mes})));
 put("cfg","cuotas",{v:CUOTAS});put("cfg","prods",{v:PRODS});put("cfg","pcamb",{v:PCAMB});put("cfg","gtpl",{v:GTPL});
 if(window.__sb){AVI.forEach(a=>put("avi",a.id,a));TRF.forEach(t=>put("trf",t.id,{...t,cob:t.cob?t.cob.id:null}));put("cfg","alias",{v:[...ALIAS]});if(MPDESDE)put("cfg","mpdesde",{v:MPDESDE})}return m}
function estado(t){SYNC_TXT=t;const e=$("#sync");if(e)e.textContent=t}
async function sincronizar(){if(syncing){syncAgain=true;return}syncing=true;const sb=window.__sb;
 try{const cur=coleccion(),ups=[],dels=[];cur.forEach((v,k)=>{if(SNAP.get(k)!==v.j)ups.push(v)});SNAP.forEach((_,k)=>{if(!cur.has(k))dels.push(k)});
  if(!ups.length&&!dels.length){syncing=false;return}
  estado(ups.length>200?`Subiendo ${ups.length} registros…`:"Guardando…");
  for(let i=0;i<ups.length;i+=400){const lote=ups.slice(i,i+400);const{error}=await sb.from("registros").upsert(lote.map(v=>({col:v.col,id:v.id,data:v.data,updated_at:new Date().toISOString()})));if(error)throw error;lote.forEach(v=>SNAP.set(v.col+"|"+v.id,v.j))}
  for(const k of dels){const i=k.indexOf("|"),{error}=await sb.from("registros").delete().eq("col",k.slice(0,i)).eq("id",k.slice(i+1));if(error)throw error;SNAP.delete(k)}
  estado("✓ Guardado "+hhmm(new Date()))}
 catch(e){console.error(e);estado("⚠ Sin conexión · reintentando");setTimeout(programar,8000)}
 syncing=false;if(syncAgain){syncAgain=false;programar()}}
function programar(){clearTimeout(syncT);syncT=setTimeout(sincronizar,500)}
function hidratarDB(rows){rows.forEach(r=>SNAP.set(r.col+"|"+r.id,stable(r.data)));if(!rows.length)return;
 const by=c=>rows.filter(r=>r.col===c).map(r=>r.data);
 SOC.length=0;by("soc").forEach(s=>{s.nac=revD(s.nac);s.venc=revD(s.venc);s.ult=revD(s.ult);SOC.push(s)});SOC.sort((a,b)=>a.n.localeCompare(b.n));BYN.clear();SOC.forEach(s=>BYN.set(s.n,s));
 COB.length=0;by("cob").forEach(c=>{c.f=revD(c.f);c.h=rev(c.h);COB.push(c)});COB.sort((a,b)=>a.id-b.id);
 INGRESOS=by("ing").map(i=>({...i,t:new Date(i.t)})).sort((a,b)=>b.t-a.t);
 Object.keys(GMES).forEach(k=>delete GMES[k]);by("gas").forEach(g=>{const m=g.mes;delete g.mes;(GMES[m]=GMES[m]||[]).push(g)});
 const cf=Object.fromEntries(rows.filter(r=>r.col==="cfg").map(r=>[r.id,r.data.v]));
 if(cf.cuotas)CUOTAS.splice(0,CUOTAS.length,...cf.cuotas);if(cf.prods)PRODS.splice(0,PRODS.length,...cf.prods);if(cf.pcamb)PCAMB.splice(0,PCAMB.length,...cf.pcamb);if(cf.gtpl)GTPL.splice(0,GTPL.length,...cf.gtpl);
 if(cf.alias){ALIAS.clear();cf.alias.forEach(([k,v])=>ALIAS.set(k,v))}if(cf.mpdesde)MPDESDE=cf.mpdesde;
 AVI=by("avi").map(a=>({...a,f:new Date(a.f),venc:revD(a.venc)}));
 TRF.length=0;by("trf").forEach(t=>{t.h=rev(t.h);if(t.cob)t.cob=COB.find(c=>c.id===t.cob)||null;TRF.push(t)});
 // las filas de la base reemplazan al estado local: los snapshots quedan con el formato de la base
 coleccion().forEach((v,k)=>{if(SNAP.has(k))SNAP.set(k,v.j)})}
function aplicar(p){const r=p.new&&p.new.col?p.new:p.old;if(!r||!r.col)return;const k=r.col+"|"+r.id;
 if(p.eventType==="DELETE"){if(!SNAP.has(k))return;SNAP.delete(k);
  if(r.col==="soc"){const i=SOC.findIndex(s=>s.n===r.id);if(i>=0){SOC.splice(i,1);BYN.delete(r.id)}}
  else if(r.col==="cob"){const i=COB.findIndex(c=>String(c.id)===r.id);if(i>=0)COB.splice(i,1)}
  else if(r.col==="ing")INGRESOS=INGRESOS.filter(x=>String(x.id)!==r.id);
  else if(r.col==="avi")AVI=AVI.filter(a=>String(a.id)!==r.id);
  else if(r.col==="trf"){const i=TRF.findIndex(t=>String(t.id)===r.id);if(i>=0)TRF.splice(i,1)}
  else if(r.col==="gas"){const j=r.id.indexOf("|"),m=r.id.slice(0,j),id=r.id.slice(j+1);if(GMES[m])GMES[m]=GMES[m].filter(g=>String(g.id)!==id)}
  refrescar();return}
 const d=r.data,j=stable(d);if(SNAP.get(k)===j)return;SNAP.set(k,j);
 if(r.col==="soc"){d.nac=revD(d.nac);d.venc=revD(d.venc);d.ult=revD(d.ult);const s=BYN.get(r.id);if(s)Object.assign(s,d);else{SOC.push(d);BYN.set(d.n,d)}}
 else if(r.col==="cob"){d.f=revD(d.f);d.h=rev(d.h);const c=COB.find(x=>String(x.id)===r.id);if(c)Object.assign(c,d);else{COB.push(d);COB.sort((a,b)=>a.id-b.id)}}
 else if(r.col==="ing"){d.t=new Date(d.t);const i=INGRESOS.find(x=>String(x.id)===r.id);if(i)Object.assign(i,d);else{INGRESOS.push(d);INGRESOS.sort((a,b)=>b.t-a.t)}}
 else if(r.col==="gas"){const m=d.mes;delete d.mes;const L=GMES[m]=GMES[m]||[],g=L.find(x=>String(x.id)===String(d.id));if(g)Object.assign(g,d);else L.push(d)}
 else if(r.col==="avi"){d.f=new Date(d.f);d.venc=revD(d.venc);const a=AVI.find(x=>String(x.id)===r.id);if(a)Object.assign(a,d);else AVI.push(d)}
 else if(r.col==="trf"){d.h=rev(d.h);d.cob=d.cob?COB.find(c=>c.id===d.cob)||null:null;const t=TRF.find(x=>String(x.id)===r.id);if(t)Object.assign(t,d);else TRF.push(d)}
 else if(r.col==="cfg"){const A={cuotas:CUOTAS,prods:PRODS,pcamb:PCAMB,gtpl:GTPL}[r.id];if(A)A.splice(0,A.length,...d.v);if(r.id==="alias"){ALIAS.clear();d.v.forEach(([k,v])=>ALIAS.set(k,v))}if(r.id==="mpdesde")MPDESDE=d.v}
 const v=coleccion().get(k);if(v)SNAP.set(k,v.j);refrescar()}
let refT=null;function refrescar(){clearTimeout(refT);refT=setTimeout(()=>{const a=document.activeElement;if($("#modal").innerHTML||(a&&/INPUT|TEXTAREA/.test(a.tagName))){refrescar();return}render(true)},400)}
function guardar(){if(window.__sb){programar();return}if(window.__vista)return;try{localStorage.setItem(KEY,JSON.stringify({base:DATA.pag.length+":"+DATA.soc.length,soc:SOC,cob:COB.map(c=>({...c,cob:undefined})),ing:INGRESOS,gm:GMES,gt:GTPL,cu:CUOTAS,pr:PRODS,pc:PCAMB,al:[...ALIAS],trf:TRF.map(t=>({...t,cob:t.cob?t.cob.id:null})),seq:SEQ,tseq:TSEQ,gid:GID}))}catch(e){}}
function cargar(){if(window.__vista)return false;let j;try{j=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){return false}
 if(!j||j.base!==DATA.pag.length+":"+DATA.soc.length)return false;
 SOC.length=0;j.soc.forEach(s=>{s.nac=revD(s.nac);s.venc=revD(s.venc);s.ult=revD(s.ult);SOC.push(s)});BYN.clear();SOC.forEach(s=>BYN.set(s.n,s));
 COB.length=0;j.cob.forEach(c=>{c.f=revD(c.f);c.h=rev(c.h);COB.push(c)});INGRESOS=j.ing.map(i=>({...i,t:new Date(i.t)}));
 Object.keys(GMES).forEach(k=>delete GMES[k]);Object.assign(GMES,j.gm);GTPL.splice(0,GTPL.length,...j.gt);CUOTAS.splice(0,CUOTAS.length,...j.cu);PRODS.splice(0,PRODS.length,...j.pr);PCAMB.splice(0,PCAMB.length,...j.pc);
 ALIAS.clear();j.al.forEach(([k,v])=>ALIAS.set(k,v));TRF.length=0;j.trf.forEach(t=>{t.h=rev(t.h);if(t.cob)t.cob=COB.find(c=>c.id===t.cob);TRF.push(t)});
 SEQ=j.seq;TSEQ=j.tseq;GID=j.gid;return true}
document.documentElement.dataset.skin="oro";
if(window.__sb){window.__perf={coleccion,stable,hidratarDB,V,SNAP:()=>SNAP,render};{const t0=performance.now();hidratarDB(window.__rows||[]);window.__perf.hid=performance.now()-t0}window.__sb.channel("registros").on("postgres_changes",{event:"*",schema:"public",table:"registros"},aplicar).subscribe();mpIniciar()}
else if(!cargar())seedTRF();
render();
