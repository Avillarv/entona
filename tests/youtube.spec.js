/* Karaoke con YouTube: lectura de enlaces, paso del tiempo de la grabación al del video
   y el flujo completo con el reproductor real. */
const { test, expect } = require('@playwright/test');
const { abrir, sinErrores } = require('./ayuda');

test('reconoce los distintos formatos de enlace de YouTube', async ({ page }) => {
  await abrir(page);
  const ids = await page.evaluate(() => [
    'https://www.youtube.com/watch?v=jNQXAC9IVRw&list=x', 'https://youtu.be/jNQXAC9IVRw?t=3',
    'youtube.com/shorts/jNQXAC9IVRw', 'https://music.youtube.com/watch?v=jNQXAC9IVRw',
    'https://www.youtube.com/embed/jNQXAC9IVRw', 'jNQXAC9IVRw',
    'https://example.com/watch?v=jNQXAC9IVRw', 'hola', '',
  ].map(Entona.yt.idDe));
  expect(ids).toEqual([...Array(6).fill('jNQXAC9IVRw'), null, null, null]);
});

test('pasa los instantes de la grabación al tiempo del video, sin contar pausas', async ({ page }) => {
  await abrir(page);
  const r = await page.evaluate(() => {
    // El video empezó 2 s después de la grabación, se pausó entre 6 y 9 s de grabación y siguió.
    const pares = [];
    for (let rec = 0; rec <= 14; rec += 0.25) {
      const pausa = rec > 6 && rec < 9;
      const vid = rec < 2 ? 0 : rec <= 6 ? rec - 2 : pausa ? 4 : rec - 5;
      pares.push({ rec, vid, ok: rec >= 2 && !pausa, rate: 1 });
    }
    const mapa = Entona.yt._mapear(pares);
    return [4, 7.5, 12].map(t => { const x = mapa(t); return x && +x.t.toFixed(2); });
  });
  // 0,1 s es la compensación del retraso de captura (LAT_CAPTURA)
  expect(r).toEqual([1.9, null, 6.9]);
});

test('detecta la melodía de un video y el karaoke la puntúa', async ({ page }) => {
  test.skip(!!process.env.SIN_RED, 'Necesita conexión a YouTube');
  test.setTimeout(180000);
  const NOTAS = [[2, 1, 60], [3.5, 1, 64], [5, 1, 67], [6.5, 1.5, 65], [9, 1, 62], [11, 2, 60], [14, 1, 67]];
  const errores = await abrir(page, { seccion: 'karaoke', tonic: 48 });
  // El navegador de pruebas no puede compartir una pestaña: la captura se reemplaza por una voz
  // sintética que canta NOTAS en esos instantes del video.
  await page.evaluate(NOTAS => {
    navigator.mediaDevices.getDisplayMedia = async () => {
      const ctx = Entona.audio.asegurar(), dest = ctx.createMediaStreamDestination(), YI = Entona.app.YI;
      const iv = setInterval(() => {
        if (YI.estado !== 1) return;
        clearInterval(iv);
        const v = YI.player.getCurrentTime(), t0 = ctx.currentTime;
        NOTAS.forEach(([t, d, m]) => {
          const ini = t0 + (t - v); if (ini < t0) return;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, ini); g.gain.linearRampToValueAtTime(0.25, ini + 0.03);
          g.gain.setValueAtTime(0.25, ini + d - 0.05); g.gain.linearRampToValueAtTime(0, ini + d);
          g.connect(dest);
          const f = 440 * Math.pow(2, (m - 69) / 12);
          [[1, 1], [2, .5], [3, .3], [4, .15]].forEach(([h, a]) => {
            const o = ctx.createOscillator(), ga = ctx.createGain();
            o.frequency.value = f * h; ga.gain.value = a; o.connect(ga).connect(g); o.start(ini); o.stop(ini + d + 0.05);
          });
        });
      }, 20);
      return dest.stream;
    };
  }, NOTAS);
  await page.click('#kAgregarYT');
  await page.fill('#ytUrl', 'https://youtu.be/jNQXAC9IVRw');   // «Me at the zoo», 19 s
  await page.click('#ytCargar');
  await expect(page.locator('#impAnalizar')).toBeEnabled({ timeout: 30000 });
  await expect(page.locator('#impNombre')).toHaveValue('Me at the zoo');
  await page.click('#impAnalizar');
  await page.waitForFunction(() => Entona.S.vista === 'practica', null, { timeout: 90000 });

  const notas = await page.evaluate(() => Entona.S.pieza.notas);
  expect(notas.map(n => n.m)).toEqual(NOTAS.map(n => n[2]));
  notas.forEach((n, i) => expect(Math.abs(n.t - NOTAS[i][0]), `nota ${i}`).toBeLessThan(0.2));

  // Karaoke: una voz simulada canta la nota correcta según el tiempo del video
  await page.evaluate(() => {
    Entona.audio.leer = () => {
      const t = Entona.app.YK.pista.currentTime - 0.05, n = Entona.S.carta.notas.find(n => t >= n.t0 && t < n.t1);
      return { midi: n ? n.m + 0.1 : null, rms: n ? 0.1 : 0.003, bloqueado: false, claridad: 0.95, umbral: 0.01 };
    };
    Entona.S.mic = 'on';
    Entona.app.ponerModo('karaoke');
  });
  await page.waitForTimeout(500);
  await page.click('#play');
  await page.waitForFunction(() => Entona.S.resultado, null, { timeout: 40000 });
  const r = await page.evaluate(() => Entona.S.resultado);
  expect(r.precision).toBeGreaterThanOrEqual(90);
  expect(r.aciertos).toBe(NOTAS.length);
  sinErrores(errores);
});
