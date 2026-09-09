"use client";

import Link from "next/link";
import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { ArrowRightIcon, ArrowUpRightIcon, CheckIcon, UploadSimpleIcon } from "./icons";

type Dimensions = { width: number; height: number };

export default function UploadExperience() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function selectFile(next: File | null) {
    setError("");
    if (!next) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type)) {
      setError("Usa una imagen JPG, PNG o WEBP.");
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      setError("La fotografía supera el máximo de 10 MB.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    const url = URL.createObjectURL(next);
    setFile(next);
    setPreview(url);
    const image = new Image();
    image.onload = () => setDimensions({ width: image.naturalWidth, height: image.naturalHeight });
    image.src = url;
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] ?? null);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!file) { setError("Selecciona una fotografía."); return; }
    setSubmitting(true);
    const form = new FormData();
    form.set("photo", file);
    form.set("name", name);
    form.set("email", email);
    form.set("width", String(dimensions.width));
    form.set("height", String(dimensions.height));
    try {
      const response = await fetch("/api/submissions", { method: "POST", body: form });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "No pudimos enviar tu fotografía.");
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos enviar tu fotografía.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(""); setDimensions({ width: 0, height: 0 });
    setName(""); setEmail(""); setError(""); setSent(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <main className="app-shell">
      <SiteHeader />
      <section className="hero" id="inicio">
        <div>
          <p className="eyebrow">Zapping celebra Chile</p>
          <h1>¡Saca tu mejor pinta<br /><em>dieciochera!</em></h1>
          <p className="hero-copy">Sube tu foto de estas Fiestas Patrias y haz que aparezca en nuestra pantalla. ¡Que se note ese 18!</p>
        </div>
        <div className="hero-fiesta" aria-hidden="true">
          <div className="hero-fiesta-photo"><img src="/fiestas-patrias/tradiciones.png" alt="" /></div>
          <span className="fiesta-badge"><b>18</b><small>SEPT.</small></span>
          <span className="fiesta-ribbon ribbon-blue" />
          <span className="fiesta-ribbon ribbon-red" />
        </div>
      </section>

      <section className="upload-layout" id="subir">
        <form className="upload-card" onSubmit={submit}>
          {sent ? (
            <div className="success-state" role="status">
              <span className="success-mark"><CheckIcon /></span>
              <p className="eyebrow">¡La recibimos!</p>
              <h2>¡Quedó <em>filete!</em></h2>
              <p>El equipo de Zapping revisará tu foto antes de tirarla a la pantalla.</p>
              <button type="button" className="primary-action centered-action" onClick={reset}>Subir otra fotito</button>
            </div>
          ) : (
            <>
              <div className="section-heading">
                <span className="step-number">01</span>
                <div><p className="eyebrow">Participa</p><h2>Manda tu fotito</h2></div>
              </div>

              <input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={onFileChange} />
              <div
                className={`dropzone ${dragging ? "is-dragging" : ""} ${preview ? "has-preview" : ""}`}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                {preview ? (
                  <>
                    <div className="upload-preview">
                      <img src={preview} alt="Vista previa de la foto seleccionada" />
                      {name && <span className="preview-name">{name}</span>}
                    </div>
                    <div className="selected-file"><span><strong>{file?.name}</strong><small>{dimensions.width && dimensions.height ? `${dimensions.width} × ${dimensions.height}` : "Imagen lista"}</small></span><button type="button" onClick={() => inputRef.current?.click()}>Cambiar</button></div>
                  </>
                ) : (
                  <>
                    <span className="upload-icon" aria-hidden="true"><UploadSimpleIcon /></span>
                    <strong>Sube tu fotaza</strong>
                    <span>tócala desde tu teléfono</span>
                    <button type="button" onClick={() => inputRef.current?.click()}><UploadSimpleIcon />Buscar una foto</button>
                    <small>JPG, PNG o WEBP · Máximo 10 MB</small>
                  </>
                )}
              </div>

              <div className="field-grid">
                <label>Tu nombre<input required type="text" name="name" autoComplete="name" enterKeyHint="next" placeholder="Ej. María González" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} /></label>
                <label>Correo electrónico<input required type="email" name="email" autoComplete="email" inputMode="email" enterKeyHint="send" placeholder="maria@correo.com" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={160} /></label>
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="primary-action" type="submit" disabled={submitting}>{submitting ? "Subiendo…" : "Subir mi fotito"}<ArrowRightIcon /></button>
            </>
          )}
        </form>

        <aside className="guidance-card">
          <img className="guidance-photo" src="/fiestas-patrias/mesa-chilena.jpg" alt="Empanadas, sombrero y símbolos chilenos" />
          <p className="eyebrow">Así de fácil</p><h2>¡Sube tu fotaza y a celebrar!</h2>
          <ul>
            <li><span>01</span><div><strong>Sube tu fotaza</strong><p>Elige ese momento dieciochero que merece salir en pantalla.</p></div></li>
            <li><span>02</span><div><strong>Ponle tu toque</strong><p>Escribe tu nombre y tu correo para que te reconozcamos en pantalla.</p></div></li>
            <li><span>03</span><div><strong>¡Atenti al Channel!</strong><p>Espera un poquito y podrás aparecer en Zapping Channel. Recuerda etiquetarnos en Instagram como @zappingchile cuando veas tu foto en pantalla.</p></div></li>
          </ul>
          <div className="format-preview" aria-label="Vista previa del formato 16:9"><div className="pillar left-pillar" /><div className="portrait-placeholder"><img src="/fiestas-patrias/terremoto-empanada.png" alt="Ejemplo de fotografía vertical" /></div><div className="pillar right-pillar" /><b>16:9</b></div>
        </aside>
      </section>
      <SiteFooter />
    </main>
  );
}

export function Brand() {
  return <span className="brand"><img src="/zapping/logotipo-pink.svg" alt="Zapping" /><span>Fiestas Patrias</span></span>;
}

export function SiteHeader() {
  return (
    <header className="topbar public-topbar">
      <Link href="/" aria-label="Zapping Fiestas Patrias, inicio"><Brand /></Link>
      <span className="event-status"><i /> 18 EN VIVO</span>
    </header>
  );
}

export function AdminHeader() {
  return (
    <header className="topbar admin-topbar">
      <Link href="/admin" aria-label="Panel administrador de Zapping"><span className="brand"><img src="/zapping/logotipo-pink.svg" alt="Zapping" /><span>Panel administrador</span></span></Link>
      <nav className="main-nav" aria-label="Navegación administrativa">
        <Link className="is-active" href="/admin">Moderación</Link>
        <a href="/vmix" target="_blank" rel="noopener">vMix <ArrowUpRightIcon /></a>
      </nav>
      <Link className="admin-public-link" href="/">Ver participación <ArrowUpRightIcon /></Link>
    </header>
  );
}

export function SiteFooter() {
  return <footer><span><img src="/zapping/logotipo-white.svg" alt="Zapping" /> · El 18 se vive en grande</span><span>Tus datos solo se usan para gestionar esta celebración.</span></footer>;
}
