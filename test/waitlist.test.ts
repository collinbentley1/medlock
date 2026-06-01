import { describe, expect, test } from "bun:test";
import { FirestoreWaitlistStore, MemoryWaitlistStore, normalizeEmail, submitWaitlist, type FetchLike } from "../src/waitlist.ts";

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

  test("can write waitlist entries through Firestore REST", async () => {
    const requestedUrls: string[] = [];
    const fetcher: FetchLike = async (input, init) => {
      const url = String(input);
      requestedUrls.push(url);

      if (url.includes("metadata.google.internal")) {
        return Response.json({ access_token: "token", expires_in: 3600 });
      }

      if (init?.method === "POST") {
        expect(init.headers).toMatchObject({ Authorization: "Bearer token" });
        return Response.json({ name: "stored" });
      }

      return Response.json({ error: { status: "NOT_FOUND" } }, { status: 404 });
    };
    const store = new FirestoreWaitlistStore({
      collection: "waitlist_preview_12",
      databaseId: "(default)",
      fetcher,
      projectId: "medlock-1025243085",
    });

    const result = await submitWaitlist(
      store,
      {
        email: "firestore@example.com",
        ipAddress: "203.0.113.55",
      },
      new Date("2026-06-01T12:00:00.000Z"),
    );

    expect(result.ok).toBe(true);
    expect(requestedUrls.some((url) => url.includes("/projects/medlock-1025243085/databases/(default)/documents/waitlist_preview_12"))).toBe(
      true,
    );
  });
});
