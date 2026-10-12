/* Filtro de voz: el ruido de fondo no debe contar como canto. Usa señales sintéticas
   que pasan por el detector real (YIN y filtro), no lecturas simuladas. */
const { test, expect } = require('@playwright/test');
const { abrir, activarMic, senalSintetica, porcentajeVoz, sinErrores } = require('./ayuda');

test.beforeEach(async ({ page }) => {
  page.errores = await abrir(page, { seccion: 'practicar', pieza: 'libre' });
  await activarMic(page);
  await senalSintetica(page);
  await page.evaluate(() => { window.__senal = 'silencio'; });
  await page.waitForTimeout(1500);   // el filtro estima el ruido de la sala
});

test('el ruido y la voz demasiado suave no cuentan; la voz sí', async ({ page }) => {
  for (const s of ['silencio', 'ruido', 'intermitente', 'vozsuave'])
    expect(await porcentajeVoz(page, s), s).toBeLessThanOrEqual(2);
  expect(await porcentajeVoz(page, 'voz')).toBeGreaterThanOrEqual(90);
  sinErrores(page.errores);
});

test('«Medir ruido» aprende un zumbido constante', async ({ page }) => {
  await page.click('#micAjustes');
  await page.evaluate(() => { window.__senal = 'zumbido'; });
  await page.click('#pmMedir');
  await page.waitForFunction(() => Entona.S.ruido > 0, null, { timeout: 6000 });
  expect(await porcentajeVoz(page, 'zumbido')).toBeLessThanOrEqual(2);
  expect(await porcentajeVoz(page, 'voz')).toBeGreaterThanOrEqual(90);
  await page.click('.seg[data-key=sensib] button[data-v=baja]');
  expect(await porcentajeVoz(page, 'voz'), 'sensibilidad baja').toBeGreaterThanOrEqual(90);
  sinErrores(page.errores);
});
