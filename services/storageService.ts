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

  const { data: { publicUrl } } = supabase.storage
    .from('photos')
    .getPublicUrl(filePath);

  return {
    url: publicUrl,
    publicId: filePath,
    thumbnailUrl: publicUrl,
  };
}

export async function deleteImage(storagePath: string): Promise<void> {
  if (!storagePath) return;
  const { error } = await supabase.storage.from('photos').remove([storagePath]);
  if (error) console.error('Failed to delete image:', error);
}
