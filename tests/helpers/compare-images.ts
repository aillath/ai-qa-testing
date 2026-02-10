import fs from 'fs';
import path from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export interface CompareResult {
  diffPixelCount: number;
  totalPixels: number;
  diffRatio: number;
  diffImagePath: string | null;
  width: number;
  height: number;
  passed: boolean;
  threshold: number;
}

/**
 * Compare two PNG images (file path or buffer). Optionally write a diff image.
 * Returns diff stats and whether the comparison passed the threshold.
 */
export function compareImages(
  imagePathOrBufferA: string | Buffer,
  imagePathOrBufferB: string | Buffer,
  options: {
    diffOutputPath?: string;
    threshold?: number; // 0–1, max allowed diff ratio to pass
  } = {}
): CompareResult {
  const threshold = options.threshold ?? 0.01;
  const diffOutputPath = options.diffOutputPath ?? null;

  const loadPng = (input: string | Buffer): { width: number; height: number; data: Buffer } => {
    const buf = typeof input === 'string' ? fs.readFileSync(input) : input;
    const png = PNG.sync.read(buf);
    return {
      width: png.width,
      height: png.height,
      data: Buffer.from(png.data)
    };
  };

  const imgA = loadPng(imagePathOrBufferA);
  const imgB = loadPng(imagePathOrBufferB);

  if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
    throw new Error(
      `Image size mismatch: ${imgA.width}x${imgA.height} vs ${imgB.width}x${imgB.height}. ` +
        'Ensure viewport matches Figma frame size.'
    );
  }

  const { width, height } = imgA;
  const totalPixels = width * height;
  const diffBuffer = Buffer.alloc(width * height * 4);

  const diffPixelCount = pixelmatch(
    imgA.data,
    imgB.data,
    diffBuffer,
    width,
    height,
    { threshold: 0.1 }
  );

  const diffRatio = totalPixels > 0 ? diffPixelCount / totalPixels : 0;
  const passed = diffRatio <= threshold;

  let writtenPath: string | null = null;
  if (diffOutputPath && diffBuffer.length > 0) {
    const diffPng = new PNG({ width, height });
    diffPng.data = Buffer.from(diffBuffer);
    const dir = path.dirname(diffOutputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(diffOutputPath, PNG.sync.write(diffPng));
    writtenPath = diffOutputPath;
  }

  return {
    diffPixelCount,
    totalPixels,
    diffRatio,
    diffImagePath: writtenPath,
    width,
    height,
    passed,
    threshold
  };
}
