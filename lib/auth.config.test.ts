import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import type { Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";

import { applyTokenToSession, applyUserToToken } from "@/lib/auth.config";

describe("applyUserToToken", () => {
  it("copies custom auth claims into the JWT for middleware access", () => {
    const token = applyUserToToken({} as JWT, {
      id: "user_123",
      email: "admin@marlin.com",
      name: "Marlin Admin",
      role: Role.ADMIN,
      avatarUrl: "/avatar.png",
      mustChangePassword: true,
    } satisfies User);

    expect(token).toMatchObject({
      id: "user_123",
      email: "admin@marlin.com",
      name: "Marlin Admin",
      role: Role.ADMIN,
      avatarUrl: "/avatar.png",
      mustChangePassword: true,
    });
  });
});

describe("applyTokenToSession", () => {
  it("hydrates the session user with role-based access claims", () => {
    const session = applyTokenToSession(
      {
        expires: "2099-01-01T00:00:00.000Z",
        user: {
          email: "admin@marlin.com",
          name: "Marlin Admin",
        },
      } as Session,
      {
        id: "user_123",
        role: Role.ADMIN,
        avatarUrl: "/avatar.png",
        mustChangePassword: false,
      } as JWT
    );

    expect(session.user).toMatchObject({
      id: "user_123",
      role: Role.ADMIN,
      avatarUrl: "/avatar.png",
      mustChangePassword: false,
    });
  });
});
