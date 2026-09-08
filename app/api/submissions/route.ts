import { ensureSchema, publicSubmission, runtimeEnv, type SubmissionRecord } from "../../../db/mural";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET() {
  await ensureSchema();
  const { results } = await runtimeEnv().DB.prepare(
    "SELECT * FROM submissions WHERE status = 'approved' ORDER BY created_at ASC LIMIT 500"
  ).all<SubmissionRecord>();
  return Response.json({ submissions: results.map((row) => publicSubmission(row)) });
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const form = await request.formData();
    const name = String(form.get("name") ?? "").trim().slice(0, 80);
    const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 160);
    const message = String(form.get("message") ?? "").trim();
    const width = Math.max(0, Number(form.get("width")) || 0);
    const height = Math.max(0, Number(form.get("height")) || 0);
    const file = form.get("photo");

    if (!name) return Response.json({ error: "Escribe tu nombre." }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Escribe un correo válido." }, { status: 400 });
    if (message.length > 30) return Response.json({ error: "El mensaje puede tener hasta 30 caracteres." }, { status: 400 });
    if (!(file instanceof File)) return Response.json({ error: "Selecciona una fotografía." }, { status: 400 });
    if (!ACCEPTED_TYPES.has(file.type)) return Response.json({ error: "Usa una imagen JPG, PNG o WEBP." }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return Response.json({ error: "La fotografía supera el máximo de 10 MB." }, { status: 400 });

    const id = crypto.randomUUID();
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const objectKey = `photos/${id}.${extension}`;
    const { DB, MEDIA } = runtimeEnv();
    await MEDIA.put(objectKey, file.stream(), {
      httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { originalName: file.name.slice(0, 120) },
    });
    try {
      await DB.prepare(`INSERT INTO submissions
        (id, name, email, message, object_key, original_name, mime_type, width, height, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`)
        .bind(id, name, email, message, objectKey, file.name.slice(0, 120), file.type, width, height)
        .run();
    } catch (error) {
      await MEDIA.delete(objectKey);
      throw error;
    }
    return Response.json({ id, status: "pending", message: "Tu foto quedó pendiente de aprobación." }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pudimos guardar la fotografía.";
    return Response.json({ error: message }, { status: 500 });
  }
}
