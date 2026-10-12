/* Practicar: modo «a tu ritmo» y karaoke de las canciones incluidas. */
const { test, expect } = require('@playwright/test');
const { abrir, vozSimulada, activarMic, sinErrores } = require('./ayuda');

test('«a tu ritmo»: cantar cada nota completa el ejercicio con 3 estrellas', async ({ page }) => {
  const errores = await abrir(page, { seccion: 'practicar', pieza: 'escalones' });
  await vozSimulada(page);
  await activarMic(page);
  await expect.poll(() => page.evaluate(() => {
    const S = Entona.S;
    if (S.resultado) return true;
    window.__voz = S.carta.notas[S.idx].m + 0.1;
    return false;
  }), { timeout: 60000, intervals: [200] }).toBe(true);
  const r = await page.evaluate(() => Entona.S.resultado);
  expect(r.stars).toBe(3);
  expect(await page.evaluate(() => Entona.S.mejor.escalones)).toBe(3);
  sinErrores(errores);
});

test('karaoke: cantar a tiempo toda la canción da 100 %', async ({ page }) => {
  const errores = await abrir(page, { seccion: 'karaoke' });
  await page.click('.k-carta[data-id=estrellita]');
  await page.evaluate(() => {
    const A = Entona.audio;
    A.leer = () => {
      const K = Entona.K, n = Entona.S.carta.notas.find(n => K.t - 0.12 >= n.t0 && K.t - 0.12 < n.t1);
      return { midi: n ? n.m : null, rms: 0.1, bloqueado: false, claridad: 0.95, umbral: 0.01 };
    };
    Entona.S.mic = 'on';
  });
  await page.click('.seg[data-key=vel] button[data-v="1"]');
  await page.click('#play');
  await page.waitForFunction(() => Entona.S.resultado, null, { timeout: 40000 });
  const r = await page.evaluate(() => Entona.S.resultado);
  expect(r.precision).toBeGreaterThanOrEqual(95);
  expect(r.aciertos).toBe(r.total);
  sinErrores(errores);
});
