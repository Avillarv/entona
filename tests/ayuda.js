/* Ayudantes compartidos por las pruebas. */
const { expect } = require('@playwright/test');

/* Abre Entona con un estado guardado (lo que normalmente está en localStorage) y espera a que arranque. */
async function abrir(page, estado = {}) {
  const errores = [];
  page.on('pageerror', e => errores.push('pageerror: ' + e.message));
  page.on('console', m => {
    const t = m.text();
    // Un bloqueo de la política de seguridad (CSP) siempre es un error, aunque sea de YouTube.
    if (/Content Security Policy|^CSP:/.test(t)) errores.push('csp: ' + t);
    else if (m.type() === 'error' && !/youtube|google|ytimg|doubleclick|favicon|404/i.test(t)) errores.push('console: ' + t);
  });
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', e => console.error('CSP: ' + e.violatedDirective + ' ' + e.blockedURI));
  });
  await page.goto('/');
  await page.evaluate(e => { localStorage.clear(); localStorage.setItem('entona.v2', JSON.stringify(e)); }, estado);
  await page.reload();
  await page.waitForFunction(() => window.Entona && Entona.S.pieza && Entona.app.irSeccion);
  return errores;
}

/* Reemplaza la lectura del micrófono: la voz es window.__voz (nota MIDI) o silencio si es null. */
async function vozSimulada(page) {
  await page.evaluate(() => {
    const A = Entona.audio;
    window.__voz = null;
    A.leer = () => {
      const v = window.__voz;
      const bloqueado = A.bloqueado();   // mientras suena la guía el micrófono no cuenta, como en el filtro real
      return { midi: bloqueado ? null : v, crudo: v, rms: v != null ? 0.1 : 0.003, bloqueado, claridad: 0.95, umbral: 0.01, bajo: false };
    };
  });
}

async function activarMic(page) {
  await page.click('#micBtn');
  await page.waitForFunction(() => Entona.S.mic === 'on');
}

/* Reemplaza el audio que llega al analizador por una señal sintética: window.__senal elige cuál.
   Así se prueba el detector real (YIN y filtro de voz), no una lectura simulada. */
async function senalSintetica(page) {
  await page.evaluate(() => {
    const A = Entona.audio, sr = A.ctx.sampleRate;
    const g = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;
    A.analyser.getFloatTimeDomainData = buf => {
      const s = window.__senal, t0 = performance.now() / 1000, rafaga = Math.sin(t0 * 2.3) > 0.3;
      for (let i = 0; i < buf.length; i++) {
        const t = t0 + i / sr;
        let v = g() * 0.0015;
        if (s === 'ruido') v += g() * 0.03;
        if (s === 'intermitente' && rafaga) v += g() * 0.05 + 0.04 * Math.sin(2 * Math.PI * (180 + 40 * Math.sin(t0 * 7)) * t);
        if (s === 'zumbido') v += 0.03 * Math.sin(2 * Math.PI * 120 * t) + 0.015 * Math.sin(2 * Math.PI * 240 * t);
        if (s === 'voz' || s === 'vozsuave') {
          const a = s === 'voz' ? 0.12 : 0.006;
          v += a * (Math.sin(2 * Math.PI * 220 * t) + 0.5 * Math.sin(2 * Math.PI * 440 * t) + 0.25 * Math.sin(2 * Math.PI * 660 * t));
        }
        buf[i] = v;
      }
    };
    const leer = A.leer;
    window.__cuenta = { n: 0, voz: 0 };
    A.leer = () => { const r = leer(); window.__cuenta.n++; if (r.midi != null) window.__cuenta.voz++; return r; };
  });
}

/* Porcentaje de cuadros que el filtro aceptó como voz mientras suena `senal` durante `ms`. */
async function porcentajeVoz(page, senal, ms = 2500) {
  await page.evaluate(s => { window.__senal = s; }, senal);
  await page.waitForTimeout(400);
  await page.evaluate(() => { window.__cuenta = { n: 0, voz: 0 }; });
  await page.waitForTimeout(ms);
  return page.evaluate(() => Math.round(100 * window.__cuenta.voz / Math.max(1, window.__cuenta.n)));
}

const sinErrores = errores => expect(errores, errores.join('\n')).toEqual([]);

module.exports = { abrir, vozSimulada, activarMic, senalSintetica, porcentajeVoz, sinErrores };
