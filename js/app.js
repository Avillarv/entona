/* Entona · aplicación: bucle principal, ajustes del micrófono, secciones, galería del karaoke,
   controles del teclado y arranque. Es el último módulo que se carga. */
(function(){
'use strict';
const E = window.Entona, S = E.S, $ = E.$, A = E.audio, B = E.bib, R = E.rollo, M = E.melodia;
const {clamp, mediana, midiAHz} = E;
const P = E.app;
const {K, YI, YK, abrirMic, audioPista, avanzar, centrarVista, cerrarMic, claveVol, decir, dif, enTiempo, esYT, hist, kDetener, kFin, kPausa, kPlay, kTiempo, objetivo, pasoRitmo, pasoTiempo, pistaAct, ponerTonica, reiniciar, seleccionar, actualizarMapa, actualizarTransporte, aguja, estrellas, pintarAjustes, pintarCabecera, pintarMapa, pintarObjetivo, pintarRuta, pintarVelo, pintarVistas, textos, edOps, edVecina, guardarLuego, pintarEditor, IMP, abrirImportar} = P;

/* =====================================================================
   Bucle principal
   ===================================================================== */
let ultTs = 0, ultTexto = 0;
function tick(ts){
  requestAnimationFrame(tick);
  const dt = Math.min(100, ts-ultTs || 16); ultTs = ts;
  const lec = S.mic==='on' ? A.leer() : {midi:null, rms:0, bloqueado:false};
  if(S.mic==='on') $('levelBar').style.width = Math.min(100, lec.rms*450)+'%';
  const m = lec.midi;
  let r = {ok:false, ref:null, mv:m, st:0};

  if(S.vista==='leccion') E.curso.tick(lec, dt, ts);
  if(S.vista==='practica'){
    if(S.cal){
      if(m != null){
        S.cal.vals.push(m); S.cal.ms += dt;
        const bar = $('calBar'); if(bar) bar.style.width = Math.min(100, S.cal.ms/15)+'%';
        if(S.cal.ms >= 1500){
          const base = Math.round(mediana(S.cal.vals));
          S.cal = null;
          ponerTonica(base-4, 'Listo. Cantaste '+E.nota(base)+', así que los ejercicios empiezan en '+E.nota(clamp(base-4,36,67))+'.');
        }
      }
    } else if(S.pieza.libre){
      if(m != null){
        const q = Math.round(m);
        r.ok = Math.abs(m-q)*100 <= 12;
        if(S.freeLo==null || q<S.freeLo) S.freeLo = q;
        if(S.freeHi==null || q>S.freeHi) S.freeHi = q;
        if(Math.abs(m-S.viewC) > 5) S.viewC += (m-S.viewC)*0.04;
      }
    } else if(S.modo==='ritmo'){
      const x = pasoRitmo(m, dt, ts);
      r.ok = x.ok; r.ref = x.ref;
      if(m != null && x.ref != null) r.mv = x.ref+dif(m, x.ref);
      centrarVista(false);
    } else {
      r = pasoTiempo(m);
    }
  }

  if(enTiempo() && !K.on) hist.length = 0;
  hist.push({t:ts, st:r.st, m:r.mv, ok:r.ok});
  while(hist.length && ts-hist[0].t > 7000) hist.shift();

  aguja(m, r.ref, r.ok);
  if(!$('panelMic').hidden) panelVivo(lec);
  if(ts-ultTexto > 90){
    ultTexto = ts;
    textos(m, r.ref, r.ok, lec.bloqueado);
    if(S.modo==='ritmo') actualizarMapa(false);
    if(enTiempo()) actualizarTransporte();
  }
  if(S.vista==='practica') R.dibujar(ts);
}

/* =====================================================================
   Ajustes del micrófono: medidor en vivo, ruido de la sala, sensibilidad y filtro del navegador
   ===================================================================== */
const posDb = r => clamp((20*Math.log10(Math.max(r, 1e-6))+70)/70, 0, 1)*100;   // −70 dB a 0 dB
let panelT = 0;
function panelVivo(lec){
  $('pmNivel').style.width = posDb(lec.rms)+'%';
  $('pmUmbral').style.left = posDb(lec.umbral || A.filtro.umbral)+'%';
  $('pmNivel').parentElement.classList.toggle('voz', lec.midi!=null);
  const ahora = performance.now();
  if(ahora-panelT < 120) return;
  panelT = ahora;
  const md = A.filtro.midiendo;
  let t = 'Silencio', voz = false;
  if(S.mic!=='on') t = 'Micrófono apagado';
  else if(md) t = 'Midiendo… guarda silencio ('+Math.max(1, Math.ceil((md.hasta-ahora)/1000))+' s)';
  else if(lec.midi!=null){ t = 'Voz: '+E.nota(lec.midi); voz = true; }
  else if(lec.bloqueado) t = 'Sonando la guía: el micrófono no cuenta';
  else if(lec.rms >= lec.umbral) t = 'Sonido sin tono claro o estable: no cuenta';
  else if(lec.bajo || lec.rms >= lec.umbral*0.3) t = 'Sonido por debajo de la línea: no cuenta';
  $('pmEstado').textContent = t; $('pmEstado').classList.toggle('voz', voz);
}
function pintarPanel(){
  $('pmFiltro').checked = S.filtroRuido;
  const md = !!A.filtro.midiendo;
  $('pmMedir').disabled = md;
  $('pmMedir').textContent = md ? 'Midiendo…' : S.ruido ? 'Volver a medir' : 'Medir ruido';
  $('pmRuido').textContent = S.ruido
    ? 'Medido. La línea roja queda por encima de los picos de ruido. Si cambias de lugar, vuelve a medir.'
    : 'Sin medir. Pulsa y guarda silencio 3 segundos: Entona aprende cuánto ruido hay y lo ignora.';
  if(S.mic!=='on') panelVivo({rms:0, umbral:A.filtro.umbral, midi:null});
}
function panelMic(abrir){
  const p = $('panelMic');
  p.hidden = abrir===undefined ? !p.hidden : !abrir;
  $('micAjustes').setAttribute('aria-expanded', String(!p.hidden));
  pintarPanel(); pintarAjustes();
  if(!p.hidden) p.scrollIntoView({block:'nearest'});
}
$('micAjustes').addEventListener('click', () => panelMic());
$('pmCerrar').addEventListener('click', () => panelMic(false));
$('pmMedir').addEventListener('click', async () => {
  if(S.mic!=='on') await abrirMic();
  if(S.mic!=='on') return;
  A.medirRuido(3000, () => { pintarPanel(); decir('Listo. Entona ignorará el ruido que había en la sala.'); });
  pintarPanel();
});
$('pmFiltro').addEventListener('change', e => {
  S.filtroRuido = e.target.checked; S.ruido = null; E.guardar(); pintarPanel();
  if(S.mic==='on'){ A.cerrarMic(); S.mic = 'off'; abrirMic(); }
});

/* =====================================================================
   Secciones: Aprender (curso) y Practicar (ejercicios, canciones e importación)
   ===================================================================== */
function irSeccion(sec){
  if(IMP.ocupado) return;
  S.seccion = sec; E.guardar();
  YI.detener();
  if(sec==='karaoke'){
    E.curso.salir(); kDetener(); S.cal = null;
    S.vista = 'karaoke';
    pintarGaleria(); pintarVistas(); pintarRuta();
    window.scrollTo(0, 0);
  } else if(sec==='aprender'){
    if(S.vista==='leccion') return;
    kDetener(); S.cal = null;
    E.curso.mostrarMapa();
  } else {
    E.curso.salir();
    seleccionar(S.pieza.id, S.modo);
  }
}
function practicar(id){
  S.seccion = 'practicar';
  E.curso.salir();
  seleccionar(id);
  window.scrollTo(0, 0);
}
/* ---------- Galería del karaoke ---------- */
function carta(p){
  const st = S.mejor[p.id]||0, n = p.notas.length;
  const img = p.yt ? '<img src="'+E.yt.miniatura(p.yt)+'" alt="" loading="lazy">'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>';
  const meta = p.abs ? (p.yt ? 'YouTube' : p.audio ? 'Audio propio' : 'Solo notas')+' · '+n+' notas' : (p.desc || '');
  return '<button class="k-carta" type="button" data-id="'+p.id+'"><span class="k-img'+(p.yt ? '' : ' sin-img')+'">'+img+'</span>'
    + '<span class="k-texto"><span class="k-nombre">'+E.texto(p.nombre)+'</span><span class="k-meta">'+E.texto(meta)+'</span>'
    + '<span class="stars" role="img" aria-label="'+st+' de 3 estrellas">'+estrellas(st)+'</span></span></button>';
}
function pintarGaleria(){
  $('kGrid').innerHTML = B.lista.length ? B.lista.slice().reverse().map(carta).join('')
    : '<p class="k-vacio">Todavía no agregas canciones. Pulsa <b>+ Canción de YouTube</b> y pega el enlace de la que quieras cantar.</p>';
  $('kIncluidas').innerHTML = E.PIEZAS.filter(p => p.grupo==='canciones').map(carta).join('');
}
$('seccionKaraoke').addEventListener('click', e => {
  const c = e.target.closest('.k-carta'); if(c){ seleccionar(c.dataset.id, 'karaoke'); window.scrollTo(0, 0); }
});
$('kAgregarYT').addEventListener('click', () => abrirImportar(null, 'youtube'));
$('kAgregarArchivo').addEventListener('click', () => abrirImportar(null, 'archivo'));
document.querySelectorAll('[data-volver]').forEach(b => b.addEventListener('click', () => {
  if(IMP.abortar) return $('impCancelar').click();
  if(!IMP.ocupado) irSeccion('karaoke');
}));

document.querySelector('.tabs').addEventListener('click', e => {
  const b = e.target.closest('button[data-seccion]'); if(b) irSeccion(b.dataset.seccion);
});

/* =====================================================================
   Controles
   ===================================================================== */
document.querySelectorAll('.seg[data-key]').forEach(seg => {
  seg.addEventListener('click', e => {
    const b = e.target.closest('button'); if(!b) return;
    const k = seg.dataset.key, v = b.dataset.v;
    if(k==='tonic') return ponerTonica(+v);
    if(k==='vel'){
      const t = kTiempo(), sonando = K.on;
      if(sonando){ K.on = false; pistaAct().pause(); A.silenciar(); K.t = t; }
      S.vel = +v; E.guardar(); pintarAjustes();
      if(sonando) kPlay();
      return;
    }
    S[k] = k==='tol' ? +v : v;
    E.guardar(); pintarAjustes();
    if(k==='nombres'){ pintarCabecera(); pintarMapa(); pintarObjetivo(); pintarEditor(); }
    if(k==='tol') pintarObjetivo();
    if(k==='salida' && S.mic==='on'){ A.cerrarMic(); S.mic = 'off'; abrirMic(); }
  });
});
function cambiarTono(d){
  const p = S.pieza;
  if(!p.abs) return ponerTonica(S.tonic+d);
  const paso = p.audio || p.yt ? 12 : 1;
  p.trans = clamp((p.trans||0)+d*paso, -24, 24);
  guardarLuego(); pintarAjustes(); pintarCabecera();
  reiniciar(false);
}
$('tonDown').addEventListener('click', () => cambiarTono(-1));
$('tonUp').addEventListener('click', () => cambiarTono(1));
$('octLibre').addEventListener('change', e => { S.octLibre = e.target.checked; E.guardar(); });
$('metronomo').addEventListener('change', e => { S.metronomo = e.target.checked; E.guardar(); });
$('volGuia').addEventListener('input', e => { S[claveVol()] = +e.target.value; E.guardar(); });
$('volPista').addEventListener('input', e => { S.volPista = +e.target.value; pistaAct().volume = S.volPista; E.guardar(); });

$('micBtn').addEventListener('click', () => S.mic==='on' ? cerrarMic() : abrirMic());
$('hearNote').addEventListener('click', () => { const tg = objetivo(); if(tg != null) A.tono(tg, 0.9); });
$('hearAll').addEventListener('click', () => {
  const c = S.carta; if(!c.notas.length) return;
  A.asegurar();
  const t = A.ctx.currentTime+0.05, t0 = c.notas[0].t0;
  c.notas.forEach(n => A.tono(n.m, (n.t1-n.t0)*0.95, {cuando:t+(n.t0-t0)}));
});
$('restart').addEventListener('click', () => reiniciar(true));
$('skip').addEventListener('click', () => { if(S.modo==='ritmo' && !S.hecho) avanzar(true); });
$('calBtn').addEventListener('click', async () => {
  if(S.mic!=='on') await abrirMic();
  if(S.mic!=='on') return;
  kDetener(); S.cal = {vals:[], ms:0}; pintarVelo();
});
$('play').addEventListener('click', () => K.on ? kPausa() : kPlay());
$('alInicio').addEventListener('click', () => { const sonando = K.on; reiniciar(false); if(sonando) kPlay(); });

audioPista.addEventListener('ended', () => { if(K.on && !esYT()) kFin(); });
YK.alTerminar = () => { if(K.on && esYT()) kFin(); };

document.addEventListener('keydown', e => {
  if(S.vista!=='practica') return;
  const enCampo = e.target.closest('input[type=text],textarea,select');
  if(enCampo) return;
  if(e.code==='Space' && !e.target.closest('button,a,input')){
    e.preventDefault();
    if(enTiempo()) K.on ? kPausa() : kPlay();
    else { const tg = objetivo(); if(tg != null) A.tono(tg, 0.9); }
    return;
  }
  if(S.modo!=='editar' || e.target.closest('input')) return;
  const k = e.key;
  if((e.ctrlKey || e.metaKey) && k.toLowerCase()==='z'){ e.preventDefault(); edOps.deshacer(); }
  else if((e.ctrlKey || e.metaKey) && k.toLowerCase()==='a'){ e.preventDefault(); edOps.todo(); }
  else if(k==='ArrowUp'){ e.preventDefault(); edOps.tono(e.shiftKey ? 12 : 1); }
  else if(k==='ArrowDown'){ e.preventDefault(); edOps.tono(e.shiftKey ? -12 : -1); }
  else if(k==='ArrowLeft'){ e.preventDefault(); edVecina(-1); }
  else if(k==='ArrowRight'){ e.preventDefault(); edVecina(1); }
  else if(k==='Delete' || k==='Backspace'){ e.preventDefault(); edOps.borrar(); }
});

/* =====================================================================
   Arranque
   ===================================================================== */
(async function(){
  const ultima = E.cargar();
  await Promise.race([B.abrir(), new Promise(r => setTimeout(() => r(false), 1500))]);
  await B.cargar();
  R.iniciar($('roll'));
  seleccionar(ultima || 'sostenida');
  const nuevo = !Object.keys(S.mejor).length && !Object.keys(S.curso).length;
  const sec = S.seccion || (nuevo ? 'aprender' : 'practicar');
  if(sec!=='practicar') irSeccion(sec);
  requestAnimationFrame(tick);
})();

Object.assign(P, {tick, posDb, panelVivo, pintarPanel, panelMic, irSeccion, practicar, carta, pintarGaleria, cambiarTono});
})();
