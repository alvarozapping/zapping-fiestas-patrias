import { getAdminFromRequest, isOwnerEmail } from "../../../admin-auth";
import { ensureSchema, runtimeEnv } from "../../../../db/mural";

type OperatorRow = { email: string; role: "operator"; created_by: string; created_at: string };

async function requireOwner(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return { error: Response.json({ error: "No autorizado" }, { status: 401 }) };
  if (admin.role !== "owner") return { error: Response.json({ error: "Solo el administrador puede gestionar operadores." }, { status: 403 }) };
  return { admin };
}

export async function GET(request: Request) {
  const access = await requireOwner(request);
  if ("error" in access) return access.error;
  await ensureSchema();
  const { results } = await runtimeEnv().DB.prepare(
    "SELECT email, role, created_by, created_at FROM event_operators ORDER BY created_at DESC"
  ).all<OperatorRow>();
  return Response.json({ operators: results.map((row) => ({ email: row.email, role: row.role, createdBy: row.created_by, createdAt: row.created_at })) });
}

export async function POST(request: Request) {
  const access = await requireOwner(request);
  if ("error" in access) return access.error;
  const payload = await request.json() as { email?: string };
  const email = String(payload.email ?? "").trim().toLowerCase().slice(0, 160);
  if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Escribe un correo institucional válido." }, { status: 400 });
  if (isOwnerEmail(email)) return Response.json({ error: "Ese correo ya pertenece al administrador principal." }, { status: 400 });
  await ensureSchema();
  const count = await runtimeEnv().DB.prepare("SELECT COUNT(*) AS total FROM event_operators").first<{ total: number }>();
  if ((count?.total ?? 0) >= 50) return Response.json({ error: "El equipo alcanzó el máximo de 50 operadores." }, { status: 400 });
  await runtimeEnv().DB.prepare(
    "INSERT INTO event_operators (email, role, created_by) VALUES (?, 'operator', ?) ON CONFLICT(email) DO UPDATE SET role = 'operator'"
  ).bind(email, access.admin.email).run();
  return Response.json({ email, role: "operator" }, { status: 201 });
}

export async function DELETE(request: Request) {
  const access = await requireOwner(request);
  if ("error" in access) return access.error;
  const email = (new URL(request.url).searchParams.get("email") ?? "").trim().toLowerCase();
  if (!email) return Response.json({ error: "Falta el correo del operador." }, { status: 400 });
  await ensureSchema();
  const result = await runtimeEnv().DB.prepare("DELETE FROM event_operators WHERE email = ?").bind(email).run();
  if (!result.meta.changes) return Response.json({ error: "Operador no encontrado." }, { status: 404 });
  return Response.json({ removed: email });
}
