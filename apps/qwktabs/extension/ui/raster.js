
// Decode extension-owned raster bytes without a page-controlled <img> request.
export async function rasterCanvas(data) {
  const match = /^data:(image\/(?:png|webp|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(data || '');
  if (!match) throw Error('Unsupported image');
  const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  const bitmap = await createImageBitmap(new Blob([bytes], { type: match[1] }));
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.getContext('2d').drawImage(bitmap, 0, 0);
    return canvas;
  } finally {
    bitmap.close();
  }
}
