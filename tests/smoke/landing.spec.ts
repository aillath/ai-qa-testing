import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { stabilizePage } from '../helpers/stabilize';

type PageItem = {
  id: string;
  name: string;
  url: string;
  type: string;
};

function loadPages(): PageItem[] {
  const p = path.join(process.cwd(), 'test-data', 'pages.json');
  const raw = fs.readFileSync(p, 'utf-8');
  return JSON.parse(raw);
}

const pages = loadPages();

for (const item of pages) {
  test.describe(`${item.name} (${item.type})`, () => {
    test(`visual + basic functional`, async ({ page }) => {
      await page.goto(item.url, { waitUntil: 'domcontentloaded' });
      await stabilizePage(page);

      // BASIC FUNCTIONAL CHECKS (customize selectors later)
      // 1) Page has at least one H1 (hero)
      const h1 = page.locator('h1').first();
      await expect(h1).toBeVisible({ timeout: 15_000 });

      // 2) Check at least one link exists (navigation sanity)
      // 2) Check at least one link exists (navigation sanity)
      const linkCount = await page.locator('a').count();
      expect(linkCount).toBeGreaterThan(0);


      // VISUAL SNAPSHOT
      // Full page screenshot baseline/diff
      await expect(page).toHaveScreenshot(`${item.id}.png`, {
        fullPage: true
      });
    });
  });
}
