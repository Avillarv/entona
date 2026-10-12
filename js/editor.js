/* Entona · editor de notas de las canciones importadas. */
(function(){
'use strict';
const E = window.Entona, S = E.S, $ = E.$, A = E.audio, B = E.bib, R = E.rollo, M = E.melodia;
const {clamp, mediana, midiAHz} = E;
const P = E.app;
const {ED, K, decir, kIr, recompilar, seleccionar, pintarCabecera, pintarRuta} = P;

/* =====================================================================
   Editor de notas (canciones importadas)
   ===================================================================== */
let guardarT = 0;
function guardarLuego(){ const p = S.pieza; clearTimeout(guardarT); guardarT = setTimeout(() => B.guardar(p), 500); }
function edFoto(){ ED.undo.push(JSON.stringify(S.pieza.notas)); if(ED.undo.length > 60) ED.undo.shift(); }
function edListo(){
  S.pieza.notas.sort((a,b) => a.t-b.t);
  recompilar(); guardarLuego(); pintarEditor(); pintarCabecera();
}
function edOir(n){ A.tono(n.m+(S.pieza.afin||0)/100, 0.3, {vol:0.2, bloquear:false}); }
const edOps = {
  tono(d){ if(!ED.sel.size) return; edFoto(); ED.sel.forEach(n => { n.m = clamp(n.m+d, 24, 96); }); edListo(); if(ED.sel.size===1) edOir([...ED.sel][0]); },
  dur(d){ if(!ED.sel.size) return; edFoto(); ED.sel.forEach(n => { n.d = +Math.max(0.06, n.d+d).toFixed(3); }); edListo(); },
  mover(d){ if(!ED.sel.size) return; edFoto(); ED.sel.forEach(n => { n.t = +Math.max(0, n.t+d).toFixed(3); }); edListo(); },
  borrar(){ if(!ED.sel.size) return; edFoto(); S.pieza.notas = S.pieza.notas.filter(n => !ED.sel.has(n)); ED.sel.clear(); edListo(); },
  agregar(){
    edFoto();
    const t = Math.max(0, K.t), ns = S.pieza.notas;
    let m = 60; for(const n of ns){ if(n.t <= t) m = n.m; else break; }
    const n = {t:+t.toFixed(3), d:0.4, m};
    ns.push(n); ED.sel = new Set([n]); ED.ancla = n; edListo(); edOir(n);
  },
  todo(){ ED.sel = new Set(S.pieza.notas); pintarEditor(); },
  cortas(){
    const antes = S.pieza.notas.length; edFoto();
    S.pieza.notas = S.pieza.notas.filter(n => n.d >= 0.16); ED.sel.clear(); edListo();
    decir('Quité '+(antes-S.pieza.notas.length)+' notas de menos de 0,16 s.');
  },
  deshacer(){ const s = ED.undo.pop(); if(!s) return; S.pieza.notas = JSON.parse(s); ED.sel.clear(); ED.ancla = null; edListo(); },
};
function pintarEditor(){
  if(S.modo!=='editar') return;
  const n = ED.sel.size, uno = n===1 ? [...ED.sel][0] : null;
  $('edSelTxt').textContent = n===0 ? 'Sin selección' : uno ? E.nota(uno.m)+' · '+uno.d.toFixed(2).replace('.',',')+' s' : n+' notas';
  document.querySelectorAll('#editor [data-ed]').forEach(b => {
    const op = b.dataset.ed.split(':')[0];
    if(['tono','dur','mover','borrar'].includes(op)) b.disabled = n===0;
    if(op==='deshacer') b.disabled = ED.undo.length===0;
  });
  if(document.activeElement !== $('edNombre')) $('edNombre').value = S.pieza.nombre;
  $('edRedetectar').disabled = !(S.pieza.audio || S.pieza.yt);
}
$('editor').addEventListener('click', e => {
  const b = e.target.closest('button[data-ed]'); if(!b || b.disabled) return;
  const [op, arg] = b.dataset.ed.split(':');
  edOps[op](arg != null ? +arg : undefined);
});
function edNotaEn(c){
  let mejor = null, dm = 0.75;
  for(const n of S.carta.notas){
    if(c.t < n.t0-0.03 || c.t > n.t1+0.03) continue;
    const d = Math.abs(c.m-n.m); if(d < dm){ dm = d; mejor = n; }
  }
  return mejor;
}
$('roll').addEventListener('click', e => {
  if(S.modo!=='editar') return;
  const rc = $('roll').getBoundingClientRect(), c = R.aCoord(e.clientX-rc.left, e.clientY-rc.top);
  if(!c || c.enTeclado) return;
  const n = edNotaEn(c);
  if(!n){ ED.sel.clear(); ED.ancla = null; kIr(Math.max(0, c.t)); pintarEditor(); return; }
  if(e.shiftKey && ED.ancla){
    const a = Math.min(ED.ancla.t, n.src.t), b = Math.max(ED.ancla.t, n.src.t);
    ED.sel = new Set(S.pieza.notas.filter(x => x.t >= a && x.t <= b));
  } else { ED.sel = new Set([n.src]); ED.ancla = n.src; edOir(n.src); }
  pintarEditor();
});
function edVecina(dir){
  const ns = S.pieza.notas; if(!ns.length) return;
  let i;
  if(ED.sel.size===1) i = ns.indexOf([...ED.sel][0])+dir;
  else { i = ns.findIndex(n => n.t >= K.t); if(i<0) i = ns.length-1; if(dir<0) i = Math.max(0, i-1); }
  i = clamp(i, 0, ns.length-1);
  ED.sel = new Set([ns[i]]); ED.ancla = ns[i];
  kIr(ns[i].t); edOir(ns[i]); pintarEditor();
}
$('edNombre').addEventListener('input', () => {
  const v = $('edNombre').value.trim(); if(!v) return;
  S.pieza.nombre = v; $('piezaNombre').textContent = v; pintarRuta(); guardarLuego();
});
$('edExportar').addEventListener('click', () => B.descargar(S.pieza));
$('edRedetectar').addEventListener('click', () => { if(S.pieza.audio || S.pieza.yt) P.abrirImportar(S.pieza); });
let borrarT = 0;
$('edBorrar').addEventListener('click', async () => {
  const b = $('edBorrar');
  if(b.dataset.seguro !== '1'){
    b.dataset.seguro = '1'; b.textContent = 'Pulsa otra vez para borrarla';
    clearTimeout(borrarT); borrarT = setTimeout(() => { b.dataset.seguro = ''; b.textContent = 'Borrar canción'; }, 4000);
    return;
  }
  clearTimeout(borrarT); b.dataset.seguro = ''; b.textContent = 'Borrar canción';
  const p = S.pieza; clearTimeout(guardarT);
  await B.borrar(p.id); delete S.mejor[p.id];
  if(S.seccion==='karaoke') P.irSeccion('karaoke'); else seleccionar(E.PIEZAS[1].id);
  decir('Borré «'+p.nombre+'».');
});

Object.assign(P, {guardarLuego, edFoto, edListo, edOir, edOps, pintarEditor, edNotaEn, edVecina});
})();
