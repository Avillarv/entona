/* Entona · práctica: la pieza elegida y su carta, los modos «a tu ritmo» y karaoke, premios y micrófono.
   Crea el espacio de nombres Entona.app que comparten los módulos de la aplicación. */
(function(){
'use strict';
const E = window.Entona, S = E.S, $ = E.$, A = E.audio, B = E.bib, R = E.rollo, M = E.melodia;
const {clamp, mediana, midiAHz} = E;
const P = E.app = {};

const LAT = 0.09;   // segundos entre cantar una nota y que aparezca en la lectura
const hist = E.hist = [];
const K = E.K = {on:false, t:0, t0:0, ctx0:0, sched:0, pulso:0, ptr:0, prevT:0, fin:false,
                 hit:new Float32Array(0), visto:new Uint8Array(0), inTune:0, absSum:0};
const ED = S.ed; ED.sel = new Set(); ED.ancla = null;
const audioPista = $('pista');
let pistaURL = null;
/* Dos reproductores de YouTube: el del karaoke y el de la importación. */
const YK = E.yt.reproductor('ytKaraoke'), YI = E.yt.reproductor('ytImp');

const todas = () => E.PIEZAS.concat(B.lista);
const enTiempo = () => S.modo==='karaoke' || S.modo==='editar';
const esYT = () => !!(S.pieza && S.pieza.yt);
const pistaAct = () => esYT() ? YK.pista : audioPista;
const conPista = () => !!(S.pieza && (S.pieza.yt ? YK.listo && YK.id===S.pieza.yt && !YK.error : S.pieza.audio && pistaURL));
const vel = () => esYT() ? 1 : S.vel;   // con YouTube el karaoke va siempre a velocidad normal
const claveVol = () => S.modo==='editar' ? 'volNotas' : (conPista() ? 'volGuiaPista' : 'volGuia');
const dif = (m, tg) => { let d = m-tg; if(S.octLibre) d -= 12*Math.round(d/12); return d; };

/* =====================================================================
   Carta: la pieza convertida a notas con tiempo en segundos y tono MIDI
   ===================================================================== */
function compilar(){
  const p = S.pieza, notas = [];
  let dur = 0, spb = null;
  if(!p.libre){
    if(p.abs){
      const off = (S.modo==='editar' ? 0 : (p.trans||0))+(p.afin||0)/100;
      p.notas.forEach(n => notas.push({t0:n.t, t1:n.t+n.d, m:n.m+off, src:n}));
      dur = Math.max(p.dur||0, notas.length ? notas[notas.length-1].t1+0.5 : 1);
    } else {
      spb = 60/p.bpm; let t = 0;
      p.notas.forEach(([s,b]) => { if(s!=null) notas.push({t0:t*spb, t1:(t+b)*spb, m:S.tonic+s}); t += b; });
      dur = t*spb;
    }
  }
  let lo = Infinity, hi = -Infinity;
  notas.forEach(n => { if(n.m<lo) lo = n.m; if(n.m>hi) hi = n.m; });
  if(!notas.length){ lo = 55; hi = 67; }
  S.carta = {notas, dur, lo, hi, spb, compas:p.compas||4, anacrusa:p.anacrusa||0};
}
/* Recompila sin perder la posición (cambios del editor o de tono). */
function recompilar(){
  compilar();
  const n = S.carta.notas.length;
  K.hit = new Float32Array(n); K.visto = new Uint8Array(n); K.ptr = 0;
  if(K.on){ K.sched = S.carta.notas.findIndex(x => x.t0 >= K.t-0.01); if(K.sched<0) K.sched = n; }
  if(S.idx >= n) S.idx = Math.max(0, n-1);
}
function tInicio(){
  const c = S.carta;
  if(S.modo==='editar') return 0;
  if(c.spb) return -(c.compas+(c.anacrusa ? c.compas-c.anacrusa : 0))*c.spb;
  if(S.pieza.audio || S.pieza.yt) return 0;
  return Math.min(0, (c.notas.length ? c.notas[0].t0 : 0)-2);
}
function centrarVista(inmediato){
  const c = S.carta;
  if(S.pieza.libre || !c.notas.length || c.hi-c.lo <= 19) return;
  let obj = null;
  if(enTiempo()){
    let s = 0, n = 0;
    for(const x of c.notas){ if(x.t1 < K.t-0.5) continue; if(x.t0 > K.t+3) break; s += x.m; n++; }
    if(n) obj = s/n;
  } else if(c.notas[S.idx]) obj = c.notas[S.idx].m;
  if(obj==null) return;
  obj = clamp(obj, c.lo+7.5, c.hi-7.5);
  S.viewC = inmediato ? obj : S.viewC+(obj-S.viewC)*0.05;
}

/* =====================================================================
   Selección de pieza y reinicio
   ===================================================================== */
function modosDe(p){
  if(p.libre) return [];
  if(p.abs) return [['karaoke','Karaoke'],['ritmo','A tu ritmo'],['editar','Editar notas']];
  return [['ritmo','A tu ritmo'],['karaoke','Karaoke']];
}
function seleccionar(id, modo){
  const p = todas().find(x => x.id===id) || E.PIEZAS[1];
  kDetener();
  S.pieza = p; S.vista = 'practica'; S.cal = null;
  $('status').textContent = '';
  const ms = modosDe(p).map(x => x[0]);
  S.modo = p.libre ? 'libre' : (ms.includes(modo) ? modo : (p.abs || p.grupo==='canciones' ? 'karaoke' : 'ritmo'));
  if(p.guia) S.guia = p.guia;
  ED.sel.clear(); ED.undo.length = 0; ED.ancla = null;
  if(pistaURL){ URL.revokeObjectURL(pistaURL); pistaURL = null; }
  if(p.audio){ pistaURL = URL.createObjectURL(p.audio); audioPista.src = pistaURL; } else { audioPista.removeAttribute('src'); }
  audioPista.load();
  if(p.yt){
    YK.alError = t => decir(t, 20000);
    YK.cargar(p.yt).catch(e => decir(e.message, 20000));
  } else YK.detener();
  E.guardar(); P.pintarTodo(); reiniciar(false);
}
function ponerModo(modo){
  if(S.modo===modo) return;
  kDetener(); S.modo = modo; S.cal = null;
  ED.sel.clear(); ED.ancla = null;
  P.pintarTodo(); reiniciar(false);
}
function reiniciar(sonido){
  kDetener();
  compilar();
  S.idx = 0; S.hold = 0; S.hecho = false; S.saltadas = 0; S.resultado = null; S.prev = null;
  S.stats = {voiced:0, inTune:0, absSum:0}; S.graceUntil = performance.now()+250;
  hist.length = 0; A.limpiarLectura();
  const n = S.carta.notas.length;
  K.hit = new Float32Array(n); K.visto = new Uint8Array(n); K.ptr = 0; K.fin = false; K.inTune = 0; K.absSum = 0;
  K.t = tInicio();
  if(S.pieza.libre) S.viewC = S.tonic+4; else centrarVista(true);
  P.pintarMapa(); P.pintarObjetivo(); P.pintarVelo(); P.pintarTransporte(); P.pintarEditor();
  if(sonido && S.modo==='ritmo' && S.mic==='on') anunciar();
}

/* =====================================================================
   Modo «a tu ritmo»: la pieza espera hasta que aciertes cada nota
   ===================================================================== */
const objetivo = () => (S.modo==='ritmo' && S.carta.notas[S.idx]) ? S.carta.notas[S.idx].m : null;
const necesita = () => { const n = S.carta.notas[S.idx]; return n ? clamp((n.t1-n.t0)*800, 350, 4000) : 1000; };

function anunciar(){
  const tg = objetivo(); if(tg==null) return;
  if(S.guia==='each' || (S.guia==='first' && S.idx===0)) A.tono(tg, 0.7);
}
function avanzar(saltada){
  if(saltada) S.saltadas++;
  S.prev = saltada ? null : objetivo();
  S.idx++; S.hold = 0;
  S.graceUntil = performance.now()+280;
  if(S.idx >= S.carta.notas.length){ S.idx = S.carta.notas.length-1; terminarRitmo(); return; }
  centrarVista(false);
  P.pintarObjetivo(); P.actualizarMapa(true);
  if(S.mic==='on') anunciar();
}
function terminarRitmo(){
  S.hecho = true;
  const st = S.stats, n = S.carta.notas.length;
  const parte = (n-S.saltadas)/n;
  const precision = st.voiced>0 ? Math.round(100*(st.inTune/st.voiced)*parte) : 0;
  const dev = st.inTune>0 ? Math.round(st.absSum/st.inTune) : null;
  const stars = S.saltadas===n ? 0 : precision>=75 ? 3 : precision>=50 ? 2 : 1;
  S.resultado = {modo:'ritmo', precision, dev, stars};
  premiar(stars);
  P.actualizarMapa(false); P.pintarVelo();
}
function pasoRitmo(m, dt, ts, bloqueado){
  const tg = objetivo();
  let ok = false;
  if(tg==null || S.hecho || m==null) return {ok, ref:S.hecho ? null : tg};
  const cents = dif(m, tg)*100;
  ok = Math.abs(cents) <= S.tol;
  /* no penaliza el instante en que la voz sigue en la nota anterior */
  const arrastre = S.prev!=null && Math.round(S.prev)!==Math.round(tg) && Math.abs(dif(m, S.prev))*100 <= S.tol+15;
  if(ts > S.graceUntil && !arrastre){
    S.stats.voiced += dt;
    if(ok){ S.stats.inTune += dt; S.stats.absSum += Math.abs(cents)*dt; }
  }
  if(ok) S.hold += dt; else S.hold = Math.max(0, S.hold-dt*0.25);
  if(S.hold >= necesita()) avanzar(false);
  return {ok, ref:tg};
}

/* =====================================================================
   Modo karaoke y transporte del editor: la canción corre a tempo
   ===================================================================== */
function kTiempo(){
  if(!K.on) return K.t;
  if(conPista()) return pistaAct().currentTime;
  return K.t0+(A.ctx.currentTime-K.ctx0)*vel();
}
function kPlay(){
  if(!enTiempo()) return;
  if(esYT() && !conPista()){
    if(!E.yt.disponible()) return decir('El video de YouTube solo funciona si abres Entona desde http://localhost:8000, no como archivo.', 15000);
    if(YK.error) return decir(YK.error, 15000);
    /* El reproductor aún carga: empieza solo en cuanto esté listo. */
    decir('Cargando el video…');
    const id = S.pieza.yt;
    YK.cargar(id).then(() => { if(S.pieza.yt===id && enTiempo() && !K.on && conPista()){ $('status').textContent = ''; kPlay(); } }).catch(() => {});
    return;
  }
  A.asegurar();
  if(K.fin || K.t >= S.carta.dur-0.05){ const m = S.modo; reiniciar(false); S.modo = m; }
  S.resultado = null;
  const c = S.carta;
  if(conPista()){
    const pa = pistaAct();
    try{ pa.currentTime = Math.max(0, K.t); }catch(e){}
    pa.playbackRate = vel(); pa.volume = S.volPista;
    const pr = pa.play(); if(pr && pr.catch) pr.catch(()=>{});
  } else { K.t0 = K.t; K.ctx0 = A.ctx.currentTime+0.06; }
  K.sched = c.notas.findIndex(n => n.t0 >= K.t-0.01); if(K.sched<0) K.sched = c.notas.length;
  K.pulso = c.spb ? Math.ceil((K.t-0.001)/c.spb) : 0;
  K.prevT = K.t; K.on = true; K.conMic = S.mic==='on';
  hist.length = 0;
  P.pintarTransporte(); P.pintarVelo();
}
function kPausa(){
  if(!K.on) return;
  K.t = kTiempo(); K.on = false;
  pistaAct().pause(); A.silenciar();
  P.pintarTransporte(); P.pintarVelo();
}
function kDetener(){ K.on = false; try{ pistaAct().pause(); }catch(e){} A.silenciar(); }
function kIr(t){
  const sonando = K.on;
  if(sonando){ K.on = false; pistaAct().pause(); A.silenciar(); }
  const c = S.carta;
  K.t = clamp(t, tInicio(), Math.max(0, c.dur-0.05));
  K.fin = false; S.resultado = null;
  for(let i=0;i<c.notas.length;i++){ if(c.notas[i].t0 >= K.t-LAT){ K.hit[i] = 0; K.visto[i] = 0; } }
  K.ptr = c.notas.findIndex(n => n.t1 > K.t-LAT); if(K.ptr<0) K.ptr = c.notas.length;
  hist.length = 0;
  centrarVista(true);
  if(sonando) kPlay(); else { P.pintarTransporte(); P.pintarVelo(); }
}
function kFin(){
  kDetener(); K.fin = true;
  const c = S.carta;
  K.t = c.dur;
  if(S.modo==='karaoke'){
    let sd = 0, sp = 0, ac = 0, tot = 0;
    c.notas.forEach((n,i) => {
      if(!K.visto[i]) return;
      const d = n.t1-n.t0, p = Math.min(1, K.hit[i]/(0.7*d));
      sd += d; sp += p*d; tot++; if(p>=.5) ac++;
    });
    if(tot && K.conMic){
      const precision = Math.round(100*sp/sd);
      const stars = precision>=75 ? 3 : precision>=50 ? 2 : precision>0 ? 1 : 0;
      const completa = tot >= c.notas.length*0.9;
      S.resultado = {modo:'karaoke', precision, aciertos:ac, total:tot, stars, completa,
                     dev: K.inTune>0 ? Math.round(K.absSum/K.inTune) : null};
      if(completa) premiar(stars);
    }
  }
  P.pintarTransporte(); P.pintarVelo();
}
/* Nota que corresponde al instante te; fuera de una nota, la más cercana a menos de 0,2 s (solo para colorear). */
function notaVisual(te){
  const c = S.carta, n = c.notas[K.ptr];
  if(n && te >= n.t0-0.2) return n;
  const a = c.notas[K.ptr-1];
  if(a && te-a.t1 < 0.2) return a;
  return null;
}
function pasoTiempo(m){
  const c = S.carta, editar = S.modo==='editar';
  let t = kTiempo(), ok = false, ref = null, mv = m;
  if(K.on){
    if(conPista() && pistaAct().ended) t = c.dur+1;
    const ctx = A.ctx, horiz = t+0.28*vel(), vol = S[claveVol()];
    while(K.sched < c.notas.length && c.notas[K.sched].t0 < horiz){
      const n = c.notas[K.sched++];
      if(vol > 0.01 && n.t0 >= t-0.03)
        A.tono(n.m, (n.t1-n.t0)/vel()*0.95, {cuando:ctx.currentTime+(n.t0-t)/vel(), vol:0.24*vol, bloquear:false});
    }
    if(c.spb && !editar){
      while(K.pulso*c.spb < horiz){
        const bt = K.pulso*c.spb;
        if(bt < c.dur && bt >= t-0.03 && (bt < 0 || S.metronomo))
          A.clic(ctx.currentTime+(bt-t)/vel(), ((K.pulso-c.anacrusa)%c.compas+c.compas)%c.compas===0);
        K.pulso++;
      }
    }
  }
  const te = t-LAT*vel();
  if(!editar){
    while(K.ptr < c.notas.length && c.notas[K.ptr].t1 <= te){ if(K.on) K.visto[K.ptr] = 1; K.ptr++; }
    const n = c.notas[K.ptr];
    if(n) ref = n.m;
    if(m != null){
      if(n && te >= n.t0){
        const d = dif(m, n.m);
        ok = Math.abs(d)*100 <= S.tol;
        if(ok && K.on){ const ds = clamp(t-K.prevT, 0, 0.1); K.hit[K.ptr] += ds; K.inTune += ds; K.absSum += Math.abs(d)*100*ds; }
        mv = n.m+d;
      } else {
        const v = notaVisual(te);
        if(v){ const d = dif(m, v.m); ok = Math.abs(d)*100 <= S.tol; mv = v.m+d; }
      }
    }
  }
  K.prevT = t; K.t = t;
  if(K.on && t >= c.dur+0.35) kFin();
  else if(K.on) centrarVista(false);
  return {ok, ref, mv, st:te};
}

/* =====================================================================
   Premios: estrellas y racha
   ===================================================================== */
function premiar(stars){
  if(stars <= 0) return;
  const id = S.pieza.id;
  if(stars > (S.mejor[id]||0)) S.mejor[id] = stars;
  E.anotarDia(); E.guardar();
  if(A.ctx){
    const t = A.ctx.currentTime+0.08, base = S.pieza.abs ? 60 : S.tonic;
    [0,4,7,12].forEach((s,i) => A.tono(base+s, 0.16, {cuando:t+i*0.11, vol:0.13}));
  }
  P.pintarRuta(); P.pintarAvance();
}

/* =====================================================================
   Micrófono y calibración
   ===================================================================== */
async function abrirMic(){
  if(S.mic==='on' || S.mic==='asking') return;
  ponerMic('asking');
  try{ await A.abrirMic(); }
  catch(e){ return ponerMic('error', (e && e.mensaje) || 'No pude abrir el micrófono.'); }
  ponerMic('on');
  if(S.modo==='ritmo' && !S.hecho && !S.cal && S.vista==='practica') anunciar();
}
function cerrarMic(){ A.cerrarMic(); S.cal = null; ponerMic('off'); }
function ponerMic(estado, error){
  S.mic = estado; S.micError = error || '';
  $('micText').textContent = {off:'Micrófono apagado', asking:'Esperando permiso…', on:'Escuchando', error:'Sin micrófono'}[estado];
  $('micBtn').textContent = estado==='on' ? 'Apagar micrófono' : 'Activar micrófono';
  $('micBtn').classList.toggle('primary', estado!=='on');
  if(estado!=='on') $('levelBar').style.width = '0';
  P.pintarVelo(); P.pintarPanel();
  E.curso.micCambio();
}
function ponerTonica(m, nota){
  S.tonic = clamp(Math.round(m), 36, 67);
  E.guardar(); P.pintarAjustes(); reiniciar(false);
  if(nota) decir(nota);
}
let decirT = 0;
function decir(t, largo){ $('status').textContent = t; clearTimeout(decirT); decirT = setTimeout(() => { $('status').textContent = ''; }, largo || 7000); }
function detener(){ kDetener(); S.cal = null; }

Object.assign(P, {LAT, hist, K, ED, audioPista, YK, YI, todas, enTiempo, esYT, pistaAct, conPista, vel, claveVol, dif, compilar, recompilar, tInicio, centrarVista, modosDe, seleccionar, ponerModo, reiniciar, objetivo, necesita, anunciar, avanzar, terminarRitmo, pasoRitmo, kTiempo, kPlay, kPausa, kDetener, kIr, kFin, notaVisual, pasoTiempo, premiar, abrirMic, cerrarMic, ponerMic, ponerTonica, decir, detener});
})();
