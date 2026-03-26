import { beforeEach, describe, expect, it, vi } from "vitest";

import { getJobPhotos, uploadJobPhoto } from "./storage";

const JOB_ID = "job-123";

describe("uploadJobPhoto", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uploads the file and returns its public URL", async () => {
    const file = new File(["binary"], "before.heic", { type: "image/heic" });
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ publicUrl: "https://cdn.example.com/job-photo.heic" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await uploadJobPhoto(JOB_ID, file, "before");

    expect(result).toBe("https://cdn.example.com/job-photo.heic");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/storage/upload");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
    });
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBeInstanceOf(FormData);
  });

  it("throws the upload error message when the upload request fails", async () => {
    const file = new File(["binary"], "after.png", { type: "image/png" });
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "quota exceeded" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(uploadJobPhoto(JOB_ID, file, "after")).rejects.toThrow(
      "Fotoğraf yüklenemedi: quota exceeded"
    );
  });

  it("throws when jobId is empty", async () => {
    const file = new File(["binary"], "detail.webp", { type: "image/webp" });
    await expect(uploadJobPhoto("   ", file, "detail")).rejects.toThrow(
      "jobId must not be empty."
    );
  });

  it("throws when the file has no extension", async () => {
    const file = new File(["binary"], "detail", { type: "image/webp" });
    await expect(uploadJobPhoto(JOB_ID, file, "detail")).rejects.toThrow(
      "file must include an extension."
    );
  });

  it("throws when photoType is invalid", async () => {
    const file = new File(["binary"], "detail.webp", { type: "image/webp" });
    await expect(
      uploadJobPhoto(JOB_ID, file, "unexpected" as unknown as "before" | "after" | "detail")
    ).rejects.toThrow("photoType must be one of: before, after, detail.");
  });
});

describe("getJobPhotos", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns all photo URLs for a job", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          urls: [
            "https://cdn.example.com/job-123/before-1.jpg",
            "https://cdn.example.com/job-123/after-1.jpg",
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const result = await getJobPhotos(JOB_ID);

    expect(result).toEqual([
      "https://cdn.example.com/job-123/before-1.jpg",
      "https://cdn.example.com/job-123/after-1.jpg",
    ]);
  });

  it("returns an empty array when the list request fails", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 500 }));
    const result = await getJobPhotos(JOB_ID);
    expect(result).toEqual([]);
  });

  it("returns an empty array when the payload is empty", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const result = await getJobPhotos(JOB_ID);
    expect(result).toEqual([]);
  });

  it("throws when jobId is whitespace only", async () => {
    await expect(getJobPhotos("\n\t ")).rejects.toThrow("jobId must not be empty.");
  });
});
