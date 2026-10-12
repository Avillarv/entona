/* Entona · lecciones: el camino del curso (mapa) y el reproductor de lecciones paso a paso.
   El bucle principal de app.js llama a C.tick con la lectura del micrófono mientras hay una lección abierta. */
(function(){
'use strict';
const E = window.Entona, S = E.S, $ = E.$, A = E.audio;
const {clamp, mediana} = E;
const C = E.curso = {};

const TOL = 50;      // cents: en las lecciones se acepta más que en la práctica
const META = 20;     // XP de la meta diaria
const MAX_REPASO = 3;
const ZIG = [0, 44, 66, 44, 0, -44, -66, -44];
C.META = META;
const L = {lec:null, pasos:[], i:0, errores:0, extra:0, p:null, fin:false, pie:null, timers:[]};

const rnd = (a, b) => a+Math.floor(Math.random()*(b-a+1));
const azar = () => Math.random() < 0.5;
const xpHoy = () => S.xpDias[E.hoy()] || 0;
const hecha = l => (S.curso[l.id]||0) > 0;
const desbloqueada = l => { const i = E.LECCIONES.indexOf(l); return i<=0 || hecha(E.LECCIONES[i-1]); };
const usaMic = p => p.tipo==='canta' || p.tipo==='voz' || p.tipo==='calibra';
const estrellas = n => '★'.repeat(n)+'<span>'+'★'.repeat(3-n)+'</span>';
const despues = (f, ms) => { L.timers.push(setTimeout(f, ms)); };
const AJUSTAR = '<button class="btn enlace" type="button" data-act="panelMic">¿Detecta sonido sin que cantes? Ajusta el micrófono</button>';
const dif = (m, tg) => { let d = m-tg; return d-12*Math.round(d/12); };   // cualquier octava vale

const ICONO = {
  hecho:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  bloq:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  actual:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
  oir:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
};

/* =====================================================================
   Sonido
   ===================================================================== */
function sonar(ms, dur){
  A.asegurar(); A.silenciar();
  let t = A.ctx.currentTime+0.08;
  ms.forEach(m => { if(m!=null) A.tono(m, dur*0.92, {cuando:t, vol:0.24}); t += dur; });
}
/* Demo: [[semitonos sobre el tono de inicio, segundos]], null es silencio. */
function sonarDemo(notas){
  A.asegurar(); A.silenciar();
  let t = A.ctx.currentTime+0.08;
  notas.forEach(([s, d]) => { if(s!=null) A.tono(S.tonic+s, d*0.94, {cuando:t, vol:0.24}); t += d; });
}
const zonaOido = () => clamp(S.tonic+4, 52, 67)+rnd(-2, 3);

/* =====================================================================
   Preguntas de oído
   ===================================================================== */
const OIDO = {
  altura(nivel){
    const iv = nivel>=3 ? rnd(1,2) : nivel===2 ? rnd(3,5) : rnd(7,12), b = zonaOido()-(nivel===1 ? 3 : 0);
    const sube = azar(), ms = sube ? [b, b+iv] : [b+iv, b];
    return {pregunta:'¿Cuál nota es más aguda?', opciones:['La primera','La segunda'], correcta:sube ? 1 : 0,
            oir:() => sonar(ms, 0.8), detalle:sube ? 'La segunda nota estaba más arriba.' : 'La primera nota estaba más arriba.'};
  },
  igual(nivel){
    const b = zonaOido(), igual = azar(), d = (azar() ? 1 : -1)*(nivel>=2 ? rnd(1,2) : rnd(3,7));
    const ms = [b, igual ? b : b+d];
    return {pregunta:'¿Las dos notas son iguales o distintas?', opciones:['Iguales','Distintas'], correcta:igual ? 0 : 1,
            oir:() => sonar(ms, 0.8),
            detalle:igual ? 'Eran la misma nota.' : 'La segunda estaba '+Math.abs(d)+(Math.abs(d)===1 ? ' semitono' : ' semitonos')+' más '+(d>0 ? 'arriba.' : 'abajo.')};
  },
  direccion(){
    const b = zonaOido()-2, r = Math.random(), tipo = r < 0.4 ? 0 : r < 0.8 ? 1 : 2;
    const s1 = rnd(1,2), s2 = rnd(1,2);
    const ms = tipo===0 ? [b, b+s1, b+s1+s2] : tipo===1 ? [b+s1+s2, b+s2, b] : [b+2, b+2, b+2];
    return {pregunta:'¿Hacia dónde va la melodía?', opciones:['Sube','Baja','Se queda igual'], correcta:tipo,
            oir:() => sonar(ms, 0.6),
            detalle:['Cada nota estaba más arriba que la anterior.','Cada nota estaba más abajo que la anterior.','Las tres notas eran la misma.'][tipo]};
  },
  afinada(nivel){
    const b = zonaOido(), ok = azar(), c = (azar() ? 1 : -1)*(nivel>=2 ? rnd(22,32) : rnd(38,55));
    const ms = [b, ok ? b : b+c/100];
    return {pregunta:'¿La segunda nota está afinada con la primera?', opciones:['Afinada','Desafinada'], correcta:ok ? 0 : 1,
            oir:() => sonar(ms, 1),
            detalle:ok ? 'Eran exactamente la misma nota.' : 'La segunda estaba '+Math.abs(c)+' cents más '+(c>0 ? 'alta.' : 'baja.')};
  },
  paso(){
    const b = zonaOido()-2, esPaso = azar(), iv = esPaso ? rnd(1,2) : rnd(4,9), sube = azar();
    const ms = sube ? [b, b+iv] : [b+iv, b];
    return {pregunta:'¿Es un paso o un salto?', opciones:['Paso','Salto'], correcta:esPaso ? 0 : 1,
            oir:() => sonar(ms, 0.8),
            detalle:esPaso ? 'Las notas eran vecinas: un paso.' : 'Entre las dos notas había '+(iv-1)+' notas de por medio: un salto.'};
  },
};

/* =====================================================================
   Mapa del curso
   ===================================================================== */
C.pintarMapa = function(){
  const hoy = xpHoy();
  let html = '<div class="meta"><div><span class="label">Meta de hoy</span><b>'+Math.min(hoy, META)+' / '+META+' XP</b></div>'
    + '<div class="meta-dato"><span class="label">Racha</span><b>'+E.racha()+'</b></div>'
    + '<div class="meta-dato"><span class="label">XP total</span><b>'+S.xp+'</b></div>'
    + '<div class="progreso"><i style="width:'+Math.min(100, hoy/META*100)+'%"></i></div></div>';
  let marcada = false;
  E.CURSO.forEach((u, ui) => {
    const abierta = desbloqueada(u.lecciones[0]);
    const listas = u.lecciones.filter(hecha).length;
    html += '<section class="unidad'+(abierta ? '' : ' cerrada')+'">'
      + '<header class="unidad-cab"><p class="eyebrow">Unidad '+(ui+1)+' · '+listas+' de '+u.lecciones.length+'</p>'
      + '<h2>'+E.texto(u.nombre)+'</h2><p>'+E.texto(u.desc)+'</p></header><ol class="camino">';
    u.lecciones.forEach((l, li) => {
      const ok = hecha(l), libre = desbloqueada(l), actual = libre && !ok && !marcada;
      if(actual) marcada = true;
      const cls = ok ? 'hecho' : actual ? 'actual' : 'bloq';
      const est = S.curso[l.id]||0;
      html += '<li class="nodo '+cls+'" style="--x:'+ZIG[li%ZIG.length]+'px">'
        + (actual ? '<span class="burbuja">Empezar</span>' : '')
        + '<button class="nodo-btn" type="button" data-lec="'+l.id+'"'+(libre ? '' : ' disabled')
        + ' aria-label="'+E.texto(l.nombre)+(ok ? ', completada' : libre ? '' : ', bloqueada')+'">'+ICONO[cls]+'</button>'
        + '<span class="nodo-nombre">'+E.texto(l.nombre)+'</span>'
        + (ok ? '<span class="stars" role="img" aria-label="'+est+' de 3 estrellas">'+estrellas(est)+'</span>' : '')
        + '</li>';
    });
    html += '</ol>';
    const ps = (u.practica||[]).map(id => E.PIEZAS.find(p => p.id===id)).filter(Boolean);
    if(ps.length){
      html += '<div class="repaso"><span class="label">Para repasar en Practicar</span><div class="row">'
        + ps.map(p => '<button class="btn small" type="button" data-pieza="'+p.id+'">'+E.texto(p.nombre)
          + (p.libre ? '' : ' <span class="stars">'+estrellas(S.mejor[p.id]||0)+'</span>')+'</button>').join('')
        + '</div></div>';
    }
    html += '</section>';
  });
  $('mapaCurso').innerHTML = html;
};
C.salir = function(){ limpiar(); L.lec = null; L.p = null; };
C.mostrarMapa = function(){
  limpiar();
  L.lec = null; L.p = null;
  S.vista = 'aprender';
  $('leccion').hidden = true; $('mapaCurso').hidden = false;
  C.pintarMapa(); E.app.pintarVistas(); E.app.pintarAvance();
  const n = document.querySelector('.nodo.actual');
  if(n && n !== document.querySelector('.nodo')) n.scrollIntoView({block:'center'});
};
$('mapaCurso').addEventListener('click', e => {
  const b = e.target.closest('button[data-lec]'); if(b && !b.disabled) return C.abrir(b.dataset.lec);
  const p = e.target.closest('button[data-pieza]'); if(p) E.app.practicar(p.dataset.pieza);
});

/* =====================================================================
   Lección: abrir, avanzar y terminar
   ===================================================================== */
function expandir(pasos){
  const r = [];
  pasos.forEach(p => {
    if(p.tipo==='oido') for(let k=0; k<(p.veces||1); k++) r.push({def:p});
    else r.push({def:p});
  });
  return r;
}
function limpiar(){ L.timers.forEach(clearTimeout); L.timers.length = 0; if(A.ctx) A.silenciar(); }

C.abrir = function(id){
  const l = E.LECCIONES.find(x => x.id===id);
  if(!l || !desbloqueada(l)) return;
  E.app.detener();
  limpiar();
  Object.assign(L, {lec:l, pasos:expandir(l.pasos), i:0, errores:0, extra:0, p:null, fin:false});
  S.vista = 'leccion';
  $('mapaCurso').hidden = true; $('leccion').hidden = false;
  E.app.pintarVistas();
  window.scrollTo(0, 0);
  empezarPaso();
};
function siguiente(){
  limpiar();
  L.i++;
  if(L.i >= L.pasos.length) return terminar();
  empezarPaso();
}
function barra(){ $('lecBarra').style.width = (L.fin ? 100 : L.i/L.pasos.length*100)+'%'; }

function terminar(){
  L.fin = true; L.p = null;
  const l = L.lec, stars = L.errores===0 ? 3 : L.errores<=2 ? 2 : 1;
  const xp = 10+(stars===3 ? 5 : 0);
  const antes = xpHoy();
  if(stars > (S.curso[l.id]||0)) S.curso[l.id] = stars;
  S.xp += xp;
  S.xpDias[E.hoy()] = antes+xp;
  const ks = Object.keys(S.xpDias).sort(); while(ks.length > 60) delete S.xpDias[ks.shift()];
  E.anotarDia(); E.guardar(); E.app.pintarAvance();
  barra();
  if(A.ctx){ const t = A.ctx.currentTime+0.08; [0,4,7,12].forEach((s,i) => A.tono(S.tonic+4+s, 0.18, {cuando:t+i*0.11, vol:0.14})); }
  const u = l.unidad, ultima = u.lecciones[u.lecciones.length-1]===l;
  const meta = antes < META && antes+xp >= META;
  $('lecCuerpo').innerHTML = '<div class="fin">'
    + '<div class="big-stars" role="img" aria-label="'+stars+' de 3 estrellas">'+estrellas(stars)+'</div>'
    + '<h2>'+(stars===3 ? '¡Lección perfecta!' : '¡Lección completada!')+'</h2>'
    + '<div class="figures"><div><b>+'+xp+' XP</b><span>ganados</span></div>'
    + '<div><b>'+L.errores+'</b><span>'+(L.errores===1 ? 'error' : 'errores')+'</span></div>'
    + '<div><b>'+Math.min(antes+xp, META)+' / '+META+'</b><span>meta de hoy</span></div></div>'
    + (meta ? '<p>Cumpliste la meta de hoy. Racha: '+E.racha()+(E.racha()===1 ? ' día' : ' días')+'.</p>' : '')
    + (ultima ? '<p>Terminaste la unidad «'+E.texto(u.nombre)+'». Sus ejercicios de repaso están en <b>Practicar</b>.</p>' : '')
    + '</div>';
  pie('bien', '', [{act:'mapa', txt:'Continuar', primario:true}]);
}

/* Pie de la lección: mensaje y botones. Enter pulsa el botón primario. */
function pie(estado, msg, botones){
  L.pie = {estado, msg, botones};
  const el = $('lecPie');
  el.dataset.estado = estado;
  el.innerHTML = '<div class="lec-msg">'+msg+'</div><div class="row">'
    + botones.map(b => '<button class="btn '+(b.primario ? 'primary grande' : 'quiet')+'" type="button" data-act="'+b.act+'"'
      + (b.off ? ' disabled' : '')+'>'+b.txt+'</button>').join('')+'</div>';
}
const pieNormal = (listo, saltar) => pie('neutral', '', (saltar ? [{act:'saltar', txt:'Saltar'}] : []).concat([{act:'seguir', txt:'Continuar', primario:true, off:!listo}]));
function resolver(msg){
  const p = L.p; if(!p || p.resuelto) return;
  p.resuelto = true;
  pie('bien', msg, [{act:'seguir', txt:'Continuar', primario:true}]);
}

/* =====================================================================
   Pasos
   ===================================================================== */
const PASOS = {};

function empezarPaso(){
  limpiar();
  const x = L.pasos[L.i];
  L.p = {tipo:x.def.tipo, def:x.def, x, resuelto:false};
  barra();
  const cuerpo = $('lecCuerpo');
  if(usaMic(L.p) && S.mic!=='on'){
    const err = S.mic==='error';
    cuerpo.innerHTML = '<p class="eyebrow">Necesitas el micrófono</p><h2>'+(err ? 'No pude usar el micrófono' : 'Este paso usa tu voz')+'</h2>'
      + '<p>'+(err ? E.texto(S.micError) : 'Activa el micrófono para que Entona te escuche. El audio se analiza en tu navegador y no sale de tu computadora.')+'</p>'
      + '<div class="row"><button class="btn primary grande" type="button" data-act="mic"'+(S.mic==='asking' ? ' disabled' : '')+'>'
      + (S.mic==='asking' ? 'Esperando permiso…' : err ? 'Volver a intentar' : 'Activar micrófono')+'</button></div>';
    L.p.sinMic = true;
    pieNormal(false, true);
    return;
  }
  PASOS[L.p.tipo].abrir(L.p, cuerpo);
}
C.micCambio = function(){
  if(S.vista==='leccion' && L.p && usaMic(L.p) && !L.p.resuelto) empezarPaso();
};

/* ---------- explica ---------- */
PASOS.explica = {
  abrir(p, el){
    const d = p.def;
    el.innerHTML = '<h2>'+d.titulo+'</h2>'+d.texto.map(t => '<p>'+t+'</p>').join('')
      + (d.demos ? '<div class="demos">'+d.demos.map((x,i) => '<button class="btn demo" type="button" data-demo="'+i+'">'
        + ICONO.oir+'<span>'+E.texto(x.etiqueta)+'</span></button>').join('')+'</div>' : '');
    pieNormal(true, false);
  },
};

/* ---------- oido ---------- */
PASOS.oido = {
  abrir(p, el){
    if(!p.x.q) p.x.q = OIDO[p.def.clase](p.def.nivel||1);
    const q = p.q = p.x.q;
    p.sel = null;
    el.innerHTML = '<p class="eyebrow">Entrena el oído'+(p.x.repaso ? ' · repaso' : '')+'</p><h2>'+q.pregunta+'</h2>'
      + '<button class="oir" type="button" data-act="oir" aria-label="Escuchar otra vez">'+ICONO.oir+'</button>'
      + '<div class="opciones">'+q.opciones.map((o,i) => '<button class="opcion" type="button" data-op="'+i+'" aria-pressed="false">'
        + '<kbd>'+(i+1)+'</kbd>'+o+'</button>').join('')+'</div>';
    pie('neutral', '', [{act:'comprobar', txt:'Comprobar', primario:true, off:true}]);
    despues(q.oir, 350);
  },
  elegir(p, i){
    if(p.resuelto) return;
    p.sel = i;
    document.querySelectorAll('#lecCuerpo .opcion').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.op===i)));
    pie('neutral', '', [{act:'comprobar', txt:'Comprobar', primario:true}]);
  },
  comprobar(p){
    if(p.resuelto || p.sel==null) return;
    const q = p.q, bien = p.sel===q.correcta;
    p.resuelto = true;
    document.querySelectorAll('#lecCuerpo .opcion').forEach(b => {
      const i = +b.dataset.op;
      b.disabled = true;
      if(i===q.correcta) b.classList.add('correcta'); else if(i===p.sel) b.classList.add('incorrecta');
    });
    if(bien) pie('bien', '<b>¡Correcto!</b> '+q.detalle, [{act:'seguir', txt:'Continuar', primario:true}]);
    else {
      L.errores++;
      const repite = L.extra < MAX_REPASO;
      if(repite){ L.extra++; L.pasos.push({def:p.def, repaso:true}); }
      pie('mal', '<b>La respuesta era «'+q.opciones[q.correcta]+'».</b> '+q.detalle+(repite ? ' Al final te haré otra pregunta así.' : ''),
          [{act:'oir', txt:'Escuchar otra vez'}, {act:'seguir', txt:'Continuar', primario:true}]);
    }
  },
};

/* ---------- respira ---------- */
PASOS.respira = {
  abrir(p, el){
    const d = p.def;
    p.t0 = null; p.fase = -1;
    p.ciclo = d.fases.reduce((a,f) => a+f[1], 0);
    el.innerHTML = '<h2>'+d.titulo+'</h2><p>'+d.texto+'</p>'
      + '<div class="respira"><div class="respira-circulo" id="lCirculo"><span id="lCuenta"></span></div>'
      + '<p class="respira-txt" id="lFase">'+d.ciclos+' ciclos de '+p.ciclo+' segundos</p>'
      + '<button class="btn primary" type="button" data-act="respirar" id="lRespirar">Empezar</button></div>';
    pieNormal(false, true);
  },
  empezar(p){ if(p.t0==null){ p.t0 = performance.now(); $('lRespirar').hidden = true; } },
  tick(p, ts){
    if(p.t0==null || p.resuelto) return;
    const d = p.def, t = (performance.now()-p.t0)/1000, total = p.ciclo*d.ciclos;
    if(t >= total){
      $('lFase').textContent = 'Muy bien. Así se usa el aire al cantar.';
      $('lCuenta').textContent = '';
      $('lCirculo').style.transitionDuration = '1s'; $('lCirculo').classList.remove('lleno');
      return resolver('<b>¡Bien hecho!</b> Repite esta respiración antes de cada práctica.');
    }
    const c = Math.floor(t/p.ciclo); let r = t-c*p.ciclo, k = 0;
    while(r >= d.fases[k][1]){ r -= d.fases[k][1]; k++; }
    const f = d.fases[k], id = c*10+k;
    if(id !== p.fase){
      p.fase = id;
      const cir = $('lCirculo');
      cir.style.transitionDuration = f[1]+'s';
      cir.classList.toggle('lleno', f[2]==='entra');
      $('lFase').textContent = f[0]+' · ciclo '+(c+1)+' de '+d.ciclos;
    }
    $('lCuenta').textContent = String(Math.ceil(f[1]-r));
  },
};

/* ---------- voz ---------- */
PASOS.voz = {
  abrir(p, el){
    const d = p.def;
    p.t = 0; p.lo = null; p.hi = null; p.ult = 0;
    el.innerHTML = '<p class="eyebrow">Usa tu voz</p><h2>'+d.titulo+'</h2><p>'+d.texto+'</p>'
      + '<div class="vivo"><span class="label">Tu voz</span><div class="note" id="lNota">–</div><small id="lDato">'
      + (d.modo==='rango' ? 'Aún no recorres notas' : '0 de '+d.segundos+' segundos')+'</small></div>'
      + '<div class="progreso grande"><i id="lProg"></i></div>'+AJUSTAR;
    pieNormal(false, true);
  },
  tick(p, ts, dt, m, bloqueado, bajo){
    if(p.resuelto) return;
    const d = p.def;
    let f = 0;
    if(bajo && ts-p.ult > 90){ p.ult = ts; $('lNota').innerHTML = '–'; $('lDato').textContent = 'Oigo un sonido débil. Si estás cantando, hazlo más fuerte o acércate al micrófono.'; }
    if(d.modo==='rango'){
      if(m!=null){ const q = Math.round(m); if(p.lo==null || q<p.lo) p.lo = q; if(p.hi==null || q>p.hi) p.hi = q; }
      const span = p.lo==null ? 0 : p.hi-p.lo;
      f = span/d.semitonos;
      if(ts-p.ult > 90 && p.lo!=null) $('lDato').textContent = 'Recorriste '+span+(span===1 ? ' semitono' : ' semitonos')+', de '+E.nota(p.lo)+' a '+E.nota(p.hi);
      if(f >= 1) resolver('<b>¡Gran sirena!</b> Fuiste de '+E.nota(p.lo)+' a '+E.nota(p.hi)+'.');
    } else {
      if(m!=null) p.t += dt/1000;
      f = p.t/d.segundos;
      if(ts-p.ult > 90) $('lDato').textContent = Math.min(d.segundos, Math.floor(p.t))+' de '+d.segundos+' segundos';
      if(f >= 1){ $('lDato').textContent = d.segundos+' de '+d.segundos+' segundos'; resolver('<b>¡Muy bien!</b> Sonido parejo durante '+d.segundos+' segundos.'); }
    }
    if(ts-p.ult > 90){ p.ult = ts; $('lNota').innerHTML = m==null ? '–' : E.notaHTML(m); }
    $('lProg').style.width = Math.min(100, f*100)+'%';
  },
};

/* ---------- calibra ---------- */
PASOS.calibra = {
  abrir(p, el){
    p.vals = []; p.ms = 0; p.ult = 0;
    el.innerHTML = '<p class="eyebrow">Tu zona cómoda</p><h2>Encuentra tu nota</h2>'
      + '<p>Canta «aaa» en una nota cómoda: ni alta ni baja, la que te salga sin esfuerzo. Sostenla hasta llenar la barra.</p>'
      + '<p>Con esa nota, Entona ajusta todos los ejercicios a tu voz.</p>'
      + '<div class="vivo"><span class="label">Tu voz</span><div class="note" id="lNota">–</div><small id="lDato">&nbsp;</small></div>'
      + '<div class="progreso grande"><i id="lProg"></i></div>'
      + '<div class="row"><button class="btn" type="button" data-act="recalibrar" id="lRepetir" hidden>Repetir</button></div>'+AJUSTAR;
    pieNormal(false, true);
  },
  tick(p, ts, dt, m, bloqueado, bajo){
    if(p.resuelto) return;
    if(m!=null){ p.vals.push(m); p.ms += dt; }
    if(ts-p.ult > 90){
      p.ult = ts; $('lNota').innerHTML = m==null ? '–' : E.notaHTML(m);
      $('lDato').textContent = bajo ? 'Oigo un sonido débil. Si estás cantando, hazlo más fuerte o acércate al micrófono.' : '\u00a0';
    }
    $('lProg').style.width = Math.min(100, p.ms/15)+'%';
    if(p.ms >= 1500){
      const base = Math.round(mediana(p.vals));
      E.app.ponerTonica(base-4);
      $('lNota').innerHTML = E.notaHTML(base);
      $('lDato').textContent = 'Los ejercicios empiezan en '+E.nota(S.tonic)+' y suben desde ahí.';
      $('lRepetir').hidden = false;
      resolver('<b>Listo.</b> Tu nota cómoda es '+E.nota(base)+'.');
    }
  },
};

/* ---------- canta ---------- */
PASOS.canta = {
  abrir(p, el){
    const d = p.def;
    p.tg = d.notas.map(([s, b]) => ({m:S.tonic+s, need:clamp(b*700, 600, 4200)}));
    p.k = 0; p.hold = 0; p.ult = 0; p.dev = 0; p.devT = 0;
    el.innerHTML = '<p class="eyebrow">Canta</p><h2>'+E.texto(d.titulo)+'</h2>'
      + '<div class="chips" id="lChips">'+p.tg.map(n => '<span class="chip"><i></i><b>'+E.nota(n.m)+'</b></span>').join('')+'</div>'
      + '<section class="readout">'
      + '<div class="box you empty" id="lYou"><span class="label">Tu voz</span><div class="note" id="lYouNota">–</div></div>'
      + '<div class="meter"><div class="hint" id="lHint" aria-live="polite"></div>'
      + '<div class="track"><div class="zone" style="width:'+TOL+'%"></div><div class="mid"></div><div class="needle" id="lAguja"></div></div>'
      + '<div class="scale"><span>más grave</span><span>más agudo</span></div></div>'
      + '<div class="box goal"><span class="label">Objetivo</span><div class="note" id="lMeta"></div></div></section>'
      + '<div class="row"><button class="btn" type="button" data-act="oirNota">Escuchar otra vez</button>'
      + (p.tg.length>1 ? '<button class="btn quiet" type="button" data-act="oirTodo">Escuchar todo</button>' : '')+'</div>'+AJUSTAR;
    pieNormal(false, true);
    this.pintar(p);
    despues(() => {
      if(p.tg.length>1){ this.todo(p); despues(() => this.nota(p), (p.tg.length*0.55+0.5)*1000); }
      else this.nota(p);
    }, 300);
  },
  nota(p){ const n = p.tg[p.k]; if(n && !p.resuelto){ A.silenciar(); A.tono(n.m, 0.9); } },
  todo(p){ sonar(p.tg.map(n => n.m), 0.55); A.bloqueoHasta = A.ctx.currentTime+p.tg.length*0.55+0.25; },
  pintar(p){
    const n = p.tg[Math.min(p.k, p.tg.length-1)];
    $('lMeta').innerHTML = E.notaHTML(n.m);
    [...$('lChips').children].forEach((el, i) => {
      el.classList.toggle('hecho', i<p.k); el.classList.toggle('actual', i===p.k && !p.resuelto);
      el.firstChild.style.width = i===p.k ? Math.min(100, p.hold/n.need*100)+'%' : '0';
    });
  },
  tick(p, ts, dt, m, bloqueado){
    if(p.resuelto) return;
    const n = p.tg[p.k];
    let ok = false, c = null;
    if(m!=null && !bloqueado){
      c = dif(m, n.m)*100; ok = Math.abs(c) <= TOL;
      if(ok){ p.hold += dt; p.dev += Math.abs(c)*dt; p.devT += dt; } else p.hold = Math.max(0, p.hold-dt*0.25);
    }
    const ag = $('lAguja');
    if(c==null){ ag.classList.remove('live','hit'); ag.style.transform = 'translateX(0)'; }
    else {
      const w = ag.parentElement.clientWidth;
      ag.style.transform = 'translateX('+(clamp(c, -100, 100)/100*(w/2-4))+'px)';
      ag.classList.add('live'); ag.classList.toggle('hit', ok);
    }
    if(p.hold >= n.need){
      p.k++; p.hold = 0;
      if(p.k >= p.tg.length){
        p.resuelto = true; this.pintar(p);
        $('lHint').textContent = '¡Completado!';
        const dev = p.devT ? Math.round(p.dev/p.devT) : 0;
        pie('bien', '<b>'+(dev<=15 ? '¡Muy afinado!' : dev<=30 ? '¡Bien!' : '¡Lo lograste!')+'</b> Te desviaste ±'+dev+' cents en promedio.',
            [{act:'seguir', txt:'Continuar', primario:true}]);
        return;
      }
      despues(() => this.nota(p), 250);
    }
    if(ts-p.ult > 90){
      p.ult = ts;
      $('lYouNota').innerHTML = m==null ? '–' : E.notaHTML(m);
      $('lYou').classList.toggle('empty', m==null); $('lYou').classList.toggle('hit', ok);
      $('lHint').textContent = bloqueado ? 'Escucha…' : m==null ? 'Canta '+E.nota(n.m) : ok ? 'Ahí está. Sostenla.'
        : Math.abs(c) < 100 ? (c<0 ? 'Sube un poco' : 'Baja un poco')
        : (c<0 ? 'Sube ' : 'Baja ')+Math.round(Math.abs(c)/100)+' semitonos';
      this.pintar(p);
    }
  },
};

/* Llamado desde el bucle principal en cada cuadro. */
C.tick = function(lec, dt, ts){
  const p = L.p;
  if(S.mic!=='on' || !p || p.sinMic || !PASOS[p.tipo].tick) return;
  PASOS[p.tipo].tick(p, ts, dt, lec.midi, lec.bloqueado, lec.bajo);
};

/* =====================================================================
   Eventos
   ===================================================================== */
function preguntarSalida(){
  if(L.fin || L.i===0 && !(L.p && L.p.resuelto)) return C.mostrarMapa();
  if(L.pie && L.pie.estado==='salir') return;
  L.antes = L.pie;
  pie('salir', '<b>¿Salir de la lección?</b> Perderás el avance de esta lección.',
      [{act:'salirSi', txt:'Salir'}, {act:'salirNo', txt:'Seguir aprendiendo', primario:true}]);
}
$('lecSalir').addEventListener('click', preguntarSalida);
$('leccion').addEventListener('click', e => {
  const op = e.target.closest('button[data-op]');
  if(op && L.p && L.p.tipo==='oido') return PASOS.oido.elegir(L.p, +op.dataset.op);
  const dm = e.target.closest('button[data-demo]');
  if(dm && L.p) return sonarDemo(L.p.def.demos[+dm.dataset.demo].notas);
  const b = e.target.closest('button[data-act]'); if(!b || b.disabled) return;
  const a = b.dataset.act, p = L.p;
  if(a==='seguir') siguiente();
  else if(a==='mapa') C.mostrarMapa();
  else if(a==='saltar'){ if(p && p.tipo==='canta') L.errores++; siguiente(); }
  else if(a==='mic') E.app.abrirMic();
  else if(a==='panelMic'){ E.app.panelMic(true); window.scrollTo(0, 0); }
  else if(a==='comprobar') PASOS.oido.comprobar(p);
  else if(a==='oir' && p && p.q) p.q.oir();
  else if(a==='respirar') PASOS.respira.empezar(p);
  else if(a==='recalibrar'){ PASOS.calibra.abrir(p, $('lecCuerpo')); p.resuelto = false; }
  else if(a==='oirNota') PASOS.canta.nota(p);
  else if(a==='oirTodo') PASOS.canta.todo(p);
  else if(a==='salirSi') C.mostrarMapa();
  else if(a==='salirNo'){ const x = L.antes; pie(x.estado, x.msg, x.botones); }
});
document.addEventListener('keydown', e => {
  if(S.vista!=='leccion' || e.ctrlKey || e.metaKey || e.altKey) return;
  if(e.key==='Escape'){ e.preventDefault(); return preguntarSalida(); }
  if(e.key==='Enter'){
    if(e.target.closest('button')) return;
    const b = $('lecPie').querySelector('.btn.primary:not([disabled])');
    if(b){ e.preventDefault(); b.click(); }
    return;
  }
  if(L.p && L.p.tipo==='oido' && /^[1-9]$/.test(e.key)){
    const i = +e.key-1; if(i < L.p.q.opciones.length) PASOS.oido.elegir(L.p, i);
  }
});

/* Para pruebas y para curiosear desde la consola. */
C.estado = L;
})();
