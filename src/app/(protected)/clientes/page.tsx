import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { searchClients, getClientStats } from "./actions";
import { ClientsContent } from "./ClientsContent";

export const metadata = {
  title: "Clientes & Passageiros — Destino Certo",
  description: "Gestão e cadastro de clientes e passageiros da Destino Certo",
};

export default async function ClientsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [initialData, stats] = await Promise.all([
    searchClients({ page: 1, pageSize: 20 }),
    getClientStats(),
  ]);

  return (
    <ClientsContent
      initialClients={initialData.clients}
      initialTotal={initialData.total}
      initialTotalPages={initialData.totalPages}
      stats={stats}
    />
  );
}
