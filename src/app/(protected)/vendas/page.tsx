import { Metadata } from "next";
import { getSales } from "@/lib/actions/sales";
import { SalesListContent } from "./SalesListContent";

export const metadata: Metadata = {
  title: "Vendas & Emissões | Destino Certo",
  description: "Gestão completa de vendas, serviços emitidos e passageiros da agência.",
};

export default async function SalesPage(props: {
  searchParams?: Promise<{
    page?: string;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const page = parseInt(searchParams?.page || "1") || 1;
  const search = searchParams?.search || "";
  const status = searchParams?.status || "ALL";
  const startDate = searchParams?.startDate || "";
  const endDate = searchParams?.endDate || "";

  const data = await getSales({
    page,
    search,
    status,
    startDate,
    endDate,
    pageSize: 25,
  });

  return (
    <div className="space-y-6">
      <SalesListContent
        initialData={data}
        initialSearch={search}
        initialStatus={status}
        initialStartDate={startDate}
        initialEndDate={endDate}
      />
    </div>
  );
}
