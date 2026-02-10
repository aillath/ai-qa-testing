import fs from 'fs';
import path from 'path';

const FIGMA_API = 'https://api.figma.com/v1';

export interface FigmaParsed {
  fileKey: string;
  nodeId: string; // API format with colon, e.g. "1:2"
}

/**
 * Parse a Figma design/file URL to extract file key and node id.
 * Supports: .../design/FILE_KEY/...?node-id=1-2  or  .../file/FILE_KEY/...?node-id=1-2
 */
export function parseFigmaUrl(figmaUrl: string): FigmaParsed | null {
  try {
    const url = new URL(figmaUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // design or file
    const keyIndex = pathParts.findIndex((p) => p === 'design' || p === 'file');
    if (keyIndex === -1 || keyIndex + 1 >= pathParts.length) return null;
    const fileKey = pathParts[keyIndex + 1];
    const nodeIdParam = url.searchParams.get('node-id');
    if (!nodeIdParam) return null;
    // URL uses hyphen (1-2), API uses colon (1:2)
    const nodeId = nodeIdParam.replace(/-/g, ':');
    return fileKey && nodeId ? { fileKey, nodeId } : null;
  } catch {
    return null;
  }
}

export interface FigmaNodeDimensions {
  width: number;
  height: number;
}

/**
 * Get node dimensions from Figma (absoluteBoundingBox).
 */
export async function getFigmaNodeDimensions(
  fileKey: string,
  nodeId: string,
  accessToken: string
): Promise<FigmaNodeDimensions | null> {
  const res = await fetch(
    `${FIGMA_API}/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`,
    { headers: { 'X-Figma-Token': accessToken } }
  );
  if (!res.ok) return null;
  interface FigmaNodeRes {
    nodes?: Record<string, { document?: { absoluteBoundingBox?: { width: number; height: number } } }>;
  }
  const data = (await res.json()) as FigmaNodeRes;
  const node = data?.nodes?.[nodeId];
  const box = node?.document?.absoluteBoundingBox;
  if (!box || typeof box.width !== 'number' || typeof box.height !== 'number') return null;
  return { width: Math.round(box.width), height: Math.round(box.height) };
}

/**
 * Get export image URL for a node (scale 1 = 1:1 with design).
 */
export async function getFigmaImageUrl(
  fileKey: string,
  nodeId: string,
  accessToken: string,
  scale = 1
): Promise<string | null> {
  const res = await fetch(
    `${FIGMA_API}/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=${scale}`,
    { headers: { 'X-Figma-Token': accessToken } }
  );
  if (!res.ok) return null;
  interface FigmaImagesRes {
    images?: Record<string, string>;
    err?: string;
  }
  const data = (await res.json()) as FigmaImagesRes;
  if (data.err) return null;
  return data?.images?.[nodeId] ?? null;
}

/**
 * Download Figma frame image to a file and return its path.
 */
export async function downloadFigmaImage(
  imageUrl: string,
  outPath: string
): Promise<string> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Figma image fetch failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, buffer);
  return outPath;
}
