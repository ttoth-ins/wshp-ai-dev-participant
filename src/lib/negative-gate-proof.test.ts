import { describe, expect, it } from "vitest";

// Intentional negative fixture (Module 5 gate proof) — proves the CI +
// branch-protection gate actually blocks a failing change, not just passes
// green ones. Never merged; the throwaway branch/PR is deleted after the
// evidence is captured.
describe("negative gate proof", () => {
  it("deliberately fails", () => {
    expect(true).toBe(false);
  });
});
