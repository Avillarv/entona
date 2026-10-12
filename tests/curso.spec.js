/* Aprender: el camino de lecciones y el reproductor de lecciones. */
const { test, expect } = require('@playwright/test');
const { abrir, vozSimulada, activarMic, sinErrores } = require('./ayuda');

/* Resuelve el paso actual como lo haría un alumno que acierta. */
async function resolverPaso(page) {
  const tipo = await page.evaluate(() => Entona.curso.estado.p.tipo);
  if (tipo === 'oido') {
    const c = await page.evaluate(() => Entona.curso.estado.p.q.correcta);
    await page.click(`.opcion[data-op="${c}"]`);
    await page.click('#lecPie .btn.primary');
  } else if (tipo === 'respira') {
    await page.evaluate(() => { document.querySelector('[data-act=respirar]').click(); Entona.curso.estado.p.t0 -= 1e6; });
  } else if (tipo === 'voz') {
    const rango = await page.evaluate(() => Entona.curso.estado.p.def.modo === 'rango');
    await page.evaluate(() => { window.__voz = 50; });
    if (rango) { await page.waitForTimeout(300); await page.evaluate(() => { window.__voz = 58; }); }
  } else if (tipo === 'calibra') {
    await page.evaluate(() => { window.__voz = 57.1; });
  } else if (tipo === 'canta') {
    // Canta cada nota objetivo. La primera, una octava abajo: en las lecciones cualquier octava vale.
    await expect.poll(() => page.evaluate(() => {
      const p = Entona.curso.estado.p;
      if (p.resuelto) return true;
      window.__voz = p.tg[p.k].m + (p.k === 0 ? -12 : 0) + 0.2;
      return false;
    }), { timeout: 60000, intervals: [300] }).toBe(true);
  }
  await page.waitForFunction(() => { const b = document.querySelector('#lecPie .btn.primary'); return b && !b.disabled; }, null, { timeout: 20000 });
  await page.evaluate(() => { window.__voz = null; });
  await page.waitForTimeout(400);   // silencio entre pasos, como en el uso real
  await page.click('#lecPie .btn.primary');
}

async function completarLeccion(page, id) {
  await page.click(`button[data-lec="${id}"]`);
  for (let i = 0; i < 40 && !(await page.evaluate(() => Entona.curso.estado.fin)); i++) await resolverPaso(page);
  expect(await page.evaluate(() => Entona.curso.estado.fin), id).toBe(true);
  await page.click('#lecPie .btn.primary');   // vuelve al mapa
}

test('las lecciones se desbloquean en orden', async ({ page }) => {
  const errores = await abrir(page, { seccion: 'aprender' });
  await expect(page.locator('button[data-lec="agudo-grave"]')).toBeEnabled();
  await expect(page.locator('button[data-lec="postura-aire"]')).toBeDisabled();
  sinErrores(errores);
});

test('una respuesta equivocada cuenta como error y se repasa al final', async ({ page }) => {
  const errores = await abrir(page, { seccion: 'aprender' });
  await page.click('button[data-lec="agudo-grave"]');
  await page.click('#lecPie .btn.primary');
  await page.click('#lecPie .btn.primary');
  const antes = await page.evaluate(() => Entona.curso.estado.pasos.length);
  const c = await page.evaluate(() => Entona.curso.estado.p.q.correcta);
  await page.click(`.opcion[data-op="${1 - c}"]`);
  await page.click('#lecPie .btn.primary');
  await expect(page.locator('#lecPie')).toHaveAttribute('data-estado', 'mal');
  expect(await page.evaluate(() => Entona.curso.estado.pasos.length)).toBe(antes + 1);
  expect(await page.evaluate(() => Entona.curso.estado.errores)).toBe(1);
  sinErrores(errores);
});

test('el curso completo se puede terminar y guarda el avance', async ({ page }) => {
  test.setTimeout(600000);
  const errores = await abrir(page, { seccion: 'aprender' });
  await vozSimulada(page);
  await activarMic(page);
  const ids = await page.evaluate(() => Entona.LECCIONES.map(l => l.id));
  for (const id of ids) await completarLeccion(page, id);
  const S = await page.evaluate(() => ({ curso: Entona.S.curso, xp: Entona.S.xp, tonic: Entona.S.tonic }));
  expect(Object.keys(S.curso)).toEqual(ids);
  expect(Object.values(S.curso).every(e => e === 3)).toBe(true);
  expect(S.xp).toBe(15 * ids.length);
  expect(S.tonic).toBe(53);   // calibró con La3 (57): los ejercicios empiezan cuatro semitonos abajo
  sinErrores(errores);
});
