"use client";

/**
 * Shrink a picked image to something an avatar can actually carry.
 *
 * Avatars are stored as data URLs on the user row, which means the string
 * travels in every session payload the app fetches. A phone photo is 3–5 MB;
 * inlining one would bloat every request and, at Better Auth's column, simply
 * fail. The previous behaviour was to reject anything over 96 KB — technically
 * safe and useless in practice, because no photograph anyone owns is 96 KB.
 *
 * So resize rather than refuse: 256 px is twice the largest rendering of an
 * avatar in this app, and re-encoding at that size puts a normal photo in the
 * 8–25 KB range.
 */

const MAX_DIM = 256;
const MIN_QUALITY = 0.5;

export interface DownscaleResult {
  dataUrl: string;
  bytes: number;
}

/** Rough byte length of a base64 data URL, without allocating a Blob. */
function dataUrlBytes(url: string): number {
  const i = url.indexOf(",");
  if (i === -1) return 0;
  const b64 = url.slice(i + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Revoke only after decode, or Safari can race and draw a blank canvas.
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't an image this browser can read."));
    };
    img.src = url;
  });
}

/**
 * Centre-crop to a square, scale to `MAX_DIM`, and encode.
 *
 * Cropping rather than squashing because every avatar in the UI is rendered in
 * a circle or a rounded square: a letterboxed portrait would be cropped by CSS
 * anyway, just less deliberately.
 *
 * Quality steps down until the result fits `maxBytes`, so a noisy photograph
 * that does not compress well still ends up small enough rather than being
 * rejected for something the learner cannot control.
 */
export async function downscaleImage(
  file: File,
  { maxBytes = 64 * 1024 }: { maxBytes?: number } = {},
): Promise<DownscaleResult> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Pick an image file.");
  }

  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  if (!side) throw new Error("That image appears to be empty.");

  const size = Math.min(MAX_DIM, side);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't resize images.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    img,
    (img.naturalWidth - side) / 2,
    (img.naturalHeight - side) / 2,
    side,
    side,
    0, 0, size, size,
  );

  // PNG for anything with transparency, JPEG otherwise — a PNG photograph is
  // several times the size of the same image as JPEG.
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";

  let quality = 0.82;
  let dataUrl = canvas.toDataURL(type, quality);
  while (dataUrlBytes(dataUrl) > maxBytes && quality > MIN_QUALITY) {
    quality -= 0.12;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  const bytes = dataUrlBytes(dataUrl);
  if (bytes > maxBytes) {
    throw new Error("That image couldn't be compressed small enough. Try another.");
  }

  return { dataUrl, bytes };
}
