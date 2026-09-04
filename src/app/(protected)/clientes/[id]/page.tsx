import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getClientDetails } from "../actions";
import { ClientDetailClient } from "./ClientDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const data = await getClientDetails(id);
  if (!data) return { title: "Cliente não encontrado — Destino Certo" };
  return {
    title: `${data.client.name} — Destino Certo`,
    description: `Perfil completo e histórico financeiro de ${data.client.name}`,
  };
}

export default async function ClientDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const data = await getClientDetails(id);
  if (!data) notFound();

  return (
    <ClientDetailClient
      initialClient={data.client}
      financialSummary={data.financialSummary}
      travelSummary={data.travelSummary}
    />
  );
}
