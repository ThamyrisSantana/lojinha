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

/** Resizes an image so its longest side is at most `max` px and returns a JPEG data URL. */
async function shrink(file: File, max: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}

/** Uploads an artwork image and returns the value to store on the product. */
export async function uploadImage(file: File, userId: string | null): Promise<string> {
  if (!IMG_EXT[file.type]) throw new Error('Formato não aceito. Use PNG, JPG, WEBP ou GIF.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Imagem muito grande (máx. 10 MB).');
  if (!supabase || !userId) return shrink(file, 360);
  const path = `${userId}/${crypto.randomUUID()}.${IMG_EXT[file.type]}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
  if (error) throw new Error('Não foi possível enviar a imagem: ' + error.message);
  return path;
}
