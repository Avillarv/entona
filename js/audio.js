/* Entona · audio: contexto, sintetizador de guía, metrónomo, micrófono y detección de tono (YIN). */
(function(){
'use strict';
const E = window.Entona, S = E.S;
const A = E.audio = {ctx:null, master:null, analyser:null, stream:null, fuente:null, buf:null, bloqueoHasta:0};
const voces = new Set();

A.asegurar = function(){
  if(!A.ctx){
    const AC = window.AudioContext || window.webkitAudioContext;
    A.ctx = new AC();
    A.master = A.ctx.createGain(); A.master.gain.value = 0.9; A.master.connect(A.ctx.destination);
  }
  if(A.ctx.state==='suspended') A.ctx.resume();
  return A.ctx;
};

/* Toca una nota. `bloquear` hace que el micrófono no cuente mientras suena (modo a tu ritmo). */
A.tono = function(midi, dur, op){
  op = op || {};
  A.asegurar();
  const c = A.ctx, t0 = op.cuando != null ? Math.max(op.cuando, c.currentTime) : c.currentTime+0.02;
  const f = E.midiAHz(midi), v = op.vol != null ? op.vol : 0.22;
  dur = Math.max(0.06, dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0,t0);
  g.gain.linearRampToValueAtTime(v,t0+0.02);
  g.gain.setValueAtTime(v,t0+Math.max(0.025,dur-0.07));
  g.gain.linearRampToValueAtTime(0,t0+dur);
  g.connect(A.master);
  const o1 = c.createOscillator(); o1.type='triangle'; o1.frequency.value=f; o1.connect(g);
  const o2 = c.createOscillator(); o2.type='sine'; o2.frequency.value=f*2;
  const g2 = c.createGain(); g2.gain.value=0.18; o2.connect(g2).connect(g);
  o1.start(t0); o2.start(t0); o1.stop(t0+dur+0.05); o2.stop(t0+dur+0.05);
  const voz = {g, o1, o2};
  voces.add(voz); o1.onended = () => voces.delete(voz);
  if(op.bloquear !== false) A.bloqueoHasta = Math.max(A.bloqueoHasta, t0+dur+0.16);
  return t0+dur;
};
A.clic = function(cuando, acento){
  A.asegurar();
  const c = A.ctx, t0 = Math.max(cuando, c.currentTime);
  const o = c.createOscillator(), g = c.createGain();
  o.type='sine'; o.frequency.value = acento ? 1760 : 1175;
  g.gain.setValueAtTime(acento ? 0.2 : 0.13, t0);
  g.gain.exponentialRampToValueAtTime(0.0008, t0+0.05);
  o.connect(g).connect(A.master); o.start(t0); o.stop(t0+0.07);
  const voz = {g, o1:o, o2:null};
  voces.add(voz); o.onended = () => voces.delete(voz);
};
A.silenciar = function(){
  if(!A.ctx) return;
  const t = A.ctx.currentTime;
  voces.forEach(v=>{
    try{ v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(0,t); v.o1.stop(t+0.02); if(v.o2) v.o2.stop(t+0.02); }catch(e){}
  });
  voces.clear();
  A.bloqueoHasta = 0;
};
A.bloqueado = () => A.ctx ? A.ctx.currentTime < A.bloqueoHasta : false;

/* ---------- Micrófono ---------- */
A.abrirMic = async function(){
  /* Los navegadores solo dan el micrófono en contextos seguros: localhost, 127.0.0.1, file:// o https.
     http://0.0.0.0 (el enlace que muestra python -m http.server) o una IP de la red no cuentan. */
  if(!window.isSecureContext)
    throw {mensaje:'El navegador solo permite el micrófono en una dirección segura. Abre http://localhost:'+(location.port || '8000')+' en lugar de '+location.host+', o abre index.html directamente.'};
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
    throw {mensaje:'Este navegador no deja usar el micrófono desde aquí. Abre Entona en Chrome, Edge o Firefox.'};
  A.asegurar();
  try{
    A.stream = await navigator.mediaDevices.getUserMedia({audio:{
      echoCancellation: S.salida==='parlantes', noiseSuppression: S.filtroRuido, autoGainControl:true }});
  }catch(e){
    const n = e && e.name;
    if(n==='NotAllowedError' || n==='SecurityError') throw {mensaje:'El navegador bloqueó el micrófono. Permítelo desde el candado de la barra de direcciones y vuelve a intentarlo.'};
    if(n==='NotFoundError' || n==='OverconstrainedError') throw {mensaje:'No encontré ningún micrófono conectado.'};
    throw {mensaje:'No pude abrir el micrófono. Revisa que otra aplicación no lo esté usando.'};
  }
  await A.ctx.resume();
  A.fuente = A.ctx.createMediaStreamSource(A.stream);
  const hp = A.ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=55;
  A.analyser = A.ctx.createAnalyser(); A.analyser.fftSize=4096; A.analyser.smoothingTimeConstant=0;
  A.fuente.connect(hp).connect(A.analyser);
  A.buf = new Float32Array(A.analyser.fftSize);
};
A.cerrarMic = function(){
  if(A.stream) A.stream.getTracks().forEach(t=>t.stop());
  if(A.fuente) try{ A.fuente.disconnect(); }catch(e){}
  A.stream = null; A.fuente = null; A.analyser = null;
};

/* ---------- Detección de tono: algoritmo YIN ---------- */
const YIN_W = 2048;
const yinD = new Float32Array(2048);
A.detectar = function(x, sr){
  const tauMin = Math.max(2, Math.floor(sr/1200));
  const tauMax = Math.min(yinD.length-2, Math.ceil(sr/55), x.length-YIN_W-1);
  let acum = 0;
  yinD[0] = 1;
  for(let tau=1; tau<=tauMax+1; tau++){
    let s = 0;
    for(let i=0;i<YIN_W;i++){ const d = x[i]-x[i+tau]; s += d*d; }
    acum += s;
    yinD[tau] = acum>0 ? s*tau/acum : 1;
  }
  let est = -1;
  for(let tau=tauMin; tau<=tauMax; tau++){
    if(yinD[tau] < 0.12){
      while(tau+1<=tauMax && yinD[tau+1] < yinD[tau]) tau++;
      est = tau; break;
    }
  }
  if(est<0){
    let m = 1, mt = -1;
    for(let tau=tauMin; tau<=tauMax; tau++) if(yinD[tau]<m){ m=yinD[tau]; mt=tau; }
    if(m < 0.22) est = mt; else return null;
  }
  let t = est;
  const a = yinD[est-1], b = yinD[est], c = yinD[est+1], den = a+c-2*b;
  if(den > 0) t = est + (a-c)/(2*den);
  return {freq: sr/t, claridad: 1-b};
};

/* ---------- Filtro de voz ----------
   Una lectura cuenta como voz si supera el umbral de volumen, el tono es claro, está en el rango de una
   voz humana y se mantiene estable unos cuadros seguidos. El umbral es el mayor de tres valores:
   un mínimo fijo, el ruido de la sala estimado solo (los momentos más silenciosos del último minuto)
   y el ruido medido a propósito con «Medir ruido» (sus picos, no su promedio). */
const SENS = {
  alta:   {min:0.006, piso:2.5, medido:1.3},
  normal: {min:0.010, piso:3.5, medido:1.8},
  baja:   {min:0.020, piso:5,   medido:2.2},
};
const G = A.filtro = {vols:[], t:0, piso:0, umbral:0.01, estables:0, previa:null, midiendo:null};
function percentil(a, q){ const o = a.slice().sort((x,y) => x-y); return o.length ? o[Math.min(o.length-1, Math.floor(o.length*q))] : 0; }

/* Mide el ruido de la sala durante `ms` milisegundos de silencio. */
A.medirRuido = function(ms, listo){ G.midiendo = {vals:[], hasta:performance.now()+ms, listo}; };

/* Lectura de un cuadro: nota MIDI (con decimales) suavizada por mediana, o null si no hay voz.
   `crudo` es el tono detectado antes del filtro; `bajo` indica un tono que no llegó al umbral. */
const recientes = [];
let vacios = 0;
A.leer = function(){
  let crudo = null, rms = 0, claridad = 0;
  const bloqueado = A.bloqueado(), ahora = performance.now();
  if(A.analyser){
    const buf = A.buf;
    A.analyser.getFloatTimeDomainData(buf);
    let e = 0; for(let i=0;i<buf.length;i+=2) e += buf[i]*buf[i];
    rms = Math.sqrt(e/(buf.length/2));
    if(!bloqueado && rms > 0.004){
      const r = A.detectar(buf, A.ctx.sampleRate);
      if(r && r.freq>55 && r.freq<1200){ crudo = E.hzAMidi(r.freq); claridad = r.claridad; }
    }
    if(!bloqueado && ahora-G.t > 100){
      G.t = ahora; G.vols.push(rms); if(G.vols.length > 600) G.vols.shift();
      G.piso = percentil(G.vols, 0.05);
    }
    if(G.midiendo){
      if(!bloqueado) G.midiendo.vals.push(rms);
      if(ahora >= G.midiendo.hasta){
        const md = G.midiendo; G.midiendo = null;
        S.ruido = md.vals.length ? percentil(md.vals, 0.95) : null;
        E.guardar();
        if(md.listo) md.listo(S.ruido);
      }
    }
  }
  const P = SENS[S.sensib] || SENS.normal;
  G.umbral = Math.max(P.min, G.piso*P.piso, S.ruido ? S.ruido*P.medido : 0);
  const fuerte = rms >= G.umbral;
  const valida = crudo!=null && !bloqueado && fuerte && claridad >= 0.85 && crudo >= 36 && crudo <= 84;
  let m = null;
  if(valida){ recientes.push(crudo); if(recientes.length>5) recientes.shift(); vacios = 0; m = E.mediana(recientes); }
  else if(++vacios > 3) recientes.length = 0;
  G.estables = m!=null ? (G.previa!=null && Math.abs(m-G.previa) < 0.6 ? G.estables+1 : 1) : 0;
  G.previa = m;
  return {midi: G.estables >= 4 ? m : null, crudo, rms, bloqueado, claridad, umbral:G.umbral,
          bajo: crudo!=null && !bloqueado && !fuerte};
};
A.limpiarLectura = () => { recientes.length = 0; };
})();
