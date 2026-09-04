import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { searchSuppliers, getSupplierStats } from "./actions";
import { SuppliersContent } from "./SuppliersContent";

export const metadata = {
  title: "Fornecedores & Parceiros — Destino Certo",
  description: "Rede de parceiros, hotéis, operadoras e companhias aéreas",
};

export default async function SuppliersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [initialData, stats] = await Promise.all([
    searchSuppliers({ page: 1, pageSize: 20 }),
    getSupplierStats(),
  ]);

  return (
    <SuppliersContent
      initialSuppliers={initialData.suppliers}
      initialTotal={initialData.total}
      initialTotalPages={initialData.totalPages}
      stats={stats}
    />
  );
}
