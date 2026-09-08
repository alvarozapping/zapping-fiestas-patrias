import { env } from "cloudflare:workers";

export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface SubmissionRecord {
  id: string;
  name: string;
  email: string;
  message: string;
  object_key: string;
  original_name: string;
  mime_type: string;
  width: number;
  height: number;
  status: SubmissionStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface DisplaySettings {
  durationSeconds: number;
  fadeSeconds: number;
  backgrounds: string[];
}

export const DEFAULT_BACKGROUNDS = ["#e90068", "#0039a6", "#d52b1e"];

type RuntimeEnv = { DB: D1Database; MEDIA: R2Bucket };

export function runtimeEnv() {
  return env as unknown as RuntimeEnv;
}

let initialized = false;

export async function ensureSchema() {
  if (initialized) return;
  const { DB } = runtimeEnv();
  await DB.batch([
    DB.prepare(`CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL DEFAULT '',
      object_key TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      width INTEGER NOT NULL DEFAULT 0,
      height INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TEXT,
      reviewed_by TEXT
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS display_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      duration_seconds INTEGER NOT NULL DEFAULT 7,
      fade_seconds REAL NOT NULL DEFAULT 2,
      backgrounds_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS event_operators (
      email TEXT PRIMARY KEY,
      role TEXT NOT NULL DEFAULT 'operator' CHECK (role = 'operator'),
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_submissions_status_created ON submissions(status, created_at DESC)"),
  ]);
  const { results: settingColumns } = await DB.prepare("PRAGMA table_info(display_settings)").all<{ name: string }>();
  if (!settingColumns.some((column) => column.name === "fade_seconds")) {
    await DB.prepare("ALTER TABLE display_settings ADD COLUMN fade_seconds REAL NOT NULL DEFAULT 2").run();
  }
  await DB.prepare(
    "INSERT OR IGNORE INTO display_settings (id, duration_seconds, fade_seconds, backgrounds_json) VALUES (1, ?, ?, ?)"
  ).bind(7, 2, JSON.stringify(DEFAULT_BACKGROUNDS)).run();
  initialized = true;
}

export async function readSettings(): Promise<DisplaySettings> {
  await ensureSchema();
  const row = await runtimeEnv().DB.prepare(
    "SELECT duration_seconds, fade_seconds, backgrounds_json FROM display_settings WHERE id = 1"
  ).first<{ duration_seconds: number; fade_seconds: number; backgrounds_json: string }>();
  let backgrounds = DEFAULT_BACKGROUNDS;
  try {
    const parsed = JSON.parse(row?.backgrounds_json ?? "[]");
    if (Array.isArray(parsed) && parsed.length) backgrounds = parsed.slice(0, 3);
    if (JSON.stringify(backgrounds) === JSON.stringify(["#2859ff", "#ff6b35", "#171813"])) {
      backgrounds = DEFAULT_BACKGROUNDS;
    }
  } catch {
    backgrounds = DEFAULT_BACKGROUNDS;
  }
  return { durationSeconds: row?.duration_seconds ?? 7, fadeSeconds: row?.fade_seconds ?? 2, backgrounds };
}

export function publicSubmission(row: SubmissionRecord, includePrivate = false) {
  return {
    id: row.id,
    name: row.name,
    ...(includePrivate ? { email: row.email } : {}),
    message: row.message,
    width: row.width,
    height: row.height,
    status: row.status,
    createdAt: row.created_at,
    imageUrl: `/api/media?id=${encodeURIComponent(row.id)}`,
  };
}
