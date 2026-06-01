import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type WaitlistEntry = {
  readonly createdAt: string;
  readonly email: string;
  readonly emailHash: string;
  readonly ipHash: string;
  readonly source: string;
  readonly userAgentHash: string;
};

export type WaitlistStore = {
  get(emailHash: string): Promise<WaitlistEntry | undefined>;
  put(entry: WaitlistEntry): Promise<void>;
};

export type WaitlistSubmission = {
  readonly email: string;
  readonly ipAddress: string;
  readonly source?: string | undefined;
  readonly userAgent?: string | undefined;
};

export type WaitlistResult =
  | { readonly ok: true; readonly duplicate: boolean; readonly entry: WaitlistEntry }
  | { readonly ok: false; readonly error: string; readonly status: number };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitWaitlist(store: WaitlistStore, submission: WaitlistSubmission, now = new Date()): Promise<WaitlistResult> {
  const email = normalizeEmail(submission.email);

  if (!isValidEmail(email)) {
    return { ok: false, error: "Enter a valid email address.", status: 400 };
  }

  const emailHash = sha256(email);
  const existing = await store.get(emailHash);
  if (existing) {
    return { ok: true, duplicate: true, entry: existing };
  }

  const entry: WaitlistEntry = {
    createdAt: now.toISOString(),
    email,
    emailHash,
    ipHash: sha256(submission.ipAddress || "unknown"),
    source: sanitizeSource(submission.source),
    userAgentHash: sha256(submission.userAgent || "unknown"),
  };

  await store.put(entry);
  return { ok: true, duplicate: false, entry };
}

export class MemoryWaitlistStore implements WaitlistStore {
  readonly #entries = new Map<string, WaitlistEntry>();

  async get(emailHash: string): Promise<WaitlistEntry | undefined> {
    return this.#entries.get(emailHash);
  }

  async put(entry: WaitlistEntry): Promise<void> {
    this.#entries.set(entry.emailHash, entry);
  }
}

export class FileWaitlistStore implements WaitlistStore {
  readonly #directory: string;

  constructor(directory: string) {
    this.#directory = directory;
  }

  async get(emailHash: string): Promise<WaitlistEntry | undefined> {
    const filePath = this.#filePath(emailHash);
    try {
      return JSON.parse(await readFile(filePath, "utf8")) as WaitlistEntry;
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        return undefined;
      }

      throw error;
    }
  }

  async put(entry: WaitlistEntry): Promise<void> {
    const filePath = this.#filePath(entry.emailHash);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(entry, null, 2)}\n`, { flag: "wx" });
  }

  #filePath(emailHash: string): string {
    return join(this.#directory, "waitlist", `${emailHash}.json`);
  }
}

export class GcsWaitlistStore implements WaitlistStore {
  readonly #bucket: string;
  readonly #fetch: typeof fetch;
  #token: { readonly accessToken: string; readonly expiresAt: number } | undefined;

  constructor(bucket: string, fetcher: typeof fetch = fetch) {
    this.#bucket = bucket;
    this.#fetch = fetcher;
  }

  async get(emailHash: string): Promise<WaitlistEntry | undefined> {
    const response = await this.#fetch(this.#objectUrl(emailHash, true), {
      headers: await this.#headers(),
    });

    if (response.status === 404) {
      return undefined;
    }

    if (!response.ok) {
      throw new Error(`GCS waitlist read failed: ${response.status}`);
    }

    return (await response.json()) as WaitlistEntry;
  }

  async put(entry: WaitlistEntry): Promise<void> {
    const response = await this.#fetch(this.#uploadUrl(entry.emailHash), {
      body: `${JSON.stringify(entry, null, 2)}\n`,
      headers: {
        ...(await this.#headers()),
        "Content-Type": "application/json; charset=utf-8",
      },
      method: "POST",
    });

    if (response.status === 409) {
      return;
    }

    if (!response.ok) {
      throw new Error(`GCS waitlist write failed: ${response.status}`);
    }
  }

  async #headers(): Promise<Record<string, string>> {
    const accessToken = await this.#accessToken();
    return { Authorization: `Bearer ${accessToken}` };
  }

  async #accessToken(): Promise<string> {
    const now = Date.now();
    if (this.#token && this.#token.expiresAt > now + 60_000) {
      return this.#token.accessToken;
    }

    const response = await this.#fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", {
      headers: { "Metadata-Flavor": "Google" },
    });

    if (!response.ok) {
      throw new Error(`metadata token request failed: ${response.status}`);
    }

    const token = (await response.json()) as { access_token: string; expires_in: number };
    this.#token = {
      accessToken: token.access_token,
      expiresAt: now + token.expires_in * 1000,
    };
    return token.access_token;
  }

  #objectUrl(emailHash: string, media: boolean): string {
    const name = encodeURIComponent(this.#objectName(emailHash));
    const alt = media ? "?alt=media" : "";
    return `https://storage.googleapis.com/storage/v1/b/${this.#bucket}/o/${name}${alt}`;
  }

  #uploadUrl(emailHash: string): string {
    const name = encodeURIComponent(this.#objectName(emailHash));
    return `https://storage.googleapis.com/upload/storage/v1/b/${this.#bucket}/o?uploadType=media&ifGenerationMatch=0&name=${name}`;
  }

  #objectName(emailHash: string): string {
    return `waitlist/${emailHash}.json`;
  }
}

export function createWaitlistStore(dataDir: string, waitlistBucket?: string): WaitlistStore {
  if (waitlistBucket) {
    return new GcsWaitlistStore(waitlistBucket);
  }

  return new FileWaitlistStore(dataDir);
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return email.length >= 3 && email.length <= 254 && EMAIL_PATTERN.test(email);
}

function sanitizeSource(value: string | undefined): string {
  const source = value?.trim() || "site";
  return source.replace(/[^a-zA-Z0-9_.:-]/g, "").slice(0, 60) || "site";
}
