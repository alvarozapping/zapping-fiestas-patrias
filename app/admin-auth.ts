import { getChatGPTUser } from "./chatgpt-auth";
import { ensureSchema, runtimeEnv } from "../db/mural";

export type AdminRole = "owner" | "operator";
export type AdminIdentity = { email: string; displayName: string; role: AdminRole };

function ownerEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isOwnerEmail(email: string): boolean {
  return process.env.NODE_ENV === "development" || ownerEmails().includes(email.toLowerCase());
}

async function identityForEmail(email: string, displayName: string): Promise<AdminIdentity | null> {
  if (isOwnerEmail(email)) return { email, displayName, role: "owner" };
  await ensureSchema();
  const operator = await runtimeEnv().DB.prepare(
    "SELECT email FROM event_operators WHERE email = ? AND role = 'operator'"
  ).bind(email.toLowerCase()).first<{ email: string }>();
  return operator ? { email, displayName, role: "operator" } : null;
}

export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const user = await getChatGPTUser();
  if (user) return identityForEmail(user.email, user.displayName);
  if (process.env.NODE_ENV === "development") {
    return { email: "admin@mural.local", displayName: "Equipo Mural Vivo", role: "owner" };
  }
  return null;
}

export async function getAdminFromRequest(request: Request): Promise<AdminIdentity | null> {
  const email = request.headers.get("oai-authenticated-user-email");
  if (email) {
    const encoded = request.headers.get("oai-authenticated-user-full-name");
    const canDecode = request.headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8";
    let displayName = email;
    if (encoded && canDecode) {
      try { displayName = decodeURIComponent(encoded); } catch { displayName = email; }
    }
    return identityForEmail(email, displayName);
  }
  if (process.env.NODE_ENV === "development") {
    return { email: "admin@mural.local", displayName: "Equipo Mural Vivo", role: "owner" };
  }
  return null;
}
