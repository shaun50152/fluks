import { supabase } from '@/lib/supabase';
import { validateMediaFile } from '@/lib/validator';
import type { PostType } from '@/types/domain';

export type UploadBucket = 'post-media' | 'recipe-media' | 'avatars';

interface MediaFile {
  uri: string;
  name: string;
  type: string;
  size: number;
}

/**
 * Validates file size, uploads to Supabase Storage, and returns the public URL.
 * Requirements: 11.2, 11.3, 11.4
 */
export async function uploadMedia(
  file: MediaFile,
  bucket: UploadBucket,
  postType: PostType
): Promise<string> {
  // Validate size before upload (req 11.3, 11.4)
  validateMediaFile({ size: file.size }, postType);

  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

  const response = await fetch(file.uri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: file.type, upsert: false });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Removes a file from Supabase Storage by its public URL.
 */
export async function deleteMedia(publicUrl: string, bucket: UploadBucket): Promise<void> {
  const url = new URL(publicUrl);
  const pathParts = url.pathname.split(`/storage/v1/object/public/${bucket}/`);
  const filePath = pathParts[1];
  if (!filePath) return;

  const { error } = await supabase.storage.from(bucket).remove([filePath]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}
