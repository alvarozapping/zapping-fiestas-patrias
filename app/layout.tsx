import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;
  const title = "Zapping Fiestas Patrias | ¡Aquí se vive el 18!";
  const description = "Comparte tu fotito dieciochera y haz que aparezca en la pantalla de Zapping.";
  return {
    title: { default: title, template: "%s · Zapping" },
    description,
    icons: { icon: "/zapping/isotipo-pink.svg", shortcut: "/zapping/isotipo-pink.svg" },
    openGraph: { title, description, type: "website", locale: "es_CL", images: [{ url: image, width: 1536, height: 1024, alt: "Zapping Fiestas Patrias" }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
