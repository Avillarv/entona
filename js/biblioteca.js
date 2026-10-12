/* Entona · biblioteca: canciones importadas. Se guardan en IndexedDB (con su audio, o con el video de YouTube
   al que van ligadas) y se exportan como JSON (notas y, si lo hay, el identificador del video). */
(function(){
'use strict';
const E = window.Entona;
const B = E.bib = {db:null, lista:[], persistente:false};
const descDe = c => c.yt ? 'YouTube' : c.audio ? 'Con audio' : 'Solo notas';

B.abrir = function(){
  return new Promise(res => {
    try{
      const rq = indexedDB.open('entona', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('canciones', {keyPath:'id'});
      rq.onsuccess = () => { B.db = rq.result; B.persistente = true; res(true); };
      rq.onerror = () => res(false);
      rq.onblocked = () => res(false);
    }catch(e){ res(false); }
  });
};
function tx(modo, fn){
  return new Promise((res, rej) => {
    try{
      const t = B.db.transaction('canciones', modo), st = t.objectStore('canciones');
      const rq = fn(st);
      t.oncomplete = () => res(rq && rq.result);
      t.onerror = t.onabort = () => rej(t.error);
    }catch(e){ rej(e); }
  });
}
/* Convierte un registro guardado en una pieza que la aplicación puede tocar. */
function aPieza(c){
  return {id:c.id, grupo:'mias', abs:true, etiqueta:'Mi canción', nombre:c.nombre, desc:descDe(c),
    tip:'', notas:c.notas, dur:c.dur, afin:c.afin||0, trans:c.trans||0, audio:c.audio||null, yt:c.yt||null, creado:c.creado||0};
}
function aRegistro(p){
  return {id:p.id, nombre:p.nombre, notas:p.notas.map(n=>({t:+n.t.toFixed(3), d:+n.d.toFixed(3), m:n.m})),
    dur:p.dur, afin:p.afin||0, trans:p.trans||0, audio:p.audio||null, yt:p.yt||null, creado:p.creado||Date.now()};
}
B.cargar = async function(){
  if(!B.db){ return B.lista; }
  try{ const filas = await tx('readonly', st => st.getAll()); B.lista = (filas||[]).sort((a,b)=>a.creado-b.creado).map(aPieza); }
  catch(e){ B.lista = []; }
  return B.lista;
};
B.guardar = async function(p){
  const i = B.lista.findIndex(x=>x.id===p.id);
  if(i<0) B.lista.push(p); else B.lista[i] = p;
  p.desc = descDe(p);
  if(B.db){ try{ await tx('readwrite', st => st.put(aRegistro(p))); }catch(e){ B.persistente = false; } }
  return p;
};
B.borrar = async function(id){
  B.lista = B.lista.filter(x=>x.id!==id);
  if(B.db){ try{ await tx('readwrite', st => st.delete(id)); }catch(e){} }
};
B.nueva = function(d){
  return aPieza({id:d.id || 'mia-'+Date.now().toString(36), nombre:d.nombre, notas:d.notas, dur:d.dur, afin:d.afin||0, trans:d.trans||0, audio:d.audio||null, yt:d.yt||null, creado:d.creado||Date.now()});
};

/* ---------- JSON ---------- */
B.aJSON = function(p){
  return JSON.stringify({formato:'entona-cancion', version:1, nombre:p.nombre, duracion:+(+p.dur).toFixed(2), afinacion:p.afin||0,
    ...(p.yt ? {youtube:p.yt} : {}), notas:p.notas.map(n=>({t:+n.t.toFixed(3), d:+n.d.toFixed(3), m:n.m}))}, null, 1);
};
B.desdeJSON = function(texto){
  let d;
  try{ d = JSON.parse(texto); }catch(e){ throw new Error('El archivo no es un JSON válido.'); }
  if(!d || d.formato!=='entona-cancion' || !Array.isArray(d.notas)) throw new Error('Ese JSON no es una canción de Entona. Revisa FORMATO-CANCION.md.');
  const notas = d.notas.map(n => ({t:+n.t, d:+n.d, m:Math.round(+n.m)}))
    .filter(n => Number.isFinite(n.t) && Number.isFinite(n.d) && Number.isFinite(n.m) && n.t>=0 && n.d>0 && n.m>=24 && n.m<=96)
    .sort((a,b)=>a.t-b.t);
  if(!notas.length) throw new Error('La canción no tiene notas válidas.');
  const fin = notas.reduce((a,n)=>Math.max(a,n.t+n.d),0);
  const yt = typeof d.youtube==='string' && /^[A-Za-z0-9_-]{11}$/.test(d.youtube) ? d.youtube : null;
  return B.nueva({nombre:String(d.nombre||'Canción importada').slice(0,80), notas, dur:Math.max(+d.duracion||0, fin+1), afin:E.clamp(+d.afinacion||0,-50,50), yt});
};
B.descargar = function(p){
  const blob = new Blob([B.aJSON(p)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const base = (p.nombre||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9 _-]+/g,'').trim().replace(/\s+/g,'-').toLowerCase();
  a.download = (base || 'cancion')+'.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
};
})();
