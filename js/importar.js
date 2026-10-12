/* Entona · importar: canciones desde un archivo de audio, un .json o un video de YouTube. */
(function(){
'use strict';
const E = window.Entona, S = E.S, $ = E.$, A = E.audio, B = E.bib, R = E.rollo, M = E.melodia;
const {clamp, mediana, midiAHz} = E;
const P = E.app;
const {YI, decir, kDetener, seleccionar, todas, pintarRuta, pintarVistas} = P;

/* =====================================================================
   Importar una canción
   ===================================================================== */
const IMP = {archivo:null, reemplaza:null, voz:'auto', ocupado:false, fuente:'youtube', ytId:null, ytListo:false, captura:null, fin:null};
const VOCES = {auto:{fmin:82, fmax:1050}, grave:{fmin:73, fmax:523}, aguda:{fmin:147, fmax:1109}};
const UMBRALES = [0.6, 0.47, 0.35, 0.26, 0.18];
function abrirImportar(p, fuente){
  kDetener(); S.cal = null;
  S.vista = 'importar';
  IMP.reemplaza = p || null; IMP.archivo = p && p.audio ? p.audio : null;
  IMP.fuente = p ? (p.yt ? 'youtube' : 'archivo') : (fuente || IMP.fuente);
  IMP.ytId = null; IMP.ytListo = false;
  $('impTitulo').textContent = p ? 'Volver a detectar «'+p.nombre+'»' : 'Agregar una canción';
  $('impNombre').value = p ? p.nombre : '';
  $('impArchivo').textContent = p && p.audio ? 'Audio guardado de esta canción' : 'Ningún archivo elegido';
  $('ytUrl').value = p && p.yt ? E.yt.enlace(p.yt) : '';
  $('impError').hidden = true; $('impProgreso').hidden = true;
  pintarVistas(); pintarRuta(); pintarFuente();
  window.scrollTo(0, 0);
  if(p && p.yt) ytCargar();
}
function pintarFuente(){
  const yt = IMP.fuente==='youtube';
  $('impFuente').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v===IMP.fuente)));
  $('impFuente').hidden = !!IMP.reemplaza;
  $('ytCampo').hidden = !yt; $('ytOpciones').hidden = !yt; $('ytComo').hidden = !yt;
  $('ytPrevia').hidden = !yt || !IMP.ytId;
  $('soltar').hidden = yt;
  $('impIntro').textContent = yt
    ? 'Pega el enlace de un video de YouTube. Entona lo escucha una vez, saca la melodía principal y la convierte en notas para cantarla en karaoke sobre el video.'
    : 'Elige un archivo de audio que tengas en tu computadora. Entona busca la melodía principal y la convierte en notas para cantarla en karaoke. Todo ocurre en tu navegador.';
  if(!IMP.ocupado){
    $('impAnalizar').textContent = yt ? 'Escuchar y detectar la melodía' : 'Detectar la melodía';
    $('impAnalizar').disabled = yt ? !IMP.ytListo : !IMP.archivo;
  }
}
$('impFuente').addEventListener('click', e => {
  const b = e.target.closest('button'); if(!b || IMP.ocupado) return;
  IMP.fuente = b.dataset.v; $('impError').hidden = true; pintarFuente();
  if(IMP.fuente!=='youtube') YI.detener();
});

/* ---------- Desde YouTube ---------- */
async function ytCargar(){
  if(IMP.ocupado) return;
  $('impError').hidden = true;
  const id = E.yt.idDe($('ytUrl').value);
  if(!id) return impError('Ese enlace no parece de un video de YouTube. Copia la dirección completa, por ejemplo https://www.youtube.com/watch?v=…');
  if(!E.yt.disponible()) return impError('YouTube solo funciona si abres Entona desde un servidor local: ejecuta «python3 -m http.server 8000 --bind 127.0.0.1» y abre http://localhost:8000, o usa la versión en línea.');
  IMP.ytId = id; IMP.ytListo = false;
  pintarFuente();
  $('ytCargar').disabled = true; $('ytCargar').textContent = 'Cargando…';
  YI.alError = t => { IMP.ytListo = false; impError(t); pintarFuente(); };
  try{
    await YI.cargar(id);
    if(YI.error) throw new Error(YI.error);
    IMP.ytListo = true;
    if(!$('impNombre').value.trim()){
      const titulo = await ytTitulo(id);
      if(titulo && !$('impNombre').value.trim()) $('impNombre').value = titulo.slice(0, 80);
    }
  }catch(e){ impError(e.message || 'No pude cargar el video.'); }
  $('ytCargar').disabled = false; $('ytCargar').textContent = 'Cargar video';
  pintarFuente();
}
async function ytTitulo(id){
  const d = YI.player && YI.player.getVideoData && YI.player.getVideoData();
  if(d && d.title) return d.title;
  try{
    const r = await fetch('https://www.youtube.com/oembed?format=json&url='+encodeURIComponent(E.yt.enlace(id)));
    if(r.ok) return (await r.json()).title || '';
  }catch(e){}
  return '';
}
$('ytCargar').addEventListener('click', ytCargar);
$('ytUrl').addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); ytCargar(); } });
$('ytUrl').addEventListener('paste', () => setTimeout(() => { if(E.yt.idDe($('ytUrl').value)) ytCargar(); }, 0));

/* Reproduce el video desde el inicio mientras se captura el audio de la pestaña; después analiza. */
async function impAnalizarYT(prog){
  prog('Esperando que compartas el audio de esta pestaña…', 0);
  const cap = await E.yt.capturar(YI);
  IMP.captura = cap;
  const P = YI.player;
  try{
    P.unMute(); if(P.getVolume() < 50) P.setVolume(70);
    P.setPlaybackRate($('ytRapido').checked ? 2 : 1);
    YI.pista.currentTime = 0; P.playVideo();
    $('ytTerminar').hidden = false; $('impCancelar').textContent = 'Cancelar';
    await new Promise((res, rej) => {
      IMP.fin = res; IMP.abortar = rej;
      YI.alTerminar = res;
      YI.alError = t => rej(new Error(t));
      const iv = setInterval(() => {
        if(IMP.fin !== res){ clearInterval(iv); return; }
        const d = YI.duracion(), t = P.getCurrentTime() || 0;
        prog('Escuchando la canción: '+E.reloj(t)+' de '+E.reloj(d)+(YI.estado===3 ? ' (cargando el video…)' : YI.estado===2 ? ' (en pausa)' : ''), d ? 0.6*t/d : 0);
        if(cap.cortada) rej(new Error('Se dejó de compartir la pestaña antes de terminar la canción.'));
        if(cap.segundos > 660) res();
      }, 250);
    });
  }catch(e){ cap.cancelar(); throw e; }
  finally{
    IMP.fin = null; IMP.abortar = null; IMP.captura = null; YI.alTerminar = null;
    $('ytTerminar').hidden = true; $('impCancelar').textContent = 'Volver';
    YI.detener(); try{ P.setPlaybackRate(1); }catch(e){}
  }
  const r = cap.terminar();
  if(!r || r.buffer.duration < 3) throw new Error('La canción sonó muy poco tiempo. Deja que suene al menos unos segundos.');
  let pico = 0; const ch = r.buffer.getChannelData(0); for(let i=0;i<ch.length;i+=7) pico = Math.max(pico, Math.abs(ch[i]));
  if(pico < 0.002) throw new Error('El audio llegó en silencio. Revisa que el video no esté silenciado y que hayas marcado «Compartir también el audio de la pestaña».');
  const op = Object.assign({centro:$('impCentro').checked, umbral:UMBRALES[+$('impSens').value-1]}, VOCES[IMP.voz]);
  const res = await M.analizar(r.buffer, op, (t, f) => prog(t, 0.6+0.4*f));
  res.notas = E.yt.alVideo(res.notas, r.mapa);
  const fin = res.notas.length ? res.notas[res.notas.length-1].t+res.notas[res.notas.length-1].d : 0;
  res.dur = Math.max(YI.duracion(), fin+1);
  return res;
}
$('ytTerminar').addEventListener('click', () => { if(IMP.fin) IMP.fin(); });
function impError(t){ $('impError').textContent = t; $('impError').hidden = false; }
async function impElegir(f){
  if(!f || IMP.ocupado) return;
  $('impError').hidden = true;
  if(/\.json$/i.test(f.name) || f.type==='application/json'){
    try{
      const p = B.desdeJSON(await f.text());
      await B.guardar(p);
      seleccionar(p.id, 'karaoke');
      decir('Importé «'+p.nombre+'» con '+p.notas.length+' notas.');
    }catch(e){ impError(e.message || 'No pude leer ese archivo.'); }
    return;
  }
  IMP.archivo = f;
  $('impArchivo').textContent = f.name;
  if(!$('impNombre').value.trim()) $('impNombre').value = f.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').slice(0, 80);
  $('impAnalizar').disabled = false;
}
async function impAnalizar(){
  if(IMP.ocupado || (IMP.fuente==='youtube' ? !IMP.ytListo : !IMP.archivo)) return;
  IMP.ocupado = true;
  $('impError').hidden = true; $('impProgreso').hidden = false; $('impAnalizar').disabled = true;
  const prog = (txt, f) => { $('impEtapa').textContent = txt; $('impBarra').style.width = Math.round(f*100)+'%'; };
  try{
    const yt = IMP.fuente==='youtube';
    let res;
    if(yt) res = await impAnalizarYT(prog);
    else {
      prog('Leyendo el archivo', 0.01);
      A.asegurar();
      let buffer;
      try{ buffer = await A.ctx.decodeAudioData(await IMP.archivo.arrayBuffer()); }
      catch(e){ throw new Error('No pude leer ese archivo de audio. Prueba con MP3, WAV, M4A u OGG.'); }
      const op = Object.assign({centro:$('impCentro').checked, umbral:UMBRALES[+$('impSens').value-1]}, VOCES[IMP.voz]);
      res = await M.analizar(buffer, op, prog);
    }
    if(!res.notas.length) throw new Error('No encontré una melodía clara en ese audio. Prueba con más sensibilidad o con otra grabación.');
    const nombre = $('impNombre').value.trim() || 'Canción sin nombre';
    let p = IMP.reemplaza;
    if(p){ p.notas = res.notas; p.afin = res.afin; p.dur = res.dur; p.nombre = nombre; }
    else p = B.nueva({nombre, notas:res.notas, dur:res.dur, afin:res.afin, audio:yt ? null : IMP.archivo, yt:yt ? IMP.ytId : null});
    let lo = 127, hi = 0; res.notas.forEach(n => { if(n.m<lo) lo = n.m; if(n.m>hi) hi = n.m; });
    /* Acerca la canción a la zona cómoda de la voz moviéndola por octavas. */
    const centroCancion = mediana(res.notas.map(n => n.m));
    p.trans = -12*Math.round((centroCancion-(S.tonic+5))/12);
    await B.guardar(p);
    IMP.ocupado = false;
    seleccionar(p.id, 'editar');
    decir('Detecté '+res.notas.length+' notas, de '+E.nota(lo)+' a '+E.nota(hi)+'. Pulsa Empezar para oírlas sobre la canción y corrige lo que haga falta.'
      + (yt ? ' Si todas las notas van un poco adelantadas o atrasadas, selecciónalas todas (Ctrl + A) y muévelas con «◂ Antes» o «Después ▸».' : '')
      + (p.trans ? ' Para cantarla la puse '+(Math.abs(p.trans)/12===1 ? 'una octava' : 'dos octavas')+' más '+(p.trans<0 ? 'abajo' : 'arriba')+', según tu tono de inicio; se cambia en «Tono de la canción».' : '')
      + (B.persistente ? '' : ' Tu navegador no dejó guardarla: se perderá al cerrar la pestaña.'), 60000);
  }catch(e){
    if(IMP.cancelado) IMP.cancelado = false;
    else impError(e.message || 'Algo falló al analizar el audio.');
    $('impProgreso').hidden = true;
  }
  IMP.ocupado = false;
  pintarFuente();
}
$('impElegir').addEventListener('click', () => $('impInput').click());
$('impInput').addEventListener('change', e => { impElegir(e.target.files[0]); e.target.value = ''; });
$('impAnalizar').addEventListener('click', impAnalizar);
$('impCancelar').addEventListener('click', () => {
  if(IMP.abortar){ IMP.cancelado = true; IMP.abortar(new Error('cancelado')); return; }
  if(IMP.ocupado) return;
  YI.detener();
  if(S.seccion==='karaoke') P.irSeccion('karaoke'); else seleccionar(S.pieza.id, S.modo);
});
const zona = $('soltar');
['dragenter','dragover'].forEach(t => zona.addEventListener(t, e => { e.preventDefault(); zona.classList.add('sobre'); }));
['dragleave','drop'].forEach(t => zona.addEventListener(t, e => { e.preventDefault(); zona.classList.remove('sobre'); }));
zona.addEventListener('drop', e => { const f = e.dataTransfer && e.dataTransfer.files[0]; if(f) impElegir(f); });
document.querySelectorAll('.seg[data-imp]').forEach(seg => {
  const pintar = () => seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(IMP.voz===b.dataset.v)));
  seg.addEventListener('click', e => { const b = e.target.closest('button'); if(!b) return; IMP.voz = b.dataset.v; pintar(); });
  pintar();
});

Object.assign(P, {IMP, VOCES, UMBRALES, abrirImportar, pintarFuente, ytCargar, ytTitulo, impAnalizarYT, impError, impElegir, impAnalizar});
})();
