const MAX_SIDE = 1024;
const QUALITY = 0.8;

/**
 * Reduz a foto para no máximo 1024 px no lado maior (JPEG 80%) antes de a enviar.
 * Chega bem para o Gemini e fica ~10x mais pequena: muito mais rápido em 4G.
 * Se o browser não conseguir ler o formato (ex.: HEIC no Chrome), envia o original.
 */
export async function compressImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
    // Só vale a pena se ficou mais pequena.
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], 'photo.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
