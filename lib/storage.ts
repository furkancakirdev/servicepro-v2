"use client";

import { createClient } from "@/lib/supabase/client";

function assertJobId(jobId: unknown) {
  if (typeof jobId !== "string") {
    throw new TypeError("jobId must be a string.");
  }

  if (jobId.trim().length === 0) {
    throw new RangeError("jobId must not be empty.");
  }
}

function assertFile(file: unknown) {
  if (!(file instanceof File)) {
    throw new TypeError("file must be a File instance.");
  }

  if (!file.name.includes(".")) {
    throw new RangeError("file must include an extension.");
  }
}

function assertPhotoType(photoType: unknown) {
  if (photoType !== "before" && photoType !== "after" && photoType !== "detail") {
    throw new TypeError("photoType must be one of: before, after, detail.");
  }
}

export async function uploadJobPhoto(
  jobId: string,
  file: File,
  photoType: "before" | "after" | "detail"
): Promise<string> {
  assertJobId(jobId);
  assertFile(file);
  assertPhotoType(photoType);

  const supabase = createClient();
  const ext = file.name.split(".").pop();
  const fileName = `${jobId}/${photoType}-${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage.from("job-photos").upload(fileName, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(`Fotoğraf yüklenemedi: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("job-photos").getPublicUrl(data.path);

  return publicUrl;
}

export async function getJobPhotos(jobId: string): Promise<string[]> {
  assertJobId(jobId);

  const supabase = createClient();
  const { data, error } = await supabase.storage.from("job-photos").list(jobId);

  if (error || !data) {
    return [];
  }

  return data.map((file) => {
    const {
      data: { publicUrl },
    } = supabase.storage.from("job-photos").getPublicUrl(`${jobId}/${file.name}`);
    return publicUrl;
  });
}
