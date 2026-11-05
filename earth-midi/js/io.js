/* Earth MIDI v0.5 · export, import, save, share, credit, network ledger */
"use strict";
const CREDIT="Planetary data sonified with Earth MIDI by Colin Robinson · earthmidi.com";
const SOURCES="Data: USGS/ANSS earthquakes; NOAA SWPC real-time solar wind (DSCOVR/ACE/IMAP), Kp, Dst, GOES X-rays and protons; NOAA CO-OPS tides (all public domain); NASA EONET natural events (public domain); ISS orbital elements (NORAD via wheretheiss.at / CelesTrak); Open-Meteo weather, upper-air, marine and air quality (CC BY 4.0, open-meteo.com).";
const LICENSE="Free to use in music and media, commercial included. Credit required: "+CREDIT;
function xs(m){const e=$("xState");if(!e)return;e.textContent=m;e.classList.add("on");clearTimeout(xs.t);xs.t=setTimeout(()=>{e.textContent="";e.classList.remove("on")},4500)}
const stamp=()=>new Date().toISOString().slice(0,16).replace(/[-:T]/g,"").replace(/(\d{8})(\d{4})/,"$1-$2");
function download(name,blob){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000)}
let JSZipP=null;function zipLib(){return JSZipP||(JSZipP=new Promise((res,rej)=>{if(window.JSZip)return res(window.JSZip);const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";s.onload=()=>res(window.JSZip);s.onerror=rej;document.head.appendChild(s)}))}
const README_CREDIT=`CREDIT (required)\n${CREDIT}\n\nLICENSE\n${LICENSE}\n\n${SOURCES}\n`;

/* ================= Standard MIDI File writer (type 1) ================= */
const ascii=s=>String(s).replace(/·/g,"-").replace(/[–—−]/g,"-").replace(/…/g,"...").replace(/µ/g,"u").replace(/³/g,"3").replace(/°/g," deg").replace(/≥/g,">=").replace(/→/g,"->").replace(/×/g,"x").replace(/[^\x20-\x7e]/g,"");
function smf(tracks,tpq,bpm){const enc={encode:s=>new TextEncoder().encode(ascii(s))},out=[0x4D,0x54,0x68,0x64,0,0,0,6,0,1,(tracks.length>>8)&255,tracks.length&255,(tpq>>8)&255,tpq&255];
  tracks.forEach((tr,ti)=>{const b=[],vlq=n=>{n=Math.max(0,Math.round(n));const st=[n&127];while(n>>=7)st.unshift((n&127)|128);b.push(...st)},meta=(type,txt)=>{const d=enc.encode(txt);vlq(0);b.push(0xFF,type);vlq(d.length);b.push(...d)};
    meta(0x03,tr.name);if(ti===0){meta(0x02,"Earth MIDI by Colin Robinson. "+LICENSE);meta(0x01,CREDIT);meta(0x01,SOURCES);(tr.text||[]).forEach(t=>meta(0x01,t));const us=Math.round(60e6/bpm);vlq(0);b.push(0xFF,0x51,3,(us>>16)&255,(us>>8)&255,us&255);vlq(0);b.push(0xFF,0x58,4,4,2,24,8)}
    const ev=(tr.ev||[]).slice().sort((a,c)=>a[0]-c[0]||((a[1][0]&0xF0)===0x80?-1:1));let prev=0;ev.forEach(([tk,bytes])=>{tk=Math.max(0,Math.round(tk));vlq(tk-prev);prev=tk;b.push(...bytes)});vlq(0);b.push(0xFF,0x2F,0);
    out.push(0x4D,0x54,0x72,0x6B,(b.length>>>24)&255,(b.length>>>16)&255,(b.length>>>8)&255,b.length&255,...b)});
  return new Blob([new Uint8Array(out)],{type:"audio/midi"})}

/* ================= DATA-ONLY PACK: the planet's last 24h as MIDI notes + CC automation + tables. No sound. ================= */
function buildDataPack(opt){
  const bpm=opt.bpm,bars=opt.bars,tpq=480,beats=bars*4,T1=S.frozen?S.endT:Date.now(),T0=T1-864e5,ticks=beats*tpq,tk=t=>(t-T0)/864e5*ticks,step=tpq/4,nSteps=Math.floor(ticks/step);
  const tSt=i=>T0+i/nSteps*864e5,sc0=scaleFor(kpAt(T1));const tracks=[{name:"Earth MIDI data pack",text:[`Real time covered: ${new Date(T0).toISOString()} → ${new Date(T1).toISOString()} UTC`,`Mapping: 24 hours → ${bars} bars at ${bpm} bpm (1 bar = ${(1440/bars).toFixed(1)} real minutes)`,`Key ${KEYS[CFG.key]} · scale ${CFG.scale}`],ev:[]}];
  const rowsOut=[],chn=k=>CH(k)-1;
  // notes: earthquakes
  const qev=[];S.quakes.filter(q=>q.time>=T0&&passQ(q)).forEach(q=>{const {note}=quakeNote(q),v=velOf(q.mag),s=tk(q.time),len=Math.max(tpq/8,tpq*map(q.mag,0,7,.25,4));qev.push([s,[0x90|chn("q"),note&127,v]],[s+len,[0x80|chn("q"),note&127,0]])});
  tracks.push({name:"Earthquakes · pitch=depth, velocity=magnitude",ev:qev});
  // notes: flares (class crossings)
  const fev=[];let lastC=null;S.xray.forEach(x=>{if(x.t<T0)return;const c=flareClass(x.v)[0];if(lastC&&"CMX".includes(c)&&"ABCMX".indexOf(c)>"ABCMX".indexOf(lastC)){const s=tk(x.t),n=ROOT+24+{C:0,M:7,X:12}[c];fev.push([s,[0x90|chn("x"),n,{C:70,M:100,X:127}[c]]],[s+tpq*2,[0x80|chn("x"),n,0]])}lastC=c});
  tracks.push({name:"Solar flares · C/M/X class onsets",ev:fev});
  // notes: sunrise & sunset over 42 cities (computed astronomy)
  const uev=[];SUN_CITIES.forEach(cc=>{let prev=null;for(let i=0;i<=1440;i++){const t=T0+i*6e4,up=sunElev(cc[1],cc[2],sunPos(t))>-.833;if(prev!==null&&up!==prev){const n=degree(sc0,Math.round(map(cc[1],-40,65,1,12)),ROOT+12)+(up?0:-12),v=Math.round(map(Math.log10(cc[3]+.1),-.6,1.6,50,118)),s=tk(t);uev.push([s,[0x90|chn("u"),n&127,v]],[s+tpq,[0x80|chn("u"),n&127,0]])}prev=up}});
  tracks.push({name:"Sunrise (up) & sunset (octave down) · 42 cities",ev:uev});
  // notes: planet chord, one chord per bar
  const cev=[];for(let b=0;b<bars;b++){const t=T0+b/bars*864e5,s=b*4*tpq;S.temps.forEach(o=>{const T=tsAt(o,t);if(!Number.isFinite(T))return;const n=degree(sc0,Math.round(map(T,-30,45,0,sc0.length*3-1)),ROOT+12*CFG.coct);cev.push([s,[0x90|chn("c"),n&127,60]],[s+4*tpq-10,[0x80|chn("c"),n&127,0]])})}
  tracks.push({name:"Planet chord · 10 city temperatures, 1 chord per bar",ev:cev});
  // notes: new natural events (NASA EONET)
  const eev=[];S.events.filter(e=>e.start>=T0&&e.start<=T1).forEach(e=>{const n={fire:72,storm:67,volcano:48,ice:84}[e.kind]||60,s=tk(e.start);eev.push([s,[0x90|chn("e"),n,90]],[s+tpq,[0x80|chn("e"),n,0]])});
  tracks.push({name:"New natural events (fire C5 · storm G4 · volcano C3 · ice C6)",ev:eev});
  // CC automation lanes, one track each, sampled every 1/16 note
  const LANES=[["s",1,"Solar wind speed 250–900 km/s",t=>map(at(S.sun.t,S.sun.speed,t),250,900,0,127)],["s",2,"Solar wind density 0–30 p/cm³",t=>map(at(S.sun.t,S.sun.density,t),0,30,0,127)],["s",3,"Bz −20…+20 nT",t=>map(at(S.sun.mt,S.sun.bz,t),-20,20,0,127)],["s",4,"Kp 0–9",t=>map(kpAt(t),0,9,0,127)],
    ["o",5,"Ocean swell 0–8 m",t=>map(oceanAt(t).h,0,8,0,127)],["x",6,"X-ray flux log A1…X1",t=>map(Math.log10(xrayAt(t)||1e-8),-8,-4,0,127)],["w",7,"Jet stream 60–320 km/h",t=>map(jetAvg(t),60,320,0,127)],["t",8,"Tide La Jolla low→high",t=>S.tides.length?map(tideNorm(S.tides[0],t),-1,1,0,127):NaN],
    ["m",9,"Moon illumination 0–100%",t=>moon(t).illum*127],["a",14,"PM2.5 0–100 µg/m³",t=>map(airAt(t).pm,0,100,0,127)],["a",15,"UV index 0–11",t=>map(airAt(t).uv,0,11,0,127)],["i",16,"ISS latitude −52…+52°",t=>S.iss?map(issAt(t).lat,-52,52,0,127):NaN],["i",17,"ISS longitude −180…180°",t=>S.iss?map(issAt(t).lon,-180,180,0,127):NaN],
    ["g",23,"Dst storm depth (−20…−200 nT)",t=>map(-dstAt(t),-20,200,0,127)],["g",24,"Protons ≥10 MeV log",t=>map(Math.log10(protAt(t)||.1),-1,4,0,127)],["u",25,"People in daylight (42 cities)",t=>{const sp=sunPos(t);return map(SUN_CITIES.filter(cc=>sunElev(cc[1],cc[2],sp)>0).reduce((a,cc)=>a+cc[3],0),0,320,0,127)}]];
  LANES.forEach(([k,cc,label,f])=>{const ev=[];let last=-1;for(let i=0;i<nSteps;i++){const v=f(tSt(i));if(!Number.isFinite(v))continue;const vv=Math.round(clamp(v,0,127));if(vv!==last){ev.push([i*step,[0xB0|chn(k),cc,vv]]);last=vv}}tracks.push({name:`CC${cc} · ${label}`,ev})});
  // tide as pitch bend lane
  if(S.tides.length){const ev=[];for(let i=0;i<nSteps;i+=2){const v=Math.round(8192+tideNorm(S.tides[0],tSt(i))*8191*.25);ev.push([i*step,[0xE0|chn("t"),v&127,v>>7]])}tracks.push({name:"Pitch bend · tide (±25%)",ev})}
  // CSV of every step
  const head=["real_utc","bar","beat","sixteenth","solar_wind_kms","density_pcm3","bz_nt","kp","ocean_m","xray_wm2","flare_class","jet_kmh","tide_norm","moon_illum","pm25","uv","iss_lat","iss_lon","dst_nt","protons_pfu","people_in_daylight_m"];
  for(let i=0;i<nSteps;i+=4){const t=tSt(i),b=Math.floor(i/16),sp=sunPos(t),r=[new Date(t).toISOString(),b+1,Math.floor(i/4)%4+1,i%4+1,at(S.sun.t,S.sun.speed,t),at(S.sun.t,S.sun.density,t),at(S.sun.mt,S.sun.bz,t),kpAt(t),oceanAt(t).h,xrayAt(t),flareClass(xrayAt(t)),jetAvg(t),S.tides.length?tideNorm(S.tides[0],t):"",moon(t).illum,airAt(t).pm,airAt(t).uv,S.iss?issAt(t).lat:"",S.iss?issAt(t).lon:"",dstAt(t),protAt(t),SUN_CITIES.filter(cc=>sunElev(cc[1],cc[2],sp)>0).reduce((a,cc)=>a+cc[3],0)];
    rowsOut.push(r.map(v=>typeof v==="number"?(Number.isFinite(v)?+v.toPrecision(5):""):v))}
  const csv=["# "+CREDIT,"# "+SOURCES,"# "+LICENSE,`# 24h → ${bars} bars at ${bpm} bpm`,head.join(","),...rowsOut.map(r=>r.map(v=>/[",]/.test(String(v))?'"'+String(v).replace(/"/g,'""')+'"':v).join(","))].join("\n");
  const quakesCsv=["# "+CREDIT,"real_utc,bar_position,magnitude,depth_km,lat,lon,place,midi_note,velocity",...S.quakes.filter(q=>q.time>=T0).map(q=>{const p=tk(q.time)/tpq/4;return [new Date(q.time).toISOString(),(Math.floor(p)+1)+"."+(Math.floor((p%1)*4)+1),q.mag,q.depth.toFixed(1),q.lat.toFixed(3),q.lon.toFixed(3),'"'+String(q.place).replace(/"/g,'""')+'"',quakeNote(q).note,velOf(q.mag)].join(",")})].join("\n");
  const json={app:"Earth MIDI",version:VERSION,credit:CREDIT,license:LICENSE,sources:SOURCES,covers:{from:new Date(T0).toISOString(),to:new Date(T1).toISOString()},timing:{bpm,bars,barMinutes:1440/bars},
    cc_map:Object.fromEntries(LANES.map(l=>[`CC${l[1]}`,{label:l[2],channel:CH(l[0])}])),notes:{earthquakes:CH("q"),flares:CH("x"),sunrise:CH("u"),chord:CH("c"),events:CH("e")},
    data:{quakes:S.quakes,solarWind:{t:S.sun.t,speed:S.sun.speed,density:S.sun.density,mt:S.sun.mt,bz:S.sun.bz,bt:S.sun.bt},kp:S.kp,dst:S.dst,protons:S.protons,xray:S.xray,ocean:S.ocean,jet:S.jet,tides:S.tides,temps:S.temps,air:S.air,events:S.events,iss:S.iss&&{l1:S.iss.l1,l2:S.iss.l2}}};
  const readme=`EARTH MIDI · DATA PACK (no sounds, just the planet)\n\nThis pack is the last 24 hours of real planetary measurements, turned into MIDI notes, MIDI CC automation lanes and plain tables, so you can drive your own instruments, synths and effects with the planet.\n\nTiming: 24 real hours → ${bars} bars at ${bpm} bpm (1 bar = ${(1440/bars).toFixed(1)} real minutes). Set your DAW to ${bpm} bpm before importing.\nCovers ${new Date(T0).toISOString()} → ${new Date(T1).toISOString()} UTC.\n\nFILES\n• earth-midi-data.mid  Type-1 MIDI, one track per layer. Note tracks: earthquakes, flares, sunrise/sunset, planet chord, natural events. CC tracks: one per measurement (list below). Drag it into your DAW.\n• earth-midi-data.csv  One row per beat with every raw value in real units.\n• earth-midi-quakes.csv  Every quake with its bar position, note and velocity.\n• earth-midi-data.json  The full raw data and mapping, for code, Max/MSP, TouchDesigner, Resolume, etc.\n\nCC MAP\n${LANES.map(l=>`CC${l[1]} (ch ${CH(l[0])}) · ${l[2]}`).join("\n")}\nPitch bend (ch ${CH("t")}) · tide level\n\nHOW TO USE\n• Ableton Live: drag the .mid into Arrangement. Each track lands on its own MIDI track. Put any instrument on the note tracks. For CC tracks, open the clip's Envelopes box, choose MIDI Ctrl, and map that CC to a macro or plugin knob (or use "Expression Control" / an M4L CC-mapper).\n• Logic Pro: drag in, then use Smart Controls or the Modulator MIDI FX "Learn" to map each CC to any plugin parameter.\n• FL Studio: import into the Channel rack, then right-click a parameter → "Link to controller" and pick the CC.\n• Bitwig: CC lanes show up as note-clip expressions; use the "MIDI CC" modulator.\n• Hardware: send the file from any sequencer; CCs drive filters, sends, anything.\n\nNOTHING HERE IS AI-GENERATED. Each value is a published sensor reading or computed astronomy, mapped by the fixed formulas printed above.\n\n${README_CREDIT}`;
  return {mid:smf(tracks,tpq,bpm),csv,quakesCsv,json,readme,counts:{quakes:qev.length/2,flares:fev.length/2,sun:uev.length/2,lanes:LANES.length}}}
async function exportDataPack(){
  const bpm=+($("dpBpm")?.value||120),bars=+($("dpBars")?.value||64);xs("Building data pack…");
  try{const p=buildDataPack({bpm,bars}),JSZip=await zipLib(),z=new JSZip(),st=stamp(),f=z.folder(`earth-midi-data_${st}`);
    f.file("earth-midi-data.mid",p.mid);f.file("earth-midi-data.csv",p.csv);f.file("earth-midi-quakes.csv",p.quakesCsv);f.file("earth-midi-data.json",JSON.stringify(p.json));f.file("README.txt",p.readme);f.file("CREDIT.txt",README_CREDIT);
    download(`earth-midi-data_${st}.zip`,await z.generateAsync({type:"blob",compression:"DEFLATE"}));xs(`Data pack: ${p.counts.quakes} quakes, ${p.counts.flares} flares, ${p.counts.sun} sunrises/sets, ${p.counts.lanes} CC lanes`)}
  catch(e){console.error(e);try{const p=buildDataPack({bpm,bars});download(`earth-midi-data_${stamp()}.mid`,p.mid);xs("Zip unavailable, saved the .mid only")}catch(_){xs("Couldn't build the pack: "+e.message)}}}
function exportDataMidOnly(){const p=buildDataPack({bpm:+($("dpBpm")?.value||120),bars:+($("dpBars")?.value||64)});download(`earth-midi-data_${stamp()}.mid`,p.mid);xs("Saved data MIDI (notes + CC lanes)")}

/* ================= performance MIDI: everything you heard, one track per layer ================= */
function exportPerfMidi(){if(!MREC.length){xs("Nothing yet: press PLAY and let it play");return}
  const bpm=Math.round(S.bpm||120),tpq=480,mspt=60000/bpm/tpq,t0=S.startPerf||MREC[0][0],byCh={};
  MREC.forEach(([t,b])=>{const ch=(b[0]&15)+1;(byCh[ch]=byCh[ch]||[]).push([Math.max(0,t-t0)/mspt,b])});
  const chName={};Object.entries(CFG.ch).forEach(([k,c])=>chName[c]=chName[c]?chName[c]+" + "+(LNAME[k]||{m:"Moon",b:"Pulse bass",d:"Pulse drums"}[k]):(LNAME[k]||{m:"Moon",b:"Pulse bass",d:"Pulse drums"}[k]));
  const tracks=[{name:"Earth MIDI performance",text:[`Real time covered: ${new Date(S.replayFrom).toISOString()} → ${new Date(realNow()).toISOString()}`,`Settings: ${JSON.stringify(CFG)}`],ev:[]}];
  Object.keys(byCh).sort((a,b)=>a-b).forEach(ch=>tracks.push({name:`ch ${ch} · ${chName[ch]||"layer"}`,ev:byCh[ch]}));
  download(`earth-midi-performance_${stamp()}.mid`,smf(tracks,tpq,bpm));xs(`Saved ${MREC.length} MIDI events on ${tracks.length-1} tracks`)}

/* ================= WAV master + stems (16-bit, credit in LIST/INFO) ================= */
function encodeWav(chunksL,chunksR,rate,title){
  const len=chunksL.reduce((a,b)=>a+b.length,0),enc=new TextEncoder();
  const info=[["INAM",title],["IART","Earth MIDI by Colin Robinson"],["ICOP",LICENSE],["ICMT",CREDIT+" | "+SOURCES],["ISFT",`Earth MIDI v${VERSION} (earthmidi.com)`],["ICRD",new Date().toISOString().slice(0,10)]];
  const chunks=info.map(([id,txt])=>{let b=enc.encode(txt+"\0");if(b.length%2)b=new Uint8Array([...b,0]);return [id,b]});
  const listLen=4+chunks.reduce((a,[,b])=>a+8+b.length,0),dataLen=len*4;
  const buf=new ArrayBuffer(44+8+listLen+dataLen),v=new DataView(buf);let o=0;const W=s=>{for(const ch of s)v.setUint8(o++,ch.charCodeAt(0))},U32=x=>{v.setUint32(o,x,true);o+=4},U16=x=>{v.setUint16(o,x,true);o+=2};
  W("RIFF");U32(buf.byteLength-8);W("WAVE");W("fmt ");U32(16);U16(1);U16(2);U32(rate);U32(rate*4);U16(4);U16(16);
  W("LIST");U32(listLen);W("INFO");chunks.forEach(([id,b])=>{W(id);U32(b.length);new Uint8Array(buf,o,b.length).set(b);o+=b.length});
  W("data");U32(dataLen);for(let i=0;i<chunksL.length;i++){const a=chunksL[i],b=chunksR[i];for(let j=0;j<a.length;j++){v.setInt16(o,a[j],true);v.setInt16(o+2,b[j],true);o+=4}}
  return new Blob([buf],{type:"audio/wav"})}
const f2i=a=>{const o=new Int16Array(a.length);for(let i=0;i<a.length;i++)o[i]=clamp(a[i],-1,1)*32767;return o};
let REC=null;
function toggleRec(stems){
  if(!A||!S.on){xs("Press PLAY first");return}
  if(REC){stopRec();return}
  const keys=stems?PAN_KEYS.filter(k=>!muted(k)).concat(["fx"]):["mix"],nch=keys.length*2,merger=A.ctx.createChannelMerger(nch),srcs=[];
  keys.forEach((k,i)=>{const node=k==="mix"?A.lim:k==="fx"?A.revG:A.buses[k],sp=A.ctx.createChannelSplitter(2);node.connect(sp);sp.connect(merger,0,i*2);sp.connect(merger,1,i*2+1);srcs.push([node,sp])});
  const proc=A.ctx.createScriptProcessor(4096,nch,2),data=keys.map(()=>[[],[]]),rate=A.ctx.sampleRate,max=rate*60*(stems?3:20);let n=0;
  proc.onaudioprocess=e=>{const o=e.outputBuffer;o.getChannelData(0).fill(0);o.getChannelData(1).fill(0);if(n>=max){if(REC&&!REC.stopping){REC.stopping=1;setTimeout(stopRec,0)}return}
    for(let i=0;i<keys.length;i++){data[i][0].push(f2i(e.inputBuffer.getChannelData(i*2)));data[i][1].push(f2i(e.inputBuffer.getChannelData(i*2+1)))}n+=4096;
    if(n%rate<4096){const s=Math.floor(n/rate),lbl=`■ ${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}${stems?" / 3:00":""}`;REC.btn.textContent=lbl;$("recDot")&&($("recDot").textContent=lbl)}};
  merger.connect(proc);proc.connect(A.ctx.destination);
  const btn=stems?$("bStems"):$("bRec");btn.classList.add("on");document.body.classList.add("recording");
  REC={proc,merger,srcs,data,keys,rate,stems,btn,label:btn.textContent,start:realNow()};
}
async function stopRec(){const R=REC;if(!R)return;REC=null;R.proc.disconnect();R.srcs.forEach(([n,sp])=>{try{n.disconnect(sp)}catch(_){}});R.btn.classList.remove("on");R.btn.textContent=R.label;document.body.classList.remove("recording");
  const title=`Earth MIDI ${new Date(R.start).toISOString().slice(0,16)} UTC`,st=stamp();
  if(!R.stems){const w=encodeWav(R.data[0][0],R.data[0][1],R.rate,title);download(`earth-midi_${st}.wav`,w);xs(`Saved ${(w.size/1048576).toFixed(1)} MB WAV with credit metadata`);return}
  xs("Packing stems…");try{const JSZip=await zipLib(),z=new JSZip(),f=z.folder(`earth-midi-stems_${st}`);
    R.keys.forEach((k,i)=>f.file(`${String(i+1).padStart(2,"0")}_${k==="fx"?"reverb-return":(LNAME[k]||k).toLowerCase().replace(/[^a-z0-9]+/g,"-")}.wav`,encodeWav(R.data[i][0],R.data[i][1],R.rate,`${title} · ${k==="fx"?"reverb return":LNAME[k]}`)));
    f.file("CREDIT.txt",README_CREDIT+"\nStems are each layer's own bus before the master chain; the shared reverb is its own stem. Line them up at 0:00.\n");
    download(`earth-midi-stems_${st}.zip`,await z.generateAsync({type:"blob",compression:"STORE"}));xs(`Saved ${R.keys.length} stems`)}catch(e){xs("Stems failed: "+e.message)}}

/* ================= compressed audio + video clip (MediaRecorder) ================= */
let MR=null;
function pickMime(list){if(!window.MediaRecorder)return null;return list.find(m=>MediaRecorder.isTypeSupported(m))||null}
function toggleMR(video){
  if(MR){MR.rec.stop();return}
  if(!A||!S.on||!A.recDest){xs("Press PLAY first");return}
  const mime=video?pickMime(["video/mp4;codecs=avc1,mp4a.40.2","video/mp4","video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"]):pickMime(["audio/mp4;codecs=mp4a.40.2","audio/mp4","audio/webm;codecs=opus","audio/webm"]);
  if(!mime){xs("This browser can't record that format");return}
  let stream=A.recDest.stream;if(video){const vs=cv.captureStream(30);stream=new MediaStream([...vs.getVideoTracks(),...A.recDest.stream.getAudioTracks()])}
  const rec=new MediaRecorder(stream,{mimeType:mime,audioBitsPerSecond:256000,videoBitsPerSecond:8e6}),parts=[],btn=video?$("bVid"):$("bAac"),label=btn.textContent,t0=performance.now();
  rec.ondataavailable=e=>e.data.size&&parts.push(e.data);
  rec.onstop=()=>{clearInterval(MR.iv);btn.classList.remove("on");btn.textContent=label;S.recVideo=false;document.body.classList.remove("recording");const ext=mime.includes("mp4")?(video?"mp4":"m4a"):(video?"webm":"webm");
    const b=new Blob(parts,{type:mime.split(";")[0]});download(`earth-midi${video?"-clip":""}_${stamp()}.${ext}`,b);xs(`Saved ${(b.size/1048576).toFixed(1)} MB ${ext.toUpperCase()}${video?" with credit burned in":""}`);MR=null};
  rec.start(1000);S.recVideo=video;btn.classList.add("on");document.body.classList.add("recording");
  MR={rec,iv:setInterval(()=>{const s=Math.floor((performance.now()-t0)/1000);btn.textContent=`■ ${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;if(video&&s>=180)rec.stop()},500)}}
// credit burned into video frames
const _drawMap=drawMap;drawMap=function(now){_drawMap(now);if(!S.recVideo)return;const W=cv.width,H=cv.height;cx.fillStyle="rgba(5,7,10,.6)";cx.fillRect(0,H-28*DPR,W,28*DPR);cx.fillStyle="#e6edf3";cx.font=`600 ${12*DPR}px "IBM Plex Mono",monospace`;cx.fillText("EARTH MIDI · real planetary data, 0% AI audio · earthmidi.com",12*DPR,H-10*DPR);cx.textAlign="right";cx.fillText($("clock").textContent,W-12*DPR,H-10*DPR);cx.textAlign="left"};

/* ================= event CSV, sessions, presets, share ================= */
function exportEventsCsv(){if(!EVENTS.length){xs("Nothing yet: press PLAY and let it play");return}
  const q=s=>'"'+String(s).replace(/"/g,'""')+'"';const rows=[["# "+CREDIT],["# "+SOURCES],["# "+LICENSE],["real_time_utc","layer","event","sensor","raw_reading","formula","sound_and_midi"]];
  EVENTS.forEach(e=>{const g=n=>(e.trace.find(x=>x[0].startsWith(n))||["",""])[1];rows.push([e.real,LNAME[e.layer]||e.layer,e.text,g("Sensor"),g("Raw"),e.trace.filter(x=>x[0].startsWith("Formula")).map(x=>x[0]+": "+x[1]).join(" | "),g("Sound")])});
  download(`earth-midi-events_${stamp()}.csv`,new Blob([rows.map(r=>r.length===1?r[0]:r.map(q).join(",")).join("\n")],{type:"text/csv"}));xs(`Saved ${EVENTS.length} events`)}
function saveSession(){const snap={app:"Earth MIDI",version:VERSION,credit:CREDIT,license:LICENSE,sources:SOURCES,saved:new Date().toISOString(),endT:S.endT||Date.now(),style:S.style,mode:S.mode,cfg:CFG,
    data:{quakes:S.quakes,sun:S.sun,kp:S.kp,dst:S.dst,protons:S.protons,xray:S.xray,ocean:S.ocean,jet:S.jet,temps:S.temps,air:S.air,tides:S.tides,events:S.events,iss:S.iss,demo:S.demo}};
  download(`earth-midi-session_${stamp()}.json`,new Blob([JSON.stringify(snap)],{type:"application/json"}));xs("Session saved: settings + exact data, replays identically")}
async function loadFile(f){try{const j=JSON.parse(await f.text());if(j.app!=="Earth MIDI")throw new Error("not an Earth MIDI file");
  if(j.preset){CFG=mergeCFG(j.cfg);if(j.style)setStyle(j.style);afterCFG();xs(`Preset loaded: ${j.name||"preset"}`);return}
  if(!j.data)throw new Error("no data in file");Object.assign(S,j.data);S.endT=j.endT;S.frozen=true;CFG=mergeCFG(j.cfg);setStyle(j.style||"ambient");afterCFG();
  $("dataState").innerHTML=`<span class="dot" style="background:var(--s);box-shadow:0 0 8px var(--s)"></span>saved session · ${new Date(j.endT-864e5).toISOString().slice(0,16)} → ${new Date(j.endT).toISOString().slice(0,16)} UTC`;
  if(S.on)$("go").click();xs("Session loaded. Press PLAY to replay it exactly")}catch(err){xs("Couldn't load: "+err.message)}}
const shareURL=()=>location.origin+location.pathname+"#s="+btoa(unescape(encodeURIComponent(JSON.stringify({cfg:CFG,style:S.style,mode:+$("mode").value}))));
async function shareLink(){const u=shareURL();history.replaceState(null,"",u.slice(u.indexOf("#")));
  if(navigator.share&&IS_MOBILE){try{await navigator.share({title:"Earth MIDI",text:"The planet as an instrument, with my settings",url:u});return}catch(_){}}
  try{await navigator.clipboard.writeText(u);xs("Link copied: opens with your settings on live data")}catch(_){prompt("Copy this link",u)}}
function readHash(){const m=location.hash.match(/#s=([^&]+)/);if(!m)return false;try{const j=JSON.parse(decodeURIComponent(escape(atob(m[1]))));CFG=mergeCFG(j.cfg);if(j.style)setStyle(j.style);if(j.mode!=null)$("mode").value=String(j.mode);return true}catch(_){return false}}
// user presets in this browser + preset files
let UPRE={};try{UPRE=JSON.parse(localStorage.getItem("em5.presets")||"{}")}catch(_){}
function saveUserPreset(){const n=prompt("Name this preset");if(!n)return;UPRE[n]={cfg:clone(CFG),style:S.style};try{localStorage.setItem("em5.presets",JSON.stringify(UPRE))}catch(_){}renderPresets();xs(`Saved preset “${n}”`)}
function exportPreset(){const n=prompt("Preset name","My Earth MIDI preset")||"preset";download(`${n.replace(/[^\w-]+/g,"_")}.earthmidi.json`,new Blob([JSON.stringify({app:"Earth MIDI",preset:true,version:VERSION,name:n,cfg:CFG,style:S.style,credit:CREDIT})],{type:"application/json"}));xs("Preset file saved")}
function deleteUserPreset(n){delete UPRE[n];try{localStorage.setItem("em5.presets",JSON.stringify(UPRE))}catch(_){}renderPresets()}
async function copyCredit(){try{await navigator.clipboard.writeText(CREDIT);xs("Credit copied")}catch(_){prompt("",CREDIT)}}

/* ================= live network ledger: proof of what this page talks to ================= */
const HOSTS={"earthquake.usgs.gov":["USGS","seismometers"],"services.swpc.noaa.gov":["NOAA SWPC","satellites: DSCOVR, ACE, GOES"],"api.tidesandcurrents.noaa.gov":["NOAA CO-OPS","tide gauges"],"marine-api.open-meteo.com":["Open-Meteo","ocean model"],"api.open-meteo.com":["Open-Meteo","weather + jet stream"],"air-quality-api.open-meteo.com":["Open-Meteo","air quality"],"eonet.gsfc.nasa.gov":["NASA EONET","natural events"],"api.wheretheiss.at":["Where the ISS at","ISS orbit"],"celestrak.org":["CelesTrak","ISS orbit"],"cdn.jsdelivr.net":["jsDelivr","map shapes + code library"],"cdnjs.cloudflare.com":["cdnjs","zip library"],"fonts.googleapis.com":["Google Fonts","typefaces"],"fonts.gstatic.com":["Google Fonts","typefaces"]};
const AI_RX=/openai|anthropic|claude\.ai|gemini|generativelanguage|aiplatform|huggingface|replicate|cohere|mistral|groq|together\.ai|stability|elevenlabs|suno|udio|perplexity|deepseek|x\.ai|ollama|inference/i;
const LEDGER={};let AI_HITS=0,REQS=0;
function ledgerAdd(name,size){let h;try{h=new URL(name).host}catch(_){return}if(h===location.host)return;REQS++;if(AI_RX.test(h))AI_HITS++;const L=LEDGER[h]=LEDGER[h]||{n:0,b:0};L.n++;L.b+=size||0;renderLedger()}
try{new PerformanceObserver(l=>l.getEntries().forEach(e=>ledgerAdd(e.name,e.transferSize))).observe({type:"resource",buffered:true})}catch(_){}
let ledT=0;function renderLedger(){clearTimeout(ledT);ledT=setTimeout(()=>{const el=$("ledger");if(!el)return;
  el.innerHTML=Object.entries(LEDGER).sort((a,b)=>b[1].n-a[1].n).map(([h,v])=>{const k=HOSTS[h];return `<li><b>${k?k[0]:h}</b><span>${k?k[1]:"other"}</span><em>${v.n}×</em><i class="${AI_RX.test(h)?"bad":"ok"}">${AI_RX.test(h)?"AI SERVICE":"not AI"}</i></li>`}).join("");
  $("aiHits").textContent=AI_HITS;$("aiHits2").textContent=AI_HITS;$("reqs").textContent=REQS;$("hosts").textContent=Object.keys(LEDGER).length},200)}
