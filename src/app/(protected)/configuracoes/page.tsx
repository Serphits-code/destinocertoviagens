import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserProfile, getSystemInfo, getUsersList } from "./actions";
import { SettingsContent } from "./SettingsContent";

export const metadata = {
  title: "Configurações & Perfil — Destino Certo",
  description: "Gerencie suas credenciais, colaboradores e consulte diagnósticos do sistema Destino Certo.",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [profile, systemInfo, users] = await Promise.all([
    getUserProfile(),
    getSystemInfo(),
    getUsersList(),
  ]);

  return (
    <SettingsContent
      profile={profile}
      systemInfo={systemInfo}
      initialUsers={users}
    />
  );
}

