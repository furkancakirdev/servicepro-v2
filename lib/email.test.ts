import { describe, expect, it } from "vitest";

import { normalizeEmailAddress } from "@/lib/email";

describe("normalizeEmailAddress", () => {
  it("normalizes Turkish characters for login-safe email matching", () => {
    expect(normalizeEmailAddress(" ibrahimyayalık@marlin.com.tr ")).toBe(
      "ibrahimyayalik@marlin.com.tr"
    );
  });

  it("keeps already-ascii emails stable", () => {
    expect(normalizeEmailAddress("admin@marlin.com")).toBe("admin@marlin.com");
  });
});
