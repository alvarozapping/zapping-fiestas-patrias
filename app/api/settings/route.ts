import { getAdminFromRequest } from "../../admin-auth";
import { readSettings, runtimeEnv } from "../../../db/mural";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const BACKGROUND_IMAGE = /^\/api\/backgrounds\?id=([0-9a-f-]{36}\.(?:jpg|png|webp))$/i;

function isBackground(value: unknown): value is string {
  return typeof value === "string" && (HEX_COLOR.test(value) || BACKGROUND_IMAGE.test(value));
}

export async function GET() {
  return Response.json(await readSettings());
}

export async function PATCH(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return Response.json({ error: "Debes iniciar sesión para administrar el evento." }, { status: 401 });
  if (admin.role !== "owner") return Response.json({ error: "Solo el administrador puede cambiar la configuración del loop." }, { status: 403 });
  const payload = await request.json() as { durationSeconds?: number; fadeSeconds?: number; backgrounds?: string[] };
  const duration = Math.min(30, Math.max(2, Number(payload.durationSeconds) || 7));
  const fadeSeconds = Math.min(5, Math.max(0.3, Number(payload.fadeSeconds) || 2));
  const backgrounds = Array.isArray(payload.backgrounds)
    ? payload.backgrounds.filter(isBackground).slice(0, 3)
    : [];
  if (!backgrounds.length) return Response.json({ error: "Agrega al menos un color o una imagen de fondo." }, { status: 400 });
  const previous = await readSettings();
  await runtimeEnv().DB.prepare(
    "UPDATE display_settings SET duration_seconds = ?, fade_seconds = ?, backgrounds_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1"
  ).bind(duration, fadeSeconds, JSON.stringify(backgrounds)).run();
  const removedImages = previous.backgrounds.filter((item) => BACKGROUND_IMAGE.test(item) && !backgrounds.includes(item));
  await Promise.all(removedImages.map((item) => {
    const id = item.match(BACKGROUND_IMAGE)?.[1];
    return id ? runtimeEnv().MEDIA.delete(`backgrounds/${id}`) : Promise.resolve();
  }));
  return Response.json({ durationSeconds: duration, fadeSeconds, backgrounds });
}
