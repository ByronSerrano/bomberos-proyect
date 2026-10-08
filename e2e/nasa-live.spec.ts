import { config } from '@config';
import { expect, test } from '@playwright/test';
import { datasetSchema } from '@/domain/models';
import { createSession } from '@/domain/replay';

test('real FIRMS query and rendered NASA GIBS tiles @live', async ({ page, request }, testInfo) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  const urls: string[] = [];
  const tileResponses: { url: string; status: number }[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (req) => urls.push(req.url()));
  page.on('response', (res) => {
    if (res.url().includes('gibs.earthdata.nasa.gov'))
      tileResponses.push({ url: res.url(), status: res.status() });
  });
  const health = await request.get('/api/health');
  expect(
    (await health.json()).firmsConfigured,
    'La prueba live necesita FIRMS_MAP_KEY en .env.',
  ).toBe(true);
  await page.addInitScript(() => {
    localStorage.setItem('disaster-replay:briefing-seen', '1');
  });
  await page.goto('/');
  await expect(page.locator('.thermal-detection')).toHaveCount(23);
  await expect
    .poll(
      () =>
        page
          .locator('img.leaflet-tile-loaded')
          .evaluateAll(
            (images) =>
              images.filter(
                (image) =>
                  image instanceof HTMLImageElement &&
                  image.src.includes('gibs.earthdata') &&
                  image.naturalWidth > 0,
              ).length,
          ),
      { timeout: 30000 },
    )
    .toBeGreaterThan(0);
  expect(
    tileResponses.some(
      (response) => response.url.includes('gibs.earthdata') && response.status === 200,
    ),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('map-nasa-gibs-real.png'), fullPage: true });
  await page.getByRole('combobox', { name: 'Mapa base' }).selectOption('none');
  await expect(page.locator('img.leaflet-tile')).toHaveCount(0);
  await expect(page.locator('.thermal-detection')).toHaveCount(23);
  await page.getByRole('button', { name: 'Fuentes y datos' }).click();
  await expect(page.getByText('FIRMS configurado', { exact: false })).toBeVisible();
  await page.getByRole('textbox', { name: 'Área oeste, sur, este, norte' }).fill('-123,53,-120,56');
  await page.getByLabel('Fecha inicial UTC').fill('2023-07-12');
  await page.getByRole('combobox', { name: 'Días', exact: true }).selectOption('1');
  await page.getByRole('combobox', { name: 'Producto' }).selectOption('VIIRS_NOAA20_SP');
  const responsePromise = page.waitForResponse(
    (response) => response.url().endsWith('/api/firms'),
    { timeout: 40000 },
  );
  await page.getByRole('button', { name: 'Consultar y comenzar nuevo replay' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const dataset = datasetSchema.parse(await response.json());
  expect(dataset.observations.length).toBeGreaterThan(0);
  const frames = createSession(dataset).frames;
  await expect(page.locator('.thermal-detection')).toHaveCount(frames[0]?.observations.length ?? 0);
  let count = 0;
  for (const frame of frames) {
    count += frame.observations.length;
    await expect(page.locator('.thermal-detection')).toHaveCount(count);
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: /Confirmar y (avanzar|ver debrief)/ }).click();
  }
  await page.getByRole('button', { name: 'Revisar mapa completo' }).click();
  await expect(page.locator('.thermal-detection')).toHaveCount(dataset.observations.length);
  await expect(page.locator('img.leaflet-tile-loaded').first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('map-firms-live.png'), fullPage: true });
  expect(urls.some((url) => url.includes('firms.modaps.eosdis.nasa.gov'))).toBe(false);
  expect(urls.some((url) => config.FIRMS_MAP_KEY && url.includes(config.FIRMS_MAP_KEY))).toBe(
    false,
  );
  expect(JSON.stringify(dataset).includes(config.FIRMS_MAP_KEY ?? '__missing_key__')).toBe(false);
  expect(errors).toEqual([]);
  await testInfo.attach('nasa-verification', {
    body: JSON.stringify(
      {
        source: 'VIIRS_NOAA20_SP',
        date: '2023-07-12',
        bbox: dataset.bbox,
        detections: dataset.observations.length,
        stages: frames.map((frame) => ({ at: frame.at, count: frame.observations.length })),
        realTilesLoaded: tileResponses.filter((item) => item.status === 200).length,
        browserErrors: errors,
      },
      null,
      2,
    ),
    contentType: 'application/json',
  });
});
