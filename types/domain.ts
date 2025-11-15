/**
 * Domain types matching the database schema
 */

export type ProjectStatus = "inspire" | "story" | "rendering" | "complete" | "error";

export interface MoodboardImage {
  id: string;
  url: string;
}

export interface Moodboard {
  id: string;
  images: MoodboardImage[];
  label?: string;
}

export interface Scene {
  id: string;
  title?: string;
  blurb: string;
  imageUrl?: string;
  videoUrl?: string;
  videoJobId?: string;
}

export interface Project {
  id: string;
  sessionToken: string;
  productPrompt: string;
  moodPrompt?: string;
  moodboards?: Moodboard[];
  likedMoodboards?: string[];
  storylineOption?: string;
  scenes?: Scene[];
  status: ProjectStatus;
  finalVideoUrl?: string;
  musicTrackId?: string;
  totalCost?: number;
  totalGenerationMs?: number;
  createdAt: string;
  updatedAt: string;
}

export type JobType = "image-gen" | "video-gen" | "compose";
export type JobStatus = "queued" | "running" | "success" | "error";

export interface Job {
  id: string;
  projectId: string;
  type: JobType;
  status: JobStatus;
  replicateRunId?: string;
  outputUrls?: string[];
  cost?: number;
  durationMs?: number;
  errorMessage?: string;
  retries?: number;
  createdAt: string;
  updatedAt: string;
}

