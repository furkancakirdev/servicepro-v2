"use client";

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

  const formData = new FormData();
  formData.append("jobId", jobId);
  formData.append("photoType", photoType);
  formData.append("file", file);

  const response = await fetch("/api/storage/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "Fotoğraf yüklenemedi.";

    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        message = `Fotoğraf yüklenemedi: ${payload.error}`;
      }
    } catch {
      // ignore malformed error payloads
    }

    throw new Error(message);
  }

  const payload = (await response.json()) as { publicUrl: string };
  return payload.publicUrl;
}

export async function getJobPhotos(jobId: string): Promise<string[]> {
  assertJobId(jobId);

  const response = await fetch(`/api/storage/list?jobId=${encodeURIComponent(jobId)}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { urls?: string[] };
  return payload.urls ?? [];
}
