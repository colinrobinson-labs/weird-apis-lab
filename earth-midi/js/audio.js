/* Earth MIDI v0.5 · sound engine + MIDI.
   Pure Web Audio: oscillators, filters, noise and convolution, built live.
   No samples, no neural nets, no generated audio. */
"use strict";
let A=null;
const mtof=m=>(+CFG.tune||440)*Math.pow(2,(m-69)/12);
const NN=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],noteName=n=>NN[((n%12)+12)%12]+(Math.floor(n/12)-1);
let ROOT=50;
const setRoot=()=>{ROOT=48+(+CFG.key)+12*(+CFG.oct)};
function kpScaleName(kp){return kp>=5?"minor pentatonic":kp>=4?"dorian":"major pentatonic"}
function scaleFor(kp){if(CFG.scale!=="auto"&&SCALES[CFG.scale])return SCALES[CFG.scale];return kp>=5?SCALES.minpent:kp>=4?SCALES.dorian:SCALES.majpent}
function scaleLabel(kp){return CFG.scale==="auto"?`${kpScaleName(kp)} (Kp ${kp.toFixed(1)})`:$("p_scale")?.selectedOptions?.[0]?.textContent||CFG.scale}
function degree(sc,i,base=ROOT){const o=Math.floor(i/sc.length);return base+12*o+sc[((i%sc.length)+sc.length)%sc.length]}
const muted=k=>S.mute[k]||(S.solo&&S.solo!==k);
const W_=p=>clamp(p*(+CFG.width),-1,1);

/* ---------- impulse responses: one per room type, generated from noise + physics-ish decay ---------- */
const ROOMS={hall:{len:3.6,damp:.72,pre:.018,er:6,bright:.85},plate:{len:2.4,damp:.45,pre:.004,er:0,bright:1},cathedral:{len:7,damp:.8,pre:.035,er:9,bright:.7},cave:{len:4.5,damp:.9,pre:.06,er:14,bright:.45},room:{len:1.1,damp:.6,pre:.006,er:5,bright:.8},space:{len:9,damp:.55,pre:.08,er:0,bright:.95}};
function genIR(ctx,type){const r=ROOMS[type]||ROOMS.hall,sr=ctx.sampleRate,len=Math.floor(sr*r.len),ir=ctx.createBuffer(2,len,sr);
  for(let c=0;c<2;c++){const d=ir.getChannelData(c);let lp=0;const pre=Math.floor(r.pre*sr);
    for(let i=pre;i<len;i++){const t=(i-pre)/(len-pre),n=Math.random()*2-1,k=r.bright*(1-r.damp*t);lp+=(n-lp)*clamp(k,.03,1);d[i]=lp*Math.pow(1-t,2.4)*(i-pre<sr*.01?(i-pre)/(sr*.01):1)}
    for(let e=0;e<r.er;e++){const at=pre+Math.floor(sr*(.008+Math.random()*.09*(1+e/4))),g=(Math.random()*.6+.2)*(1-e/(r.er+2))*(c?-1:1)*(Math.random()<.5?-1:1);if(at<len)d[at]+=g}}
  return ir}
function driveCurve(amt){const n=2048,c=new Float32Array(n),k=1+amt*14;for(let i=0;i<n;i++){const x=i/(n-1)*2-1;c[i]=Math.tanh(k*x)/Math.tanh(k)}return c}

function initAudio(){
  const ctx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:"playback"});
  const sum=ctx.createGain();
  const hp=ctx.createBiquadFilter();hp.type="highpass";hp.frequency.value=20;hp.Q.value=.5;
  const ls=ctx.createBiquadFilter();ls.type="lowshelf";ls.frequency.value=160;
  const hs=ctx.createBiquadFilter();hs.type="highshelf";hs.frequency.value=7000;
  const pre=ctx.createGain(),sh=ctx.createWaveShaper(),post=ctx.createGain();sh.oversample="4x";sh.curve=driveCurve(CFG.drive);
  const mlp=ctx.createBiquadFilter();mlp.type="lowpass";mlp.frequency.value=20000;mlp.Q.value=.5;
  const comp=ctx.createDynamicsCompressor();comp.threshold.value=-18;comp.knee.value=12;comp.ratio.value=3.5;comp.attack.value=.012;comp.release.value=.25;
  const lim=ctx.createDynamicsCompressor();lim.threshold.value=-1.5;lim.knee.value=0;lim.ratio.value=20;lim.attack.value=.002;lim.release.value=.08;
  const out=ctx.createGain();out.gain.value=0;
  const an=ctx.createAnalyser();an.fftSize=2048;an.smoothingTimeConstant=.82;
  const spl=ctx.createChannelSplitter(2),anL=ctx.createAnalyser(),anR=ctx.createAnalyser();anL.fftSize=anR.fftSize=1024;
  sum.connect(hp);hp.connect(ls);ls.connect(hs);hs.connect(pre);pre.connect(sh);sh.connect(post);post.connect(mlp);mlp.connect(comp);comp.connect(lim);
  lim.connect(an);lim.connect(spl);spl.connect(anL,0);spl.connect(anR,1);lim.connect(out);out.connect(ctx.destination);
  const recDest=ctx.createMediaStreamDestination?ctx.createMediaStreamDestination():null;if(recDest)lim.connect(recDest);
  // reverb
  const rev=ctx.createConvolver();rev.buffer=genIR(ctx,CFG.revType);const revG=ctx.createGain();revG.gain.value=.55;rev.connect(revG);revG.connect(sum);
  // ping-pong delay
  const dl=ctx.createDelay(2),dr=ctx.createDelay(2),fb=ctx.createGain(),dlg=ctx.createGain(),mrg=ctx.createChannelMerger(2),dlf=ctx.createBiquadFilter();
  dl.delayTime.value=.375;dr.delayTime.value=.375;fb.gain.value=.38;dlg.gain.value=.3;dlf.type="lowpass";dlf.frequency.value=3200;
  dlg.connect(dl);dl.connect(dlf);dlf.connect(dr);dr.connect(fb);fb.connect(dl);dl.connect(mrg,0,0);dr.connect(mrg,0,1);mrg.connect(sum);mrg.connect(rev);
  // pink-ish noise
  const nb=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate),nd=nb.getChannelData(0);let b0=0,b1=0,b2=0;for(let i=0;i<nd.length;i++){const w=Math.random()*2-1;b0=.99765*b0+w*.099;b1=.963*b1+w*.2965;b2=.57*b2+w*1.0526;nd[i]=(b0+b1+b2+w*.1848)*.18}
  // sidechain duck group (pads, drones, beds)
  const duck=ctx.createGain();duck.connect(sum);
  A={ctx,sum,out,rev,revG,dly:dlg,an,anL,anR,nb,buses:{},sends:{},meters:{},mlp,hp,ls,hs,sh,pre,post,dl,dr,fb,lim,duck,recDest,curRev:CFG.revType,curDrive:CFG.drive};
  const DUCKED="sotwcaueg";
  PAN_KEYS.forEach(k=>{const g=ctx.createGain();g.connect(DUCKED.includes(k)?duck:sum);const sR=ctx.createGain();sR.gain.value=CFG.send[k];g.connect(sR);sR.connect(rev);
    const m=ctx.createAnalyser();m.fftSize=256;m.smoothingTimeConstant=.6;g.connect(m);A.buses[k]=g;A.sends[k]=sR;A.meters[k]=m});
  buildPad();buildSurf();buildShimmer();buildWind();buildTide();buildChoir();buildISS();buildEvents();buildMag();buildAir();
  applyMaster(true);
}
function applyMaster(force){if(!A)return;const c=A.ctx.currentTime;
  A.hp.frequency.setTargetAtTime(+CFG.hpf,c,.05);A.ls.gain.setTargetAtTime(+CFG.lowEq,c,.05);A.hs.gain.setTargetAtTime(+CFG.highEq,c,.05);
  A.pre.gain.setTargetAtTime(1+CFG.drive*1.5,c,.05);A.post.gain.setTargetAtTime(1/(1+CFG.drive*1.1),c,.05);
  if(force||A.curDrive!==CFG.drive){A.sh.curve=driveCurve(+CFG.drive);A.curDrive=CFG.drive}
  if(force||A.curRev!==CFG.revType){A.rev.buffer=genIR(A.ctx,CFG.revType);A.curRev=CFG.revType}
  PAN_KEYS.forEach(k=>A.sends[k].gain.setTargetAtTime(+CFG.send[k],c,.05))}

/* ---------- Sun: evolving pad (type selectable) ---------- */
const PADTYPE={saw:"sawtooth",soft:"triangle",hollow:"square",pure:"sine"};
function buildPad(){
  const {ctx}=A,flt=ctx.createBiquadFilter(),flt2=ctx.createBiquadFilter(),g=ctx.createGain();
  flt.type="lowpass";flt.frequency.value=800;flt.Q.value=2;flt2.type="highpass";flt2.frequency.value=70;g.gain.value=0;
  flt.connect(flt2);flt2.connect(g);g.connect(A.buses.s);
  const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=.07;lg.gain.value=250;lfo.connect(lg);lg.connect(flt.frequency);lfo.start();
  const voices=[];for(let v=0;v<4;v++)for(const det of[-7,7]){const o=ctx.createOscillator();o.type=PADTYPE[CFG.inst.s]||"sawtooth";o.detune.value=det+(Math.random()*4-2);const vg=ctx.createGain();vg.gain.value=.05;const p=ctx.createStereoPanner();p.pan.value=W_(det<0?-.45:.45);o.connect(vg);vg.connect(p);p.connect(flt);o.start();voices.push({o,vg,v,p,det})}
  A.pad={flt,g,voices,lfo,chordIx:0,lastChord:0,type:CFG.inst.s};
}
/* ---------- Ocean: filtered noise surf at the real swell period ---------- */
function buildSurf(){
  const {ctx}=A,src=ctx.createBufferSource();src.buffer=A.nb;src.loop=true;
  const bp=ctx.createBiquadFilter();bp.type="bandpass";bp.frequency.value=700;bp.Q.value=.6;
  const lp=ctx.createBiquadFilter();lp.type="lowpass";lp.frequency.value=2500;
  const am=ctx.createGain();am.gain.value=.5;const lfo=ctx.createOscillator();lfo.frequency.value=.1;const lg=ctx.createGain();lg.gain.value=.5;lfo.connect(lg);lg.connect(am.gain);lfo.start();
  const g=ctx.createGain();g.gain.value=0;const pan=ctx.createStereoPanner();const pl=ctx.createOscillator();pl.frequency.value=.031;const pg=ctx.createGain();pg.gain.value=.6;pl.connect(pg);pg.connect(pan.pan);pl.start();
  src.connect(bp);bp.connect(lp);lp.connect(am);am.connect(g);g.connect(pan);pan.connect(A.buses.o);src.start();
  A.surf={bp,g,lfo,pg};
}
/* ---------- Flares: high sine cluster shimmer ---------- */
function buildShimmer(){
  const {ctx}=A,g=ctx.createGain();g.gain.value=0;const f=ctx.createBiquadFilter();f.type="bandpass";f.frequency.value=4000;f.Q.value=.7;
  const oscs=[74,81,86,93].map((m,i)=>{const o=ctx.createOscillator();o.frequency.value=mtof(m);const tg=ctx.createGain();tg.gain.value=0;const l=ctx.createOscillator();l.frequency.value=.13+i*.07;const lg=ctx.createGain();lg.gain.value=.05;l.connect(lg);lg.connect(tg.gain);const p=ctx.createStereoPanner();p.pan.value=W_([-.7,.7,-.3,.3][i]);o.connect(tg);tg.connect(p);p.connect(f);o.start();l.start();return o});
  f.connect(g);g.connect(A.buses.x);A.shim={g,f,oscs};
}
/* ---------- Jet stream: resonant wind ---------- */
function buildWind(){const {ctx}=A,src=ctx.createBufferSource();src.buffer=A.nb;src.loop=true;src.playbackRate.value=.7;
  const bp=ctx.createBiquadFilter();bp.type="bandpass";bp.Q.value=5;bp.frequency.value=600;const bp2=ctx.createBiquadFilter();bp2.type="bandpass";bp2.Q.value=9;bp2.frequency.value=1100;
  const lfo=ctx.createOscillator();lfo.frequency.value=.09;const lg=ctx.createGain();lg.gain.value=220;lfo.connect(lg);lg.connect(bp.frequency);lg.connect(bp2.frequency);lfo.start();
  const g=ctx.createGain();g.gain.value=0;const pan=ctx.createStereoPanner();const pl=ctx.createOscillator();pl.frequency.value=.05;const pg=ctx.createGain();pg.gain.value=.8;pl.connect(pg);pg.connect(pan.pan);pl.start();
  src.connect(bp);src.connect(bp2);bp.connect(g);bp2.connect(g);g.connect(pan);pan.connect(A.buses.w);src.start();A.wind={bp,bp2,g,lfo,pg}}
/* ---------- Tides: sub drone bent by measured water level ---------- */
function buildTide(){const {ctx}=A,o=ctx.createOscillator(),o2=ctx.createOscillator(),lp=ctx.createBiquadFilter(),g=ctx.createGain();o.type="triangle";o2.type="sine";
  o.frequency.value=mtof(ROOT-12);o2.frequency.value=mtof(ROOT-24);lp.type="lowpass";lp.frequency.value=260;g.gain.value=0;const g2=ctx.createGain();g2.gain.value=.8;
  o.connect(lp);o2.connect(g2);g2.connect(lp);lp.connect(g);g.connect(A.buses.t);o.start();o2.start();A.tide={o,o2,g}}
/* ---------- Planet chord: one voice per city, pitch = live temperature; air pollution adds haze ---------- */
const CHORDTYPE={voices:["sawtooth",1],strings:["sawtooth",0],glass:["sine",0],reed:["square",.6]};
function buildChoir(){const {ctx}=A,out=ctx.createGain();out.gain.value=0;const f1=ctx.createBiquadFilter(),f2=ctx.createBiquadFilter();f1.type="bandpass";f1.frequency.value=720;f1.Q.value=3;f2.type="bandpass";f2.frequency.value=1150;f2.Q.value=4;
  const mix=ctx.createGain();const form=ctx.createGain(),dry=ctx.createGain();mix.connect(form);form.connect(f1);form.connect(f2);mix.connect(dry);f1.connect(out);f2.connect(out);dry.connect(out);
  const haze=ctx.createWaveShaper();haze.curve=driveCurve(0);haze.oversample="2x";const hlp=ctx.createBiquadFilter();hlp.type="lowpass";hlp.frequency.value=9000;out.connect(haze);haze.connect(hlp);hlp.connect(A.buses.c);
  const vib=ctx.createOscillator();vib.frequency.value=4.6;const vg=ctx.createGain();vg.gain.value=4;vib.connect(vg);vib.start();
  const voices=CITIES.map((_,i)=>{const o=ctx.createOscillator();o.frequency.value=220;vg.connect(o.detune);const g=ctx.createGain();g.gain.value=.022;const p=ctx.createStereoPanner();p.pan.value=W_(clamp(CITIES[i][2]/180,-1,1)*.8);o.connect(g);g.connect(p);p.connect(mix);o.start();return {o,g,p,note:0}});
  A.choir={out,voices,last:-99,form,dry,haze,hlp,hazeAmt:-1};setChoirType()}
function setChoirType(){if(!A)return;const [t,f]=CHORDTYPE[CFG.inst.c]||CHORDTYPE.voices;A.choir.voices.forEach(v=>v.o.type=t);A.choir.form.gain.value=f;A.choir.dry.gain.value=f?.35:.9}
function setPadType(){if(!A)return;A.pad.voices.forEach(v=>v.o.type=PADTYPE[CFG.inst.s]||"sawtooth")}
/* ---------- ISS: beacon whose pitch follows latitude; plucks every 5° of ground track ---------- */
function buildISS(){const {ctx}=A,o=ctx.createOscillator(),g=ctx.createGain(),p=ctx.createStereoPanner(),f=ctx.createBiquadFilter();o.type="sine";f.type="lowpass";f.frequency.value=2400;g.gain.value=0;o.connect(f);f.connect(g);g.connect(p);p.connect(A.buses.i);o.start();
  const t=ctx.createOscillator(),tg=ctx.createGain();t.frequency.value=5.5;tg.gain.value=6;t.connect(tg);tg.connect(o.detune);t.start();A.issV={o,g,p,f,lastArc:null}}
function issPluck(n,vel,pan,land){if(!A||muted("i"))return;const {ctx}=A,c=ctx.currentTime+.01,f=mtof(n),o=ctx.createOscillator(),m=ctx.createOscillator(),mg=ctx.createGain(),g=ctx.createGain(),p=ctx.createStereoPanner();
  const inst=CFG.inst.i;o.type=inst==="square"?"square":"sine";m.frequency.value=f*(land?3:2);mg.gain.setValueAtTime(f*(inst==="pluck"?2.5:inst==="glass"?1.2:.4),c);mg.gain.exponentialRampToValueAtTime(f*.01,c+.25);
  o.frequency.value=f;g.gain.setValueAtTime(0,c);g.gain.linearRampToValueAtTime(Math.pow(vel/127,1.4)*.16*(inst==="square"?.5:1),c+.004);g.gain.exponentialRampToValueAtTime(.0004,c+(inst==="glass"?2.4:.9));
  p.pan.value=W_(pan);m.connect(mg);mg.connect(o.frequency);o.connect(g);g.connect(p);p.connect(A.buses.i);p.connect(A.dly);o.start(c);m.start(c);o.stop(c+2.6);m.stop(c+2.6)}
/* ---------- NASA EONET: wildfire crackle, volcano drones, storm swirl ---------- */
function buildEvents(){const {ctx}=A,cr=ctx.createGain();cr.gain.value=1;const hp=ctx.createBiquadFilter();hp.type="highpass";hp.frequency.value=1800;cr.connect(hp);hp.connect(A.buses.e);
  const vol=ctx.createGain();vol.gain.value=0;const vlp=ctx.createBiquadFilter();vlp.type="lowpass";vlp.frequency.value=180;vlp.Q.value=4;vol.connect(vlp);vlp.connect(A.buses.e);
  const vo=[0,1,2,3,4,5].map(i=>{const o=ctx.createOscillator();o.type="sawtooth";o.frequency.value=mtof(ROOT-24+[0,7,12,-5,3,10][i]);o.detune.value=(i-2.5)*9;const g=ctx.createGain();g.gain.value=0;o.connect(g);g.connect(vol);o.start();return {o,g}});
  const st=ctx.createBufferSource();st.buffer=A.nb;st.loop=true;st.playbackRate.value=.4;const sbp=ctx.createBiquadFilter();sbp.type="bandpass";sbp.Q.value=2;sbp.frequency.value=400;const sg=ctx.createGain();sg.gain.value=0;
  const sl=ctx.createOscillator();sl.frequency.value=.2;const sl2=ctx.createGain();sl2.gain.value=300;sl.connect(sl2);sl2.connect(sbp.frequency);sl.start();const sp=ctx.createStereoPanner();const spl=ctx.createOscillator();spl.frequency.value=.13;const spg=ctx.createGain();spg.gain.value=.9;spl.connect(spg);spg.connect(sp.pan);spl.start();
  st.connect(sbp);sbp.connect(sg);sg.connect(sp);sp.connect(A.buses.e);st.start();
  A.ev={cr,vol,vo,sg,sl,nextCrackle:0}}
function crackle(when,amp){const {ctx}=A,n=ctx.createBufferSource();n.buffer=A.nb;const g=ctx.createGain(),p=ctx.createStereoPanner();const d=.004+Math.random()*.02;
  g.gain.setValueAtTime(amp,when);g.gain.exponentialRampToValueAtTime(.0005,when+d);p.pan.value=W_(Math.random()*1.6-.8);n.connect(g);g.connect(p);p.connect(A.ev.cr);n.start(when,Math.random()*3.5);n.stop(when+d+.01)}
/* ---------- Magnetosphere: Dst ring-current drone + proton glitter ---------- */
function buildMag(){const {ctx}=A,a=ctx.createOscillator(),b=ctx.createOscillator(),rm=ctx.createGain(),g=ctx.createGain(),f=ctx.createBiquadFilter();
  a.frequency.value=mtof(ROOT);b.frequency.value=mtof(ROOT)*1.414;rm.gain.value=0;b.connect(rm.gain);a.connect(rm);f.type="bandpass";f.frequency.value=900;f.Q.value=1.5;rm.connect(f);f.connect(g);g.gain.value=0;g.connect(A.buses.g);a.start();b.start();
  const sw=ctx.createOscillator();sw.frequency.value=.03;const swg=ctx.createGain();swg.gain.value=500;sw.connect(swg);swg.connect(f.frequency);sw.start();
  A.mag={a,b,g,f,nextGlit:0}}
function glitter(when,n,amp){const {ctx}=A,o=ctx.createOscillator(),g=ctx.createGain(),p=ctx.createStereoPanner();o.type="sine";o.frequency.value=mtof(n);g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(amp,when+.002);g.gain.exponentialRampToValueAtTime(.0003,when+.18);p.pan.value=W_(Math.random()*2-1);o.connect(g);g.connect(p);p.connect(A.buses.g);p.connect(A.dly);o.start(when);o.stop(when+.2)}
/* ---------- Air: breathy haze bed (PM2.5 = level, UV = brightness) ---------- */
function buildAir(){const {ctx}=A,s=ctx.createBufferSource();s.buffer=A.nb;s.loop=true;s.playbackRate.value=1.3;const f=ctx.createBiquadFilter();f.type="bandpass";f.Q.value=.8;f.frequency.value=2000;const g=ctx.createGain();g.gain.value=0;
  const l=ctx.createOscillator();l.frequency.value=.11;const lg=ctx.createGain();lg.gain.value=.3;const am=ctx.createGain();am.gain.value=.7;l.connect(lg);lg.connect(am.gain);l.start();
  s.connect(f);f.connect(am);am.connect(g);g.connect(A.buses.a);s.start();A.air={f,g}}
/* ---------- Sunrise chorus: a chime when the sun actually rises or sets over a big city ---------- */
function sunChime(city,rise){const sc=scaleFor(S.cur.kp||2),n=degree(sc,Math.round(map(city[1],-40,65,1,12)),ROOT+12),vel=Math.round(map(Math.log10(city[3]+.1),-.6,1.6,50,118));
  if(A&&!muted("u")){const {ctx}=A,c=ctx.currentTime+.02,steps=rise?[0,4,7]:[7,4,0],inst=CFG.inst.u;
    steps.forEach((s,i)=>{const nn=n+(s===4?(sc.includes(4)?4:3):s),o=ctx.createOscillator(),o2=ctx.createOscillator(),g=ctx.createGain(),p=ctx.createStereoPanner();const tt=c+i*.11;
      o.type=inst==="warm"?"triangle":"sine";o.frequency.value=mtof(nn);o2.type="sine";o2.frequency.value=mtof(nn)*(inst==="chime"?2.76:2);const g2=ctx.createGain();g2.gain.value=inst==="soft"?0:.35;o2.connect(g2);g2.connect(g);
      g.gain.setValueAtTime(0,tt);g.gain.linearRampToValueAtTime(Math.pow(vel/127,1.5)*.13,tt+.01);g.gain.exponentialRampToValueAtTime(.0004,tt+3.2);p.pan.value=W_(clamp(city[2]/180,-1,1)*.85);
      o.connect(g);g.connect(p);p.connect(A.buses.u);o.start(tt);o2.start(tt);o.stop(tt+3.4);o2.stop(tt+3.4)})}
  midiNote(CH("u"),n,vel,1500);pushNote(n,"u",vel,2.5);S.hit.u=1;return {n,vel}}

/* ---------- per-tick engine update: every parameter is set from a measurement ---------- */
function updateEngine(){
  if(!A)return;const t=realNow(),c=A.ctx.currentTime;
  const sp=at(S.sun.t,S.sun.speed,t),de=at(S.sun.t,S.sun.density,t),bz=at(S.sun.mt,S.sun.bz,t),bt=at(S.sun.mt,S.sun.bt,t),kp=kpAt(t);
  if(Number.isFinite(sp)){
    A.pad.flt.frequency.setTargetAtTime(map(sp,250,900,260,4200)*(bz<-5?.6:1),c,1.5);
    A.pad.flt.Q.setTargetAtTime(map(de,0,25,1,9),c,2);
    A.pad.lfo.frequency.setTargetAtTime(map(Number.isFinite(bt)?bt:5,0,30,.04,.5),c,2);
    A.pad.g.gain.setTargetAtTime(muted("s")?0:map(de,0,20,.32,.55),c,1);
  }
  const sc=scaleFor(kp),prog=CFG.prog==="kp"?(kp>=4?PROGS.minor:PROGS.classic):(PROGS[CFG.prog]||PROGS.classic);
  if(c-A.pad.lastChord>+CFG.chordEvery){A.pad.lastChord=c;A.pad.chordIx=(A.pad.chordIx+1)%prog.length;const ch=prog[A.pad.chordIx];
    A.pad.voices.forEach(x=>x.o.frequency.setTargetAtTime(mtof(degree(sc,ch[x.v],ROOT-12)),c,.9));
    const bzDark=Number.isFinite(bz)&&bz<-8;A.pad.voices.forEach(x=>x.vg.gain.setTargetAtTime(.05*(bzDark&&x.v===3?1.4:1),c,1));
    midiCC(CH("s"),1,map(sp,250,900,0,127));midiCC(CH("s"),2,map(de,0,30,0,127));midiCC(CH("s"),3,map(bz,-20,20,0,127));midiCC(CH("s"),4,map(kp,0,9,0,127));
    const rn=degree(sc,ch[0],ROOT-12);if(A.pad.rootNote)midiOff(CH("s"),A.pad.rootNote);midiOn(CH("s"),rn,70);A.pad.rootNote=rn;pushNote(rn,"s",60,+CFG.chordEvery*.9);S.hit.s=.6;
  }
  const oc=oceanAt(t),oh=oc.h,op=oc.p;
  A.surf.g.gain.setTargetAtTime(muted("o")?0:map(oh,0,6,.05,.42),c,1);A.surf.lfo.frequency.setTargetAtTime(1/Math.max(3,op),c,1);A.surf.bp.frequency.setTargetAtTime(map(op,4,16,1400,380),c,2);A.surf.pg.gain.setTargetAtTime(.6*CFG.width,c,.2);
  const xf=xrayAt(t),lx=Number.isFinite(xf)?Math.log10(xf):-8;
  A.shim.g.gain.setTargetAtTime(muted("x")?0:map(lx,-8,-4,.0,.16),c,1.2);A.shim.f.frequency.setTargetAtTime(map(lx,-8,-4,2000,9000),c,2);
  PAN_KEYS.forEach(k=>A.buses[k].gain.setTargetAtTime(muted(k)?0:+CFG.vol[k],c,.08));
  A.mlp.frequency.setTargetAtTime(+CFG.mlp,c,.1);A.dl.delayTime.setTargetAtTime(+CFG.dtime,c,.1);A.dr.delayTime.setTargetAtTime(+CFG.dtime,c,.1);A.fb.gain.setTargetAtTime(+CFG.dfb,c,.1);
  const jv=jetAvg(t);if(Number.isFinite(jv)){A.wind.bp.frequency.setTargetAtTime(map(jv,60,320,280,1500),c,2);A.wind.bp2.frequency.setTargetAtTime(map(jv,60,320,600,2600),c,2);A.wind.g.gain.setTargetAtTime(muted("w")?0:map(jv,60,320,.08,.5),c,1.5);A.wind.lfo.frequency.setTargetAtTime(map(jv,60,320,.05,.3),c,2)}
  A.wind.pg.gain.setTargetAtTime(.8*CFG.width,c,.2);
  const tn=S.tides.length?tideNorm(S.tides[0],t):0;A.tide.o.frequency.setTargetAtTime(mtof(ROOT-12),c,.5);A.tide.o2.frequency.setTargetAtTime(mtof(ROOT-24),c,.5);A.tide.o.detune.setTargetAtTime(tn*50,c,1);A.tide.o2.detune.setTargetAtTime(tn*50,c,1);A.tide.g.gain.setTargetAtTime(muted("t")?0:(S.style==="pulse"?.12:.28),c,1);
  const mo=moon(t);A.revG.gain.setTargetAtTime(CFG.rev>=0?+CFG.rev:map(mo.illum,0,1,.38,.85),c,3);
  // planet chord
  A.choir.out.gain.setTargetAtTime(muted("c")?0:.9,c,1.5);
  if(c-A.choir.last>20&&S.temps.length){A.choir.last=c;const steps=sc.length*3;
    A.choir.voices.forEach((v,i)=>{const T=tsAt(S.temps[i],t);if(!Number.isFinite(T))return;const n=degree(sc,Math.round(map(T,-30,45,0,steps-1)),ROOT+12*CFG.coct);if(v.note)midiOff(CH("c"),v.note);v.o.frequency.setTargetAtTime(mtof(n),c,1.2);v.note=n;midiOn(CH("c"),n,60);pushNote(n,"c",50,6)});
    logEv("Planet chord: "+S.temps.map(x=>`${x.name} ${Math.round(tsAt(x,t))}°`).join(", "),"c",null,chordTrace(t));S.hit.c=.8}
  // air: PM2.5 → haze on the chord + breathy bed; UV → brightness
  const air=airAt(t);if(Number.isFinite(air.pm)){const hz=map(air.pm,5,60,0,.85);if(Math.abs(hz-A.choir.hazeAmt)>.04){A.choir.haze.curve=driveCurve(hz);A.choir.hazeAmt=hz}
    A.choir.hlp.frequency.setTargetAtTime(map(air.pm,5,80,12000,2600),c,2);A.air.g.gain.setTargetAtTime(muted("a")?0:map(air.pm,0,60,.02,.22),c,2);A.air.f.frequency.setTargetAtTime(map(air.uv,0,10,700,5200),c,2);
    midiCC(CH("a"),14,map(air.pm,0,100,0,127));midiCC(CH("a"),15,map(air.uv,0,11,0,127))}
  // ISS
  if(S.iss){const p=issAt(t);if(p){const sp2=sunPos(t),lit=sunElev(p.lat,p.lon,sp2)>-18;
    A.issV.o.frequency.setTargetAtTime(mtof(degree(sc,Math.round(map(p.lat,-52,52,0,sc.length*2)),ROOT+12)),c,.4);A.issV.g.gain.setTargetAtTime(muted("i")?0:(lit?.035:.018),c,.5);A.issV.p.pan.setTargetAtTime(W_(clamp(p.lon/180,-1,1)*.85),c,.2);
    midiCC(CH("i"),16,map(p.lat,-52,52,0,127));midiCC(CH("i"),17,map(p.lon,-180,180,0,127));S.cur.iss=p;S.cur.issLit=lit}}
  // events: wildfire crackle density, volcano drones, storm swirl
  const act=S.events.filter(e=>e.start<=t),fires=act.filter(e=>e.kind==="fire").length,vols=act.filter(e=>e.kind==="volcano").length,storms=act.filter(e=>e.kind==="storm").length;
  A.ev.vo.forEach((v,i)=>{v.g.gain.setTargetAtTime(i<vols?.05:0,c,2);v.o.frequency.setTargetAtTime(mtof(ROOT-24+[0,7,12,-5,3,10][i]),c,1)});A.ev.vol.gain.setTargetAtTime(muted("e")?0:.9,c,1);
  A.ev.sg.gain.setTargetAtTime(muted("e")?0:map(storms,0,8,0,.28),c,2);A.ev.sl.frequency.setTargetAtTime(map(storms,0,8,.05,.6),c,2);
  if(!muted("e")&&fires){const rate=clamp(fires/12,.3,14);while(A.ev.nextCrackle<c+.15){A.ev.nextCrackle=Math.max(A.ev.nextCrackle,c)+(-Math.log(1-Math.random()))/rate;crackle(A.ev.nextCrackle,.25+Math.random()*.4)}}
  midiCC(CH("e"),20,map(fires,0,400,0,127));midiCC(CH("e"),21,map(vols,0,20,0,127));midiCC(CH("e"),22,map(storms,0,10,0,127));
  // magnetosphere
  const dst=dstAt(t),pf=protAt(t);A.mag.g.gain.setTargetAtTime(muted("g")?0:map(-(Number.isFinite(dst)?dst:0),-10,150,0,.2),c,2);A.mag.a.frequency.setTargetAtTime(mtof(ROOT),c,1);A.mag.b.frequency.setTargetAtTime(mtof(ROOT)*map(-(dst||0),0,200,1.414,2.618),c,2);
  if(!muted("g")&&Number.isFinite(pf)){const rate=clamp(map(Math.log10(pf),-1,3,.15,12),.15,12);while(A.mag.nextGlit<c+.15){A.mag.nextGlit=Math.max(A.mag.nextGlit,c)+(-Math.log(1-Math.random()))/rate;glitter(A.mag.nextGlit,degree(sc,8+Math.floor(Math.random()*6),ROOT+12),.05)}}
  midiCC(CH("g"),23,map(-(dst||0),-20,200,0,127));midiCC(CH("g"),24,map(Math.log10(pf||.1),-1,4,0,127));
  midiCC(CH("w"),7,map(jv,60,320,0,127));midiCC(CH("t"),8,map(tn,-1,1,0,127));midiPB(CH("t"),tn);midiCC(CH("m"),9,mo.illum*127);midiCC(CH("o"),5,map(oh,0,8,0,127));midiCC(CH("x"),6,map(lx,-8,-4,0,127));
  Object.assign(S.cur,{sp,de,bz,bt,kp,oh,op,xf,jv,tn,mo,air,dst,pf,fires,vols,storms,act:act.length});
}

/* ---------- Pulse: drums + bass; tempo from solar wind, hats from quake rate, ghosts from Kp ---------- */
const PATTERNS={four:{k:"x...x...x...x...",s:"....x.......x..."},break:{k:"x.........x.x...",s:"....x.......x..x"},half:{k:"x.......x.......",s:"........x......."},dembow:{k:"x...x...x...x...",s:"...x..x....x..x."},minimal:{k:"x...x...x...x...",s:"................"},broken:{k:"x..x......x..x..",s:"....x.......x...."}};
function drum(kind,time,vel=1){const {ctx}=A;
  if(kind==="k"){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(155,time);o.frequency.exponentialRampToValueAtTime(42,time+.12);g.gain.setValueAtTime(.95*vel,time);g.gain.exponentialRampToValueAtTime(.001,time+.45);o.connect(g);g.connect(A.buses.r);o.start(time);o.stop(time+.5);
    const ck=ctx.createBufferSource();ck.buffer=A.nb;const cg=ctx.createGain(),cf=ctx.createBiquadFilter();cf.type="highpass";cf.frequency.value=3000;cg.gain.setValueAtTime(.25*vel,time);cg.gain.exponentialRampToValueAtTime(.001,time+.012);ck.connect(cf);cf.connect(cg);cg.connect(A.buses.r);ck.start(time,Math.random()*3);ck.stop(time+.02);
    if(CFG.duck>0){const d=A.duck.gain;d.cancelScheduledValues(time);d.setTargetAtTime(1-CFG.duck,time,.004);d.setTargetAtTime(1,time+.05,.11)}}
  else if(kind==="s"){const n=ctx.createBufferSource();n.buffer=A.nb;const bp=ctx.createBiquadFilter();bp.type="bandpass";bp.frequency.value=1900;bp.Q.value=.7;const g=ctx.createGain();g.gain.setValueAtTime(.55*vel,time);g.gain.exponentialRampToValueAtTime(.001,time+.19);n.connect(bp);bp.connect(g);g.connect(A.buses.r);n.start(time,Math.random()*3);n.stop(time+.22);
    const o=ctx.createOscillator(),og=ctx.createGain();o.type="triangle";o.frequency.setValueAtTime(210,time);o.frequency.exponentialRampToValueAtTime(140,time+.08);og.gain.setValueAtTime(.35*vel,time);og.gain.exponentialRampToValueAtTime(.001,time+.12);o.connect(og);og.connect(A.buses.r);o.start(time);o.stop(time+.14)}
  else{const n=ctx.createBufferSource();n.buffer=A.nb;const hp=ctx.createBiquadFilter();hp.type="highpass";hp.frequency.value=7500;const g=ctx.createGain(),p=ctx.createStereoPanner();p.pan.value=W_(.25);g.gain.setValueAtTime(.35*vel,time);g.gain.exponentialRampToValueAtTime(.001,time+(kind==="o"?.18:.05));n.connect(hp);hp.connect(g);g.connect(p);p.connect(A.buses.r);n.start(time,Math.random()*3);n.stop(time+.2)}}
function bassNote(n,time,len){const {ctx}=A,o=ctx.createOscillator(),o2=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain();o.type="sawtooth";o2.type="square";o2.detune.value=-1200;o.frequency.value=mtof(n);o2.frequency.value=mtof(n);const g2=ctx.createGain();g2.gain.value=.35;
  f.type="lowpass";f.Q.value=8;f.frequency.setValueAtTime(900,time);f.frequency.exponentialRampToValueAtTime(140,time+len);g.gain.setValueAtTime(.3,time);g.gain.exponentialRampToValueAtTime(.001,time+len);o.connect(f);o2.connect(g2);g2.connect(f);f.connect(g);g.connect(A.buses.r);o.start(time);o2.start(time);o.stop(time+len+.05);o2.stop(time+len+.05)}
let seq={next:0,step:0,fill:false};
function curBPM(){if(+CFG.bpmLock>0)return +CFG.bpmLock;const sp=S.cur&&Number.isFinite(S.cur.sp)?S.cur.sp:400;return map(sp,250,900,+CFG.bpmMin,+CFG.bpmMax)}
function schedulePulse(){
  if(!A||S.style!=="pulse"||!S.on)return;const c=A.ctx.currentTime,t=realNow();
  const bpm=curBPM(),st=60/bpm/4,pat=PATTERNS[CFG.pattern]||PATTERNS.four;
  const hourAgo=t-36e5,rate=S.quakes.filter(q=>q.time>hourAgo&&q.time<=t).length,hatP=clamp(map(rate,0,20,.2,.95)*CFG.hats,0,1);
  const tn=S.tides.length?tideNorm(S.tides[0],t):0,kp=S.cur.kp||2,sc=scaleFor(kp),ghost=kp>=4?.18:kp>=3?.08:0;
  if(seq.next<c)seq.next=c+.05;
  while(seq.next<c+.15){const s16=seq.step%16,hum=CFG.humanize*(Math.random()-.5)*.02,tm=seq.next+(s16%2===1?CFG.swing*st:0)+hum;
    const fillNow=seq.fill&&s16>=12;
    if(pat.k[s16]==="x"||(fillNow&&s16%2===0)){drum("k",tm,fillNow?.8:1);midiNote(CH("d"),36,fillNow?90:110,80)}
    if(pat.s[s16]==="x"){drum("s",tm);midiNote(CH("d"),38,100,80)}else if(ghost&&Math.random()<ghost){drum("s",tm,.25);midiNote(CH("d"),38,35,40)}
    if(s16%2===1&&Math.random()<hatP){const op=s16%4===2;drum(op?"o":"h",tm,.6+Math.random()*.4);midiNote(CH("d"),op?46:42,70,40)}
    if(s16%4===2){const bn=degree(sc,Math.round(map(tn,-1,1,0,4)),ROOT-24);bassNote(bn,tm,st*1.6);midiNote(CH("b"),bn,96,st*1500);pushNote(bn,"r",90,st*1.6)}
    if(s16===15)seq.fill=false;
    seq.next+=st;seq.step++}
  S.bpm=bpm;S.qrate=rate;
}
/* ---------- Quakes ---------- */
function passQ(q){if(q.mag<CFG.mmin)return false;const R_=REGIONS[CFG.region];if(!R_)return true;return R_.some(([a,b,c,d])=>q.lat>=a&&q.lat<=b&&q.lon>=c&&q.lon<=d)}
function velOf(m){const x=clamp((m-1)/6,0,1),y=CFG.vcurve==="soft"?Math.pow(x,.6):CFG.vcurve==="hard"?Math.pow(x,1.7):x;return Math.round(lerp(+CFG.velMin,+CFG.velMax,y))}
function quakeNote(q){const sc=scaleFor(kpAt(q.time)),steps=sc.length*3;let i;
  if(CFG.qpitch==="lat")i=Math.round(map(q.lat,-60,70,0,steps-1));else if(CFG.qpitch==="mag")i=Math.round(map(q.mag,0,7,0,steps-1));else i=Math.round(map(q.depth,0,700,steps-1,0));
  return {note:degree(sc,i,ROOT+12*CFG.qoct),step:i,steps,sc}}
function quakePan(q){return clamp(CFG.qpan==="lat"?q.lat/90:q.lon/180,-1,1)*.85}
const QINST={bell:{r:2,r2:1.4,idx:[1.5,6],dec:1,p:4.007},marimba:{r:4,r2:4,idx:[2,4],dec:.35,p:10},glass:{r:3.5,r2:2.71,idx:[.6,2.5],dec:1.6,p:5.4},gong:{r:1.41,r2:1.18,idx:[2,7],dec:1.9,p:2.3},pluck:{r:1,r2:1,idx:[3,8],dec:.4,p:3}};
function quakeVoice(q){
  const {ctx}=A,c=ctx.currentTime+.01,{note}=quakeNote(q),I=QINST[CFG.inst.q]||QINST.bell;
  const vel=velOf(q.mag),amp=Math.pow(vel/127,1.6)*.55,dec=(1.2+q.mag*.9)*CFG.len*I.dec,f=mtof(note);
  const car=ctx.createOscillator(),mod=ctx.createOscillator(),mg=ctx.createGain(),eg=ctx.createGain(),lp=ctx.createBiquadFilter(),pan=ctx.createStereoPanner();
  if(CFG.inst.q==="pluck")car.type="triangle";
  car.frequency.value=f;mod.frequency.value=f*(q.depth>70?I.r2:I.r);
  mg.gain.setValueAtTime(f*map(q.mag,1,7,I.idx[0],I.idx[1]),c);mg.gain.exponentialRampToValueAtTime(f*.02,c+dec*(CFG.inst.q==="pluck"?.15:.6));
  eg.gain.setValueAtTime(0,c);eg.gain.linearRampToValueAtTime(amp,c+.005);eg.gain.exponentialRampToValueAtTime(.0005,c+dec);
  lp.type="lowpass";lp.frequency.value=map(vel,20,127,1800,9000);pan.pan.value=W_(quakePan(q));
  mod.connect(mg);mg.connect(car.frequency);car.connect(eg);eg.connect(lp);lp.connect(pan);pan.connect(A.buses.q);pan.connect(A.dly);
  const p2=ctx.createOscillator(),p2g=ctx.createGain();p2.frequency.value=f*I.p;p2g.gain.setValueAtTime(amp*.12,c);p2g.gain.exponentialRampToValueAtTime(.0001,c+dec*.35);p2.connect(p2g);p2g.connect(pan);
  [car,mod,p2].forEach(o=>{o.start(c);o.stop(c+dec+.1)});
  if(q.mag>=4.5){
    const s=ctx.createOscillator(),sg=ctx.createGain();s.type="sine";s.frequency.setValueAtTime(mtof(ROOT-12)*2.2,c);s.frequency.exponentialRampToValueAtTime(mtof(ROOT-24),c+.35);
    sg.gain.setValueAtTime(0,c);sg.gain.linearRampToValueAtTime(map(q.mag,4.5,8,.45,.9),c+.01);sg.gain.exponentialRampToValueAtTime(.0005,c+1.5+q.mag*.4);s.connect(sg);sg.connect(A.buses.q);s.start(c);s.stop(c+4+q.mag);
    const n=ctx.createBufferSource();n.buffer=A.nb;const nf=ctx.createBiquadFilter();nf.type="lowpass";nf.frequency.value=140;const ng=ctx.createGain();
    ng.gain.setValueAtTime(0,c);ng.gain.linearRampToValueAtTime(map(q.mag,4.5,8,.6,1.4),c+.08);ng.gain.exponentialRampToValueAtTime(.0005,c+q.mag*.9);n.connect(nf);nf.connect(ng);ng.connect(A.buses.q);n.start(c);n.stop(c+q.mag);
    if(CFG.fills)seq.fill=true;
  }
  return {note,vel,dur:dec};
}
function flareBell(cls,f){if(A&&!muted("x")){const {ctx}=A,c=ctx.currentTime;[0,7,12,19].forEach((d,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type="triangle";o.frequency.value=mtof(ROOT+24+d);g.gain.setValueAtTime(0,c+i*.12);g.gain.linearRampToValueAtTime(.08,c+i*.12+.02);g.gain.exponentialRampToValueAtTime(.0003,c+i*.12+5);o.connect(g);g.connect(A.buses.x);o.start(c+i*.12);o.stop(c+6)})}
  pushNote(ROOT+24,"x",100,3);midiNote(CH("x"),ROOT+24,100,1500);S.hit.x=1;
  logEv(`Flare ${cls}`,"x",null,[["Sensor","GOES-East/West X-ray sensor, 0.1–0.8 nm"],["Raw reading",`flux ${(f||0).toExponential(2)} W/m²`],["Formula",`flux crosses into class ${cls[0]} → bell swell\nlog10(flux) −8…−4 → shimmer level`],["Sound + MIDI",`4 triangle bells, root +24\nMIDI ch ${CH("x")} note ${ROOT+24}`],["AI involved","none"]])}

/* ================= MIDI out / in ================= */
let midi=null,out=null;
const MREC=[];const lastCC={};
async function initMIDI(){
  if(!navigator.requestMIDIAccess){$("midiState").textContent=IS_MOBILE?"":"Web MIDI needs Chrome or Edge";return}
  try{midi=await navigator.requestMIDIAccess();fillPorts();midi.onstatechange=fillPorts}catch(e){$("midiState").textContent="MIDI permission denied"}
}
function fillPorts(){const s=$("midiOut"),v=s.value;s.innerHTML='<option value="">MIDI out: off</option>';midi.outputs.forEach(o=>{const op=document.createElement("option");op.value=o.id;op.textContent="MIDI → "+o.name;s.appendChild(op)});s.value=v;
  if(!midi.outputs.size)$("midiState").textContent="no MIDI ports (see “Use it in your DAW”)";
  midi.inputs.forEach(i=>i.onmidimessage=onMidiIn)}
function tx(b,when){if(out)try{out.send(b,when)}catch(_){}if(S.on&&MREC.length<400000&&b[0]<0xF0)MREC.push([when||performance.now(),b])}
function midiNote(ch,n,v,ms){n=clamp(Math.round(n),0,127);tx([0x90+ch-1,n,clamp(Math.round(v),1,127)]);tx([0x80+ch-1,n,0],performance.now()+ms)}
function midiOn(ch,n,v){tx([0x90+ch-1,n&127,v])}
function midiOff(ch,n){tx([0x80+ch-1,n&127,0])}
function midiPB(ch,x){if(!Number.isFinite(x))return;const v=Math.round(8192+clamp(x,-1,1)*8191*.25);if(lastCC['pb'+ch]===v)return;lastCC['pb'+ch]=v;tx([0xE0+ch-1,v&127,v>>7])}
function midiCC(ch,cc,v){if(!Number.isFinite(v))return;const key=ch*128+cc,vv=Math.round(clamp(v,0,127));if(lastCC[key]===vv)return;lastCC[key]=vv;tx([0xB0+ch-1,cc,vv])}
// MIDI clock (24 ppqn) follows the planet's tempo so a DAW can slave to it
let clk={next:0,on:false};
function midiClock(){if(!out||!CFG.clock||!S.on){if(clk.on&&out){out.send([0xFC]);clk.on=false}return}
  const now=performance.now();if(!clk.on){out.send([0xFA]);clk.on=true;clk.next=now}
  const iv=60000/curBPM()/24;while(clk.next<now+120){out.send([0xF8],clk.next);clk.next+=iv}}
// MIDI in: learn any knob to any control, and play along in the planet's live scale
let LEARN={armed:null,on:false,map:{}};try{LEARN.map=JSON.parse(localStorage.getItem("em5.learn")||"{}")}catch(_){}
function onMidiIn(e){const [st,d1,d2]=e.data,typ=st&0xF0;
  if(typ===0xB0){if(LEARN.on&&LEARN.armed){LEARN.map[d1]=LEARN.armed;try{localStorage.setItem("em5.learn",JSON.stringify(LEARN.map))}catch(_){}xs(`CC ${d1} → ${LEARN.armed}`);LEARN.armed=null;return}
    const k=LEARN.map[d1];if(k){const el=$("p_"+k.replace(".","_"));if(el&&el.type==="range"){el.value=+el.min+(d2/127)*(el.max-el.min);el.dispatchEvent(new Event("input"))}}}
  else if(typ===0x90&&d2>0&&CFG.playAlong&&A){const sc=scaleFor(S.cur.kp||2),pc=((d1-ROOT)%12+12)%12;let best=sc[0];sc.forEach(s=>{if(Math.abs(s-pc)<Math.abs(best-pc))best=s});const n=d1-pc+best;
    const fake={mag:map(d2,1,127,1,7),depth:0,lon:map(d1,36,96,-180,180),lat:0,time:realNow()};const sv=CFG.qpitch;const r=quakeVoiceRaw(n,d2,fake);pushNote(n,"q",d2,r)}}
function quakeVoiceRaw(note,vel,q){if(!A)return 1;const {ctx}=A,c=ctx.currentTime+.005,I=QINST[CFG.inst.q]||QINST.bell,f=mtof(note),amp=Math.pow(vel/127,1.6)*.5,dec=2.2*CFG.len*I.dec;
  const car=ctx.createOscillator(),mod=ctx.createOscillator(),mg=ctx.createGain(),eg=ctx.createGain(),pan=ctx.createStereoPanner();car.frequency.value=f;mod.frequency.value=f*I.r;mg.gain.setValueAtTime(f*I.idx[1]*vel/127,c);mg.gain.exponentialRampToValueAtTime(f*.02,c+dec*.5);
  eg.gain.setValueAtTime(0,c);eg.gain.linearRampToValueAtTime(amp,c+.004);eg.gain.exponentialRampToValueAtTime(.0005,c+dec);pan.pan.value=W_(clamp(q.lon/180,-1,1)*.7);mod.connect(mg);mg.connect(car.frequency);car.connect(eg);eg.connect(pan);pan.connect(A.buses.q);pan.connect(A.dly);car.start(c);mod.start(c);car.stop(c+dec+.1);mod.stop(c+dec+.1);return dec}
