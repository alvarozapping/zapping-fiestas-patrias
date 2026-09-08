"use client";

import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";

type Submission = { id: string; name: string; message: string; imageUrl: string; width: number; height: number };
type Settings = { durationSeconds: number; fadeSeconds: number; backgrounds: string[] };
type PreviousPhoto = { photo: Submission; background: string };

export default function DisplayLoop() {
  const [photos, setPhotos] = useState<Submission[]>([]);
  const [settings, setSettings] = useState<Settings>({ durationSeconds: 7, fadeSeconds: 2, backgrounds: ["#e90068", "#0039a6", "#d52b1e"] });
  const [index, setIndex] = useState(0);
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const [previous, setPrevious] = useState<PreviousPhoto | null>(null);
  const photosRef = useRef<Submission[]>([]);
  const settingsRef = useRef<Settings>(settings);
  const indexRef = useRef(0);
  const backgroundIndexRef = useRef(0);
  const effectiveFadeSeconds = Math.min(settings.fadeSeconds, Math.max(0.3, settings.durationSeconds - 0.2));

  const load = useCallback(async () => {
    const [photoResponse, settingsResponse] = await Promise.all([fetch("/api/submissions", { cache: "no-store" }), fetch("/api/settings", { cache: "no-store" })]);
    const photoData = await photoResponse.json() as { submissions: Submission[] };
    const displayData = await settingsResponse.json() as Settings;
    photosRef.current = photoData.submissions; settingsRef.current = displayData;
    setPhotos(photoData.submissions); setSettings(displayData); setIndex((current) => {
      const next = photoData.submissions.length ? current % photoData.submissions.length : 0;
      indexRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => { load(); const refresh = window.setInterval(load, 10000); return () => window.clearInterval(refresh); }, [load]);
  useEffect(() => {
    document.documentElement.classList.add("vmix-document");
    document.body.classList.add("vmix-document");
    return () => { document.documentElement.classList.remove("vmix-document"); document.body.classList.remove("vmix-document"); };
  }, []);
  useEffect(() => {
    if (photos.length < 2) return;
    const timer = window.setInterval(() => {
      const livePhotos = photosRef.current;
      const liveSettings = settingsRef.current;
      if (livePhotos.length < 2) return;
      const currentIndex = indexRef.current % livePhotos.length;
      const currentBackgroundIndex = backgroundIndexRef.current % Math.max(liveSettings.backgrounds.length, 1);
      setPrevious({ photo: livePhotos[currentIndex], background: liveSettings.backgrounds[currentBackgroundIndex] || "#171813" });
      const nextIndex = (currentIndex + 1) % livePhotos.length;
      const nextBackgroundIndex = liveSettings.backgrounds.length > 1
        ? (currentBackgroundIndex + 1 + Math.floor(Math.random() * (liveSettings.backgrounds.length - 1))) % liveSettings.backgrounds.length
        : 0;
      indexRef.current = nextIndex; backgroundIndexRef.current = nextBackgroundIndex;
      setIndex(nextIndex); setBackgroundIndex(nextBackgroundIndex);
    }, settings.durationSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [photos.length, settings.durationSeconds]);
  useEffect(() => {
    if (!previous) return;
    const timer = window.setTimeout(() => setPrevious(null), effectiveFadeSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [previous, effectiveFadeSeconds]);

  const photo = photos[index];
  const background = settings.backgrounds[backgroundIndex % Math.max(settings.backgrounds.length, 1)] || "#171813";

  return <main className="vmix-stage" aria-label="Salida transparente para vMix">
    {(previous || photo) && <div className="vmix-frame">
      {previous && <PhotoLayer key={`previous-${previous.photo.id}`} phase="previous" photo={previous.photo} background={previous.background} fadeSeconds={effectiveFadeSeconds} />}
      {photo && <PhotoLayer key={`current-${photo.id}`} phase="current" photo={photo} background={background} fadeSeconds={effectiveFadeSeconds} />}
    </div>}
  </main>;
}

function PhotoLayer({ phase, photo, background, fadeSeconds }: { phase: "current" | "previous"; photo: Submission; background: string; fadeSeconds: number }) {
  const vertical = photo.height > photo.width;
  const className = `vmix-photo ${vertical ? "is-vertical" : "is-horizontal"} film-roll-${phase}`;
  const style = { ...(vertical ? backgroundStyle(background) : { backgroundColor: "#171813" }), "--fade-duration": `${fadeSeconds}s` } as CSSProperties;
  return <div className={className} style={style}>
    <img src={photo.imageUrl} alt={`Fotografía de ${photo.name}`} />
    <span className="photo-person-name">{photo.name}</span>
    {photo.message && <strong className="photo-person-message">{photo.message}</strong>}
  </div>;
}

function backgroundStyle(background: string): CSSProperties {
  if (background.startsWith("#")) return { backgroundColor: background };
  return { backgroundImage: `url("${background}")`, backgroundPosition: "center", backgroundSize: "cover" };
}