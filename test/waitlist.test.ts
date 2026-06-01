import { describe, expect, test } from "bun:test";
import { MemoryWaitlistStore, normalizeEmail, submitWaitlist } from "../src/waitlist.ts";

describe("waitlist", () => {
  test("normalizes and stores a valid email once", async () => {
    const store = new MemoryWaitlistStore();
    const first = await submitWaitlist(
      store,
      {
        email: "  Person@Example.COM ",
        ipAddress: "203.0.113.10",
        source: "test",
        userAgent: "bun-test",
      },
      new Date("2026-06-01T12:00:00.000Z"),
    );
    const duplicate = await submitWaitlist(store, {
      email: "person@example.com",
      ipAddress: "203.0.113.10",
    });

    expect(first.ok).toBe(true);
    expect(duplicate.ok).toBe(true);
    if (first.ok && duplicate.ok) {
      expect(first.duplicate).toBe(false);
      expect(duplicate.duplicate).toBe(true);
      expect(first.entry.email).toBe("person@example.com");
    }
  });

  test("rejects invalid emails", async () => {
    const result = await submitWaitlist(new MemoryWaitlistStore(), {
      email: "not-email",
      ipAddress: "203.0.113.10",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
    }
  });

  test("normalizes email casing consistently", () => {
    expect(normalizeEmail(" Collin@Example.Com ")).toBe("collin@example.com");
  });
});
