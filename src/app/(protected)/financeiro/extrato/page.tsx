import { Metadata } from "next";
import { getBankAccounts, getBankStatement } from "@/lib/actions/bank-accounts";
import { BankStatementView } from "./BankStatementView";

export const metadata: Metadata = {
  title: "Extrato Bancário & Conciliação | Destino Certo",
  description: "Extrato e conciliação bancária diária por conta corrente e caixa.",
};

export default async function BankStatementPage(props: {
  searchParams?: Promise<{ accountId?: string; startDate?: string; endDate?: string }>;
}) {
  const searchParams = await props.searchParams;
  const accounts = await getBankAccounts();

  // Seleciona Banco do Brasil como padrão se existir, senão a primeira conta
  const defaultAccount =
    accounts.find((a) => a.name.toLowerCase().includes("banco do brasil")) || accounts[0];

  const selectedAccountId = searchParams?.accountId || defaultAccount?.id || "";
  
  // Período padrão: 15/09/2026 a 17/09/2026 (ou datas passadas na URL)
  const startDate = searchParams?.startDate || "2026-09-15";
  const endDate = searchParams?.endDate || "2026-09-17";

  const initialStatement = selectedAccountId
    ? await getBankStatement({
        accountId: selectedAccountId,
        startDate,
        endDate,
      })
    : null;

  return (
    <div className="space-y-6">
      <BankStatementView
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        initialStatement={initialStatement}
        initialStartDate={startDate}
        initialEndDate={endDate}
      />
    </div>
  );
}
