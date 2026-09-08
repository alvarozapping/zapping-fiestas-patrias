import type { Metadata } from "next";
import Link from "next/link";
import { getChatGPTUser, requireChatGPTUser } from "../chatgpt-auth";
import { getAdminIdentity } from "../admin-auth";
import AdminDashboard from "./admin-dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administración | Zapping Fiestas Patrias",
  description: "Revisa las fotografías y configura la pantalla dieciochera de Zapping.",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const identity = await getAdminIdentity();
  if (!identity) {
    const signedInUser = await getChatGPTUser();
    if (!signedInUser) await requireChatGPTUser("/admin");
    return <main className="admin-access-denied"><img src="/zapping/logotipo-pink.svg" alt="Zapping" /><p className="eyebrow">Panel administrador</p><h1>Acceso reservado</h1><p>Tu cuenta no tiene permiso para administrar este evento.</p><Link href="/">Volver a la participación</Link></main>;
  }
  return <AdminDashboard displayName={identity.displayName} role={identity.role} />;
}
