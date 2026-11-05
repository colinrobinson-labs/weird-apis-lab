/* Earth MIDI v0.5 · visuals. Every mark is placed from a measurement or computed astronomy. */
"use strict";
const cv=$("map"),cx=cv.getContext("2d");
const VIEW={lon:-110,lat:18,zoom:1,drag:null,lastInteract:0};
let LAND_DOTS=[],STARS=[];
function sizeMap(){const w=cv.clientWidth,h=cv.clientHeight||w/2;cv.width=Math.round(w*DPR);cv.height=Math.round(h*DPR)}
addEventListener("resize",()=>{sizeMap()});
window.onLand=()=>{const W=720,H=360,oc=document.createElement("canvas");oc.width=W;oc.height=H;const g=oc.getContext("2d");g.fillStyle="#000";g.fillRect(0,0,W,H);g.fillStyle="#fff";g.beginPath();
  S.land.features.forEach(f=>{const polys=f.geometry.type==="Polygon"?[f.geometry.coordinates]:f.geometry.coordinates;polys.forEach(poly=>poly.forEach(ring=>{ring.forEach(([lo,la],i)=>{const x=(lo+180)/360*W,y=(90-la)/180*H;if(i&&Math.abs(lo-ring[i-1][0])>180)g.moveTo(x,y);else i?g.lineTo(x,y):g.moveTo(x,y)})}))});g.fill("evenodd");
  const px=g.getImageData(0,0,W,H).data;window.LANDPX=px;const step=IS_MOBILE?2:1.5;LAND_DOTS=[];
  for(let la=-84;la<=84;la+=step){const ls=step/Math.max(.15,Math.cos(la*D2R));for(let lo=-180;lo<180;lo+=ls){const x=Math.floor((lo+180)/360*W),y=Math.floor((90-la)/180*H);if(px[(y*W+x)*4]>128)LAND_DOTS.push([lo,la,Math.sin(la*D2R),Math.cos(la*D2R)])}}};
for(let i=0;i<260;i++)STARS.push([Math.random(),Math.random(),Math.random()*1.2+.2,Math.random()*6]);

/* projection: flat equirectangular or orthographic globe */
function proj(lon,lat){const W=cv.width,H=cv.height;
  if(CFG.mapView==="flat"){return [(lon+180)/360*W,(90-lat)/180*H,1]}
  const R=Math.min(W,H)*.46*VIEW.zoom,cxp=W/2,cyp=H/2,l=(lon-VIEW.lon)*D2R,p=lat*D2R,p0=VIEW.lat*D2R;
  const cosc=Math.sin(p0)*Math.sin(p)+Math.cos(p0)*Math.cos(p)*Math.cos(l);
  return [cxp+R*Math.cos(p)*Math.sin(l),cyp-R*(Math.cos(p0)*Math.sin(p)-Math.sin(p0)*Math.cos(p)*Math.cos(l)),cosc]}
const globeR=()=>Math.min(cv.width,cv.height)*.46*VIEW.zoom;
function smallCircle(lat0,lon0,ang,n=72){const out=[],p1=lat0*D2R,d=ang*D2R;for(let i=0;i<=n;i++){const th=i/n*2*Math.PI,p2=Math.asin(Math.sin(p1)*Math.cos(d)+Math.cos(p1)*Math.sin(d)*Math.cos(th)),l2=lon0+Math.atan2(Math.sin(th)*Math.sin(d)*Math.cos(p1),Math.cos(d)-Math.sin(p1)*Math.sin(p2))/D2R;out.push([((l2+540)%360)-180,p2/D2R])}return out}
function strokePath(pts){cx.beginPath();let pen=false,prev=null;for(const [lo,la] of pts){const [x,y,v]=proj(lo,la);const brk=!v||v<0||(CFG.mapView==="flat"&&prev!==null&&Math.abs(lo-prev)>180);if(brk){pen=false}else{pen?cx.lineTo(x,y):cx.moveTo(x,y);pen=true}prev=lo}cx.stroke()}
let parts=[];S.flashes=[];
function drawMap(now){
  const W=cv.width,H=cv.height,t=realNow(),globe=CFG.mapView!=="flat";cx.clearRect(0,0,W,H);
  if(globe&&CFG.spin&&!VIEW.drag&&now-VIEW.lastInteract>4000)VIEW.lon=((VIEW.lon+.03+540)%360)-180;
  const sp=sunPos(t),c=S.cur||{};
  // solar wind particles (background): count from density, speed from wind speed, colour from Bz
  const spd=Number.isFinite(c.sp)?c.sp:400,den=Number.isFinite(c.de)?c.de:4,bz=Number.isFinite(c.bz)?c.bz:0;
  if(globe){STARS.forEach(s=>{cx.fillStyle=`rgba(220,230,255,${.25+.25*Math.sin(now/900+s[3])})`;cx.fillRect(s[0]*W,s[1]*H,s[2]*DPR,s[2]*DPR)})}
  const want=Math.round(map(den,0,25,30,260)*(IS_MOBILE?.6:1));while(parts.length<want)parts.push({x:Math.random()*W,y:Math.random()*H,l:Math.random()*.6+.4});parts.length=Math.min(parts.length,want);
  cx.strokeStyle=bz<-5?"rgba(255,120,90,.45)":"rgba(255,210,120,.3)";cx.lineWidth=DPR;const dir=globe?(((sp.lon-VIEW.lon+540)%360-180)>0?-1:1):1;
  parts.forEach(p=>{const v=spd/400*2.2*DPR*p.l;p.x+=v*dir;if(p.x>W)p.x=0;if(p.x<0)p.x=W;cx.beginPath();cx.moveTo(p.x,p.y);cx.lineTo(p.x-v*6*dir,p.y);cx.stroke()});
  if(globe){const R=globeR(),gx=W/2,gy=H/2,rms=S.rms||0;
    const at=cx.createRadialGradient(gx,gy,R*.95,gx,gy,R*1.18+rms*R*.3);at.addColorStop(0,"rgba(60,200,255,.35)");at.addColorStop(.4,`rgba(60,160,255,${.12+rms*.6})`);at.addColorStop(1,"rgba(60,160,255,0)");cx.fillStyle=at;cx.beginPath();cx.arc(gx,gy,R*1.3,0,7);cx.fill();
    const oc=cx.createRadialGradient(gx-R*.35,gy-R*.35,R*.1,gx,gy,R);oc.addColorStop(0,"#0f2233");oc.addColorStop(1,"#060b12");cx.fillStyle=oc;cx.beginPath();cx.arc(gx,gy,R,0,7);cx.fill();
    // graticule
    cx.strokeStyle="rgba(120,170,220,.08)";cx.lineWidth=DPR*.7;for(let l=-150;l<=180;l+=30){const pts=[];for(let la=-90;la<=90;la+=4)pts.push([l,la]);strokePath(pts)}for(let la=-60;la<=60;la+=30){const pts=[];for(let l=-180;l<=180;l+=4)pts.push([l,la]);strokePath(pts)}
    // land as dots, lit by the real sun
    const sd=Math.sin(sp.lat*D2R),cd=Math.cos(sp.lat*D2R),ds=(IS_MOBILE?1.7:1.5)*DPR*VIEW.zoom;
    for(const d of LAND_DOTS){const [x,y,v]=proj(d[0],d[1]);if(v<=0)continue;const el=d[2]*sd+d[3]*cd*Math.cos((d[0]-sp.lon)*D2R);
      cx.fillStyle=el>.05?`rgba(140,200,240,${.45+v*.45})`:el>-.1?`rgba(255,170,90,${.35+v*.4})`:`rgba(70,100,140,${.22+v*.25})`;cx.fillRect(x-ds/2,y-ds/2,ds,ds)}
    // terminator line
    cx.strokeStyle="rgba(255,190,110,.35)";cx.lineWidth=1.4*DPR;strokePath(smallCircle(sp.lat,sp.lon,90,120));
    const [ssx,ssy,sv]=proj(sp.lon,sp.lat);if(sv>0){const g=cx.createRadialGradient(ssx,ssy,0,ssx,ssy,R*.6);g.addColorStop(0,"rgba(255,210,120,.16)");g.addColorStop(1,"rgba(255,210,120,0)");cx.fillStyle=g;cx.beginPath();cx.arc(gx,gy,R,0,7);cx.fill()}
  }else{
    cx.strokeStyle="rgba(120,160,200,.06)";cx.lineWidth=1;for(let l=-150;l<=180;l+=30){const[x]=proj(l,0);cx.beginPath();cx.moveTo(x,0);cx.lineTo(x,H);cx.stroke()}for(let l=-60;l<=60;l+=30){const[,y]=proj(0,l);cx.beginPath();cx.moveTo(0,y);cx.lineTo(W,y);cx.stroke()}
    if(S.land){cx.beginPath();S.land.features.forEach(f=>{const polys=f.geometry.type==="Polygon"?[f.geometry.coordinates]:f.geometry.coordinates;polys.forEach(poly=>poly.forEach(ring=>{ring.forEach(([lo,la],i)=>{const[x,y]=proj(lo,la);if(i&&Math.abs(lo-ring[i-1][0])>180)cx.moveTo(x,y);else i?cx.lineTo(x,y):cx.moveTo(x,y)})}))});
      cx.fillStyle="#0e1822";cx.fill();cx.strokeStyle="rgba(124,180,220,.28)";cx.lineWidth=DPR*.8;cx.stroke()}
    const dr=sp.lat*D2R;cx.fillStyle="rgba(0,0,8,.42)";cx.beginPath();
    for(let x=0;x<=W;x+=4){const lon=x/W*360-180,ha=(lon-sp.lon)*D2R,lat=Math.atan(-Math.cos(ha)/Math.tan(dr))/D2R;const[,y]=proj(lon,lat);x?cx.lineTo(x,y):cx.moveTo(x,y)}
    cx.lineTo(W,sp.lat>0?H:0);cx.lineTo(0,sp.lat>0?H:0);cx.closePath();cx.fill();
    const[sx,sy]=proj(sp.lon,sp.lat);const sg=cx.createRadialGradient(sx,sy,0,sx,sy,W*.12);sg.addColorStop(0,"rgba(255,200,80,.18)");sg.addColorStop(1,"rgba(255,200,80,0)");cx.fillStyle=sg;cx.fillRect(0,0,W,H);
  }
  // aurora ovals around the geomagnetic poles; size and brightness from Kp
  const kp=c.kp||2,edge=67-2*kp,al=map(kp,0,9,.15,.7)*(0.75+.25*Math.sin(now/600));
  [[80.7,-72.7],[-80.7,107.3]].forEach(([pl,plo])=>{for(let k=0;k<3;k++){cx.strokeStyle=`rgba(${k?199:124},${k?125:255},${k?255:158},${al*(1-k*.3)})`;cx.lineWidth=(6-k*2)*DPR*(globe?VIEW.zoom:1);const wob=Math.sin(now/800+k)*1.2;strokePath(smallCircle(pl,plo,90-edge+k*1.6+wob,96))}});
  // jet stream streaks along the measured wind direction
  S.jet.forEach(p=>{const v=tsAt(p,t),d=at(p.t,p.d,t);if(!Number.isFinite(v))return;const[x,y,vis]=proj(p.lon,p.lat);if(vis<=0)return;const ang=(270-d)*D2R,L=map(v,40,320,20,120)*DPR*(globe?.7:1);
    for(let k=0;k<6;k++){const ph=((now/1000*v/120+k/6)%1),ox=x+Math.cos(ang)*L*(ph-.5)*2+Math.sin(ang)*(k-2.5)*5*DPR,oy=y-Math.sin(ang)*L*(ph-.5)*2+Math.cos(ang)*(k-2.5)*5*DPR;
      cx.strokeStyle=`rgba(154,209,255,${(1-Math.abs(ph-.5)*2)*.7})`;cx.lineWidth=1.3*DPR;cx.beginPath();cx.moveTo(ox,oy);cx.lineTo(ox-Math.cos(ang)*14*DPR,oy+Math.sin(ang)*14*DPR);cx.stroke()}});
  // tide gauges
  S.tides.forEach(o=>{const[x,y,v]=proj(o.lon,o.lat);if(v<=0)return;const n=tideNorm(o,t),h=22*DPR;cx.strokeStyle="rgba(77,214,193,.6)";cx.lineWidth=1*DPR;cx.strokeRect(x+6*DPR,y-h/2,5*DPR,h);cx.fillStyle="#4dd6c1";const lv=(n+1)/2*h;cx.fillRect(x+6*DPR,y+h/2-lv,5*DPR,lv)});
  // chord cities: colour = live temperature, haze ring = PM2.5
  cx.font=`${10*DPR}px "IBM Plex Mono",monospace`;S.temps.forEach((o,i)=>{const T=tsAt(o,t);if(!Number.isFinite(T))return;const[x,y,v]=proj(o.lon,o.lat);if(v<=0)return;const hue=map(T,-20,40,220,0),pul=1+.25*Math.sin(now/500+o.lon);
    const pm=S.air[i]?at(S.air[i].t,S.air[i].pm,t):NaN;if(Number.isFinite(pm)){cx.fillStyle=`rgba(214,192,143,${map(pm,0,80,.03,.3)})`;cx.beginPath();cx.arc(x,y,map(pm,0,80,6,22)*DPR,0,7);cx.fill()}
    cx.fillStyle=`hsla(${hue},90%,65%,.95)`;cx.beginPath();cx.arc(x,y,3*DPR*pul,0,7);cx.fill();cx.fillStyle="rgba(230,237,243,.8)";cx.fillText(`${Math.round(T)}°`,x+6*DPR,y-5*DPR)});
  // ocean rings at the real swell period
  S.ocean.forEach(o=>{const[x,y,v]=proj(o.lon,o.lat);if(v<=0)return;const ph=(now/1000%o.p)/o.p,R=map(o.h,0,8,6,26)*DPR;
    for(let k=0;k<3;k++){const pp=(ph+k/3)%1;cx.strokeStyle=`rgba(60,200,255,${(1-pp)*.55})`;cx.lineWidth=1.4*DPR;cx.beginPath();cx.arc(x,y,R*pp*1.6,0,7);cx.stroke()}
    cx.fillStyle="#3cc8ff";cx.beginPath();cx.arc(x,y,2.4*DPR,0,7);cx.fill()});
  // NASA EONET events
  S.events.forEach(e=>{if(e.start>t)return;const[x,y,v]=proj(e.lon,e.lat);if(v<=0)return;const s=DPR*(globe?.9+v*.3:1);
    if(e.kind==="fire"){const f=.6+.4*Math.sin(now/90+e.lon*7)*Math.sin(now/53+e.lat*3);cx.fillStyle=`rgba(255,${120+f*80|0},40,${.5+f*.4})`;cx.beginPath();cx.arc(x,y,(1.6+f*1.4)*s,0,7);cx.fill()}
    else if(e.kind==="volcano"){const p=.5+.5*Math.sin(now/400+e.lon);cx.fillStyle=`rgba(255,61,46,${.6+p*.4})`;cx.beginPath();cx.moveTo(x,y-6*s);cx.lineTo(x+5*s,y+3*s);cx.lineTo(x-5*s,y+3*s);cx.fill();cx.strokeStyle=`rgba(255,61,46,${(1-p)*.6})`;cx.beginPath();cx.arc(x,y,(6+p*12)*s,0,7);cx.stroke()}
    else if(e.kind==="storm"){cx.strokeStyle="rgba(154,209,255,.85)";cx.lineWidth=1.5*DPR;const r0=now/300*(e.lat>=0?-1:1);for(let a=0;a<2;a++){cx.beginPath();for(let k=0;k<14;k++){const th=r0+a*Math.PI+k*.35,rr=(1+k*.7)*s;k?cx.lineTo(x+Math.cos(th)*rr,y+Math.sin(th)*rr):cx.moveTo(x+Math.cos(th)*rr,y+Math.sin(th)*rr)}cx.stroke()}}
    else{cx.fillStyle=e.col;cx.globalAlpha=.8;cx.fillRect(x-2*s,y-2*s,4*s,4*s);cx.globalAlpha=1}});
  // ISS ground track ±45 min and the station itself
  if(S.iss){const pts=[];for(let m=-45;m<=45;m+=1.5){const p=issAt(t+m*6e4);if(p)pts.push([p.lon,p.lat])}cx.setLineDash([3*DPR,5*DPR]);cx.strokeStyle="rgba(232,244,255,.35)";cx.lineWidth=1.2*DPR;strokePath(pts);cx.setLineDash([]);
    const p=issAt(t);if(p){const[x,y,v]=proj(p.lon,p.lat);if(v>0){const lit=c.issLit,pu=1+.3*Math.sin(now/200);cx.strokeStyle=`rgba(232,244,255,${lit?.9:.5})`;cx.lineWidth=1.5*DPR;cx.beginPath();cx.arc(x,y,7*DPR*pu,0,7);cx.stroke();
      cx.fillStyle="#fff";cx.shadowColor="#bfe9ff";cx.shadowBlur=14*DPR;cx.fillRect(x-4*DPR,y-1*DPR,8*DPR,2*DPR);cx.fillRect(x-1*DPR,y-3*DPR,2*DPR,6*DPR);cx.shadowBlur=0;cx.fillStyle="rgba(232,244,255,.85)";cx.fillText("ISS",x+9*DPR,y+3*DPR)}}}
  // quakes already heard: glowing dots fading over the real day
  cx.globalCompositeOperation="lighter";
  S.quakes.forEach(q=>{if(!S.played.has(q.id)&&S.on)return;const[x,y,v]=proj(q.lon,q.lat);if(v<=0)return;const age=clamp((t-q.time)/864e5,0,1),r=Math.max(1.2,(q.mag+.5)*(globe?1.1:1.6))*DPR*(globe?VIEW.zoom:1);
    const g=cx.createRadialGradient(x,y,0,x,y,r*3);g.addColorStop(0,`rgba(255,${Math.round(map(q.depth,0,300,120,220))},80,${.9-age*.6})`);g.addColorStop(1,"rgba(255,90,60,0)");cx.fillStyle=g;cx.beginPath();cx.arc(x,y,r*3,0,7);cx.fill()});
  // seismic wavefronts as true great-circle rings from each epicentre
  S.rings=S.rings.filter(r=>now-r.t<4000+r.mag*800);
  S.rings.forEach(r=>{const age=(now-r.t)/(4000+r.mag*800);for(let k=0;k<3;k++){const a=clamp(age-k*.12,0,1);if(a<=0)continue;cx.strokeStyle=`rgba(255,90,60,${(1-a)*.9})`;cx.lineWidth=(2.5-k*.6)*DPR;strokePath(smallCircle(r.lat,r.lon,Math.max(.3,a*map(r.mag,1,7,6,45)),48))}
    const[x,y,v]=proj(r.lon,r.lat);if(age<.15&&v>0){cx.fillStyle=`rgba(255,240,200,${1-age/.15})`;cx.beginPath();cx.arc(x,y,map(r.mag,1,7,4,18)*DPR,0,7);cx.fill()}});
  // sunrise / sunset flashes
  S.flashes=S.flashes.filter(f=>now-f.t<2600);S.flashes.forEach(f=>{const[x,y,v]=proj(f.lon,f.lat);if(v<=0)return;const a=(now-f.t)/2600;cx.strokeStyle=f.rise?`rgba(255,210,122,${1-a})`:`rgba(255,140,90,${1-a})`;cx.lineWidth=2*DPR;cx.beginPath();cx.arc(x,y,(4+a*30)*DPR,0,7);cx.stroke();
    if(a<.6){cx.fillStyle=`rgba(255,226,170,${1-a/.6})`;cx.fillText((f.rise?"☀ ":"☾ ")+f.name,x+8*DPR,y-8*DPR)}});
  cx.globalCompositeOperation="source-over";
  $("clock").textContent=new Date(t).toISOString().slice(0,19).replace("T"," ")+" UTC";
  {const mo=moon(t),r=11*DPR,mx=W-24*DPR,my=24*DPR;cx.fillStyle="#1a222c";cx.beginPath();cx.arc(mx,my,r,0,7);cx.fill();cx.save();cx.beginPath();cx.arc(mx,my,r,0,7);cx.clip();cx.fillStyle="#e9ecf4";cx.shadowColor="#fff";cx.shadowBlur=12*DPR*mo.illum;const k=Math.cos(2*Math.PI*mo.ph);cx.beginPath();if(mo.ph<.5){cx.arc(mx,my,r,-Math.PI/2,Math.PI/2);cx.ellipse(mx,my,Math.abs(k)*r,r,0,Math.PI/2,-Math.PI/2,k>0)}else{cx.arc(mx,my,r,Math.PI/2,-Math.PI/2);cx.ellipse(mx,my,Math.abs(k)*r,r,0,-Math.PI/2,Math.PI/2,k>0)}cx.fill();cx.restore()}
}
/* ---------- map interaction: drag to spin, wheel/pinch to zoom, hover to inspect, tap to hear ---------- */
let HOVER=null;
function pickAt(px,py){let best=null,bd=(IS_MOBILE?24:14)*DPR;const T=(o,lon,lat,extra)=>{const[x,y,v]=proj(lon,lat);if(v<=0)return;const d=Math.hypot(x-px,y-py);if(d<bd){bd=d;best=Object.assign({o},extra||{})}};
  S.quakes.forEach(q=>{if(S.on&&!S.played.has(q.id))return;T(q,q.lon,q.lat,{type:"q"})});S.ocean.forEach(o=>T(o,o.lon,o.lat,{type:"o"}));S.events.forEach(e=>T(e,e.lon,e.lat,{type:"e"}));S.temps.forEach((o,i)=>T(o,o.lon,o.lat,{type:"c",i}));
  if(S.iss){const p=issAt(realNow());if(p)T(p,p.lon,p.lat,{type:"i"})}S.tides.forEach(o=>T(o,o.lon,o.lat,{type:"t"}));return best}
function tipHTML(b){const t=realNow(),o=b.o,E=s=>String(s).replace(/[<&]/g,m=>m==="<"?"&lt;":"&amp;");
  if(b.type==="q")return `<b style="color:#ff5a3c">M${o.mag.toFixed(1)}</b> ${E(o.place)}<br>${Math.round(o.depth)} km deep · ${new Date(o.time).toISOString().slice(11,16)} UTC<br>→ ${noteName(quakeNote(o).note)} · tap to hear it`;
  if(b.type==="o")return `<b style="color:#3cc8ff">${o.name}</b><br>waves ${o.h.toFixed(1)} m · period ${o.p.toFixed(1)} s`;
  if(b.type==="e")return `<b style="color:${o.col}">${E(o.kind)}</b> ${E(o.title)}<br>since ${new Date(o.start).toISOString().slice(0,10)}${o.mag?` · ${o.mag} ${E(o.magU||"")}`:""}<br><small>NASA EONET</small>`;
  if(b.type==="c"){const a=S.air[b.i];return `<b style="color:#ff8fd1">${o.name}</b> ${tsAt(o,t).toFixed(1)}°C${a?`<br>PM2.5 ${at(a.t,a.pm,t).toFixed(0)} µg/m³ · UV ${at(a.t,a.uv,t).toFixed(1)}`:""}`}
  if(b.type==="i")return `<b>International Space Station</b><br>${o.lat.toFixed(1)}°, ${o.lon.toFixed(1)}° · ${Math.round(o.alt)} km up<br>${S.cur.issLit?"in sunlight":"in Earth's shadow"}`;
  if(b.type==="t")return `<b style="color:#4dd6c1">${o.name}</b> tide gauge<br>${tsAt(o,t).toFixed(2)} m above MLLW`;return ""}
const ptr=new Map();let pinch0=0,zoom0=1;
cv.addEventListener("pointerdown",e=>{cv.setPointerCapture(e.pointerId);ptr.set(e.pointerId,[e.clientX,e.clientY]);VIEW.lastInteract=performance.now();
  if(ptr.size===2){const [a,b]=[...ptr.values()];pinch0=Math.hypot(a[0]-b[0],a[1]-b[1]);zoom0=VIEW.zoom;VIEW.drag=null}else VIEW.drag={x:e.clientX,y:e.clientY,lon:VIEW.lon,lat:VIEW.lat,moved:0}});
cv.addEventListener("pointermove",e=>{const r=cv.getBoundingClientRect();
  if(ptr.has(e.pointerId))ptr.set(e.pointerId,[e.clientX,e.clientY]);
  if(ptr.size===2&&CFG.mapView!=="flat"){const [a,b]=[...ptr.values()];VIEW.zoom=clamp(zoom0*Math.hypot(a[0]-b[0],a[1]-b[1])/(pinch0||1),.7,3.2);return}
  if(VIEW.drag&&CFG.mapView!=="flat"){const dx=e.clientX-VIEW.drag.x,dy=e.clientY-VIEW.drag.y;VIEW.drag.moved=Math.max(VIEW.drag.moved,Math.abs(dx)+Math.abs(dy));const k=180/(globeR()/DPR*Math.PI);VIEW.lon=((VIEW.drag.lon-dx*k+540)%360)-180;VIEW.lat=clamp(VIEW.drag.lat+dy*k,-80,80);VIEW.lastInteract=performance.now();$("tip").style.display="none";return}
  if(e.pointerType==="touch")return;
  const b=pickAt((e.clientX-r.left)*DPR,(e.clientY-r.top)*DPR);HOVER=b;const tip=$("tip");if(!b){tip.style.display="none";return}
  tip.innerHTML=tipHTML(b);tip.style.display="block";tip.style.left=Math.min(e.clientX-r.left+12,r.width-230)+"px";tip.style.top=(e.clientY-r.top+12)+"px"});
cv.addEventListener("pointerup",e=>{const r=cv.getBoundingClientRect(),wasDrag=VIEW.drag&&VIEW.drag.moved>6;ptr.delete(e.pointerId);if(ptr.size<2)pinch0=0;VIEW.drag=null;if(wasDrag)return;
  const b=pickAt((e.clientX-r.left)*DPR,(e.clientY-r.top)*DPR),tip=$("tip");if(!b){tip.style.display="none";return}
  tip.innerHTML=tipHTML(b);tip.style.display="block";tip.style.left=Math.min(Math.max(4,e.clientX-r.left-100),r.width-230)+"px";tip.style.top=Math.max(4,e.clientY-r.top-80)+"px";
  if(b.type==="q")auditionQuake(b.o)});
cv.addEventListener("pointercancel",e=>{ptr.delete(e.pointerId);VIEW.drag=null});
cv.addEventListener("mouseleave",()=>$("tip").style.display="none");
cv.addEventListener("wheel",e=>{if(CFG.mapView==="flat")return;e.preventDefault();VIEW.zoom=clamp(VIEW.zoom*Math.exp(-e.deltaY*.0012),.7,3.2);VIEW.lastInteract=performance.now()},{passive:false});

/* ---------- 24h timeline: quake ticks, flare classes, sunrise marks; click to jump ---------- */
const tl=$("tl");
function drawTimeline(){const w=tl.clientWidth*DPR,h=tl.clientHeight*DPR;if(tl.width!==w||tl.height!==h){tl.width=w;tl.height=h}const g=tl.getContext("2d");g.clearRect(0,0,w,h);
  const t1=S.on&&S.mode>0&&!S.liveSince?(S.endT||Date.now()):(S.frozen?S.endT:Date.now()),t0=t1-864e5,X=t=>(t-t0)/864e5*w;
  S.xray.forEach((x,i)=>{if(i%3)return;const cl=x.v>=1e-5?.5:x.v>=1e-6?.22:0;if(cl){g.fillStyle=`rgba(199,125,255,${cl})`;g.fillRect(X(x.t),0,Math.max(1,w/288*3),h)}});
  for(let hh=0;hh<=24;hh+=3){const x=X(t0+hh*36e5);g.fillStyle="rgba(125,139,153,.35)";g.fillRect(x,h-4*DPR,1,4*DPR);if(hh%6===0&&hh<24){g.fillStyle="rgba(125,139,153,.8)";g.font=`${9*DPR}px "IBM Plex Mono",monospace`;g.fillText(new Date(t0+hh*36e5).toISOString().slice(11,16),x+2*DPR,h-6*DPR)}}
  S.quakes.forEach(q=>{if(q.time<t0)return;const x=X(q.time),hh=map(q.mag,0,7,2,h*.85);g.fillStyle=S.played.has(q.id)||!S.on?`rgba(255,90,60,${map(q.mag,0,6,.35,1)})`:"rgba(255,90,60,.18)";g.fillRect(x,h-hh-12*DPR+12*DPR*(1-0),Math.max(1,DPR),hh*.85)});
  const pt=realNow();if(S.on){const x=X(pt);g.fillStyle="#fff";g.shadowColor="#fff";g.shadowBlur=10*DPR;g.fillRect(x-1,0,2*DPR,h);g.shadowBlur=0}
  if(TLH!=null){g.fillStyle="rgba(255,255,255,.25)";g.fillRect(TLH-1,0,1,h);g.fillStyle="#e6edf3";g.font=`${10*DPR}px "IBM Plex Mono",monospace`;g.fillText(new Date(t0+TLH/w*864e5).toISOString().slice(11,16)+" UTC",Math.min(TLH+4*DPR,w-70*DPR),11*DPR)}}
let TLH=null;
tl.addEventListener("pointermove",e=>{const r=tl.getBoundingClientRect();TLH=(e.clientX-r.left)*DPR});tl.addEventListener("pointerleave",()=>TLH=null);
tl.addEventListener("pointerdown",e=>{const r=tl.getBoundingClientRect(),f=(e.clientX-r.left)/r.width;if(!S.on){$("go").click();setTimeout(()=>seekTo(f),60)}else seekTo(f);xs(`Jumped to ${new Date(Date.now()-864e5*(1-f)).toISOString().slice(11,16)} UTC`)});

/* ---------- sparklines with glowing playhead ---------- */
function spark(id,ts,vs,col,t,lo,hi){const c=$(id);if(!c||!c.offsetParent)return;const w=c.clientWidth*DPR,h=c.clientHeight*DPR;if(c.width!==w){c.width=w;c.height=h}const g=c.getContext("2d");g.clearRect(0,0,w,h);if(!vs.length)return;
  const t0=ts[0],t1=ts[ts.length-1],X=x=>(x-t0)/(t1-t0||1)*w,Y=v=>h-((v-lo)/(hi-lo||1))*(h-6)-3;
  const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,col+"55");gr.addColorStop(1,col+"00");g.beginPath();let st=false;ts.forEach((tt,i)=>{const v=vs[i];if(!Number.isFinite(v))return;st?g.lineTo(X(tt),Y(v)):g.moveTo(X(tt),Y(v));st=true});
  g.strokeStyle=col;g.lineWidth=1.5*DPR;g.stroke();g.lineTo(w,h);g.lineTo(0,h);g.fillStyle=gr;g.fill();
  const px=clamp(X(t),0,w);g.strokeStyle="#fff";g.globalAlpha=.5;g.beginPath();g.moveTo(px,0);g.lineTo(px,h);g.stroke();g.globalAlpha=1;
  const v=at(ts,vs,t);if(Number.isFinite(v)){const pr=1+.4*Math.sin(performance.now()/250);g.fillStyle=col;g.shadowColor=col;g.shadowBlur=14*DPR;g.beginPath();g.arc(px,Y(v),3.5*DPR*pr,0,7);g.fill();g.shadowBlur=0}}
const SPK={};
function drawSparks(){
  const t=realNow(),c=S.cur||{};
  spark("kq",S.quakes.map(q=>q.time),S.quakes.map(q=>q.mag),COLS.q,t,0,7);
  spark("ks",S.sun.t,S.sun.speed,COLS.s,t,250,Math.max(700,...S.sun.speed.filter(Number.isFinite)));
  if(S.ocean.length){const ts=S.ocean[0].ht;spark("ko",ts,ts.map(x=>oceanAt(x).h),COLS.o,t,0,6)}
  spark("kx",S.xray.map(x=>x.t),S.xray.map(x=>Math.log10(x.v)),COLS.x,t,-8,-4);
  if(S.jet.length){const ts=S.jet[0].t;spark("kw",ts,ts.map(x=>jetAvg(x)),COLS.w,t,40,300)}
  if(S.tides.length)spark("kt",S.tides[0].t,S.tides[0].v,COLS.t,t,Math.min(...S.tides[0].v),Math.max(...S.tides[0].v));
  if(S.temps.length){const ts=S.temps[0].t;spark("kc",ts,ts.map(x=>S.temps.reduce((a,o)=>a+(tsAt(o,x)||0),0)/S.temps.length),COLS.c,t,0,30)}
  {const ts=[...Array(60)].map((_,i)=>t-15*864e5+i*864e5/2);spark("km",ts,ts.map(x=>moon(x).illum),COLS.m,t,0,1)}
  if(S.iss){const ts=[...Array(97)].map((_,i)=>t-12*36e5+i*15*6e4);spark("ki",ts,ts.map(x=>issAt(x).lat),COLS.i,t,-55,55)}
  if(S.events.length){const ts=[...Array(49)].map((_,i)=>Date.now()-864e5*2+i*36e5);spark("ke",ts,ts.map(x=>S.events.filter(e=>e.start<=x).length),COLS.e,t,0,Math.max(10,S.events.length))}
  if(S.dst.length)spark("kg",S.dst.map(d=>d.t),S.dst.map(d=>d.v),COLS.g,t,Math.min(-50,...S.dst.map(d=>d.v)),Math.max(20,...S.dst.map(d=>d.v)));
  if(S.air.length){const ts=S.air[0].t;spark("ka",ts,ts.map(x=>airAt(x).pm),COLS.a,t,0,60)}
  {const ts=[...Array(97)].map((_,i)=>t-12*36e5+i*15*6e4),sp0=x=>{const sp=sunPos(x);return SUN_CITIES.filter(cc=>sunElev(cc[1],cc[2],sp)>0).reduce((a,cc)=>a+cc[3],0)};spark("ku",ts,ts.map(sp0),COLS.u,t,0,320)}
  const T=(id,h)=>{const e=$(id);if(e&&e._h!==h){e.innerHTML=h;e._h=h}},Tt=(id,s)=>{const e=$(id);if(e&&e.textContent!==s)e.textContent=s};
  T("vs",Number.isFinite(c.sp)?`${Math.round(c.sp)}<small>km/s</small>`:"–");
  Tt("ss",Number.isFinite(c.sp)?`density ${c.de?.toFixed(1)} p/cm³ · Bz ${c.bz?.toFixed(1)} nT · Kp ${c.kp?.toFixed(1)} → ${c.kp>=5?"storm":c.kp>=4?"unsettled":"quiet"}`:"");
  T("vo",S.ocean.length?`${c.oh?.toFixed(1)}<small>m avg · ${c.op?.toFixed(1)} s</small>`:"–");
  const big=S.ocean.slice().sort((a,b)=>b.h-a.h)[0];Tt("so",big?`biggest: ${big.name} ${big.h.toFixed(1)} m every ${big.p.toFixed(0)} s`:"");
  if(Number.isFinite(c.jv)){T("vw",`${Math.round(c.jv)}<small>km/h avg</small>`);const fast=S.jet.map(p=>[p.name,tsAt(p,t)]).sort((a,b)=>b[1]-a[1])[0];Tt("sw",`fastest: ${fast[0]} ${Math.round(fast[1])} km/h`)}
  if(S.tides.length){const o=S.tides[0],v=tsAt(o,t),prev=tsAt(o,t-6e5);T("vt",`${v.toFixed(2)}<small>m · ${v>=prev?"rising":"falling"}</small>`);Tt("st",S.tides.map(x=>`${x.name} ${tsAt(x,t).toFixed(2)} m`).join(" · ")+(S.demo.t?" (demo)":""))}
  if(S.temps.length){const ts=S.temps.map(o=>[o.name,tsAt(o,t)]).filter(x=>Number.isFinite(x[1])).sort((a,b)=>a[1]-b[1]);if(ts.length){T("vc",`${Math.round(ts[0][1])}…${Math.round(ts[ts.length-1][1])}<small>°C</small>`);Tt("sc",`coldest ${ts[0][0]}, hottest ${ts[ts.length-1][0]}`)}}
  if(c.mo){T("vm",`${Math.round(c.mo.illum*100)}%<small>${c.mo.name}</small>`);Tt("sm",`day ${c.mo.age.toFixed(1)} of 29.5 · reverb ${CFG.rev>=0?Math.round(CFG.rev*100)+"% (manual)":Math.round(map(c.mo.illum,0,1,38,85))+"%"}`)}
  T("vx",Number.isFinite(c.xf)?`${flareClass(c.xf)}<small>class</small>`:"–");
  const pk=S.xray.reduce((a,b)=>b.v>a.v?b:a,{v:0});Tt("sx",pk.v?`24h peak ${flareClass(pk.v)} at ${new Date(pk.t).toISOString().slice(11,16)} UTC`:"");
  if(S.iss){const p=c.iss||issAt(t);if(p){T("vi",`${Math.abs(p.lat).toFixed(1)}°${p.lat>=0?"N":"S"} ${Math.abs(p.lon).toFixed(1)}°${p.lon>=0?"E":"W"}<small>${Math.round(p.alt)} km</small>`);
    Tt("si",(S.iss.fix?`orbit model vs live fix: ${Math.round(S.iss.fix.err)} km apart · `:"")+(S.demo.i?"demo orbit":S.cur.issLit?"in sunlight":"in Earth's shadow"))}}
  if(S.events.length){T("ve",`${c.fires??0}<small>fires · ${c.storms??0} storms · ${c.vols??0} volcanoes</small>`);const nw=S.events.slice().sort((a,b)=>b.start-a.start)[0];Tt("se",nw?`newest: ${nw.title}`:"")}
  if(Number.isFinite(c.dst))T("vg",`${Math.round(c.dst)}<small>nT Dst · ${Number.isFinite(c.pf)?c.pf.toFixed(2):"–"} pfu</small>`);
  Tt("sg",Number.isFinite(c.dst)?(c.dst<-100?"intense geomagnetic storm":c.dst<-50?"moderate storm":c.dst<-30?"weak storm":"quiet ring current")+(c.pf>=10?" · solar radiation storm":""):"");
  if(c.air&&Number.isFinite(c.air.pm)){T("va",`${c.air.pm.toFixed(0)}<small>µg/m³ PM2.5 · UV ${c.air.uv.toFixed(1)}</small>`);Tt("sa",c.air.worst&&c.air.worst[0]?`haziest: ${c.air.worst[0]} ${Math.round(c.air.worst[1])} µg/m³`:"")}
  {const sp=sunPos(t),up=SUN_CITIES.filter(cc=>sunElev(cc[1],cc[2],sp)>0);T("vu",`${up.length}<small>of ${SUN_CITIES.length} cities in daylight</small>`);Tt("su",`${Math.round(up.reduce((a,cc)=>a+cc[3],0))} M people under the sun${S.lastSun?` · last: ${S.lastSun}`:""}`)}
  if(S.style==="pulse"&&S.bpm)Tt("bpmLbl",`♩ ${Math.round(S.bpm)} bpm`);else Tt("bpmLbl","");
  if(!S.on){if(S.quakes.length){T("vq",`${S.quakes.length}<small>quakes in 24h</small>`);Tt("sq",`largest M${Math.max(...S.quakes.map(q=>q.mag)).toFixed(1)}`)}}
}
/* ---------- piano roll with a lit keyboard ---------- */
function pushNote(n,k,v,dur){S.notes.push({n,k,v,t:performance.now(),d:dur*1000});if(S.notes.length>500)S.notes.shift()}
function drawRoll(now){const c=$("roll"),w=c.clientWidth*DPR,h=c.clientHeight*DPR;if(c.width!==w||c.height!==h){c.width=w;c.height=h}const g=c.getContext("2d");g.clearRect(0,0,w,h);
  const span=12000,lo=24,hi=100,Y=n=>h-(n-lo)/(hi-lo)*h,kw=18*DPR,nh=h/(hi-lo);
  g.fillStyle="rgba(255,255,255,.025)";for(let n=lo;n<hi;n++)if([1,3,6,8,10].includes(n%12))g.fillRect(kw,Y(n+1),w,nh);
  S.notes.forEach(nt=>{const x=kw+(w-kw)-(now-nt.t)/span*(w-kw),len=nt.d/span*(w-kw);if(x+len<kw)return;const a=clamp(nt.v/127,.25,1),fresh=now-nt.t<300;g.fillStyle=COLS[nt.k]||"#fff";g.globalAlpha=a;g.shadowColor=COLS[nt.k]||"#fff";g.shadowBlur=(fresh?20:4)*DPR;g.fillRect(Math.max(kw,x),Y(nt.n)-nh*.5-1*DPR,Math.max(3*DPR,len),Math.max(3*DPR,nh+1))});
  g.globalAlpha=1;g.shadowBlur=0;
  for(let n=lo;n<hi;n++){const blk=[1,3,6,8,10].includes(n%12),act=S.notes.find(nt=>nt.n===n&&now-nt.t<nt.d&&now>=nt.t);g.fillStyle=act?COLS[act.k]:blk?"#1a222c":"#c9d1d9";g.globalAlpha=act?1:blk?.9:.18;g.fillRect(0,Y(n+1),blk?kw*.6:kw,nh-.5)}
  g.globalAlpha=1;g.fillStyle="rgba(255,255,255,.5)";g.fillRect(w-2,0,2,h)}
/* ---------- output: spectrum, waveform, stereo vectorscope ---------- */
let td,fd,tl_,tr_;
function drawScope(){const c=$("scope"),w=c.clientWidth*DPR,h=c.clientHeight*DPR;if(c.width!==w||c.height!==h){c.width=w;c.height=h}const g=c.getContext("2d");g.fillStyle="rgba(5,7,10,.35)";g.fillRect(0,0,w,h);
  if(!A){g.fillStyle="#7d8b99";g.font=`${12*DPR}px "IBM Plex Mono",monospace`;g.fillText("press PLAY to hear the planet",16*DPR,h/2);return 0}
  td=td||new Float32Array(A.an.fftSize);fd=fd||new Uint8Array(A.an.frequencyBinCount);A.an.getFloatTimeDomainData(td);A.an.getByteFrequencyData(fd);
  const vw=Math.min(h,w*.3),sw=w-vw-8*DPR,bars=IS_MOBILE?48:96;for(let i=0;i<bars;i++){const idx=Math.floor(Math.pow(i/bars,2)*fd.length*.5),v=fd[idx]/255,bh=v*h*.9,hue=lerp(10,280,i/bars);g.fillStyle=`hsla(${hue},90%,60%,${.25+v*.6})`;g.fillRect(i*sw/bars,h-bh,sw/bars-2*DPR,bh)}
  let rms=0;g.beginPath();for(let i=0;i<td.length;i++){rms+=td[i]*td[i];const x=i/td.length*sw,y=h/2+td[i]*h*.9;i?g.lineTo(x,y):g.moveTo(x,y)}
  g.strokeStyle="#e6edf3";g.lineWidth=1.6*DPR;g.shadowColor="#3cc8ff";g.shadowBlur=10*DPR;g.stroke();g.shadowBlur=0;
  tl_=tl_||new Float32Array(A.anL.fftSize);tr_=tr_||new Float32Array(A.anR.fftSize);A.anL.getFloatTimeDomainData(tl_);A.anR.getFloatTimeDomainData(tr_);
  const ox=w-vw/2,oy=h/2,R=vw*.45;g.strokeStyle="rgba(125,139,153,.25)";g.lineWidth=DPR;g.beginPath();g.arc(ox,oy,R,0,7);g.stroke();g.fillStyle="rgba(124,255,158,.55)";
  for(let i=0;i<tl_.length;i+=2){const m=(tl_[i]+tr_[i])*.7,s=(tl_[i]-tr_[i])*.7;g.fillRect(ox+s*R*1.4,oy-m*R*1.4,1.4*DPR,1.4*DPR)}
  return Math.sqrt(rms/td.length)}
/* ---------- per-card live meters (each layer's own audio) ---------- */
const mbuf=new Float32Array(256);
function drawMeters(){if(!A)return;PAN_KEYS.forEach(k=>{const c=$("vu"+k);if(!c||!c.offsetParent)return;const w=c.clientWidth*DPR,h=c.clientHeight*DPR;if(c.width!==w){c.width=w;c.height=h}const g=c.getContext("2d");g.clearRect(0,0,w,h);
  A.meters[k].getFloatTimeDomainData(mbuf);let rms=0;g.beginPath();for(let i=0;i<mbuf.length;i++){rms+=mbuf[i]*mbuf[i];const x=i/mbuf.length*w,y=h/2+clamp(mbuf[i]*3,-1,1)*h/2;i?g.lineTo(x,y):g.moveTo(x,y)}
  g.strokeStyle=COLS[k];g.lineWidth=1.2*DPR;g.shadowColor=COLS[k];g.shadowBlur=6*DPR;g.stroke();g.shadowBlur=0;rms=Math.sqrt(rms/mbuf.length);S.hit[k]=Math.max(S.hit[k],clamp(rms*5,0,1)*.7)})}
/* ---------- title letters glow with their layer ---------- */
const TL_LAYERS=["q","s","o","x","w","t","c","i","u"];
function drawTitle(){document.querySelectorAll("#title .L").forEach((el,i)=>{const k=TL_LAYERS[i%TL_LAYERS.length];el.style.setProperty("--h",(S.hit[k]||0).toFixed(3))})}
/* ---------- event log + trace ---------- */
function chordTrace(t){return [["Sensor","Open-Meteo weather model, 2 m air temperature, 10 cities"],["Raw reading",S.temps.map(x=>`${x.name}: ${tsAt(x,t).toFixed(1)}°C`).join("\n")],["Formula","temperature −30…45 °C → scale step 0…"+(scaleFor(S.cur.kp||2).length*3-1)+"\n(cold low, hot high)"],["Sound + MIDI",`10 voices panned by longitude\nMIDI ch ${CH("c")}, one note per city`],["AI involved","none"]]}
function showTrace(tr){$("trace").querySelector("ol").innerHTML=tr.map(([a])=>`<li><b${a==="AI involved"?' class="ai0"':""}>${a}</b><span${a==="AI involved"?' class="ai0"':""}></span></li>`).join("");[...$("trace").querySelectorAll("li span")].forEach((e,i)=>e.textContent=tr[i][1])}
const EVENTS=[];
function logEv(txt,k,q,tr){const real=q?q.time:realNow();if(S.on&&EVENTS.length<60000)EVENTS.push({real:new Date(real).toISOString(),layer:k,text:txt,trace:tr||[]});
  const li=document.createElement("li");if(tr){li.onclick=()=>{showTrace(tr);if(q)auditionQuake(q,true)};if(!S.traced){S.traced=1;showTrace(tr)}}
  const tm=new Date(real).toISOString().slice(11,19);li.innerHTML=`<span>${tm}</span>${q?`<b>M${q.mag.toFixed(1)}</b>`:`<b style="color:${COLS[k]}">${{x:"FLARE",u:"SUN",e:"NASA",i:"ISS",c:"CHORD"}[k]||"•"}</b>`}<span></span>`;li.lastChild.textContent=q?txt.split(" · ").slice(1).join(" · "):txt;
  const ul=$("log");ul.prepend(li);while(ul.children.length>40)ul.lastChild.remove()}

let lastFrame=0;
function frame(now){
  try{drawMap(now);drawTimeline();if(now-lastFrame>(IS_MOBILE?120:60)){drawSparks();lastFrame=now}drawRoll(now);const rms=drawScope();S.rms=rms||0;drawMeters();drawTitle();
  const glow=clamp((rms||0)*6+S.hit.q*.6,0,1);document.documentElement.style.setProperty("--glow",glow.toFixed(3));
  [...PAN_KEYS,"m"].forEach(k=>{S.hit[k]*=.93;const el=$("c"+k);if(el)el.style.setProperty("--hit",S.hit[k].toFixed(3))});
  if($("mini"))$("mini").style.setProperty("--lvl",clamp((rms||0)*5,0,1).toFixed(3))}catch(err){console.error(err)}
  requestAnimationFrame(frame);
}
