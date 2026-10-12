/* Interfaz: secciones, panel del micrófono y diseño en pantallas angostas. */
const { test, expect } = require('@playwright/test');
const { abrir, sinErrores } = require('./ayuda');

test('quien entra por primera vez llega a Aprender', async ({ page }) => {
  const errores = await abrir(page);
  await expect(page.locator('#seccionAprender')).toBeVisible();
  await expect(page.locator('.tabs button[data-seccion=aprender]')).toHaveAttribute('aria-current', 'page');
  sinErrores(errores);
});

test('las tres pestañas muestran su sección', async ({ page }) => {
  const errores = await abrir(page, { seccion: 'aprender' });
  await page.click('.tabs button[data-seccion=practicar]');
  await expect(page.locator('#seccionPracticar')).toBeVisible();
  await expect(page.locator('#ruta')).toBeVisible();
  await page.click('.tabs button[data-seccion=karaoke]');
  await expect(page.locator('#seccionKaraoke')).toBeVisible();
  await expect(page.locator('#kIncluidas .k-carta')).toHaveCount(5);
  await page.click('.k-carta[data-id=fray]');
  await expect(page.locator('#vistaPractica')).toBeVisible();
  await expect(page.locator('#ruta')).toBeHidden();
  await page.click('#vistaPractica [data-volver]');
  await expect(page.locator('#seccionKaraoke')).toBeVisible();
  sinErrores(errores);
});

test('el panel del micrófono se abre y se cierra', async ({ page }) => {
  const errores = await abrir(page, { seccion: 'practicar' });
  await page.click('#micAjustes');
  await expect(page.locator('#panelMic')).toBeVisible();
  await expect(page.locator('#pmEstado')).toHaveText('Micrófono apagado');
  await page.click('#pmCerrar');
  await expect(page.locator('#panelMic')).toBeHidden();
  sinErrores(errores);
});

test.describe('en un celular', () => {
  test.use({ viewport: { width: 380, height: 800 } });
  for (const seccion of ['aprender', 'practicar', 'karaoke']) {
    test(`${seccion}: sin desplazamiento horizontal`, async ({ page }) => {
      const errores = await abrir(page, { seccion });
      await page.click('#micAjustes');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(380);
      sinErrores(errores);
    });
  }
});
