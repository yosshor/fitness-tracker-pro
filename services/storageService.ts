
/**
 * Image storage via Cloudinary (free tier, no credit card required).
 *
 * Setup:
 *  1. Create a free account at https://cloudinary.com
 *  2. Go to Settings → Upload → Add upload preset → set to "Unsigned"
 *  3. Copy the Cloud Name and Upload Preset into the app Settings → API Keys
 */

export interface UploadResult {
  url: string;
  publicId: string;
  thumbnailUrl: string;
}

export async function uploadImage(
  file: File | Blob,
  cloudName: string,
  uploadPreset: string,
  folder: string = 'progress'
): Promise<UploadResult> {
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary not configured. Add Cloud Name and Upload Preset in Settings → API Keys.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Upload failed (${response.status})`);
  }

  const data = await response.json();
  return {
    url: data.secure_url,
    publicId: data.public_id,
    thumbnailUrl: data.secure_url.replace('/upload/', '/upload/w_400,h_400,c_fill,q_auto/'),
  };
}

// Cloudinary free tier doesn't support delete via unsigned API,
// so we just remove the reference from Firestore. The image remains in Cloudinary.
export async function deleteImage(_publicId: string): Promise<void> {
  // No-op for unsigned uploads. Images can be cleaned up from Cloudinary dashboard.
}
