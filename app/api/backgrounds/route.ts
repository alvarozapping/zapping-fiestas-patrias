import { getAdminFromRequest } from "../../admin-auth";
import { runtimeEnv } from "../../../db/mural";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SAFE_ID = /^[0-9a-f-]{36}\.(?:jpg|png|webp)$/i;

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!SAFE_ID.test(id)) return new Response("Fondo no encontrado", { status: 404 });
  const object = await runtimeEnv().MEDIA.get(`backgrounds/${id}`);
  if (!object) return new Response("Fondo no encontrado", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
}

export async function POST(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (admin.role !== "owner") return Response.json({ error: "Solo el administrador puede cargar fondos." }, { status: 403 });
  const form = await request.formData();
  const file = form.get("background");
  if (!(file instanceof File)) return Response.json({ error: "Selecciona una imagen de fondo." }, { status: 400 });
  if (!ACCEPTED_TYPES.has(file.type)) return Response.json({ error: "Usa una imagen JPG, PNG o WEBP." }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return Response.json({ error: "La imagen supera el máximo de 10 MB." }, { status: 400 });

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const id = `${crypto.randomUUID()}.${extension}`;
  await runtimeEnv().MEDIA.put(`backgrounds/${id}`, file.stream(), {
    httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { originalName: file.name.slice(0, 120) },
  });
  return Response.json({ background: `/api/backgrounds?id=${encodeURIComponent(id)}` }, { status: 201 });
}
