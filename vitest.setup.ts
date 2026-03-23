import { afterEach, vi } from "vitest";

afterEach(() => {
  // Keep timer state isolated between suites.
  vi.useRealTimers();
});
