import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_SIDE = 1024;

/**
 * Reduz a foto para no máximo 1024 px no lado maior (JPEG 80%) antes de a enviar.
 * Chega bem para o Gemini e fica muitas vezes mais pequena: muito mais rápido em 4G.
 * Se falhar, devolve a foto original.
 */
export async function compressPhoto(asset: { uri: string; width: number; height: number; mimeType?: string | null }) {
  try {
    const ctx = ImageManipulator.manipulate(asset.uri);
    if (Math.max(asset.width, asset.height) > MAX_SIDE) {
      ctx.resize(asset.width >= asset.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
    }
    const image = await ctx.renderAsync();
    const result = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
    return { uri: result.uri, mimeType: 'image/jpeg' };
  } catch {
    return { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' };
  }
}
