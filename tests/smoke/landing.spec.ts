import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { stabilizePage } from '../helpers/stabilize';
import {
  parseFigmaUrl,
  getFigmaNodeDimensions,
  getFigmaImageUrl,
  downloadFigmaImage
} from '../helpers/figma';
import { compareImages } from '../helpers/compare-images';

type PageItem = {
  id: string;
  name: string;
  url: string;
  type: string;
  figmaLink?: string;
};

function loadPages(): PageItem[] {
  const p = path.join(process.cwd(), 'test-data', 'pages.json');
  const raw = fs.readFileSync(p, 'utf-8');
  return JSON.parse(raw);
}

const pages = loadPages();
const figmaToken = process.env.FIGMA_ACCESS_TOKEN;
const designDiffThreshold = Number(process.env.DESIGN_DIFF_THRESHOLD) || 0.01;

for (const item of pages) {
  test.describe(`${item.name} (${item.type})`, () => {
    test(`visual + basic functional`, async ({ page }) => {
      await page.goto(item.url, { waitUntil: 'domcontentloaded' });
      await stabilizePage(page);

      // BASIC FUNCTIONAL CHECKS (customize selectors later)
      const h1 = page.locator('h1').first();
      await expect(h1).toBeVisible({ timeout: 15_000 });

      const linkCount = await page.locator('a').count();
      expect(linkCount).toBeGreaterThan(0);

      await expect(page).toHaveScreenshot(`${item.id}.png`, {
        fullPage: true
      });
    });

    test(`design vs Figma (compare and show issues)`, async ({ page }, testInfo) => {
      if (!item.figmaLink) {
        test.skip();
        return;
      }
      // Run design comparison once (Desktop); Figma frame size is fixed per design
      if (testInfo.project.name !== 'Desktop Chromium') {
        test.skip();
        return;
      }
      if (!figmaToken) {
        test.skip(true, 'FIGMA_ACCESS_TOKEN not set – set it to run design comparison');
        return;
      }

      const parsed = parseFigmaUrl(item.figmaLink);
      if (!parsed) {
        throw new Error(`Invalid Figma URL: ${item.figmaLink}. Use design/file link with ?node-id=...`);
      }

      const { fileKey, nodeId } = parsed;
      const dimensions = await getFigmaNodeDimensions(fileKey, nodeId, figmaToken);
      if (!dimensions) {
        throw new Error('Could not get Figma node dimensions. Check file key, node id, and token.');
      }

      const imageUrl = await getFigmaImageUrl(fileKey, nodeId, figmaToken, 1);
      if (!imageUrl) {
        throw new Error('Could not get Figma image export URL.');
      }

      const baselinesDir = path.join(process.cwd(), 'test-data', 'figma-baselines');
      const figmaPath = path.join(baselinesDir, `${item.id}-figma.png`);
      await downloadFigmaImage(imageUrl, figmaPath);

      await page.setViewportSize({ width: dimensions.width, height: dimensions.height });
      await page.goto(item.url, { waitUntil: 'domcontentloaded' });
      await stabilizePage(page);

      const screenshotBuffer = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: dimensions.width, height: dimensions.height }
      });

      const resultsDir = path.join(process.cwd(), 'test-results', 'design-diffs');
      const diffPath = path.join(resultsDir, `${item.id}-diff.png`);
      const result = compareImages(figmaPath, screenshotBuffer, {
        diffOutputPath: diffPath,
        threshold: designDiffThreshold
      });

      const issuesReport = {
        pageId: item.id,
        pageName: item.name,
        url: item.url,
        figmaLink: item.figmaLink,
        viewport: { width: dimensions.width, height: dimensions.height },
        diffPixelCount: result.diffPixelCount,
        totalPixels: result.totalPixels,
        diffRatio: result.diffRatio,
        threshold: result.threshold,
        passed: result.passed,
        diffImagePath: result.diffImagePath
      };

      await test.info().attach('design-comparison-report.json', {
        body: JSON.stringify(issuesReport, null, 2),
        contentType: 'application/json'
      });
      if (result.diffImagePath && fs.existsSync(result.diffImagePath)) {
        await test.info().attach('design-diff.png', {
          path: result.diffImagePath,
          contentType: 'image/png'
        });
      }
      await test.info().attach('website-screenshot.png', {
        body: screenshotBuffer,
        contentType: 'image/png'
      });
      await test.info().attach('figma-baseline.png', {
        path: figmaPath,
        contentType: 'image/png'
      });

      expect(
        result.passed,
        `Design differs from Figma: ${(result.diffRatio * 100).toFixed(2)}% pixels different (threshold ${(result.threshold * 100).toFixed(0)}%). Check design-diff.png and report.`
      ).toBe(true);
    });
  });
}
