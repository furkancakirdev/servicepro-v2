import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMocks = vi.hoisted(() => {
  const upload = vi.fn();
  const list = vi.fn();
  const getPublicUrl = vi.fn();
  const from = vi.fn(() => ({
    upload,
    list,
    getPublicUrl,
  }));
  const createClient = vi.fn(() => ({
    storage: {
      from,
    },
  }));

  return {
    upload,
    list,
    getPublicUrl,
    from,
    createClient,
  };
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: storageMocks.createClient,
}));

import { getJobPhotos, uploadJobPhoto } from "./storage";

const FIXED_DATE = new Date(2026, 2, 21, 10, 15, 30);
const FIXED_TIMESTAMP = FIXED_DATE.getTime();
const JOB_ID = "iş-123";

describe("uploadJobPhoto", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_DATE);
    storageMocks.upload.mockReset();
    storageMocks.list.mockReset();
    storageMocks.getPublicUrl.mockReset();
    storageMocks.from.mockClear();
    storageMocks.createClient.mockClear();
  });

  it("uploads the file and returns its public URL", async () => {
    // Arrange
    const file = new File(["binary"], "önce.heic", { type: "image/heic" });
    storageMocks.upload.mockResolvedValue({
      data: { path: `${JOB_ID}/before-${FIXED_TIMESTAMP}.heic` },
      error: null,
    });
    storageMocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://cdn.example.com/job-photo.heic" },
    });

    // Act
    const result = await uploadJobPhoto(JOB_ID, file, "before");

    // Assert
    expect(result).toBe("https://cdn.example.com/job-photo.heic");
    expect(storageMocks.createClient).toHaveBeenCalledTimes(1);
    expect(storageMocks.from).toHaveBeenCalledWith("job-photos");
    expect(storageMocks.upload).toHaveBeenCalledWith(
      `${JOB_ID}/before-${FIXED_TIMESTAMP}.heic`,
      file,
      {
        cacheControl: "3600",
        upsert: false,
      }
    );
    expect(storageMocks.getPublicUrl).toHaveBeenCalledWith(
      `${JOB_ID}/before-${FIXED_TIMESTAMP}.heic`
    );
  });

  it("throws the upload error message when Supabase upload fails", async () => {
    // Arrange
    const file = new File(["binary"], "sonra.png", { type: "image/png" });
    storageMocks.upload.mockResolvedValue({
      data: { path: `${JOB_ID}/after-${FIXED_TIMESTAMP}.png` },
      error: { message: "quota exceeded" },
    });

    // Act
    const execution = uploadJobPhoto(JOB_ID, file, "after");

    // Assert
    await expect(execution).rejects.toThrow("Fotoğraf yüklenemedi: quota exceeded");
  });

  it("throws when jobId is empty", async () => {
    // Arrange
    const file = new File(["binary"], "detay.webp", { type: "image/webp" });

    // Act
    const execution = uploadJobPhoto("   ", file, "detail");

    // Assert
    await expect(execution).rejects.toThrow("jobId must not be empty.");
  });

  it("throws when the file has no extension", async () => {
    // Arrange
    const file = new File(["binary"], "detay", { type: "image/webp" });

    // Act
    const execution = uploadJobPhoto(JOB_ID, file, "detail");

    // Assert
    await expect(execution).rejects.toThrow("file must include an extension.");
  });

  it("throws when photoType is not one of the supported variants", async () => {
    // Arrange
    const file = new File(["binary"], "detay.webp", { type: "image/webp" });

    // Act
    const execution = uploadJobPhoto(
      JOB_ID,
      file,
      "unexpected" as unknown as "before" | "after" | "detail"
    );

    // Assert
    await expect(execution).rejects.toThrow(
      "photoType must be one of: before, after, detail."
    );
  });
});

describe("getJobPhotos", () => {
  beforeEach(() => {
    storageMocks.upload.mockReset();
    storageMocks.list.mockReset();
    storageMocks.getPublicUrl.mockReset();
    storageMocks.from.mockClear();
    storageMocks.createClient.mockClear();
  });

  it("returns all photo URLs for a job", async () => {
    // Arrange
    storageMocks.list.mockResolvedValue({
      data: [{ name: "before-1.jpg" }, { name: "after-1.jpg" }],
      error: null,
    });
    storageMocks.getPublicUrl.mockImplementation((path: string) => ({
      data: { publicUrl: `https://cdn.example.com/${path}` },
    }));

    // Act
    const result = await getJobPhotos(JOB_ID);

    // Assert
    expect(result).toEqual([
      `https://cdn.example.com/${JOB_ID}/before-1.jpg`,
      `https://cdn.example.com/${JOB_ID}/after-1.jpg`,
    ]);
    expect(storageMocks.list).toHaveBeenCalledWith(JOB_ID);
    expect(storageMocks.getPublicUrl).toHaveBeenNthCalledWith(1, `${JOB_ID}/before-1.jpg`);
    expect(storageMocks.getPublicUrl).toHaveBeenNthCalledWith(2, `${JOB_ID}/after-1.jpg`);
  });

  it("returns an empty array when the list request fails", async () => {
    // Arrange
    storageMocks.list.mockResolvedValue({
      data: null,
      error: { message: "forbidden" },
    });

    // Act
    const result = await getJobPhotos(JOB_ID);

    // Assert
    expect(result).toEqual([]);
  });

  it("returns an empty array when Supabase returns no files", async () => {
    // Arrange
    storageMocks.list.mockResolvedValue({
      data: null,
      error: null,
    });

    // Act
    const result = await getJobPhotos(JOB_ID);

    // Assert
    expect(result).toEqual([]);
  });

  it("throws when jobId is whitespace only", async () => {
    // Arrange
    const invalidJobId = "\n\t " as string;

    // Act
    const execution = getJobPhotos(invalidJobId);

    // Assert
    await expect(execution).rejects.toThrow("jobId must not be empty.");
  });
});
