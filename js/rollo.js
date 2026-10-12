/* Entona · rollo de piano: dibuja los carriles, el teclado, las notas objetivo y el trazo de la voz.
   Dos disposiciones: «vivo» (a tu ritmo y canto libre: el tiempo real corre de derecha a izquierda)
   y «tiempo» (karaoke y editor: las notas de la canción avanzan hacia la línea del ahora). */
(function(){
'use strict';
const E = window.Entona, S = E.S;
const R = E.rollo = {geo:null};
const FUENTE = '"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace';
let cv, g, C = {}, cw = 0, ch = 0;

R.colores = function(){
  const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
  C = {surface:v('--surface'), lane:v('--lane-dark'), line:v('--line'), ink:v('--ink'), muted:v('--muted'),
       voice:v('--voice'), ok:v('--ok'), keyW:v('--key-white'), keyB:v('--key-black'), onInk:v('--on-ink')};
};
R.medir = function(){
  const dpr = window.devicePixelRatio || 1;
  cw = cv.clientWidth; ch = cv.clientHeight;
  cv.width = Math.round(cw*dpr); cv.height = Math.round(ch*dpr);
  g.setTransform(dpr,0,0,dpr,0,0);
};
R.iniciar = function(canvas){
  cv = canvas; g = cv.getContext('2d');
  R.colores(); R.medir();
  new ResizeObserver(R.medir).observe(cv);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', R.colores);
  new MutationObserver(R.colores).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(R.colores);
};

/* Rango vertical visible, en notas MIDI. Si la canción es muy amplia, la ventana sigue a S.viewC. */
R.rango = function(){
  const c = S.carta;
  if(S.pieza.libre || !c || !c.notas.length) return [S.viewC-8, S.viewC+8];
  if(c.hi-c.lo <= 19) return [c.lo-3, c.hi+3];
  return [S.viewC-10.5, S.viewC+10.5];
};
const enTiempo = () => S.modo==='karaoke' || S.modo==='editar';

function barra(x, y, w, h, r){
  g.beginPath();
  if(g.roundRect) g.roundRect(x, y, w, h, Math.min(r, w/2, h/2)); else g.rect(x, y, w, h);
}

R.dibujar = function(ahora){
  if(!cw || !S.pieza) return;
  const w = cw, h = ch, G = w<520 ? 36 : 48;
  const [lo,hi] = R.rango(), rh = h/(hi-lo+1);
  const y = m => h-(m-lo+0.5)*rh;
  g.clearRect(0,0,w,h);

  /* carriles y teclado */
  g.fillStyle = C.keyW; g.fillRect(0,0,G,h);
  const m0 = Math.floor(lo)-1, m1 = Math.ceil(hi)+1;
  for(let m=m0; m<=m1; m++){
    const top = y(m)-rh/2, p = E.pc(m);
    g.fillStyle = E.NEGRA[p] ? C.lane : C.surface; g.fillRect(G,top,w-G,rh);
    g.fillStyle = C.line;
    if(p===0 || p===5){ g.globalAlpha = p===0 ? 1 : .55; g.fillRect(0,top+rh-.5,w,1); g.globalAlpha = 1; }
    if(E.NEGRA[p]){ g.fillRect(G*.6,y(m)-.5,G*.4,1); g.fillStyle = C.keyB; g.fillRect(0,top+1,G*.6,rh-2); }
  }
  g.fillStyle = C.line; g.fillRect(G-.5,0,1,h);
  g.textBaseline = 'middle';
  if(rh >= 11){
    g.font = '500 10px '+FUENTE; g.textAlign = 'right'; g.fillStyle = C.keyB; g.globalAlpha = .75;
    for(let m=m0; m<=m1; m++) if(E.pc(m)===0) g.fillText(E.nota(m), G-4, y(m)+.5);
    g.globalAlpha = 1;
  }

  if(enTiempo()) tiempo(w, h, G, y, rh, lo);
  else vivo(ahora, w, h, G, y, rh);
};

/* ---------- Disposición «vivo» ---------- */
function vivo(ahora, w, h, G, y, rh){
  const c = S.carta, hist = E.hist;
  R.geo = null;
  if(!S.pieza.libre && c && !S.hecho && c.notas[S.idx]){
    const tg = c.notas[S.idx].m, nx = c.notas[S.idx+1];
    if(nx && Math.round(nx.m)!==Math.round(tg)){
      const ny = y(nx.m);
      g.strokeStyle = C.muted; g.globalAlpha = .7; g.lineWidth = 1; g.setLineDash([4,4]);
      g.strokeRect(G+1.5, ny-rh/2+1.5, w-G-3, rh-3); g.setLineDash([]); g.globalAlpha = 1;
      g.fillStyle = C.muted; g.textAlign = 'left'; g.font = '500 10px '+FUENTE;
      if(rh>=13) g.fillText('luego '+E.nota(nx.m), G+8, ny+.5);
    }
    const ty = y(tg), banda = S.tol/100*rh;
    g.fillStyle = C.ok;
    g.globalAlpha = .13; g.fillRect(G,ty-rh/2,w-G,rh);
    g.globalAlpha = .3;  g.fillRect(G,ty-banda,w-G,banda*2);
    g.globalAlpha = 1;   g.fillRect(G,ty-rh/2,3,rh);
    g.textAlign = 'left'; g.font = '500 11px '+FUENTE;
    if(rh>=13) g.fillText(E.nota(tg), G+8, ty+.5);
  }
  const nowX = w-52, pps = (nowX-G)/6000;
  trazo(hist, p => nowX-(ahora-p.t)*pps, w, h, G, y);
  g.fillStyle = C.muted; g.globalAlpha = .45; g.fillRect(nowX-.5,0,1,h); g.globalAlpha = 1;
  cabeza(hist, nowX, h, y);
}

/* ---------- Disposición «tiempo» ---------- */
function tiempo(w, h, G, y, rh, lo){
  const c = S.carta, K = E.K, t = K.t, editar = S.modo==='editar';
  const pps = w<520 ? 80 : 110, nowX = G+(w-G)*(editar ? 0.4 : 0.3);
  R.geo = {G, nowX, pps, lo, rh, h, t};
  const tIzq = t-(nowX-G)/pps, tDer = t+(w-nowX)/pps;

  g.save(); g.beginPath(); g.rect(G,0,w-G,h); g.clip();
  /* líneas de compás en las piezas con pulso */
  if(c.spb){
    const paso = c.spb*(c.compas||4), off = (c.anacrusa||0)*c.spb;
    g.fillStyle = C.line;
    for(let k=Math.ceil((tIzq-off)/paso); off+k*paso<tDer; k++) g.fillRect(nowX+(off+k*paso-t)*pps-.5, 0, 1, h);
  }
  const sel = S.ed.sel;
  g.font = '500 10px '+FUENTE; g.textAlign = 'left';
  for(let i=0;i<c.notas.length;i++){
    const n = c.notas[i];
    if(n.t1 < tIzq) continue;
    if(n.t0 > tDer) break;
    const x0 = nowX+(n.t0-t)*pps, an = Math.max(3,(n.t1-n.t0)*pps-1.5), yy = y(n.m), top = yy-rh/2+1.5, al = Math.max(3,rh-3);
    let texto = C.ink;
    if(editar){
      const s = sel && sel.has(n.src);
      g.fillStyle = s ? C.voice : C.ink; g.globalAlpha = s ? 1 : .55;
      barra(x0, top, an, al, 3); g.fill(); texto = C.onInk;
    } else {
      const dur = n.t1-n.t0, punt = Math.min(1, K.hit[i]/(0.7*dur));
      if(K.visto[i]){
        g.fillStyle = punt>=.5 ? C.ok : C.voice; g.globalAlpha = punt>=.5 ? .95 : .3;
        barra(x0, top, an, al, 3); g.fill(); texto = null;
      } else if(t>=n.t0 && t<n.t1+0.12){
        g.fillStyle = C.ok; g.globalAlpha = .28; barra(x0, top, an, al, 3); g.fill();
        g.globalAlpha = 1; barra(x0, top, an*punt, al, 3); g.fill();
        g.strokeStyle = C.ok; g.lineWidth = 1.5; barra(x0+.75, top+.75, an-1.5, al-1.5, 3); g.stroke();
      } else {
        g.fillStyle = C.muted; g.globalAlpha = .42; barra(x0, top, an, al, 3); g.fill();
      }
    }
    g.globalAlpha = 1;
    if(texto && an > 30 && rh >= 13){ g.fillStyle = texto; g.fillText(E.nota(n.m), x0+5, yy+.5); }
  }
  g.restore();

  if(!editar){ trazo(E.hist, p => nowX+(p.st-t)*pps, w, h, G, y); }
  g.fillStyle = editar ? C.voice : C.muted; g.globalAlpha = editar ? .9 : .5; g.fillRect(nowX-.75,0,1.5,h); g.globalAlpha = 1;
  if(!editar){
    const u = E.hist[E.hist.length-1];
    if(u && u.m!=null) cabeza(E.hist, nowX+(u.st-t)*pps, h, y);
    /* cuenta de entrada */
    if(K.on && t<0 && c.spb){
      g.fillStyle = C.ink; g.font = '700 34px "Bricolage Grotesque","Segoe UI",system-ui,sans-serif'; g.textAlign = 'left';
      g.fillText(String(Math.ceil(-t/c.spb)), nowX+14, 30);
    }
  }
}

function trazo(hist, xDe, w, h, G, y){
  g.save(); g.beginPath(); g.rect(G,0,w-G,h); g.clip();
  g.lineWidth = 3; g.lineCap = 'round';
  let pv = null;
  for(let i=0;i<hist.length;i++){
    const p = hist[i];
    if(p.m==null){ pv = null; continue; }
    const x = xDe(p), yy = E.clamp(y(p.m), 3, h-3);
    if(pv && p.t-pv.t < 160 && Math.abs(p.m-pv.m) < 2.5){
      g.strokeStyle = p.ok ? C.ok : C.voice;
      g.beginPath(); g.moveTo(pv.x,pv.y); g.lineTo(x,yy); g.stroke();
    }
    pv = {x, y:yy, t:p.t, m:p.m};
  }
  g.restore();
}
function cabeza(hist, x, h, y){
  const u = hist[hist.length-1];
  if(!u || u.m==null) return;
  const yy = y(u.m);
  g.fillStyle = u.ok ? C.ok : C.voice;
  if(yy < 0 || yy > h){
    const up = yy<0, ay = up ? 6 : h-6;
    g.beginPath(); g.moveTo(x, up?ay-4:ay+4); g.lineTo(x-7, up?ay+6:ay-6); g.lineTo(x+7, up?ay+6:ay-6); g.closePath(); g.fill();
  } else {
    g.globalAlpha = .22; g.beginPath(); g.arc(x,yy,12,0,6.2832); g.fill();
    g.globalAlpha = 1;   g.beginPath(); g.arc(x,yy,6,0,6.2832); g.fill();
  }
}

/* Convierte un punto del lienzo en tiempo de canción y nota (solo en disposición «tiempo»). */
R.aCoord = function(px, py){
  const q = R.geo; if(!q) return null;
  return {t: q.t+(px-q.nowX)/q.pps, m: q.lo+(q.h-py)/q.rh-0.5, enTeclado: px<q.G};
};
})();
