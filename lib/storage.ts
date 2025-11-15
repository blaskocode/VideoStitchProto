import { createClient } from "@/lib/supabaseClient";

/**
 * Uploads an image from a URL to Supabase Storage.
 *
 * @param imageUrl - URL of the image to download and upload
 * @param bucket - Storage bucket name
 * @param path - Path in the bucket (e.g., "moodboards/image-id.jpg")
 * @returns Public URL of the uploaded image
 */
export async function uploadImageFromUrl(
  imageUrl: string,
  bucket: string,
  path: string
): Promise<string> {
  const supabase = createClient();

  // Download the image
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return publicUrl;
}

/**
 * Uploads a video from a URL to Supabase Storage.
 *
 * @param videoUrl - URL of the video to download and upload
 * @param bucket - Storage bucket name
 * @param path - Path in the bucket (e.g., "videos/scene-id/video-id.mp4")
 * @returns Public URL of the uploaded video
 */
export async function uploadVideoFromUrl(
  videoUrl: string,
  bucket: string,
  path: string
): Promise<string> {
  const supabase = createClient();

  // Download the video
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType: "video/mp4",
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload video: ${error.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return publicUrl;
}
