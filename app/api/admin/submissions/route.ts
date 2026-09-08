import { getAdminFromRequest } from "../../../admin-auth";
import { ensureSchema, publicSubmission, runtimeEnv, type SubmissionRecord, type SubmissionStatus } from "../../../../db/mural";

export async function GET(request: Request) {
  if (!await getAdminFromRequest(request)) return Response.json({ error: "No autorizado" }, { status: 401 });
  await ensureSchema();
  const { DB } = runtimeEnv();
  const { results } = await DB.prepare(
    "SELECT * FROM submissions ORDER BY created_at DESC LIMIT 500"
  ).all<SubmissionRecord>();
  const counts = { total: results.length, pending: 0, approved: 0, rejected: 0 };
  for (const row of results) counts[row.status] += 1;
  return Response.json({ submissions: results.map((row) => publicSubmission(row, true)), counts });
}

export async function PATCH(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return Response.json({ error: "No autorizado" }, { status: 401 });
  const payload = await request.json() as { id?: string; status?: SubmissionStatus };
  if (!payload.id || !payload.status || !["approved", "rejected", "pending"].includes(payload.status)) {
    return Response.json({ error: "Actualización inválida" }, { status: 400 });
  }
  await ensureSchema();
  const result = await runtimeEnv().DB.prepare(
    "UPDATE submissions SET status = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ? WHERE id = ?"
  ).bind(payload.status, admin.email, payload.id).run();
  if (!result.meta.changes) return Response.json({ error: "Envío no encontrado" }, { status: 404 });
  return Response.json({ id: payload.id, status: payload.status });
}

export async function DELETE(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (admin.role !== "owner") return Response.json({ error: "Solo el administrador puede eliminar envíos." }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  await ensureSchema();
  const { DB, MEDIA } = runtimeEnv();
  const row = await DB.prepare("SELECT * FROM submissions WHERE id = ?").bind(id).first<SubmissionRecord>();
  if (!row) return Response.json({ error: "Envío no encontrado" }, { status: 404 });
  await MEDIA.delete(row.object_key);
  await DB.prepare("DELETE FROM submissions WHERE id = ?").bind(id).run();
  return Response.json({ deleted: id });
}
