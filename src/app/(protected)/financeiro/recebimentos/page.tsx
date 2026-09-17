import { Metadata } from "next";
import { getReceivables, getReceivablesKPIs } from "@/lib/actions/receivables";
import { ReceivablesContent } from "./ReceivablesContent";

export const metadata: Metadata = {
  title: "Recebimentos por Tipo & Forma de Pagamento | Destino Certo",
  description: "Relatório e conciliação analítica de recebimentos por PIX, Cartão, Boleto, Dinheiro, Banco e Crédito.",
};

export default async function ReceivablesPage(props: {
  searchParams?: Promise<{
    page?: string;
    search?: string;
    method?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  const page = searchParams?.page ? parseInt(searchParams.page, 10) : 1;
  const search = searchParams?.search || "";
  const method = searchParams?.method || "ALL";
  const status = searchParams?.status || "ALL";
  const startDate = searchParams?.startDate || "";
  const endDate = searchParams?.endDate || "";
  const dateType = (searchParams?.dateType as "PAID" | "DUE") || "PAID";

  const [receivablesData, kpiData] = await Promise.all([
    getReceivables({
      page,
      pageSize: 25,
      search,
      paymentMethod: method !== "ALL" ? method : undefined,
      status: status !== "ALL" ? status : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      dateType,
    }),
    getReceivablesKPIs({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      dateType,
    }),
  ]);

  return (
    <ReceivablesContent
      initialData={receivablesData}
      initialKPIs={kpiData}
      initialSearch={search}
      initialMethod={method}
      initialStatus={status}
      initialStartDate={startDate}
      initialEndDate={endDate}
      initialDateType={dateType}
    />
  );
}
