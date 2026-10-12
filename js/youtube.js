/* Entona · YouTube: reproductor incrustado, reloj para el karaoke y captura del audio de la pestaña
   para detectar la melodía.

   Entona no descarga videos. Para detectar la melodía, el video suena en el reproductor oficial de
   YouTube dentro de la página y el navegador comparte el audio de esta pestaña (getDisplayMedia).
   Ese audio se analiza en memoria y se descarta: se guardan solo las notas y el identificador del video. */
(function(){
'use strict';
const E = window.Entona, A = E.audio;
const Y = E.yt = {};

/* Identificador de 11 caracteres a partir de cualquier enlace de YouTube (o del identificador solo). */
Y.idDe = function(texto){
  const t = String(texto||'').trim();
  if(/^[A-Za-z0-9_-]{11}$/.test(t)) return t;
  let u;
  try{ u = new URL(/^https?:\/\//i.test(t) ? t : 'https://'+t); }catch(e){ return null; }
  const h = u.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
  let id = null;
  if(h==='youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if(h==='youtube.com' || h==='youtube-nocookie.com'){
    id = u.searchParams.get('v');
    if(!id){ const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/); if(m) id = m[1]; }
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
};
Y.valido = id => typeof id==='string' && /^[A-Za-z0-9_-]{11}$/.test(id);
Y.miniatura = id => 'https://i.ytimg.com/vi/'+id+'/mqdefault.jpg';
Y.enlace = id => 'https://www.youtube.com/watch?v='+id;
/* El reproductor de YouTube exige una página servida por http(s); con file:// falla. */
Y.disponible = () => /^https?:$/.test(location.protocol);

let apiP = null;
Y.api = function(){
  if(window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if(apiP) return apiP;
  apiP = new Promise((res, rej) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if(prev) prev(); res(window.YT); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => { apiP = null; s.remove(); rej(new Error('No pude cargar YouTube. Revisa tu conexión a internet.')); };
    document.head.appendChild(s);
  });
  return apiP;
};

const NO_INCRUSTABLE = 'YouTube no deja reproducir este video aquí: puede que no exista, que sea privado o que su dueño no permita verlo fuera de YouTube. Busca otra versión de la canción (por ejemplo, un video con la letra).';
const ERRORES = {
  2:'El enlace no corresponde a un video válido.',
  5:'Este video no se puede reproducir aquí.',
  100:'El video no existe o es privado.',
  101:NO_INCRUSTABLE, 150:NO_INCRUSTABLE,
  153:'YouTube no aceptó la página. Abre Entona desde http://localhost y no como archivo.',
};

/* Reproductor dentro del elemento `elId`. Expone `pista`, con la misma forma que un <audio>
   (currentTime, play, pause, ended, volume, playbackRate), para que el motor del karaoke lo use igual. */
Y.reproductor = function(elId){
  const R = {player:null, id:null, listo:false, estado:-1, error:null, titulo:'', alTerminar:null, alError:null, alEstado:null};
  let base = {t:0, perf:0}, ultRep = -1, creando = null;

  function crear(id){
    return Y.api().then(YT => new Promise((res, rej) => {
      R.player = new YT.Player(elId, {
        host:'https://www.youtube-nocookie.com', videoId:id,
        playerVars:{playsinline:1, rel:0, origin:location.origin},
        events:{
          onReady:() => { R.listo = true; res(); },
          onStateChange:e => {
            R.estado = e.data;
            base = {t:R.player.getCurrentTime()||0, perf:performance.now()};
            const d = R.player.getVideoData && R.player.getVideoData();
            if(d && d.title) R.titulo = d.title;
            if(R.alEstado) R.alEstado(e.data);
            if(e.data===0 && R.alTerminar) R.alTerminar();
          },
          onError:e => {
            R.error = ERRORES[e.data] || 'YouTube no pudo reproducir este video (error '+e.data+').';
            if(R.alError) R.alError(R.error);
            rej(new Error(R.error));
          },
        }});
    }));
  }
  /* Carga un video. Resuelve cuando el reproductor está listo; los errores del video llegan por alError. */
  R.cargar = function(id){
    R.error = null;
    if(R.player && R.listo){
      if(R.id !== id){ R.id = id; R.titulo = ''; R.estado = -1; R.player.cueVideoById(id); }
      return Promise.resolve();
    }
    R.id = id;
    if(!creando) creando = crear(id).catch(e => { creando = null; throw e; });
    return creando;
  };
  R.detener = function(){ if(R.player && R.listo && (R.estado===1 || R.estado===3)) R.player.pauseVideo(); };
  R.duracion = () => (R.player && R.listo && R.player.getDuration()) || 0;

  /* Reloj: getCurrentTime llega a saltos, así que entre reportes se interpola con el reloj del
     navegador y, cuando llega un reporte nuevo, se corrige con suavidad (o de golpe si se desvió mucho). */
  R.pista = {
    get currentTime(){
      const p = R.player;
      if(!p || !R.listo) return 0;
      const rep = p.getCurrentTime() || 0, ahora = performance.now();
      if(R.estado !== 1){ base = {t:rep, perf:ahora}; ultRep = rep; return rep; }
      const est = base.t+(ahora-base.perf)/1000*(p.getPlaybackRate()||1);
      if(rep !== ultRep){
        ultRep = rep;
        base = Math.abs(rep-est) > 0.35 ? {t:rep, perf:ahora} : {t:est+(rep-est)*0.3, perf:ahora};
      } else base = {t:est, perf:ahora};
      return base.t;
    },
    set currentTime(t){
      if(!R.player || !R.listo) return;
      R.player.seekTo(Math.max(0, t), true);
      base = {t:Math.max(0, t), perf:performance.now()};
    },
    set playbackRate(v){ if(R.player && R.listo) R.player.setPlaybackRate(v); },
    set volume(v){ if(R.player && R.listo){ R.player.setVolume(Math.round(v*100)); if(v > 0) R.player.unMute(); } },
    play(){ if(R.player && R.listo) R.player.playVideo(); return Promise.resolve(); },
    pause(){ R.detener(); },
    get ended(){ return R.estado===0; },
  };
  return R;
};

/* =====================================================================
   Captura del audio de la pestaña
   ===================================================================== */
const LAT_CAPTURA = 0.1;   // s: retraso aproximado entre que suena el video y llega el audio capturado

/* Pide al navegador compartir el audio de esta pestaña. Devuelve un objeto que graba mientras
   el video suena; `terminar()` devuelve el audio (AudioBuffer) y la función que pasa un instante
   de la grabación al tiempo del video. */
Y.capturar = async function(R){
  const md = navigator.mediaDevices;
  if(!window.isSecureContext)
    throw new Error('El navegador solo deja compartir el audio de la pestaña en una dirección segura. Abre http://localhost:'+(location.port || '8000')+' en lugar de '+location.host+'.');
  if(!md || !md.getDisplayMedia)
    throw new Error('Este navegador no puede compartir el audio de la pestaña. Usa Chrome, Edge o Brave en una computadora.');
  let stream;
  try{
    stream = await md.getDisplayMedia({
      video:true, audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:false},
      preferCurrentTab:true, selfBrowserSurface:'include', surfaceSwitching:'exclude', systemAudio:'exclude'});
  }catch(e){
    throw new Error(e && e.name==='NotAllowedError'
      ? 'No se compartió la pestaña. Para detectar la melodía, Entona necesita escuchar el audio de esta pestaña.'
      : 'No pude capturar el audio de la pestaña'+(e && e.name ? ' ('+e.name+')' : '')+'.');
  }
  const pistas = stream.getAudioTracks();
  if(!pistas.length){
    stream.getTracks().forEach(t => t.stop());
    throw new Error('No llegó el audio. En el cuadro del navegador elige esta pestaña y deja marcada la opción «Compartir también el audio de la pestaña».');
  }
  const ctx = A.asegurar(), sr = ctx.sampleRate, f = Math.max(1, Math.round(sr/11025)), srOut = sr/f;
  const src = ctx.createMediaStreamSource(new MediaStream(pistas));
  const proc = ctx.createScriptProcessor(4096, 2, 2), mudo = ctx.createGain();
  mudo.gain.value = 0;
  const izq = [], der = [], pares = [];
  let n = 0, ultVid = -1, cortada = false;
  pistas[0].addEventListener('ended', () => { cortada = true; });

  /* Guarda el audio reducido a ~11 kHz y anota pares (instante de la grabación, tiempo del video). */
  proc.onaudioprocess = e => {
    const ib = e.inputBuffer, a = ib.getChannelData(0), b = ib.numberOfChannels > 1 ? ib.getChannelData(1) : a;
    const m = Math.floor(a.length/f), la = new Float32Array(m), lb = new Float32Array(m);
    for(let i=0;i<m;i++){
      let sa = 0, sb = 0;
      for(let k=0;k<f;k++){ sa += a[i*f+k]; sb += b[i*f+k]; }
      la[i] = sa/f; lb[i] = sb/f;
    }
    izq.push(la); der.push(lb); n += m;
    const p = R.player;
    if(p && R.listo){
      const vid = p.getCurrentTime() || 0;
      if(vid !== ultVid){ ultVid = vid; pares.push({rec:n/srOut, vid, ok:R.estado===1, rate:p.getPlaybackRate()||1}); }
    }
  };
  src.connect(proc); proc.connect(mudo); mudo.connect(ctx.destination);

  const C = {
    get segundos(){ return n/srOut; },
    get cortada(){ return cortada; },
    cancelar(){
      proc.onaudioprocess = null;
      try{ src.disconnect(); proc.disconnect(); mudo.disconnect(); }catch(e){}
      stream.getTracks().forEach(t => t.stop());
    },
    terminar(){
      C.cancelar();
      if(!n) return null;
      const buf = ctx.createBuffer(2, n, srOut), L = buf.getChannelData(0), Rc = buf.getChannelData(1);
      let o = 0;
      for(let i=0;i<izq.length;i++){ L.set(izq[i], o); Rc.set(der[i], o); o += izq[i].length; }
      return {buffer:buf, mapa:mapear(pares)};
    },
  };
  return C;
};

/* Tramos en los que el video avanzó al mismo ritmo que la grabación (sin pausas, cargas ni anuncios).
   Dentro de cada tramo, tiempo del video = desfase + velocidad × instante de la grabación. */
function mapear(pares){
  const tramos = [];
  let t = null;
  for(let i=1;i<pares.length;i++){
    const a = pares[i-1], b = pares[i], dr = b.rec-a.rec, dv = b.vid-a.vid;
    const sigue = a.ok && b.ok && dr > 0 && Math.abs(dv-dr*b.rate) < 0.3+0.25*dr*b.rate;
    if(sigue){
      if(!t){ t = {ini:a.rec, fin:b.rec, rate:b.rate, desf:[a.vid-a.rate*a.rec]}; tramos.push(t); }
      t.fin = b.rec; t.desf.push(b.vid-b.rate*b.rec);
    } else t = null;
  }
  tramos.forEach(x => { x.off = E.mediana(x.desf)-LAT_CAPTURA*x.rate; });
  const mapa = rec => {
    const x = tramos.find(x => rec >= x.ini-0.6 && rec <= x.fin+0.3);
    return x ? {t:x.off+x.rate*rec, rate:x.rate} : null;
  };
  mapa.tramos = tramos;
  return mapa;
}
Y._mapear = mapear;

/* Pasa las notas detectadas (en tiempo de la grabación) al tiempo del video. */
Y.alVideo = function(notas, mapa){
  const r = [];
  notas.forEach(n => {
    const x = mapa(n.t);
    if(x && x.t >= 0) r.push({t:+x.t.toFixed(3), d:+(n.d*x.rate).toFixed(3), m:n.m});
  });
  return r.sort((a,b) => a.t-b.t);
};
})();
