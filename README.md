# AI QA Testing

Playwright-based QA: visual snapshots, basic functional checks, and **design vs implementation** comparison (website vs Figma).

## Design vs Figma (compare and show issues)

When you add both a **website URL** and a **Figma link** for a page, the suite:

1. Fetches the Figma frame as an image (via Figma API)
2. Opens the website at the same viewport size as the Figma frame
3. Compares the two images and reports differences
4. Attaches a **design-comparison-report.json**, **design-diff.png** (highlighted differences), and both screenshots to the test report

### Setup

1. **Figma access token**  
   Create a [personal access token](https://www.figma.com/developers/api#access-tokens) in Figma (Settings → Account → Personal access tokens).  
   - **Local:** `export FIGMA_ACCESS_TOKEN=your_token`  
   - **CI:** Add `FIGMA_ACCESS_TOKEN` as a repository secret and use it in the workflow (already wired in `qa.yml`).

2. **Figma URL**  
   Use a design or file link that includes the frame you want:  
   `https://www.figma.com/design/FILE_KEY/PageName?node-id=1-2`  
   (The node id in the URL can use `-`; the code converts it for the API.)

### How to add a “website + Figma” item

**In `test-data/pages.json`:**

```json
{
  "id": "home",
  "name": "Home",
  "url": "https://yoursite.com",
  "type": "landing",
  "figmaLink": "https://www.figma.com/design/ABC123/Home?node-id=0-1"
}
```

**Manual workflow run:**  
Use the “QA - Playwright Visual & Functional” workflow: fill in **Website URL**, optional **Snapshot id**, and **Figma design URL** (with `?node-id=...`).

**Repository dispatch:**  
Send `figmaLink` in `client_payload` along with `url`, `itemId`, `pageName`, `type` so the workflow overwrites `pages.json` with one entry that has both `url` and `figmaLink`.

### Threshold and artifacts

- **Diff threshold:** Default max allowed pixel difference ratio is `0.01` (1%). Override with `DESIGN_DIFF_THRESHOLD` (e.g. `0.02` for 2%).
- **Issues:** The test fails if the diff ratio is above the threshold. Open the Playwright HTML report to see **design-comparison-report.json**, **design-diff.png**, and the two screenshots.

## Other commands

- `npm test` – run all tests  
- `npm run test:ui` – run with Playwright UI  
- `npm run test:update` – update visual snapshots  
- `npm run report` – open last HTML report  
