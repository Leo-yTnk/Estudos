import type { LocalImage } from './collections';

export async function importLocalImage(file: File): Promise<LocalImage> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.size > 30_000_000) {
    throw new Error('Escolha uma imagem raster de até 30 MB.');
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a imagem.');
    let scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
    for (let attempt = 0; attempt < 5; attempt++, scale *= .72) {
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const src = canvas.toDataURL('image/webp', .8);
      if (src.length <= 590_000) return { src, alt: '' };
    }
    throw new Error('A imagem não coube neste caderno.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
