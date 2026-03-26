import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";

import {
  getPostLoginRedirectPath,
  shouldForcePasswordReset,
} from "@/lib/auth-flows";

describe("getPostLoginRedirectPath", () => {
  it("forces first-login users into the password activation flow", () => {
    expect(
      getPostLoginRedirectPath({
        safeNextPath: "/jobs/123",
        role: Role.TECHNICIAN,
        mustChangePassword: true,
      })
    ).toBe("/reset-password?firstLogin=1");
  });

  it("uses the requested path when password activation is not required", () => {
    expect(
      getPostLoginRedirectPath({
        safeNextPath: "/jobs/123",
        role: Role.COORDINATOR,
        mustChangePassword: false,
      })
    ).toBe("/jobs/123");
  });
});

describe("shouldForcePasswordReset", () => {
  it("redirects authenticated users with temporary passwords away from protected pages", () => {
    expect(
      shouldForcePasswordReset({
        pathname: "/dispatch",
        isLoggedIn: true,
        mustChangePassword: true,
      })
    ).toBe(true);
  });

  it("allows the reset-password and logout routes during activation", () => {
    expect(
      shouldForcePasswordReset({
        pathname: "/reset-password",
        isLoggedIn: true,
        mustChangePassword: true,
      })
    ).toBe(false);

    expect(
      shouldForcePasswordReset({
        pathname: "/logout",
        isLoggedIn: true,
        mustChangePassword: true,
      })
    ).toBe(false);
  });
});
