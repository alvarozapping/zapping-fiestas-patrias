import type { Metadata } from "next";
import DisplayLoop from "./display-loop";

export const metadata: Metadata = {
  title: "Salida transparente para vMix | Zapping",
  description: "Loop transparente 1920 × 1080 para integrar las fotografías aprobadas en vMix.",
  robots: { index: false, follow: false },
};

export default function VmixPage() { return <DisplayLoop />; }
