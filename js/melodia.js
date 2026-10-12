/* Entona · melodía: saca la melodía principal de un archivo de audio.

   Cómo funciona, en cuatro pasos:
   1. Baja el audio a 11 kHz y lo corta en ventanas de 70 ms cada 20 ms.
   2. En cada ventana calcula el espectro. Si se pide, resta lo que suena distinto en los dos
      canales (instrumentos abiertos en estéreo) para quedarse con el centro, donde suele ir la voz.
   3. Para cada tono posible suma la fuerza de sus armónicos ("saliencia"): el tono cuya serie
      de armónicos explica mejor el espectro es el candidato a melodía.
   4. Elige el camino más probable a lo largo del tiempo (Viterbi) y lo corta en notas.

   Es una versión reducida del método de Salamon y Gómez (2012). Con voz sola acierta casi todo;
   con una banda completa da una aproximación que hay que corregir en el editor. */
(function(){
'use strict';
const E = window.Entona;
const M = E.melodia = {};

const SR = 11025, N = 2048, WIN = 768, HOP = 221;
const PASO = 20;          // cents por casilla de tono
const ARMONICOS = 10, ALFA = 0.8, GAMMA = 0.7;
M.DT = HOP/SR;

/* ---------- FFT radix-2 ---------- */
const rev = new Uint16Array(N), cosT = new Float32Array(N/2), sinT = new Float32Array(N/2);
(function(){
  const bits = Math.round(Math.log2(N));
  for(let i=0;i<N;i++){ let r = 0; for(let b=0;b<bits;b++) r |= ((i>>b)&1) << (bits-1-b); rev[i] = r; }
  for(let i=0;i<N/2;i++){ cosT[i] = Math.cos(2*Math.PI*i/N); sinT[i] = Math.sin(2*Math.PI*i/N); }
})();
function fft(re, im){
  for(let i=0;i<N;i++){ const j = rev[i]; if(j>i){ let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for(let size=2; size<=N; size<<=1){
    const half = size>>1, step = N/size;
    for(let i=0;i<N;i+=size){
      for(let j=0,k=0;j<half;j++,k+=step){
        const wr = cosT[k], wi = -sinT[k], a = i+j, b = a+half;
        const xr = re[b]*wr - im[b]*wi, xi = re[b]*wi + im[b]*wr;
        re[b] = re[a]-xr; im[b] = im[a]-xi; re[a] += xr; im[a] += xi;
      }
    }
  }
}
const hann = new Float32Array(WIN);
for(let i=0;i<WIN;i++) hann[i] = 0.5-0.5*Math.cos(2*Math.PI*i/(WIN-1));
/* Ponderación A: el oído (y la voz) pesan más entre 1 y 4 kHz que en los graves. */
const peso = new Float32Array(N/2);
for(let k=1;k<N/2;k++){
  const f = k*SR/N, f2 = f*f;
  const ra = (148693636*f2*f2) / ((f2+424.36)*Math.sqrt((f2+11599.29)*(f2+544496.41))*(f2+148693636));
  peso[k] = ra*1.2589;
}
const pausa = () => new Promise(r => setTimeout(r, 0));

/* ---------- Paso 1 a 3: saliencia por cuadro ---------- */
M.analizar = async function(buffer, op, prog){
  op = Object.assign({centro:true, fmin:82, fmax:1050, umbral:0.35}, op||{});
  prog = prog || function(){};
  const dur = Math.min(buffer.duration, 600);
  prog('Preparando el audio', 0.02);
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const off = new OAC(2, Math.max(1, Math.ceil(dur*SR)), SR);
  const src = off.createBufferSource(); src.buffer = buffer; src.connect(off.destination); src.start();
  const r = await off.startRendering();
  const L = r.getChannelData(0), R = r.numberOfChannels>1 ? r.getChannelData(1) : L;
  const frames = Math.floor((L.length-WIN)/HOP)+1;
  if(!(frames > 10)) throw new Error('El audio es demasiado corto para analizarlo.');

  const nb = Math.ceil(1200*Math.log2(op.fmax/op.fmin)/PASO)+1;
  const sal = new Float32Array(frames*nb), pico = new Float32Array(frames);
  const reM = new Float32Array(N), imM = new Float32Array(N), reS = new Float32Array(N), imS = new Float32Array(N);
  const mag = new Float32Array(N/2);
  const k0 = Math.max(2, Math.floor(60*N/SR)), k1 = Math.min(N/2-2, Math.ceil(5000*N/SR));
  const lfmin = Math.log2(op.fmin), porOct = 1200/PASO;
  const pesoArm = new Float32Array(ARMONICOS+1);
  for(let h=1;h<=ARMONICOS;h++) pesoArm[h] = Math.pow(ALFA, h-1);

  let ult = performance.now();
  for(let f=0; f<frames; f++){
    const o = f*HOP;
    for(let i=0;i<WIN;i++){
      const a = L[o+i], b = R[o+i], w = hann[i];
      reM[i] = (a+b)*0.5*w; reS[i] = (a-b)*0.5*w;
    }
    reM.fill(0, WIN); imM.fill(0); fft(reM, imM);
    if(op.centro){ reS.fill(0, WIN); imS.fill(0); fft(reS, imS); }
    let mx = 0;
    for(let k=k0-1;k<=k1+1;k++){
      let v = Math.hypot(reM[k], imM[k]);
      if(op.centro){ v -= Math.hypot(reS[k], imS[k]); if(v<0) v = 0; }
      mag[k] = v; v *= peso[k]; if(v>mx) mx = v;
    }
    if(mx > 0){
      const piso = mx*0.01, fila = f*nb;
      let top = 0;
      for(let k=k0;k<=k1;k++){
        const b = mag[k];
        if(b*peso[k] <= piso || b <= mag[k-1] || b < mag[k+1]) continue;
        const la = Math.log(mag[k-1]+1e-12), lb = Math.log(b), lc = Math.log(mag[k+1]+1e-12);
        const den = la-2*lb+lc, d = den<0 ? 0.5*(la-lc)/den : 0;
        /* El pico se busca en el espectro sin ponderar para no desplazar su frecuencia. */
        const fr = (k+d)*SR/N, g = Math.pow(Math.exp(lb-0.25*(la-lc)*d)*peso[k], GAMMA);
        const lf = Math.log2(fr);
        for(let h=1;h<=ARMONICOS;h++){
          const pos = (lf-Math.log2(h)-lfmin)*porOct;
          if(pos < -1) break;
          if(pos > nb) continue;
          const w = g*pesoArm[h], b0 = Math.floor(pos);
          for(let q=b0-1;q<=b0+2;q++){
            if(q<0 || q>=nb) continue;
            const dist = Math.abs(q-pos);
            if(dist < 2) sal[fila+q] += w*(1-dist/2);
          }
        }
      }
      for(let q=0;q<nb;q++) if(sal[fila+q]>top) top = sal[fila+q];
      pico[f] = top;
    }
    if(performance.now()-ult > 40){ prog('Buscando la melodía', 0.05+0.83*f/frames); await pausa(); ult = performance.now(); }
  }

  /* Normaliza con el percentil 90 de los cuadros que no son silencio. */
  let pmax = 0; for(let f=0;f<frames;f++) if(pico[f]>pmax) pmax = pico[f];
  if(!(pmax > 0)) throw new Error('El archivo parece estar en silencio.');
  const vivos = []; for(let f=0;f<frames;f++) if(pico[f] > pmax*0.03) vivos.push(pico[f]);
  vivos.sort((a,b)=>a-b);
  const P = vivos[Math.floor(vivos.length*0.9)] || pmax;
  for(let i=0;i<sal.length;i++) sal[i] /= P;

  prog('Uniendo las notas', 0.92); await pausa();
  const cache = {sal, frames, nb, fmin:op.fmin, dur:buffer.duration};
  const res = M.renotar(cache, op);
  res.cache = cache; res.dur = buffer.duration;
  prog('Listo', 1);
  return res;
};

/* ---------- Paso 4: camino más probable y corte en notas ---------- */
M.renotar = function(cache, op){
  const {sal, frames, nb} = cache;
  const umbral = op.umbral != null ? op.umbral : 0.35;
  const VENT = 6, LAM = 0.035, SALTO = 0.7, ENTRAR = 0.55, SALIR = 0.1, U = nb, ancho = nb+1;
  const bp = new Int16Array(frames*ancho);
  let prev = new Float32Array(ancho).fill(-1e9), cur = new Float32Array(ancho);
  prev[U] = 0;
  for(let f=0; f<frames; f++){
    const fila = f*nb, bf = f*ancho;
    let mejor = -1e9, arg = 0;
    for(let b=0;b<nb;b++) if(prev[b]>mejor){ mejor = prev[b]; arg = b; }
    for(let b=0;b<nb;b++){
      let v = mejor-SALTO, a = arg;
      const lo = b-VENT < 0 ? 0 : b-VENT, hi = b+VENT >= nb ? nb-1 : b+VENT;
      for(let j=lo;j<=hi;j++){ const c = prev[j]-LAM*(j>b ? j-b : b-j); if(c>v){ v = c; a = j; } }
      const c = prev[U]-ENTRAR; if(c>v){ v = c; a = U; }
      const s = sal[fila+b];
      cur[b] = v + (s>1.5 ? 1.5 : s) - umbral; bp[bf+b] = a;
    }
    if(prev[U] >= mejor-SALIR){ cur[U] = prev[U]; bp[bf+U] = U; } else { cur[U] = mejor-SALIR; bp[bf+U] = arg; }
    const t = prev; prev = cur; cur = t;
  }
  let est = U, mv = prev[U];
  for(let b=0;b<nb;b++) if(prev[b]>mv){ mv = prev[b]; est = b; }
  const camino = new Int16Array(frames);
  for(let f=frames-1; f>=0; f--){ camino[f] = est; est = bp[f*ancho+est]; }

  /* Tono fino por cuadro, en semitonos MIDI. */
  const base = E.hzAMidi(cache.fmin);
  const pm = new Float32Array(frames).fill(NaN);
  let sx = 0, sy = 0, voz = 0;
  for(let f=0;f<frames;f++){
    const b = camino[f]; if(b===U) continue;
    const fila = f*nb, y1 = sal[fila+b], y0 = b>0 ? sal[fila+b-1] : y1, y2 = b<nb-1 ? sal[fila+b+1] : y1;
    const den = y0-2*y1+y2, d = den<0 ? E.clamp(0.5*(y0-y2)/den, -0.5, 0.5) : 0;
    const m = base + (b+d)*PASO/100;
    pm[f] = m; voz++;
    const ang = 2*Math.PI*(m-Math.round(m));
    sx += Math.cos(ang)*y1; sy += Math.sin(ang)*y1;
  }
  /* Afinación general de la grabación respecto a La = 440 Hz. */
  let afin = voz ? Math.round(Math.atan2(sy, sx)/(2*Math.PI)*100) : 0;
  if(Math.abs(afin) < 8) afin = 0;
  if(afin) for(let f=0;f<frames;f++) pm[f] -= afin/100;

  const notas = M.cortar(pm, M.DT, WIN/2/SR, op.minDur || 0.1);
  return {notas, afin, tono:pm, cuadrosConVoz:voz};
};

M.cortar = function(pm, dt, desfase, minDur){
  const n = pm.length, crudas = [];
  let i = 0;
  while(i<n){
    if(pm[i] !== pm[i]){ i++; continue; }
    const ini = i, vals = [pm[i]];
    let centro = pm[i], fin = i, huecos = 0, desv = 0, primDesv = -1, corte = -1, j = i+1;
    for(; j<n; j++){
      const v = pm[j];
      if(v !== v){ if(++huecos > 3) break; continue; }
      huecos = 0;
      if(Math.abs(v-centro) < 0.8){
        vals.push(v); fin = j; desv = 0;
        if(vals.length%4===0) centro = E.mediana(vals);
      } else {
        if(desv===0) primDesv = j;
        if(++desv >= 3){ corte = primDesv; break; }
      }
    }
    crudas.push({t:ini*dt+desfase, d:(fin-ini+1)*dt, m:Math.round(E.mediana(vals))});
    i = corte >= 0 ? corte : j;
  }
  /* Une trozos de la misma nota separados por un instante y descarta los muy cortos. */
  const notas = [];
  for(const c of crudas){
    if(c.d < minDur*0.5) continue;
    const u = notas[notas.length-1];
    if(u && u.m===c.m && c.t-(u.t+u.d) < 0.12){ u.d = c.t+c.d-u.t; continue; }
    notas.push(c);
  }
  return notas.filter(x => x.d >= minDur).map(x => ({t:+x.t.toFixed(3), d:+x.d.toFixed(3), m:x.m}));
};
})();
