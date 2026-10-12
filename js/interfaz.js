/* Entona · interfaz: lectura en vivo, mapa de la melodía, transporte, avisos sobre el rollo
   y pintado de la vista de práctica. */
(function(){
'use strict';
const E = window.Entona, S = E.S, $ = E.$, A = E.audio, B = E.bib, R = E.rollo, M = E.melodia;
const {clamp, mediana, midiAHz} = E;
const P = E.app;
const {K, LAT, abrirMic, claveVol, dif, enTiempo, esYT, kIr, kPlay, modosDe, necesita, objetivo, ponerModo, reiniciar, seleccionar, tInicio, todas, vel} = P;

/* =====================================================================
   Lectura: nota cantada, aguja e indicaciones
   ===================================================================== */
function aguja(m, ref, ok){
  const nd = $('needle');
  if(m==null){ nd.classList.remove('live','hit'); nd.style.transform = 'translateX(0)'; return; }
  const conRef = ref != null;
  const base = conRef ? ref : Math.round(m), span = conRef ? 100 : 50;
  const cents = clamp((conRef ? dif(m, base) : m-base)*100, -span, span);
  const w = nd.parentElement.clientWidth;
  nd.style.transform = 'translateX('+(cents/span*(w/2-4))+'px)';
  nd.classList.add('live'); nd.classList.toggle('hit', ok);
}
function corregir(m, tg){
  const d = dif(m, tg), c = d*100;
  if(Math.abs(c) <= S.tol) return 'Ahí está. Sostén la nota.';
  const oct = Math.round(d/12);
  if(oct!==0 && Math.abs(d-oct*12) < 0.7) return 'Es la nota correcta, pero una octava '+(oct<0 ? 'abajo' : 'arriba')+'.';
  if(Math.abs(c) < 100) return c<0 ? 'Sube un poco' : 'Baja un poco';
  if(Math.abs(d) >= 8 && S.pieza.abs) return 'Muy lejos. Prueba a '+(d<0 ? 'bajar' : 'subir')+' una octava el tono de la canción.';
  const n = Math.round(Math.abs(d));
  return (d<0 ? 'Sube ' : 'Baja ')+n+(n===1 ? ' semitono' : ' semitonos');
}
function indicacion(m, ref, bloqueado){
  if(S.cal) return 'Sostén una nota cómoda…';
  if(S.modo==='editar') return '';
  if(S.pieza.libre){
    if(S.mic!=='on') return 'Activa el micrófono y canta';
    if(m==null) return 'Canta cualquier nota';
    const c = Math.round((m-Math.round(m))*100);
    if(Math.abs(c) <= 12) return 'Afinado en '+E.nota(m);
    return Math.abs(c)+' cents '+(c>0 ? 'por encima' : 'por debajo')+' de '+E.nota(m);
  }
  if(S.modo==='karaoke'){
    if(K.fin) return 'Canción terminada';
    if(!K.on) return K.t > tInicio()+0.05 ? 'En pausa' : (S.mic==='on' ? 'Pulsa Empezar cuando quieras' : 'Activa el micrófono para puntuar');
    if(K.t < 0 && S.carta.spb) return 'Prepárate…';
    if(ref==null) return '';
    const n = S.carta.notas[K.ptr], dentro = n && K.t-LAT*vel() >= n.t0;
    if(m==null || !dentro) return (dentro ? 'Canta ' : 'Sigue ')+E.nota(ref);
    return corregir(m, ref);
  }
  if(S.mic!=='on') return 'Activa el micrófono para empezar';
  if(bloqueado) return 'Escucha…';
  if(S.hecho) return 'Lección terminada';
  if(ref==null) return '';
  if(m==null) return 'Canta '+E.nota(ref);
  return corregir(m, ref);
}
let ultRef = null;
function textos(m, ref, ok, bloqueado){
  $('youNote').innerHTML = m==null ? '–' : E.notaHTML(m);
  $('youHz').textContent = m==null ? '— Hz' : midiAHz(m).toFixed(1)+' Hz';
  $('youBox').classList.toggle('hit', ok);
  $('youBox').classList.toggle('empty', m==null);
  $('hint').textContent = indicacion(m, ref, bloqueado);
  if(S.pieza.libre){
    $('goalNote').textContent = S.freeLo==null ? '–' : E.nota(S.freeLo)+' – '+E.nota(S.freeHi);
    $('goalHz').textContent = S.freeLo==null ? 'Aún sin notas' : (S.freeHi-S.freeLo)+' semitonos';
  } else if(S.modo==='karaoke' && ref !== ultRef){
    ultRef = ref; pintarObjetivo(ref);
  }
}
function pintarObjetivo(refK){
  const libre = !!S.pieza.libre;
  const tg = S.modo==='ritmo' ? objetivo() : (refK != null ? refK : (S.carta.notas[K.ptr] ? S.carta.notas[K.ptr].m : null));
  $('goalBox').classList.toggle('range', libre);
  $('goalBox').classList.toggle('empty', !libre && tg==null);
  $('goalLabel').textContent = libre ? 'Tu rango en esta sesión' : (S.modo==='karaoke' ? 'Nota' : 'Objetivo');
  if(!libre){
    $('goalNote').innerHTML = tg==null ? '–' : E.notaHTML(tg);
    $('goalHz').textContent = tg==null ? '' : midiAHz(tg).toFixed(1)+' Hz';
  }
  const span = libre ? 50 : 100, tol = libre ? 12 : S.tol;
  $('zone').style.width = (tol/span*100)+'%';
  $('scaleLo').textContent = '−'+span+' cents'; $('scaleHi').textContent = '+'+span;
  $('count').textContent = S.modo==='ritmo' ? 'Nota '+(S.idx+1)+' de '+S.carta.notas.length : '';
}

/* =====================================================================
   Mapa de la melodía (a tu ritmo)
   ===================================================================== */
function pintarMapa(){
  const map = $('map');
  map.textContent = '';
  if(S.modo!=='ritmo') return;
  const c = S.carta;
  if(!c.notas.length) return;
  const span = Math.round(c.hi-c.lo)+1, t0 = c.notas[0].t0, total = c.notas[c.notas.length-1].t1-t0;
  const fila = clamp(Math.floor(104/span), 4, 14);
  map.style.height = span*fila+'px';
  map.style.minWidth = Math.round(total*(c.spb ? 20/c.spb : 30))+'px';
  c.notas.forEach(n => {
    const el = document.createElement('div');
    el.className = 'blk';
    el.style.left = ((n.t0-t0)/total*100)+'%';
    el.style.width = 'calc('+((n.t1-n.t0)/total*100)+'% - 3px)';
    el.style.top = Math.round(c.hi-n.m)*fila+'px';
    el.style.height = Math.max(3, fila-2)+'px';
    el.title = E.nota(n.m);
    el.appendChild(document.createElement('i'));
    map.appendChild(el);
  });
  actualizarMapa(true);
}
function actualizarMapa(mover){
  const kids = $('map').children;
  for(let i=0;i<kids.length;i++){
    const el = kids[i], hecho = S.hecho || i<S.idx, actual = !S.hecho && i===S.idx;
    el.classList.toggle('done', hecho); el.classList.toggle('now', actual);
    el.firstChild.style.width = actual ? Math.min(100, S.hold/necesita()*100)+'%' : '0';
    if(actual && mover){ const sc = $('mapScroll'); sc.scrollLeft = el.offsetLeft-sc.clientWidth/2+el.offsetWidth/2; }
  }
}

/* =====================================================================
   Transporte
   ===================================================================== */
let arrastrando = false;
function pintarTransporte(){
  const c = S.carta;
  $('play').textContent = K.on ? 'Pausa' : (K.t > tInicio()+0.05 && !K.fin ? 'Seguir' : 'Empezar');
  $('play').classList.toggle('primary', !K.on);
  const b = $('barra'); b.min = String(Math.min(0, tInicio())); b.max = String(Math.max(1, c.dur));
  actualizarTransporte();
}
function actualizarTransporte(){
  if(!arrastrando) $('barra').value = String(K.t);
  $('tiempo').textContent = E.reloj(K.t)+' / '+E.reloj(S.carta.dur);
}

/* =====================================================================
   Avisos sobre el rollo
   ===================================================================== */
function estrellas(n){ return '★'.repeat(n)+'<span>'+'★'.repeat(3-n)+'</span>'; }
let veloHTML = null;
function pintarVelo(){
  let html = '';
  const r = S.resultado;
  if(S.cal){
    html = '<div class="card"><h3>Canta «aaa» en una nota cómoda</h3><p>Ni alta ni baja: la que te salga sin esfuerzo. Sostenla un par de segundos.</p>'
      + '<div class="track" style="height:8px"><div id="calBar" style="height:100%;width:0;background:var(--ok)"></div></div>'
      + '<div class="row"><button class="btn" data-act="calCancel" type="button">Cancelar</button></div></div>';
  } else if(r){
    const ps = todas(), sig = ps[ps.indexOf(S.pieza)+1];
    const titulo = r.stars===3 ? 'Muy afinado' : r.stars===2 ? 'Bien, vas tomando la nota' : r.stars===1 ? 'Completado' : 'Sin notas acertadas';
    const cifras = r.modo==='karaoke'
      ? '<div><b>'+r.precision+' %</b><span>de la melodía afinada</span></div><div><b>'+r.aciertos+' de '+r.total+'</b><span>notas acertadas</span></div>'
      : '<div><b>'+r.precision+' %</b><span>del tiempo en la nota</span></div><div><b>'+(r.dev==null ? '–' : '±'+r.dev)+'</b><span>cents de desviación</span></div>';
    html = '<div class="card"><div class="big-stars" role="img" aria-label="'+r.stars+' de 3 estrellas">'+estrellas(r.stars)+'</div>'
      + '<h3>'+titulo+'</h3><div class="figures">'+cifras+'</div>'
      + (r.modo==='karaoke' && !r.completa ? '<p>Cantaste solo un tramo, así que este resultado no se guarda.</p>' : '')
      + '<div class="row"><button class="btn" data-act="again" type="button">Repetir</button>'
      + (sig && !S.pieza.abs ? '<button class="btn primary" data-act="next" type="button">Siguiente: '+E.texto(sig.nombre)+'</button>' : '')+'</div></div>';
  } else if(S.modo!=='editar' && S.mic!=='on' && !K.on){
    const err = S.mic==='error';
    html = '<div class="card"><h3>'+(err ? 'No pude usar el micrófono' : 'Activa el micrófono para empezar')+'</h3>'
      + '<p>'+(err ? E.texto(S.micError) : 'El audio se analiza en tu navegador y no sale de tu computadora. Usa audífonos si puedes: así el micrófono no confunde la música con tu voz.')+'</p>'
      + '<div class="row"><button class="btn primary" data-act="mic" type="button"'+(S.mic==='asking' ? ' disabled' : '')+'>'
      + (S.mic==='asking' ? 'Esperando permiso…' : err ? 'Volver a intentar' : 'Activar micrófono')+'</button></div></div>';
  }
  if(veloHTML !== html){ veloHTML = html; $('veil').innerHTML = html; }
}
$('veil').addEventListener('click', e => {
  const b = e.target.closest('button[data-act]'); if(!b) return;
  const a = b.dataset.act;
  if(a==='mic') abrirMic();
  else if(a==='again'){ reiniciar(true); if(S.modo==='karaoke') kPlay(); }
  else if(a==='next'){ const ps = todas(); seleccionar(ps[ps.indexOf(S.pieza)+1].id); }
  else if(a==='calCancel'){ S.cal = null; pintarVelo(); }
});

/* =====================================================================
   Pintado de la interfaz
   ===================================================================== */
function pintarRuta(){
  const nav = $('ruta'); nav.textContent = '';
  const ps = todas();
  E.GRUPOS.forEach(gr => {
    const h = document.createElement('h2'); h.textContent = gr.nombre; nav.appendChild(h);
    const suyas = ps.filter(p => p.grupo===gr.id);
    suyas.forEach(p => {
      const b = document.createElement('button');
      b.className = 'step'; b.type = 'button'; b.dataset.id = p.id;
      if(p===S.pieza && S.vista==='practica') b.setAttribute('aria-current', 'true');
      const st = S.mejor[p.id]||0;
      b.innerHTML = '<span class="step-name"></span>'
        + (p.libre ? '<span></span>' : '<span class="stars" role="img" aria-label="'+st+' de 3 estrellas">'+estrellas(st)+'</span>')
        + '<span class="step-desc"></span>';
      b.querySelector('.step-name').textContent = p.nombre;
      b.querySelector('.step-desc').textContent = p.desc || '';
      nav.appendChild(b);
    });
    if(gr.id==='mias'){
      if(!suyas.length){ const v = document.createElement('p'); v.className = 'vacio'; v.textContent = 'Aquí aparecerán las canciones que importes.'; nav.appendChild(v); }
      const a = document.createElement('button');
      a.className = 'btn small add'; a.type = 'button'; a.id = 'abrirImportar'; a.textContent = '+ Importar canción';
      if(S.vista==='importar') a.setAttribute('aria-current', 'true');
      nav.appendChild(a);
    }
  });
}
$('ruta').addEventListener('click', e => {
  if(P.IMP.ocupado) return;
  if(e.target.closest('#abrirImportar')) return P.abrirImportar(null);
  const b = e.target.closest('.step'); if(b) seleccionar(b.dataset.id);
});
function pintarAvance(){
  $('xpHoy').textContent = Math.min(S.xpDias[E.hoy()]||0, E.curso.META)+' / '+E.curso.META+' XP';
  const r = E.racha();
  $('racha').textContent = r+(r===1 ? ' día' : ' días');
  $('totalEstrellas').textContent = String(Object.values(S.mejor).reduce((a,b) => a+(+b||0), 0));
}
function pintarCabecera(){
  const p = S.pieza;
  $('piezaEtiqueta').textContent = p.etiqueta || '';
  $('piezaNombre').textContent = p.nombre;
  let tip = p.tip || '';
  if(p.abs){
    const ns = p.notas;
    if(S.modo==='editar') tip = 'Revisa la melodía detectada: pulsa Empezar para oír las notas sobre la canción y corrige las que no coincidan.';
    else if(ns.length){
      let lo = 127, hi = 0; ns.forEach(n => { if(n.m<lo) lo = n.m; if(n.m>hi) hi = n.m; });
      const t = p.trans||0;
      tip = ns.length+' notas, de '+E.nota(lo+t)+' a '+E.nota(hi+t)+'. '+(p.yt ? 'Suena con el video de YouTube.' : p.audio ? 'Suena con el audio original.' : 'Suena con la guía sintetizada.');
    } else tip = 'Esta canción no tiene notas. Agrégalas en «Editar notas».';
  }
  $('piezaTip').textContent = tip;
  const seg = $('modoSeg'), ms = modosDe(p);
  seg.hidden = !ms.length; seg.textContent = '';
  ms.forEach(([id, txt]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.v = id; b.textContent = txt; b.setAttribute('aria-pressed', String(S.modo===id));
    seg.appendChild(b);
  });
}
$('modoSeg').addEventListener('click', e => { const b = e.target.closest('button'); if(b) ponerModo(b.dataset.v); });

function pintarAjustes(){
  const p = S.pieza, abs = !!p.abs;
  $('tonLabel').textContent = abs ? 'Tono de la canción' : 'Tono de inicio';
  if(abs){ const t = p.trans||0; $('tonOut').textContent = (t>0 ? '+' : t<0 ? '−' : '')+Math.abs(t)+' st'; }
  else $('tonOut').textContent = E.nota(S.tonic);
  $('tonPre').hidden = abs; $('calBtn').hidden = abs;
  $('tonNota').textContent = abs
    ? (p.audio || p.yt ? 'Con el audio original la melodía solo se mueve por octavas (12 semitonos), para que siga coincidiendo con la canción.' : 'Sube o baja toda la canción por semitonos.')
    : 'Mueve todos los ejercicios a la zona cómoda de tu voz.';
  $('setTono').hidden = S.modo==='editar';
  $('tolNote').textContent = 'Cuenta como afinado dentro de ±'+S.tol+' cents (un semitono son 100).';
  document.querySelectorAll('.seg[data-key]').forEach(seg => {
    const k = seg.dataset.key;
    seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(String(S[k])===b.dataset.v)));
  });
  $('octLibre').checked = S.octLibre;
  $('metronomo').checked = S.metronomo;
  $('volGuia').value = String(S[claveVol()]); $('volPista').value = String(S.volPista);
}
function pintarVistas(){
  const aprender = S.vista==='aprender' || S.vista==='leccion', karaoke = !aprender && S.seccion==='karaoke';
  $('seccionAprender').hidden = !aprender;
  $('seccionKaraoke').hidden = S.vista!=='karaoke';
  $('seccionPracticar').hidden = aprender || S.vista==='karaoke';
  $('seccionPracticar').classList.toggle('sin-ruta', karaoke);
  document.querySelectorAll('[data-volver]').forEach(b => { b.hidden = !karaoke; });
  const actual = aprender ? 'aprender' : karaoke ? 'karaoke' : 'practicar';
  document.querySelectorAll('.tabs button').forEach(b =>
    b.setAttribute('aria-current', b.dataset.seccion===actual ? 'page' : 'false'));
  const prac = S.vista==='practica';
  $('vistaPractica').hidden = !prac; $('vistaImportar').hidden = S.vista!=='importar';
  if(!prac) return;
  const p = S.pieza, t = enTiempo(), ed = S.modo==='editar';
  document.querySelector('.readout').hidden = ed;
  $('mapWrap').hidden = S.modo!=='ritmo';
  $('transporte').hidden = !t;
  $('ctrlRitmo').hidden = S.modo!=='ritmo';
  $('ctrlTiempo').hidden = !t;
  $('ctlPista').hidden = !(p.audio || p.yt);
  document.querySelector('.seg[data-key=vel]').parentElement.hidden = esYT();
  $('ytBox').hidden = !esYT();
  $('escena').classList.toggle('con-video', esYT());
  $('ctlMetro').hidden = !(S.modo==='karaoke' && !p.abs);
  $('volGuiaTxt').textContent = ed ? 'Notas detectadas' : 'Guía';
  $('editor').hidden = !ed;
  $('rollBox').classList.toggle('editable', ed);
}
function pintarTodo(){
  pintarVistas(); pintarRuta(); pintarAvance(); pintarCabecera(); pintarAjustes();
}

const barra = $('barra');
barra.addEventListener('pointerdown', () => { arrastrando = true; });
barra.addEventListener('pointerup', () => { arrastrando = false; });
barra.addEventListener('input', () => { kIr(+barra.value); actualizarTransporte(); });
barra.addEventListener('change', () => { arrastrando = false; });

Object.assign(P, {aguja, corregir, indicacion, textos, pintarObjetivo, pintarMapa, actualizarMapa, pintarTransporte, actualizarTransporte, estrellas, pintarVelo, pintarRuta, pintarAvance, pintarCabecera, pintarAjustes, pintarVistas, pintarTodo});
})();
