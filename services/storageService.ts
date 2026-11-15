import { supabase } from './supabase';

export interface UploadResult {
  url: string;
  publicId: string;
  thumbnailUrl: string;
}

export async function uploadImage(
  file: File | Blob,
  userId: string,
  folder: string = 'progress'
): Promise<UploadResult> {
  const ext = file instanceof File ? file.name.split('.').pop() || 'jpg' : 'jpg';
  const filePath = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('photos')
    .upload(filePath, file, { contentType: file.type || 'image/jpeg' });

  if (error) throw new Error(error.message || 'Upload failed');

  const url = await signPhotoUrl(filePath);
  return { url, publicId: filePath, thumbnailUrl: url };
}

const SIGNED_URL_TTL = 60 * 60 * 24; // 24h; URLs are re-signed on every load

// Accepts a storage path or an old public/signed Supabase URL and returns a fresh signed URL.
// Non-Supabase URLs (e.g. Google avatars) are returned unchanged.
export async function signPhotoUrl(pathOrUrl?: string | null): Promise<string> {
  if (!pathOrUrl) return '';
  let path = pathOrUrl;
  if (/^https?:/.test(pathOrUrl)) {
    const m = pathOrUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/photos\/([^?]+)/);
    if (!m) return pathOrUrl;
    path = decodeURIComponent(m[1]);
  }
  const { data, error } = await supabase.storage.from('photos').createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data) {
    console.error('Failed to sign photo URL:', error);
    return '';
  }
  return data.signedUrl;
}

export async function deleteImage(storagePath: string): Promise<void> {
  if (!storagePath) return;
  const { error } = await supabase.storage.from('photos').remove([storagePath]);
  if (error) console.error('Failed to delete image:', error);
}
