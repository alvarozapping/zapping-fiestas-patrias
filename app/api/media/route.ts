import { getAdminFromRequest } from "../../admin-auth";
import { ensureSchema, runtimeEnv, type SubmissionRecord } from "../../../db/mural";

export async function GET(request: Request) {
  await ensureSchema();
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const row = await runtimeEnv().DB.prepare(
    "SELECT * FROM submissions WHERE id = ?"
  ).bind(id).first<SubmissionRecord>();
  if (!row) return new Response("Imagen no encontrada", { status: 404 });
  if (row.status !== "approved" && !await getAdminFromRequest(request)) {
    return new Response("Acceso no autorizado", { status: 401 });
  }
  const object = await runtimeEnv().MEDIA.get(row.object_key);
  if (!object) return new Response("Imagen no encontrada", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", row.status === "approved" ? "public, max-age=86400" : "private, no-store");
  return new Response(object.body, { headers });
}
