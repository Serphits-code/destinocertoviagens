import { Metadata } from "next";
import { getDailyCash, getMonthlyCash } from "@/lib/actions/daily-cash";
import { DailyCashContent } from "./DailyCashContent";

export const metadata: Metadata = {
  title: "Livro Caixa & Fechamento Diário | Destino Certo",
  description: "Espelho automatizado em tempo real da planilha de fechamento diário e controle de caixa.",
};

export default async function CaixaPage(props: {
  searchParams?: Promise<{
    date?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  // Data padrão: 22/07/2026 (ou a data passada via URL)
  const selectedDate = searchParams?.date || "2026-07-22";

  const [y, m] = selectedDate.split("-").map(Number);

  // Carregar dados diários e mensais em paralelo
  const [dayData, monthData] = await Promise.all([
    getDailyCash(selectedDate),
    getMonthlyCash(m || 7, y || 2026),
  ]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <DailyCashContent
        dayData={dayData}
        monthData={monthData}
        selectedDate={selectedDate}
      />
    </div>
  );
}
