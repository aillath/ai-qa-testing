import { Page } from '@playwright/test';

export async function stabilizePage(page: Page) {
  // Wait DOM + fonts ('load' is reliable; networkidle is deprecated)
  await page.waitForLoadState('load');
  await page.evaluate(async () => {
    // wait for fonts
    // @ts-ignore
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  });

  // Disable CSS animations/transitions (reduces flaky diffs)
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        scroll-behavior: auto !important;
        caret-color: transparent !important;
      }
    `
  });
}
