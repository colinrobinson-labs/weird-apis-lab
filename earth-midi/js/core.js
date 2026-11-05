/* Earth MIDI v0.5 · core: helpers, settings, state, live data, astronomy.
   Every number here is either fetched from a public sensor feed or computed
   from published physics. Nothing is generated or guessed by a model. */
"use strict";
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,map=(v,a,b,c,d)=>lerp(c,d,clamp((v-a)/(b-a),0,1));
const DPR=Math.min(2,window.devicePixelRatio||1);
const VERSION="0.5";
const IS_MOBILE=matchMedia("(max-width:700px)").matches;

/* ================= layers ================= */
// key, name, colour, what it measures
const LAYERS=[
 ["q","Earthquakes","#ff5a3c"],["s","Solar wind","#ffc53d"],["o","Ocean swell","#3cc8ff"],["x","Solar X-rays","#c77dff"],
 ["w","Jet stream","#9ad1ff"],["t","Tides","#4dd6c1"],["c","Planet chord","#ff8fd1"],["i","Space station","#e8f4ff"],
 ["e","Fires, storms, volcanoes","#ff9f43"],["g","Magnetosphere","#7cff9e"],["a","Air","#d6c08f"],["u","Sunrise chorus","#ffd27a"],
 ["r","Pulse drums + bass","#f2f2f2"]];
const COLS=Object.fromEntries(LAYERS.map(l=>[l[0],l[2]]));COLS.m="#d9dce6";COLS.b="#f2f2f2";
const LNAME=Object.fromEntries(LAYERS.map(l=>[l[0],l[1]]));

/* ================= producer settings ================= */
const SCALES={auto:null,majpent:[0,2,4,7,9],minpent:[0,3,5,7,10],dorian:[0,2,3,5,7,9,10],lydian:[0,2,4,6,7,9,11],mixo:[0,2,4,5,7,9,10],phrygian:[0,1,3,5,7,8,10],aeolian:[0,2,3,5,7,8,10],ionian:[0,2,4,5,7,9,11],harmmin:[0,2,3,5,7,8,11],hirajoshi:[0,2,3,7,8],insen:[0,1,5,7,10],pelog:[0,1,3,7,8],blues:[0,3,5,6,7,10],wholetone:[0,2,4,6,8,10],chromatic:[0,1,2,3,4,5,6,7,8,9,10,11]};
const KEYS=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const REGIONS={world:null,ring:[[-60,90,100,180],[-60,90,-180,-60]],americas:[[-60,75,-170,-30]],asia:[[-50,60,60,180]],eurmed:[[25,72,-25,60]],alaska:[[50,72,-180,-130]],california:[[32,42,-125,-114]],japan:[[24,46,122,150]],indo:[[-12,8,94,142]],andes:[[-56,12,-82,-62]]};
const PROGS={classic:[[0,2,4,7],[5,7,9,12],[3,5,7,10],[4,6,8,11]],minor:[[0,2,4,7],[5,7,9,12],[2,4,6,9],[6,8,10,13]],modal:[[0,2,4,7],[1,3,5,8],[0,2,4,7],[6,8,10,13]],drone:[[0,4,7,11],[0,4,7,11],[0,4,7,11],[0,4,7,11]],rising:[[0,2,4,7],[1,3,5,8],[2,4,6,9],[3,5,7,10]],kp:null};
const PAN_KEYS=["q","s","o","x","w","t","c","r","i","e","g","a","u"];
const DEF={
  key:2,oct:0,scale:"auto",tune:440,prog:"classic",chordEvery:8,
  qpitch:"depth",qpan:"lon",mmin:0,region:"world",vcurve:"linear",velMin:20,velMax:127,len:1,dens:12,qoct:0,quant:false,humanize:0,
  inst:{q:"bell",s:"saw",c:"voices",i:"pluck",u:"chime"},
  bpmMin:112,bpmMax:134,bpmLock:0,swing:0,hats:1,pattern:"four",duck:.45,fills:true,
  rev:-1,revType:"hall",dtime:"0.375",dfb:.38,mlp:20000,hpf:20,drive:.2,width:1,lowEq:0,highEq:0,coct:0,
  vol:{q:1,s:1,o:1,x:1,w:1,t:1,c:1,r:1,i:.8,e:.9,g:.9,a:1,u:.9},
  send:{q:.7,s:.5,o:.4,x:.5,w:.45,t:.45,c:.45,r:.12,i:.55,e:.4,g:.5,a:.4,u:.65},
  ch:{q:1,s:2,o:3,x:4,w:5,t:6,c:7,m:8,b:9,d:10,i:11,e:12,g:13,a:14,u:15},
  clock:false,loop:false,playAlong:false,mapView:"globe",spin:true
};
const clone=o=>JSON.parse(JSON.stringify(o));
function mergeCFG(src){const c=clone(DEF);if(!src)return c;for(const k in src){if(c[k]&&typeof c[k]==="object"&&!Array.isArray(c[k]))Object.assign(c[k],src[k]);else if(k in c)c[k]=src[k]}return c}
let CFG=clone(DEF);
try{const sv=localStorage.getItem("em5.cfg");if(sv)CFG=mergeCFG(JSON.parse(sv))}catch(_){}
const getP=(o,k)=>k.split(".").reduce((a,b)=>a==null?a:a[b],o),setP=(o,k,v)=>{const ks=k.split(".");ks.slice(0,-1).reduce((a,b)=>a[b],o)[ks.at(-1)]=v};
const CH=k=>CFG.ch[k]||1;

/* ================= state ================= */
const S={quakes:[],jet:[],tides:[],temps:[],air:[],sun:{speed:[],density:[],bz:[],bt:[],t:[],mt:[]},kp:[],dst:[],protons:[],ocean:[],xray:[],events:[],iss:null,demo:{},land:null,
  played:new Set(),rings:[],notes:[],on:false,mode:180,replayStart:0,replayFrom:0,liveSince:0,
  mute:Object.fromEntries(PAN_KEYS.map(k=>[k,false])),solo:null,hit:Object.fromEntries([...PAN_KEYS,"m"].map(k=>[k,0])),style:"ambient",cur:{},sunState:{},evPlayed:new Set()};
const OCEAN_PTS=[["N Pacific",30,-150],["Gulf of Alaska",55,-145],["N Atlantic",50,-30],["S Atlantic",-35,-20],["Cape of Good Hope",-38,20],["S Indian",-40,80],["Bay of Bengal",14,88],["Tasman Sea",-38,160],["Southern Ocean",-55,-90],["Philippine Sea",20,135]];
const JET_PTS=[["N Atlantic",45,-40],["N Pacific",38,165],["N America",42,-95],["Eurasia",45,70],["S Indian",-45,90],["S Pacific",-45,-120]];
const CITIES=[["Reykjavík",64.14,-21.9],["Anchorage",61.2,-149.9],["Tokyo",35.68,139.69],["Los Angeles",34.05,-118.24],["Cairo",30.04,31.24],["Mumbai",19.08,72.88],["Singapore",1.35,103.82],["Nairobi",-1.29,36.82],["São Paulo",-23.55,-46.63],["Sydney",-33.87,151.21]];
const TIDE_ST=[["La Jolla","9410230",32.87,-117.26],["The Battery, NY","8518750",40.7,-74.01],["Honolulu","1612340",21.31,-157.87]];
// Sunrise chorus: big metro areas (approx. population, millions) + a few iconic places
const SUN_CITIES=[["Tokyo",35.68,139.69,37],["Delhi",28.61,77.21,33],["Shanghai",31.23,121.47,29],["Dhaka",23.81,90.41,23],["São Paulo",-23.55,-46.63,22],["Mexico City",19.43,-99.13,22],["Cairo",30.04,31.24,22],["Beijing",39.9,116.4,22],["Mumbai",19.08,72.88,21],["Osaka",34.69,135.5,19],["New York",40.71,-74.01,19],["Karachi",24.86,67.01,17],["Kinshasa",-4.44,15.27,17],["Lagos",6.52,3.38,16],["Istanbul",41.01,28.98,16],["Buenos Aires",-34.6,-58.38,15],["Kolkata",22.57,88.36,15],["Manila",14.6,120.98,15],["Rio de Janeiro",-22.91,-43.17,14],["Guangzhou",23.13,113.26,14],["Los Angeles",34.05,-118.24,12],["Moscow",55.76,37.62,12.6],["Paris",48.86,2.35,11],["Jakarta",-6.21,106.85,11],["Lima",-12.05,-77.04,11],["Bangkok",13.76,100.5,11],["Bogotá",4.71,-74.07,11],["Seoul",37.57,126.98,10],["London",51.51,-0.13,9.6],["Tehran",35.69,51.39,9.5],["Riyadh",24.71,46.68,7.7],["Santiago",-33.45,-70.67,6.9],["Madrid",40.42,-3.7,6.7],["Toronto",43.65,-79.38,6.3],["Singapore",1.35,103.82,6],["Johannesburg",-26.2,28.05,6],["Sydney",-33.87,151.21,5.3],["Nairobi",-1.29,36.82,5],["San Diego",32.72,-117.16,3.3],["Auckland",-36.85,174.76,1.7],["Honolulu",21.31,-157.86,1],["Reykjavík",64.14,-21.9,.24]];

/* ================= fetch helpers ================= */
async function getJSON(u,ms=20000){const ac=new AbortController(),to=setTimeout(()=>ac.abort(),ms);try{const r=await fetch(u,{cache:"no-store",signal:ac.signal});if(!r.ok)throw new Error(r.status);return await r.json()}finally{clearTimeout(to)}}
async function getText(u,ms=20000){const ac=new AbortController(),to=setTimeout(()=>ac.abort(),ms);try{const r=await fetch(u,{cache:"no-store",signal:ac.signal});if(!r.ok)throw new Error(r.status);return await r.text()}finally{clearTimeout(to)}}
const rows=j=>Array.isArray(j)&&Array.isArray(j[0])?j.slice(1).map(r=>Object.fromEntries(j[0].map((k,i)=>[k,r[i]]))):(Array.isArray(j)?j:[]);
const num=v=>v===null||v===undefined||v===""?NaN:+v;
const swpcT=s=>Date.parse(String(s).replace(" ","T")+(/Z$|[+-]\d\d:?\d\d$/.test(String(s))?"":"Z"));
const wave=(n,b,a)=>Array.from({length:n},(_,i)=>b+a*Math.sin(i/9)+a*.35*Math.sin(i*.73));
const omTimes=a=>a.map(x=>Date.parse(x+"Z"));
const arr=j=>Array.isArray(j)?j:[j];

/* ================= loaders (each falls back to clearly-labelled demo data) ================= */
async function loadQuakes(){
  try{const j=await getJSON("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson");
    const fresh=j.features.map(f=>({id:f.id,mag:f.properties.mag??0,place:f.properties.place||"",time:f.properties.time,lon:f.geometry.coordinates[0],lat:f.geometry.coordinates[1],depth:Math.max(0,f.geometry.coordinates[2]||0),url:f.properties.url,tsunami:f.properties.tsunami,felt:f.properties.felt}));
    const known=new Set(S.quakes.map(q=>q.id));fresh.forEach(q=>{if(!known.has(q.id))S.quakes.push(q)});S.quakes.sort((a,b)=>a.time-b.time);
    S.quakes=S.quakes.filter(q=>q.time>Date.now()-864e5*1.05);S.demo.q=false;
  }catch(e){if(!S.quakes.length){S.quakes=demoQuakes();S.demo.q=true}}
}
function demoQuakes(){const now=Date.now(),a=[];for(let i=0;i<200;i++){const r=Math.random(),belt=r<.4?[35+Math.random()*25,-125+Math.random()*-30]:r<.7?[-10+Math.random()*50,120+Math.random()*30]:[-40+Math.random()*50,-75+Math.random()*8];
  a.push({id:"d"+i,mag:+(Math.random()**2.2*5.8+.6).toFixed(1),place:"demo data",time:now-864e5+i*432e3,lat:belt[0],lon:belt[1],depth:Math.random()**2*400})}return a}
async function loadSun(){
  try{const [p,m]=await Promise.all([getJSON("https://services.swpc.noaa.gov/products/solar-wind/plasma-1-day.json"),getJSON("https://services.swpc.noaa.gov/products/solar-wind/mag-1-day.json")]);
    const P=rows(p).filter(r=>Number.isFinite(num(r.speed))),M=rows(m).filter(r=>Number.isFinite(num(r.bz_gsm??r.bz)));
    S.sun.t=P.map(r=>swpcT(r.time_tag));S.sun.speed=P.map(r=>num(r.speed));S.sun.density=P.map(r=>num(r.density));
    S.sun.mt=M.map(r=>swpcT(r.time_tag));S.sun.bz=M.map(r=>num(r.bz_gsm??r.bz));S.sun.bt=M.map(r=>num(r.bt));S.demo.s=false;
  }catch(e){if(!S.sun.speed.length){const n=288,t0=Date.now()-864e5;S.sun.t=S.sun.mt=[...Array(n)].map((_,i)=>t0+i*3e5);S.sun.speed=wave(n,430,60);S.sun.density=wave(n,5,3).map(v=>Math.max(.5,v));S.sun.bz=wave(n,-1,5);S.sun.bt=wave(n,6,2);S.demo.s=true}}
  try{const k=rows(await getJSON("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"));S.kp=k.map(r=>({t:swpcT(r.time_tag),v:num(r.Kp??r.kp_index??r.kp)})).filter(r=>Number.isFinite(r.v)&&Number.isFinite(r.t));S.demo.k=false}
  catch(e){if(!S.kp.length){S.kp=[...Array(8)].map((_,i)=>({t:Date.now()-(8-i)*108e5,v:2+Math.sin(i)}));S.demo.k=true}}
}
async function loadXray(){
  try{const j=await getJSON("https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json");
    S.xray=j.filter(r=>r.energy==="0.1-0.8nm"&&r.flux>0).map(r=>({t:Date.parse(r.time_tag),v:r.flux}));S.demo.x=false}
  catch(e){if(!S.xray.length){const t0=Date.now()-864e5;S.xray=[...Array(288)].map((_,i)=>({t:t0+i*3e5,v:Math.pow(10,-6.3+.4*Math.sin(i/30)+(i===200?1.2:0))}));S.demo.x=true}}
}
async function loadMag(){
  // Dst: Kyoto World Data Center ring-current index via NOAA SWPC (nT; negative = geomagnetic storm)
  try{const d=rows(await getJSON("https://services.swpc.noaa.gov/products/kyoto-dst.json"));S.dst=d.map(r=>({t:swpcT(r.time_tag),v:num(r.dst)})).filter(r=>Number.isFinite(r.v)&&Number.isFinite(r.t)).filter(r=>r.t>Date.now()-864e5*2);S.demo.dst=false}
  catch(e){if(!S.dst.length){const t0=Date.now()-864e5;S.dst=[...Array(25)].map((_,i)=>({t:t0+i*36e5,v:-12+8*Math.sin(i/4)}));S.demo.dst=true}}
  // GOES integral protons >=10 MeV (particle flux units)
  try{const j=await getJSON("https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json");S.protons=j.filter(r=>r.energy===">=10 MeV"&&r.flux>0).map(r=>({t:Date.parse(r.time_tag),v:r.flux}));if(!S.protons.length)throw 0;S.demo.p=false}
  catch(e){if(!S.protons.length){const t0=Date.now()-864e5;S.protons=[...Array(288)].map((_,i)=>({t:t0+i*3e5,v:.3+.1*Math.sin(i/20)}));S.demo.p=true}}
}
async function loadOcean(){
  try{const j=arr(await getJSON(`https://marine-api.open-meteo.com/v1/marine?latitude=${OCEAN_PTS.map(p=>p[1])}&longitude=${OCEAN_PTS.map(p=>p[2])}&current=wave_height,wave_period,wave_direction&hourly=wave_height&past_days=1&forecast_days=1&timezone=GMT`));
    S.ocean=j.map((x,i)=>({name:OCEAN_PTS[i][0],lat:OCEAN_PTS[i][1],lon:OCEAN_PTS[i][2],h:x.current?.wave_height??0,p:x.current?.wave_period??8,dir:x.current?.wave_direction??0,ht:omTimes(x.hourly?.time||[]),hist:(x.hourly?.wave_height||[])}));S.demo.o=false;
  }catch(e){if(!S.ocean.length){const t0=Date.now()-864e5;S.ocean=OCEAN_PTS.map(p=>({name:p[0],lat:p[1],lon:p[2],h:1+Math.random()*4,p:6+Math.random()*8,dir:0,ht:[...Array(48)].map((_,k)=>t0+k*36e5),hist:wave(48,2,1)}));S.demo.o=true}}
}
async function loadJet(){
  try{const j=arr(await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${JET_PTS.map(p=>p[1])}&longitude=${JET_PTS.map(p=>p[2])}&hourly=wind_speed_250hPa,wind_direction_250hPa&past_days=1&forecast_days=1&timezone=GMT`));
    S.jet=j.map((x,i)=>({name:JET_PTS[i][0],lat:JET_PTS[i][1],lon:JET_PTS[i][2],t:omTimes(x.hourly.time),v:x.hourly.wind_speed_250hPa,d:x.hourly.wind_direction_250hPa}));S.demo.w=false}
  catch(e){if(!S.jet.length){const t0=Date.now()-864e5;S.jet=JET_PTS.map((p,i)=>({name:p[0],lat:p[1],lon:p[2],t:[...Array(48)].map((_,k)=>t0+k*36e5),v:wave(48,160+i*15,50),d:wave(48,260,20)}));S.demo.w=true}}
}
async function loadTemps(){
  try{const j=arr(await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${CITIES.map(p=>p[1])}&longitude=${CITIES.map(p=>p[2])}&hourly=temperature_2m&past_days=1&forecast_days=1&timezone=GMT`));
    S.temps=j.map((x,i)=>({name:CITIES[i][0],lat:CITIES[i][1],lon:CITIES[i][2],t:omTimes(x.hourly.time),v:x.hourly.temperature_2m}));S.demo.c=false}
  catch(e){if(!S.temps.length){const t0=Date.now()-864e5;S.temps=CITIES.map((p,i)=>({name:p[0],lat:p[1],lon:p[2],t:[...Array(48)].map((_,k)=>t0+k*36e5),v:wave(48,30-Math.abs(p[1])*.5,4)}));S.demo.c=true}}
}
async function loadAir(){
  try{const j=arr(await getJSON(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${CITIES.map(p=>p[1])}&longitude=${CITIES.map(p=>p[2])}&hourly=pm2_5,uv_index&past_days=1&forecast_days=1&timezone=GMT`));
    S.air=j.map((x,i)=>({name:CITIES[i][0],lat:CITIES[i][1],lon:CITIES[i][2],t:omTimes(x.hourly.time),pm:x.hourly.pm2_5,uv:x.hourly.uv_index}));S.demo.a=false}
  catch(e){if(!S.air.length){const t0=Date.now()-864e5;S.air=CITIES.map((p,i)=>({name:p[0],lat:p[1],lon:p[2],t:[...Array(48)].map((_,k)=>t0+k*36e5),pm:wave(48,15+i*3,6),uv:wave(48,3,3).map(v=>Math.max(0,v))}));S.demo.a=true}}
}
async function loadTides(){
  const res=await Promise.all(TIDE_ST.map(async st=>{try{const j=await getJSON(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?range=26&station=${st[1]}&product=water_level&datum=MLLW&units=metric&time_zone=gmt&format=json&application=earth_midi`);
      const d=(j.data||[]).filter(r=>r.v!=="");if(!d.length)throw 0;return {name:st[0],lat:st[2],lon:st[3],t:d.map(r=>Date.parse(r.t.replace(" ","T")+":00Z")),v:d.map(r=>+r.v),demo:false}}
    catch(e){const t0=Date.now()-864e5;return {name:st[0],lat:st[2],lon:st[3],t:[...Array(260)].map((_,k)=>t0+k*36e4),v:[...Array(260)].map((_,k)=>1+.8*Math.sin(k/260*2*Math.PI*1.93)),demo:true}}}));
  S.tides=res;S.demo.t=res.every(r=>r.demo);
}
/* NASA EONET: open natural events (wildfires, severe storms, volcanoes, ice) */
const EV_CAT={wildfires:["fire","#ff7a2e"],severeStorms:["storm","#9ad1ff"],volcanoes:["volcano","#ff3d2e"],seaLakeIce:["ice","#cfefff"],floods:["flood","#3c8cff"],earthquakes:["quake","#ff5a3c"],landslides:["landslide","#c8a26b"],dustHaze:["dust","#d6c08f"],snow:["snow","#ffffff"],tempExtremes:["heat","#ff4f7b"],drought:["drought","#e0a050"],manmade:["manmade","#bbbbbb"],waterColor:["water","#4dd6c1"]};
async function loadEvents(){
  try{const j=await getJSON("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=45",25000);
    S.events=(j.events||[]).map(e=>{const cat=(e.categories&&e.categories[0]&&e.categories[0].id)||"other",g=(e.geometry||[]),last=g[g.length-1]||{},first=g[0]||{};
      let c=last.coordinates;while(Array.isArray(c)&&Array.isArray(c[0]))c=c[0];
      return {id:e.id,title:e.title,cat,kind:(EV_CAT[cat]||["event"])[0],col:(EV_CAT[cat]||[0,"#ff9f43"])[1],lon:c?+c[0]:NaN,lat:c?+c[1]:NaN,start:Date.parse(first.date),last:Date.parse(last.date),mag:last.magnitudeValue,magU:last.magnitudeUnit,link:e.sources&&e.sources[0]&&e.sources[0].url}})
      .filter(e=>Number.isFinite(e.lat)&&Number.isFinite(e.lon));S.demo.e=false}
  catch(e){if(!S.events.length){S.events=[...Array(30)].map((_,i)=>({id:"de"+i,title:"demo event",cat:i%5?"wildfires":"severeStorms",kind:i%5?"fire":"storm",col:i%5?"#ff7a2e":"#9ad1ff",lat:-40+Math.random()*90,lon:-170+Math.random()*340,start:Date.now()-Math.random()*864e5*5,last:Date.now()}));S.demo.e=true}}
}
/* ISS: two-line orbital elements, propagated in the browser (two-body + J2 + drag term) */
async function loadISS(){
  let tle=null;
  try{const j=await getJSON("https://api.wheretheiss.at/v1/satellites/25544/tles?format=json");if(j.line1&&j.line2)tle=[j.line1,j.line2]}catch(_){}
  if(!tle)try{const t=(await getText("https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE")).trim().split(/\r?\n/).map(s=>s.trim());const l1=t.find(s=>s.startsWith("1 ")),l2=t.find(s=>s.startsWith("2 "));if(l1&&l2)tle=[l1,l2]}catch(_){}
  if(tle){S.iss=parseTLE(tle[0],tle[1]);S.iss.src="TLE";S.demo.i=false}
  else if(!S.iss){S.iss=parseTLE("1 25544U 98067A   26300.50000000  .00010000  00000-0  18000-3 0  9990","2 25544  51.6400 120.0000 0005000  90.0000 270.0000 15.50000000400000");S.iss.demoEpoch=true;S.demo.i=true}
  // independent live fix to show how far the model is from the measured position
  try{const p=await getJSON("https://api.wheretheiss.at/v1/satellites/25544");const m=issAt(p.timestamp*1000);S.iss.fix={lat:p.latitude,lon:p.longitude,alt:p.altitude,t:p.timestamp*1000,err:gcKm(m.lat,m.lon,p.latitude,p.longitude),vel:p.velocity}}catch(_){}
}
function parseTLE(l1,l2){const yy=+l1.slice(18,20),doy=+l1.slice(20,32),yr=yy<57?2000+yy:1900+yy;const epoch=Date.UTC(yr,0,1)+(doy-1)*864e5;
  return {epoch,ndot2:+l1.slice(33,43),inc:+l2.slice(8,16),raan:+l2.slice(17,25),ecc:+("0."+l2.slice(26,33).trim()),argp:+l2.slice(34,42),M:+l2.slice(43,51),n:+l2.slice(52,63),l1,l2}}
const D2R=Math.PI/180;
function issAt(t){const o=S.iss;if(!o)return null;const mu=398600.4418,Re=6378.137,J2=1.08262668e-3;
  const dtd=(t-o.epoch)/864e5,dts=dtd*86400,n0=o.n*2*Math.PI/86400,a=Math.cbrt(mu/(n0*n0)),e=o.ecc,i=o.inc*D2R,p=a*(1-e*e),k=1.5*J2*(Re/p)**2*n0;
  const raan=o.raan*D2R-k*Math.cos(i)*dts,argp=o.argp*D2R+k*(2-2.5*Math.sin(i)**2)*dts;
  let M=(o.M*D2R+2*Math.PI*(o.n*dtd+o.ndot2*dtd*dtd))%(2*Math.PI);let E=M;for(let j=0;j<8;j++)E=E-(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
  const nu=2*Math.atan2(Math.sqrt(1+e)*Math.sin(E/2),Math.sqrt(1-e)*Math.cos(E/2)),r=a*(1-e*Math.cos(E)),u=argp+nu;
  const x=r*(Math.cos(raan)*Math.cos(u)-Math.sin(raan)*Math.sin(u)*Math.cos(i)),y=r*(Math.sin(raan)*Math.cos(u)+Math.cos(raan)*Math.sin(u)*Math.cos(i)),z=r*Math.sin(u)*Math.sin(i);
  const jd=t/864e5+2440587.5,gmst=((280.46061837+360.98564736629*(jd-2451545))%360+360)%360;
  let lon=Math.atan2(y,x)/D2R-gmst;lon=((lon+540)%360)-180;const lat=Math.atan2(z,Math.hypot(x,y))/D2R;return {lat,lon,alt:r-Re}}
function gcKm(a,b,c,d){const p1=a*D2R,p2=c*D2R,dl=(d-b)*D2R;return 6371*Math.acos(clamp(Math.sin(p1)*Math.sin(p2)+Math.cos(p1)*Math.cos(p2)*Math.cos(dl),-1,1))}

async function loadLand(){try{const w=await getJSON("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json");S.land=topojson.feature(w,w.objects.land);if(window.onLand)onLand()}catch(_){}}

const DEMO_NAMES={q:"quakes",s:"solar wind",k:"Kp",x:"X-rays",o:"ocean",w:"jet stream",c:"city temps",t:"tides",dst:"Dst",p:"protons",a:"air quality",e:"NASA events",i:"ISS orbit"};
let lastRefresh=0;
async function refresh(full){
  const jobs=[loadQuakes(),loadSun(),loadXray(),loadMag(),loadOcean(),loadJet(),loadTemps(),loadTides(),loadAir()];
  if(full||!S.events.length||Date.now()-lastRefresh>6e5)jobs.push(loadEvents(),loadISS());
  await Promise.all(jobs);lastRefresh=Date.now();
  const d=Object.entries(S.demo).filter(([,v])=>v).map(([k])=>DEMO_NAMES[k]||k);
  if(!S.frozen)$("dataState").innerHTML=d.length?`<span class="warn">demo: ${d.join(", ")}</span> (source unreachable)`:`<span class="dot"></span>14 live feeds · updated ${new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`;
  if(window.onData)onData();
}

/* ================= time series helpers ================= */
function at(ts,vs,t){if(!vs||!vs.length)return NaN;let lo=0,hi=ts.length-1;if(t<=ts[0])return vs[0];if(t>=ts[hi])return vs[hi];while(hi-lo>1){const m=(lo+hi)>>1;ts[m]<=t?lo=m:hi=m}
  const a=vs[lo],b=vs[hi];if(!Number.isFinite(a))return b;if(!Number.isFinite(b))return a;return a+(b-a)*(t-ts[lo])/((ts[hi]-ts[lo])||1)}
const atP=(list,t)=>at(list.map(x=>x.t),list.map(x=>x.v),t);
const kpAt=t=>{let v=S.kp.length?S.kp[S.kp.length-1].v:2;for(const k of S.kp)if(k.t<=t)v=k.v;return v};
const xrayAt=t=>atP(S.xray,t),dstAt=t=>atP(S.dst,t),protAt=t=>atP(S.protons,t);
const tsAt=(o,t)=>at(o.t,o.v,t);
const flareClass=f=>!Number.isFinite(f)?"–":f>=1e-4?"X"+(f/1e-4).toFixed(1):f>=1e-5?"M"+(f/1e-5).toFixed(1):f>=1e-6?"C"+(f/1e-6).toFixed(1):f>=1e-7?"B"+(f/1e-7).toFixed(1):"A"+(f/1e-8).toFixed(1);
function jetAvg(t){const v=S.jet.map(p=>tsAt(p,t)).filter(Number.isFinite);return v.length?v.reduce((a,b)=>a+b,0)/v.length:NaN}
function tideNorm(o,t){const v=tsAt(o,t),mn=Math.min(...o.v),mx=Math.max(...o.v);return mx>mn?(v-mn)/(mx-mn)*2-1:0}
function airAt(t){if(!S.air.length)return {pm:NaN,uv:NaN};const pm=S.air.map(o=>at(o.t,o.pm,t)).filter(Number.isFinite),uv=S.air.map(o=>at(o.t,o.uv,t)).filter(Number.isFinite);
  return {pm:pm.length?pm.reduce((a,b)=>a+b,0)/pm.length:NaN,uv:uv.length?uv.reduce((a,b)=>a+b,0)/uv.length:NaN,pmMax:Math.max(...pm),worst:S.air.reduce((a,o)=>{const v=at(o.t,o.pm,t);return v>a[1]?[o.name,v]:a},["",-1])}}
function oceanAt(t){if(!S.ocean.length)return {h:0,p:8};let h=0,n=0;S.ocean.forEach(o=>{const v=at(o.ht,o.hist,t);if(Number.isFinite(v)){h+=v;n++}});return {h:n?h/n:S.ocean.reduce((a,b)=>a+b.h,0)/S.ocean.length,p:S.ocean.reduce((a,b)=>a+b.p,0)/S.ocean.length}}

/* ================= astronomy (computed, not fetched) ================= */
function moon(t){const syn=29.530588853,ref=Date.UTC(2000,0,6,18,14),age=(((t-ref)/864e5)%syn+syn)%syn,ph=age/syn;return {age,ph,illum:(1-Math.cos(2*Math.PI*ph))/2,name:ph<.03||ph>.97?"new moon":ph<.22?"waxing crescent":ph<.28?"first quarter":ph<.47?"waxing gibbous":ph<.53?"full moon":ph<.72?"waning gibbous":ph<.78?"last quarter":"waning crescent"}}
function sunPos(t){const d=new Date(t),doy=(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())-Date.UTC(d.getUTCFullYear(),0,0))/864e5,g=2*Math.PI/365*(doy-1+(d.getUTCHours()-12)/24);
  const decl=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
  const eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
  const mins=d.getUTCHours()*60+d.getUTCMinutes()+d.getUTCSeconds()/60;let lon=-(mins+eq-720)/4;lon=((lon+540)%360)-180;return {lat:decl*180/Math.PI,lon}}
function sunElev(lat,lon,sp){const a=lat*D2R,d=sp.lat*D2R,h=(lon-sp.lon)*D2R;return Math.asin(Math.sin(a)*Math.sin(d)+Math.cos(a)*Math.cos(d)*Math.cos(h))/D2R}

/* ================= time model ================= */
function realNow(){
  if(!S.on)return S.frozen?S.endT:Date.now();
  if(S.mode>0&&!S.liveSince){const el=(performance.now()-S.replayStart)/1000,frac=el/S.mode;
    if(frac>=1){if(CFG.loop||S.frozen){S.replayStart=performance.now();S.played.clear();S.evPlayed.clear();S.rings=[];S.sunState={};return S.replayFrom}S.liveSince=Date.now();setMode();return Date.now()}
    return S.replayFrom+frac*((S.endT||Date.now())-S.replayFrom)}
  return Date.now();
}
function setMode(){const el=$("modeLbl");if(!el)return;el.textContent=!S.on?"idle":S.mode>0&&!S.liveSince?`replaying the last 24h at ${Math.round(86400/S.mode)}× speed`:"LIVE · events play as the sensors publish them"}
function seekTo(frac){if(!S.on)return;frac=clamp(frac,0,.999);
  if(S.liveSince||S.mode===0){S.mode=S.mode||180;S.liveSince=0;S.endT=Date.now();S.replayFrom=S.endT-864e5}
  S.replayStart=performance.now()-frac*S.mode*1000;const t=realNow();
  S.played.clear();S.quakes.forEach(q=>{if(q.time<=t)S.played.add(q.id)});S.evPlayed.clear();S.events.forEach(e=>{if(e.start<=t)S.evPlayed.add(e.id)});S.rings=[];S.sunState={};setMode()}
