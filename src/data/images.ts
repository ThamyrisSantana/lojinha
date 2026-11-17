/* Product artwork. In the cloud it goes to the Supabase `imagens` bucket (in the user's folder);
   in demo mode it is shrunk and kept inline as a data URL. */
import { BUCKET, SUPABASE_URL, supabase } from './supabase';

const IMG_EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMAGE_ACCEPT = Object.keys(IMG_EXT).join(',');

/** Public address of a stored image path (or the data URL itself). */
export function imgUrl(p?: string): string {
  if (!p) return '';
  if (p.startsWith('data:')) return p;
  return `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${p.split('/').map(encodeURIComponent).join('/')}`;
}

/** Thumbnail address for a stored image. Cloud uploads keep the original (it is the print file)
 *  plus a small copy next to it, which is what the lists show. Images uploaded before thumbnails
 *  existed have none; `Avatar` then falls back to the original. */
export function thumbUrl(p?: string): string {
  if (!p || p.startsWith('data:')) return imgUrl(p);
  return imgUrl(thumbPath(p));
}

const thumbPath = (p: string) => p.replace(/\.[a-z]+$/i, '') + '.thumb.webp';

/** Longest side of the thumbnail: the largest avatar is 64 CSS px, so this stays sharp on 3x screens. */
const THUMB_SIZE = 192;

/** Draws the image so its longest side is at most `max` px. */
async function shrink(file: File, max: number): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

/** Uploads an artwork image and returns the value to store on the product. */
export async function uploadImage(file: File, userId: string | null): Promise<string> {
  if (!IMG_EXT[file.type]) throw new Error('Formato não aceito. Use PNG, JPG, WEBP ou GIF.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Imagem muito grande (máx. 10 MB).');
  if (!supabase || !userId) return (await shrink(file, 360)).toDataURL('image/jpeg', 0.85);
  const path = `${userId}/${crypto.randomUUID()}.${IMG_EXT[file.type]}`;
  const storage = supabase.storage.from(BUCKET);
  const { error } = await storage.upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
  if (error) throw new Error('Não foi possível enviar a imagem: ' + error.message);
  // The thumbnail is a nice-to-have: if it fails, the lists just load the original.
  try {
    const canvas = await shrink(file, THUMB_SIZE);
    const thumb = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.85));
    // Browsers without WEBP encoding hand back a PNG; it is stored under the same name with its real type.
    if (thumb) await storage.upload(thumbPath(path), thumb, { contentType: thumb.type, cacheControl: '31536000', upsert: false });
  } catch (err) {
    console.warn('Thumbnail not saved', err);
  }
  return path;
}
