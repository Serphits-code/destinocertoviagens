import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getBirthdaysByMonth, getMonthlyBirthdayCounts } from "./actions";
import { BirthdaysContent } from "./BirthdaysContent";

export const metadata = {
  title: "Aniversariantes do Mês — Destino Certo",
  description: "Acompanhe e parabenize os aniversariantes do mês na Destino Certo",
};

interface PageProps {
  searchParams?: Promise<{
    mes?: string;
  }>;
}

export default async function BirthdaysPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const resolvedParams = searchParams ? await searchParams : undefined;
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const paramMonth = resolvedParams?.mes ? parseInt(resolvedParams.mes, 10) : NaN;
  const initialMonth = !isNaN(paramMonth) && paramMonth >= 1 && paramMonth <= 12
    ? paramMonth
    : currentMonth;

  const [initialClients, initialCounts] = await Promise.all([
    getBirthdaysByMonth(initialMonth, currentYear),
    getMonthlyBirthdayCounts(),
  ]);

  return (
    <BirthdaysContent
      initialClients={initialClients}
      initialCounts={initialCounts}
      initialMonth={initialMonth}
      currentYear={currentYear}
    />
  );
}
