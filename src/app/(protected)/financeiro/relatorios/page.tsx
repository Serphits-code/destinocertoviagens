import { Metadata } from "next";
import { getCorporateFinancialReport, type FinancialReportFilters } from "@/lib/actions/financial-reports";
import { FinancialReportContent } from "./FinancialReportContent";

export const metadata: Metadata = {
  title: "Relatório Financeiro Empresarial | Destino Certo",
  description: "Visão executiva, DRE gerencial, KPIs analíticos e conciliação de receitas e despesas.",
};

export default async function RelatoriosPage(props: {
  searchParams?: Promise<{
    period?: string;
    startDate?: string;
    endDate?: string;
    dateBasis?: string;
    kind?: string;
    status?: string;
    paymentMethod?: string;
    search?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  const filters: FinancialReportFilters = {
    period: (searchParams?.period as any) || "month",
    startDate: searchParams?.startDate,
    endDate: searchParams?.endDate,
    dateBasis: (searchParams?.dateBasis as any) || "dueDate",
    kind: (searchParams?.kind as any) || "ALL",
    status: (searchParams?.status as any) || "ALL",
    paymentMethod: searchParams?.paymentMethod || "ALL",
    search: searchParams?.search || "",
    page: searchParams?.page ? parseInt(searchParams.page, 10) : 1,
    pageSize: 25,
  };

  const reportData = await getCorporateFinancialReport(filters);

  return <FinancialReportContent initialData={reportData} initialFilters={filters} />;
}
