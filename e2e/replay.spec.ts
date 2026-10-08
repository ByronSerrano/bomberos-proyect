import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { datasetSchema } from '@/domain/models';

const sample = datasetSchema.parse(
  JSON.parse(await readFile('public/data/bc-2023-07-12.json', 'utf8')),
);
test.beforeEach(async ({ page }) => {
  // Deterministic tests exercise the real bundled NASA case, independent of external tile availability.
  await page.route('https://gibs.earthdata.nasa.gov/**', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('.thermal-detection')).toHaveCount(23);
});
test.afterEach(async ({ page }) => {
  expect(await page.pageErrors()).toEqual([]);
});
test('map renders only revealed readings, zooms, shows popups and remounts cleanly', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await expect(page.getByTestId('map-time')).toContainText('09:58');
  await expect(
    page.getByRole('group', { name: 'Etapas del replay' }).getByRole('button').nth(1),
  ).toBeDisabled();
  await page.locator('.thermal-detection').last().click();
  await expect(page.locator('.leaflet-popup-content')).toContainText('FRP:');
  await page.getByRole('button', { name: 'Close popup' }).click();
  const before = await page.locator('.thermal-detection').first().getAttribute('d');
  await page.getByRole('button', { name: 'Acercar', exact: true }).click();
  await expect
    .poll(() => page.locator('.thermal-detection').first().getAttribute('d'))
    .not.toBe(before);
  await page.getByRole('button', { name: 'Centrar mapa' }).click();
  await expect(
    page.getByText('No se pudieron cargar algunas imágenes', { exact: false }),
  ).toBeVisible();
  const notice = await page.locator('.map-tile-notice').boundingBox();
  const legend = await page.locator('.map-key').boundingBox();
  expect(notice && legend && notice.y + notice.height <= legend.y).toBe(true);
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Fuentes y datos' }).click();
    await page.getByRole('button', { name: 'Volver al ejercicio' }).click();
    await expect(page.locator('.leaflet-container')).toHaveCount(1);
    await expect(page.locator('.thermal-detection')).toHaveCount(23);
  }
  await page.screenshot({ path: test.info().outputPath('workspace.png'), fullPage: true });
  expect(errors).toEqual([]);
});
test('controlled decisions, resources, history, full debrief, export and restart', async ({
  page,
}) => {
  const note = '<img src=x onerror=alert(1)> Contrastar con campo.';
  await expect(page.getByRole('button', { name: 'Confirmar y avanzar' })).toBeDisabled();
  await page.locator('input[value="interpret-detections"]').check();
  await page.getByRole('textbox', { name: 'Tu razonamiento' }).fill(note);
  await page.getByRole('button', { name: 'Fuentes y datos' }).click();
  await page.getByRole('button', { name: 'Volver al ejercicio' }).click();
  await expect(page.locator('input[value="interpret-detections"]')).toBeChecked();
  await expect(page.getByRole('textbox', { name: 'Tu razonamiento' })).toHaveValue(note);
  await page.getByRole('button', { name: 'Confirmar y avanzar' }).click();
  await expect(page.locator('.thermal-detection')).toHaveCount(24);
  await expect(page.locator('.journal-note')).toHaveText(`Tu razonamiento: ${note}`);
  await expect(page.locator('.journal-note img')).toHaveCount(0);
  await expect(page.locator('.resource').filter({ hasText: 'Analistas' })).toContainText('1/2');
  await page.getByRole('group', { name: 'Etapas del replay' }).getByRole('button').first().click();
  await expect(page.locator('.thermal-detection')).toHaveCount(23);
  await expect(page.locator('input[value="interpret-detections"]')).toBeDisabled();
  await page.getByRole('button', { name: 'Volver a la etapa actual' }).click();
  await page.locator('input[value="verify-field"]').check();
  await page.getByRole('button', { name: 'Confirmar y avanzar' }).click();
  await expect(page.locator('.thermal-detection')).toHaveCount(41);
  await expect(page.locator('input[value="prepare-all"]')).toBeDisabled();
  await page.locator('input[value="prepare-contingency"]').check();
  await page.getByRole('button', { name: 'Confirmar y avanzar' }).click();
  await expect(page.locator('.thermal-detection')).toHaveCount(69);
  await page.locator('input[value="handoff-monitor"]').check();
  await page.getByRole('button', { name: 'Confirmar y ver debrief' }).click();
  await expect(
    page.getByRole('heading', { name: 'La evidencia detrás de tus decisiones.' }),
  ).toBeVisible();
  await expect(page.locator('.score-ring strong')).toHaveText('100');
  await expect(page.locator('.review-row')).toHaveCount(4);
  await page.screenshot({ path: test.info().outputPath('debrief.png'), fullPage: true });
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar debrief JSON' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error('No se generó el informe.');
  const report = JSON.parse(await readFile(path, 'utf8'));
  expect(report.score).toBe(100);
  expect(report.decisions).toHaveLength(4);
  expect(report.dataset.observations).toHaveLength(69);
  await page.getByRole('button', { name: 'Revisar mapa completo' }).click();
  await expect(page.locator('.thermal-detection')).toHaveCount(69);
  await page.getByRole('button', { name: 'Ver debrief' }).click();
  await page.getByRole('button', { name: 'Repetir el ejercicio' }).click();
  await expect(page.locator('.thermal-detection')).toHaveCount(23);
  await expect(page.locator('.journal-row')).toHaveCount(0);
});
test('failed and empty NASA responses preserve the existing replay', async ({ page }) => {
  await page.locator('input[value="interpret-detections"]').check();
  await page.getByRole('button', { name: 'Confirmar y avanzar' }).click();
  await page.getByRole('button', { name: 'Fuentes y datos' }).click();
  await page.route('**/api/firms', (route) =>
    route.fulfill({ status: 502, json: { error: 'NASA temporalmente no disponible.' } }),
  );
  await page.getByRole('button', { name: 'Consultar y comenzar nuevo replay' }).click();
  await expect(page.getByText('NASA temporalmente no disponible.', { exact: true })).toBeVisible();
  await page.unroute('**/api/firms');
  await page.route('**/api/firms', (route) =>
    route.fulfill({ json: { ...sample, observations: [] } }),
  );
  await page.getByRole('button', { name: 'Consultar y comenzar nuevo replay' }).click();
  await expect(page.getByText('NASA no devolvió detecciones', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Volver al ejercicio' }).click();
  await expect(page.locator('.thermal-detection')).toHaveCount(24);
  await expect(page.locator('.journal-row')).toHaveCount(1);
});
test('layout fits the viewport and decisions are keyboard accessible', async ({ page }) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const radio = page.locator('input[value="interpret-detections"]');
  await radio.focus();
  await page.keyboard.press('Space');
  await expect(radio).toBeChecked();
  for (const section of ['Fuentes y datos', 'Sala de mando']) {
    await page.getByRole('button', { name: section }).click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
});
