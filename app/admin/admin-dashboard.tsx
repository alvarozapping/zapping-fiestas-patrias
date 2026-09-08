"use client";

import { type ChangeEvent, type CSSProperties, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminHeader, SiteFooter } from "../upload-experience";
import { ArrowRightIcon, ArrowUpRightIcon, ArrowsClockwiseIcon, CheckIcon, PlusIcon, TelevisionIcon, XIcon } from "../icons";

type Status = "pending" | "approved" | "rejected";
type Submission = { id: string; name: string; email: string; message: string; imageUrl: string; width: number; height: number; status: Status; createdAt: string };
type Counts = { total: number; pending: number; approved: number; rejected: number };
type Settings = { durationSeconds: number; fadeSeconds: number; backgrounds: string[] };
type Operator = { email: string; role: "operator"; createdBy: string; createdAt: string };

const EMPTY_COUNTS: Counts = { total: 0, pending: 0, approved: 0, rejected: 0 };

export default function AdminDashboard({ displayName, role }: { displayName: string; role: "owner" | "operator" }) {
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS);
  const [settings, setSettings] = useState<Settings>({ durationSeconds: 7, fadeSeconds: 2, backgrounds: ["#ff155b", "#0033a0", "#da291c"] });
  const [operators, setOperators] = useState<Operator[]>([]);
  const [operatorEmail, setOperatorEmail] = useState("");
  const [filter, setFilter] = useState<"all" | Status>("pending");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [teamSaving, setTeamSaving] = useState(false);
  const [teamNotice, setTeamNotice] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const [submissionsResponse, settingsResponse, operatorsResponse] = await Promise.all([
        fetch("/api/admin/submissions", { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }),
        role === "owner" ? fetch("/api/admin/operators", { cache: "no-store" }) : Promise.resolve(null),
      ]);
      if (!submissionsResponse.ok) throw new Error("No pudimos cargar los envíos.");
      const data = await submissionsResponse.json() as { submissions: Submission[]; counts: Counts };
      const display = await settingsResponse.json() as Settings;
      setSubmissions(data.submissions); setCounts(data.counts); setSettings(display);
      if (operatorsResponse) {
        if (!operatorsResponse.ok) throw new Error("No pudimos cargar el equipo operador.");
        const team = await operatorsResponse.json() as { operators: Operator[] };
        setOperators(team.operators);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No pudimos cargar el panel.");
    } finally { setLoading(false); }
  }, [role]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => filter === "all" ? submissions : submissions.filter((item) => item.status === filter), [submissions, filter]);
  const previewItem = useMemo(() => submissions.find((item) => item.id === previewId) ?? null, [submissions, previewId]);

  useEffect(() => {
    if (!previewId) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setPreviewId(null); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [previewId]);

  async function changeStatus(id: string, status: Status) {
    setNotice("");
    const response = await fetch("/api/admin/submissions", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status }) });
    if (!response.ok) { setNotice("No pudimos actualizar este envío."); return; }
    await load();
    setNotice(status === "approved" ? "La foto ya está visible en la pantalla." : "El envío fue rechazado.");
  }

  async function remove(id: string) {
    if (!window.confirm("¿Eliminar esta foto de forma permanente?")) return;
    const response = await fetch(`/api/admin/submissions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) { setNotice("No pudimos eliminar este envío."); return; }
    if (previewId === id) setPreviewId(null);
    await load(); setNotice("La foto fue eliminada.");
  }

  async function saveSettings() {
    setSaving(true); setNotice("");
    const response = await fetch("/api/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(settings) });
    const data = await response.json() as { error?: string; durationSeconds?: number; backgrounds?: string[] };
    setSaving(false);
    if (!response.ok) { setNotice(data.error || "No pudimos guardar los ajustes."); return; }
    setNotice("Los ajustes de pantalla fueron guardados.");
  }

  async function uploadBackground(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadingBackground(true); setNotice("");
    const form = new FormData();
    form.set("background", file);
    try {
      const response = await fetch("/api/backgrounds", { method: "POST", body: form });
      const data = await response.json() as { background?: string; error?: string };
      if (!response.ok || !data.background) throw new Error(data.error || "No pudimos cargar el fondo.");
      setSettings((current) => ({ ...current, backgrounds: [...current.backgrounds, data.background!].slice(0, 3) }));
      setNotice("Fondo cargado. Guarda la configuración para aplicarlo al loop.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No pudimos cargar el fondo.");
    } finally {
      setUploadingBackground(false);
    }
  }

  async function addOperator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTeamSaving(true); setTeamNotice("");
    const response = await fetch("/api/admin/operators", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: operatorEmail }) });
    const data = await response.json() as { error?: string };
    setTeamSaving(false);
    if (!response.ok) { setTeamNotice(data.error || "No pudimos agregar al operador."); return; }
    setOperatorEmail("");
    await load();
    setTeamNotice("Operador agregado. Debe ingresar con ese mismo correo.");
  }

  async function removeOperator(email: string) {
    if (!window.confirm(`¿Quitar el acceso de ${email}?`)) return;
    setTeamNotice("");
    const response = await fetch(`/api/admin/operators?email=${encodeURIComponent(email)}`, { method: "DELETE" });
    if (!response.ok) { setTeamNotice("No pudimos quitar este acceso."); return; }
    await load();
    setTeamNotice("Acceso de operador eliminado.");
  }

  return (
    <main className="app-shell admin-shell">
      <AdminHeader />
      <section className="admin-heading page-width">
        <div><p className="eyebrow">Zapping Fiestas Patrias</p><h1>Que salga todo<br /><em>¡de lujo!</em></h1></div>
        <div className="admin-stamp" aria-hidden="true"><b>18</b><small>SEPT.</small></div>
        <div className="admin-user"><span>{displayName.slice(0, 1).toUpperCase()}</span><div><small>{role === "owner" ? "Administrador principal" : "Perfil operador"}</small><strong>{displayName}</strong></div></div>
      </section>

      <section className="stats-grid page-width" aria-label="Resumen de envíos">
        <Stat label="Fotos recibidas" value={counts.total} tone="dark" />
        <Stat label="Esperando ojo" value={counts.pending} tone="lime" />
        <Stat label="Listas para salir" value={counts.approved} tone="blue" />
        <Stat label="Fuera del loop" value={counts.rejected} tone="light" />
      </section>

      {role === "owner" && <section className="team-panel page-width" aria-labelledby="team-title">
        <div className="team-copy"><p className="eyebrow">Accesos</p><h2 id="team-title">Equipo operador</h2><p>Agrega el correo institucional de quienes revisarán las fotos. Cada persona deberá entrar al panel con ese mismo correo.</p></div>
        <div className="team-management">
          <form className="operator-form" onSubmit={addOperator}><label htmlFor="operator-email">Correo institucional</label><div><input id="operator-email" required type="email" placeholder="nombre@empresa.cl" value={operatorEmail} onChange={(event) => setOperatorEmail(event.target.value)} maxLength={160} /><button type="submit" disabled={teamSaving}>{teamSaving ? "Agregando…" : <><PlusIcon /> Dar acceso</>}</button></div></form>
          <div className="operator-list">{operators.length ? operators.map((operator) => <div className="operator-row" key={operator.email}><span>{operator.email.slice(0, 1).toUpperCase()}</span><div><strong>{operator.email}</strong><small>Operador · Puede aprobar y rechazar fotos</small></div><button type="button" onClick={() => removeOperator(operator.email)}>Quitar</button></div>) : <p className="operator-empty">Todavía no has agregado operadores.</p>}</div>
          {teamNotice && <p className="team-notice" role="status">{teamNotice}</p>}
        </div>
      </section>}

      <section className="admin-grid page-width">
        <div className="review-panel">
          <div className="panel-title-row"><div><p className="eyebrow">Moderación</p><h2>Fotos del carrete</h2></div><button className="refresh-button" type="button" onClick={load}><ArrowsClockwiseIcon /> Actualizar</button></div>
          <div className="filter-tabs" role="tablist" aria-label="Filtrar fotografías">
            {(["pending", "approved", "rejected", "all"] as const).map((item) => (
              <button key={item} className={filter === item ? "is-active" : ""} type="button" onClick={() => setFilter(item)}>
                {{ pending: "Por revisar", approved: "Aprobadas", rejected: "Rechazadas", all: "Todas" }[item]}
              </button>
            ))}
          </div>

          {loading ? <div className="empty-list">Cargando fotografías…</div> : visible.length ? (
            <div className="submission-list">
              {visible.map((item) => <SubmissionCard key={item.id} item={item} onPreview={setPreviewId} onStatus={changeStatus} onRemove={role === "owner" ? remove : undefined} />)}
            </div>
          ) : (
            <div className="empty-list"><span><TelevisionIcon /></span><strong>Todo tranquilo por aquí</strong><p>Las nuevas fotitos aparecerán automáticamente.</p></div>
          )}
        </div>

        {role === "owner" ? <aside className="settings-panel">
          <div className="panel-title-row"><div><p className="eyebrow">Pantalla</p><h2>Armar el loop</h2></div><div className="screen-links"><a className="open-screen" href="/vmix" target="_blank"><TelevisionIcon /> vMix <ArrowUpRightIcon /></a></div></div>
          <label className="setting-field">Duración de cada foto <strong>{settings.durationSeconds} s</strong><input type="range" min="2" max="30" step="1" value={settings.durationSeconds} onChange={(event) => setSettings({ ...settings, durationSeconds: Number(event.target.value) })} /></label>
          <div className="setting-field"><div className="setting-label"><span>Tiempo del cambio</span><strong>{settings.fadeSeconds.toFixed(1)} s</strong></div><p>En vMix controla cuánto tarda el rollo hacia el costado.</p><input aria-label="Duración del cambio entre fotos" type="range" min="0.3" max="5" step="0.1" value={settings.fadeSeconds} onChange={(event) => setSettings({ ...settings, fadeSeconds: Number(event.target.value) })} /></div>
          <div className="setting-field"><div className="setting-label"><span>Fondos para fotos verticales</span><strong>{settings.backgrounds.length}/3</strong></div><p>Puedes combinar colores e imágenes. Se alternarán detrás de cada foto vertical.</p><div className="background-list">
            {settings.backgrounds.map((background, index) => <div className="background-option" key={background + index}><span className="background-swatch" style={backgroundStyle(background)} />{background.startsWith("#") ? <><input aria-label={`Color de fondo ${index + 1}`} type="color" value={background} onChange={(event) => setSettings({ ...settings, backgrounds: settings.backgrounds.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} /><span>{background.toUpperCase()}</span></> : <span>Imagen {index + 1}</span>}{settings.backgrounds.length > 1 && <button type="button" aria-label={`Eliminar fondo ${index + 1}`} onClick={() => setSettings({ ...settings, backgrounds: settings.backgrounds.filter((_, itemIndex) => itemIndex !== index) })}><XIcon /></button>}</div>)}
          </div><input ref={backgroundInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadBackground} />{settings.backgrounds.length < 3 && <div className="background-actions"><button className="add-color" type="button" onClick={() => setSettings({ ...settings, backgrounds: [...settings.backgrounds, "#ff155b"] })}><PlusIcon /> Agregar color</button><button className="add-color" type="button" disabled={uploadingBackground} onClick={() => backgroundInputRef.current?.click()}>{uploadingBackground ? "Cargando…" : <><PlusIcon /> Cargar imagen</>}</button></div>}</div>
          <div className="mini-screen" style={backgroundStyle(settings.backgrounds[0])}><div className="mini-portrait"><img src="/fiestas-patrias/terremoto-empanada.png" alt="Vista previa vertical" /></div><span>{settings.durationSeconds}s</span></div>
          <button className="primary-action" type="button" disabled={saving} onClick={saveSettings}>{saving ? "Guardando…" : "Guardar configuración"}<ArrowRightIcon /></button>
          {notice && <p className="admin-notice" role="status">{notice}</p>}
        </aside> : <aside className="operator-panel"><p className="eyebrow">Tu perfil</p><h2>Operación de fotos</h2><p>Puedes revisar las imágenes en grande, aprobarlas o rechazarlas. La configuración del loop queda reservada al administrador principal.</p><div className="operator-screen-links"><a href="/vmix" target="_blank"><TelevisionIcon /> Abrir salida vMix <ArrowUpRightIcon /></a></div>{notice && <p className="admin-notice" role="status">{notice}</p>}</aside>}
      </section>
      <SiteFooter />
      {previewItem && <ReviewModal item={previewItem} onClose={() => setPreviewId(null)} onStatus={changeStatus} />}
    </main>
  );
}

function backgroundStyle(background?: string): CSSProperties {
  if (!background || background.startsWith("#")) return { backgroundColor: background || "#080809" };
  return { backgroundImage: `url("${background}")`, backgroundPosition: "center", backgroundSize: "cover" };
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <article className={`stat-card stat-${tone}`}><span>{label}</span><strong>{String(value).padStart(2, "0")}</strong></article>;
}

function SubmissionCard({ item, onPreview, onStatus, onRemove }: { item: Submission; onPreview: (id: string) => void; onStatus: (id: string, status: Status) => void; onRemove?: (id: string) => void }) {
  const date = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(`${item.createdAt.replace(" ", "T")}Z`));
  return <article className="submission-card">
    <button className={`submission-image ${item.height > item.width ? "is-vertical" : "is-horizontal"}`} type="button" onClick={() => onPreview(item.id)} aria-label={`Ver en grande la foto enviada por ${item.name}`}><img src={item.imageUrl} alt={`Foto enviada por ${item.name}`} />{item.message && <span className="submission-message-thumb">{item.message}</span>}<span className="zoom-hint">Ver grande</span></button>
    <div className="submission-info"><div><strong>{item.name}</strong><span>{item.email}</span><small>{date} · {item.width && item.height ? `${item.width} × ${item.height}` : "Tamaño original"}</small></div><span className={`status-badge status-${item.status}`}>{{ pending: "Por revisar", approved: "Aprobada", rejected: "Rechazada" }[item.status]}</span></div>
    <div className="card-actions">
      {item.status !== "approved" && <button className="approve-button" type="button" onClick={() => onStatus(item.id, "approved")}><CheckIcon /> Aprobar</button>}
      {item.status !== "rejected" && <button type="button" onClick={() => onStatus(item.id, "rejected")}><XIcon /> Rechazar</button>}
      {onRemove && <button className="delete-button" type="button" onClick={() => onRemove(item.id)}>Eliminar</button>}
    </div>
  </article>;
}

function ReviewModal({ item, onClose, onStatus }: { item: Submission; onClose: () => void; onStatus: (id: string, status: Status) => void }) {
  const vertical = item.height > item.width;
  const date = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(`${item.createdAt.replace(" ", "T")}Z`));
  return <div className="review-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-modal-title">
      <button className="review-modal-close" type="button" onClick={onClose} aria-label="Cerrar fotografía" autoFocus><XIcon /></button>
      <div className={`review-modal-photo ${vertical ? "is-vertical" : "is-horizontal"}`}>
        <img src={item.imageUrl} alt={`Fotografía completa enviada por ${item.name}`} />
      </div>
      <aside className="review-modal-info">
        <span className={`status-badge status-${item.status}`}>{{ pending: "Por revisar", approved: "Aprobada", rejected: "Rechazada" }[item.status]}</span>
        <p className="eyebrow">Revisión de foto</p>
        <h2 id="review-modal-title">{item.name}</h2>
        <p className="review-email">{item.email}</p>
        {item.message && <div className="review-message"><small>Mensaje</small><strong>{item.message}</strong></div>}
        <p className="review-meta">{date}<br />{item.width && item.height ? `${item.width} × ${item.height} px · ${vertical ? "Vertical" : "Horizontal"}` : "Tamaño original"}</p>
        <div className="review-modal-actions">
          {item.status !== "approved" && <button className="approve-button" type="button" onClick={() => onStatus(item.id, "approved")}><CheckIcon /> Aprobar foto</button>}
          {item.status !== "rejected" && <button className="reject-button" type="button" onClick={() => onStatus(item.id, "rejected")}><XIcon /> Rechazar foto</button>}
        </div>
      </aside>
    </section>
  </div>;
}
