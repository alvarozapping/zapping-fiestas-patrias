import type { Metadata } from "next";
import UploadExperience from "./upload-experience";

export const metadata: Metadata = {
  title: "Sube tu fotito | Zapping Fiestas Patrias",
  description: "Comparte tu foto dieciochera y haz que aparezca en la pantalla de Zapping.",
};

export default function Home() {
  return <UploadExperience />;
}
