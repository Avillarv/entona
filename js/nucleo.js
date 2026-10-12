/* Entona · núcleo: espacio de nombres, utilidades, nombres de notas y estado guardado. */
(function(){
'use strict';
const E = window.Entona = {};

E.$ = id => document.getElementById(id);
E.clamp = (v,a,b) => Math.min(b, Math.max(a, v));
E.mediana = a => { const b = Array.from(a).sort((x,y)=>x-y), n = b.length; return n%2 ? b[(n-1)/2] : (b[n/2-1]+b[n/2])/2; };
E.midiAHz = m => 440*Math.pow(2,(m-69)/12);
E.hzAMidi = f => 69 + 12*Math.log2(f/440);
E.reloj = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };
E.hoy = (d) => { d = d || new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };

/* Estado de la aplicación. Lo que se guarda entre sesiones está en CLAVES. */
const S = E.S = {
  pieza:null, vista:'practica', modo:'ritmo', carta:null,
  tonic:55, tol:35, guia:'each', nombres:'solf', octLibre:false, salida:'audifonos',
  volGuia:0.8, volGuiaPista:0, volNotas:0.7, volPista:0.8, metronomo:true, vel:1,
  mejor:{}, dias:[], curso:{}, xp:0, xpDias:{}, seccion:null,
  filtroRuido:true, sensib:'normal', ruido:null,
  mic:'off', micError:'', cal:null,
  idx:0, hold:0, hecho:false, saltadas:0, prev:null, graceUntil:0,
  stats:{voiced:0,inTune:0,absSum:0}, resultado:null,
  freeLo:null, freeHi:null, viewC:59,
  ed:{sel:null, undo:[]},
};
const CLAVES = ['tonic','tol','nombres','octLibre','salida','volGuia','volGuiaPista','volNotas','volPista','metronomo','vel','mejor','dias','curso','xp','xpDias','seccion','filtroRuido','sensib','ruido'];
const ALMACEN = 'entona.v2';

E.cargar = function(){
  let d = {};
  try{ d = JSON.parse(localStorage.getItem(ALMACEN) || '{}') || {}; }catch(e){}
  if(Number.isFinite(d.tonic)) S.tonic = E.clamp(Math.round(d.tonic),36,67);
  if([20,35,50].includes(d.tol)) S.tol = d.tol;
  if(d.nombres==='abc' || d.nombres==='solf') S.nombres = d.nombres;
  if(typeof d.octLibre==='boolean') S.octLibre = d.octLibre;
  if(d.salida==='parlantes' || d.salida==='audifonos') S.salida = d.salida;
  ['volGuia','volGuiaPista','volNotas','volPista'].forEach(k => { if(Number.isFinite(d[k])) S[k] = E.clamp(d[k],0,1); });
  if(typeof d.metronomo==='boolean') S.metronomo = d.metronomo;
  if([0.6,0.8,1].includes(d.vel)) S.vel = d.vel;
  if(d.mejor && typeof d.mejor==='object') S.mejor = d.mejor;
  if(Array.isArray(d.dias)) S.dias = d.dias.filter(x=>typeof x==='string').slice(-90);
  if(d.curso && typeof d.curso==='object') S.curso = d.curso;
  if(Number.isFinite(d.xp)) S.xp = Math.max(0, d.xp);
  if(d.xpDias && typeof d.xpDias==='object') S.xpDias = d.xpDias;
  if(['aprender','practicar','karaoke'].includes(d.seccion)) S.seccion = d.seccion;
  if(typeof d.filtroRuido==='boolean') S.filtroRuido = d.filtroRuido;
  if(['alta','normal','baja'].includes(d.sensib)) S.sensib = d.sensib;
  if(Number.isFinite(d.ruido) && d.ruido > 0) S.ruido = d.ruido;
  return d.pieza || null;
};
E.guardar = function(){
  const d = {pieza: S.pieza ? S.pieza.id : null};
  CLAVES.forEach(k => d[k] = S[k]);
  try{ localStorage.setItem(ALMACEN, JSON.stringify(d)); }catch(e){}
};

/* Racha: días seguidos con al menos una pieza completada, contando hoy o ayer como último día. */
E.racha = function(){
  const set = new Set(S.dias);
  const d = new Date();
  if(!set.has(E.hoy(d))){ d.setDate(d.getDate()-1); if(!set.has(E.hoy(d))) return 0; }
  let n = 0;
  while(set.has(E.hoy(d))){ n++; d.setDate(d.getDate()-1); }
  return n;
};
E.anotarDia = function(){ const h = E.hoy(); if(!S.dias.includes(h)){ S.dias.push(h); S.dias = S.dias.slice(-90); } };

/* Nombres de notas. La octava sigue la numeración científica: La4 = 440 Hz, MIDI 69. */
const SOLF = ['Do','Do♯','Re','Re♯','Mi','Fa','Fa♯','Sol','Sol♯','La','La♯','Si'];
const ABC  = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
E.NEGRA = [0,1,0,1,0,0,1,0,1,0,1,0];
E.pc = m => ((Math.round(m)%12)+12)%12;
E.nombre = m => (S.nombres==='abc' ? ABC : SOLF)[E.pc(m)];
E.octava = m => Math.floor(Math.round(m)/12)-1;
E.nota = m => E.nombre(m)+E.octava(m);
E.notaHTML = m => E.nombre(m)+'<sub>'+E.octava(m)+'</sub>';
E.texto = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
})();
