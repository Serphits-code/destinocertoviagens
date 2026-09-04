import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getSupplierDetails } from "../actions";
import { SupplierDetailClient } from "./SupplierDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const data = await getSupplierDetails(id);
  if (!data) return { title: "Fornecedor não encontrado — Destino Certo" };
  return {
    title: `${data.supplier.name} — Destino Certo`,
    description: `Perfil e histórico de faturas de ${data.supplier.name}`,
  };
}

export default async function SupplierDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const data = await getSupplierDetails(id);
  if (!data) notFound();

  return (
    <SupplierDetailClient
      initialSupplier={data.supplier}
      financialSummary={data.financialSummary}
    />
  );
}
