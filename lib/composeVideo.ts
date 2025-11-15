import ffmpeg from "fluent-ffmpeg";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { createClient } from "@/lib/supabaseClient";
import { getMusicTrackById } from "@/lib/music";
import type { Scene } from "@/types/domain";

/**
 * Downloads a file from a URL to a temporary file
 */
async function downloadToTemp(url: string, extension: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `temp-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`);

  await fs.writeFile(tempFile, buffer);
  return tempFile;
}

/**
 * Uploads a video file to Supabase Storage
 */
async function uploadVideoFile(
  filePath: string,
  bucket: string,
  storagePath: string
): Promise<string> {
  const supabase = createClient();
  const fileBuffer = await fs.readFile(filePath);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, fileBuffer, {
      contentType: "video/mp4",
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload video: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(storagePath);

  return publicUrl;
}

/**
 * Composes a final video from scene clips and music
 *
 * @param projectId - The project ID
 * @param scenes - Array of scenes with videoUrl
 * @param musicTrackId - The selected music track ID
 * @returns Public URL of the final composed video
 */
export async function composeProjectVideo(
  projectId: string,
  scenes: Scene[],
  musicTrackId: string
): Promise<string> {
  // Validate inputs
  if (!scenes || scenes.length === 0) {
    throw new Error("No scenes provided");
  }

  const scenesWithVideos = scenes.filter((scene) => scene.videoUrl);
  if (scenesWithVideos.length === 0) {
    throw new Error("No scenes have video URLs");
  }

  const musicTrack = getMusicTrackById(musicTrackId);
  if (!musicTrack) {
    throw new Error(`Music track not found: ${musicTrackId}`);
  }

  const tempDir = os.tmpdir();
  const tempFiles: string[] = [];

  try {
    // Download all video clips to temp files
    const videoFiles: string[] = [];
    for (const scene of scenesWithVideos) {
      if (!scene.videoUrl) continue;
      const videoFile = await downloadToTemp(scene.videoUrl, "mp4");
      tempFiles.push(videoFile);
      videoFiles.push(videoFile);
    }

    // Download music track
    const musicFile = await downloadToTemp(musicTrack.url, "mp3");
    tempFiles.push(musicFile);

    // Create output file path
    const outputFile = path.join(
      tempDir,
      `final-${projectId}-${Date.now()}.mp4`
    );
    tempFiles.push(outputFile);

    // Build FFmpeg command
    return new Promise((resolve, reject) => {
      let command = ffmpeg();

      // Add all video inputs
      videoFiles.forEach((file) => {
        command = command.input(file);
      });

      // Add music input
      command = command.input(musicFile);

      // Build filter complex for concatenation
      // For MVP, we'll use simple concatenation (can add crossfades later)
      const filterComplex: string[] = [];

      // Scale and normalize all videos to 1080p, 30fps
      videoFiles.forEach((_, index) => {
        filterComplex.push(
          `[${index}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v${index}]`
        );
      });

      // Concatenate video streams
      const concatInputs = videoFiles
        .map((_, index) => `[v${index}]`)
        .join("");
      filterComplex.push(
        `${concatInputs}concat=n=${videoFiles.length}:v=1:a=0[outv]`
      );

      command
        .complexFilter(filterComplex)
        .outputOptions([
          "-map [outv]",
          `-map ${videoFiles.length}:a`, // Map music audio (last input)
          "-c:v libx264",
          "-preset medium",
          "-crf 23",
          "-c:a aac",
          "-b:a 192k",
          "-shortest", // End with video length
          "-movflags +faststart", // Web optimization
        ])
        .output(outputFile)
        .on("start", (commandLine) => {
          console.log("FFmpeg command:", commandLine);
        })
        .on("progress", (progress) => {
          console.log("Processing:", progress.percent, "%");
        })
        .on("end", async () => {
          try {
            // Upload final video to Supabase Storage
            const storagePath = `final/${projectId}/final-${Date.now()}.mp4`;
            const publicUrl = await uploadVideoFile(
              outputFile,
              "videos",
              storagePath
            );

            // Clean up temp files after successful upload
            for (const file of tempFiles) {
              try {
                await fs.unlink(file);
              } catch (error) {
                console.warn(`Failed to delete temp file ${file}:`, error);
              }
            }

            resolve(publicUrl);
          } catch (error) {
            // Clean up temp files even on upload error
            for (const file of tempFiles) {
              try {
                await fs.unlink(file);
              } catch (cleanupError) {
                console.warn(`Failed to delete temp file ${file}:`, cleanupError);
              }
            }
            reject(error);
          }
        })
        .on("error", (error) => {
          console.error("FFmpeg error:", error);
          
          // Clean up temp files on FFmpeg error
          Promise.all(
            tempFiles.map((file) => 
              fs.unlink(file).catch((err) => 
                console.warn(`Failed to delete temp file ${file}:`, err)
              )
            )
          ).finally(() => {
            reject(new Error(`Video composition failed: ${error.message}`));
          });
        })
        .run();
    });
  } catch (error) {
    // Clean up temp files if download fails
    for (const file of tempFiles) {
      try {
        await fs.unlink(file);
      } catch (cleanupError) {
        console.warn(`Failed to delete temp file ${file}:`, cleanupError);
      }
    }
    throw error;
  }
}

