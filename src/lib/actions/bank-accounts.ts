"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, requireWritePermission } from "@/lib/auth-guards";

export interface BankAccountItem {
  id: string;
  name: string;
  bankCode: string | null;
  agency: string | null;
  accountNumber: string | null;
  type: string;
  initialBalance: number;
  currentBalance: number;
}

export interface BankStatementTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  document: string | null;
  categoryName: string | null;
  personName: string | null;
  personDoc: string | null;
  isReconciled: boolean;
  financialEntryId: string | null;
}

export interface BankStatementResult {
  account: BankAccountItem;
  transactions: BankStatementTransaction[];
  saldoAnterior: number;
  totalEntradas: number;
  totalSaidas: number;
  saldoPeriodo: number;
  saldoFinal: number;
}

export async function getBankAccounts(): Promise<BankAccountItem[]> {
  await requireAuth();

  const accounts = await db.bankAccount.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { transactions: true } },
    },
  });

  // Calcular saldos acumulados
  const balances = await db.$queryRaw<Array<{ accountId: string; total: number }>>`
    SELECT "accountId", COALESCE(SUM(amount), 0)::float AS total
    FROM "BankTransaction"
    GROUP BY "accountId"
  `;
  const balanceMap = new Map(balances.map((b) => [b.accountId, b.total]));

  return accounts.map((a) => {
    const txTotal = balanceMap.get(a.id) || 0;
    const current = Number(a.initialBalance) + txTotal;
    return {
      id: a.id,
      name: a.name,
      bankCode: a.bankCode,
      agency: a.agency,
      accountNumber: a.accountNumber,
      type: a.type,
      initialBalance: Number(a.initialBalance),
      currentBalance: current,
    };
  });
}

export async function getBankStatement(params: {
  accountId: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
}): Promise<BankStatementResult | null> {
  await requireAuth();

  const account = await db.bankAccount.findUnique({
    where: { id: params.accountId },
  });
  if (!account) return null;

  const start = new Date(`${params.startDate}T00:00:00.000Z`);
  const end = new Date(`${params.endDate}T23:59:59.999Z`);

  // 1. Saldo Anterior (antes de start)
  const prevSumRaw = await db.bankTransaction.aggregate({
    _sum: { amount: true },
    where: {
      accountId: params.accountId,
      date: { lt: start },
    },
  });
  const saldoAnterior = Number(account.initialBalance) + Number(prevSumRaw._sum.amount ?? 0);

  // 2. Transações do Período
  const rows = await db.bankTransaction.findMany({
    where: {
      accountId: params.accountId,
      date: { gte: start, lte: end },
    },
    orderBy: [{ date: "asc" }, { amount: "desc" }],
  });

  let totalEntradas = 0;
  let totalSaidas = 0;

  const transactions: BankStatementTransaction[] = rows.map((r) => {
    const val = Number(r.amount);
    if (val >= 0) totalEntradas += val;
    else totalSaidas += Math.abs(val);

    return {
      id: r.id,
      date: r.date.toISOString().slice(0, 10),
      amount: val,
      description: r.description,
      document: r.document,
      categoryName: r.categoryName,
      personName: r.personName,
      personDoc: r.personDoc,
      isReconciled: r.isReconciled,
      financialEntryId: r.financialEntryId,
    };
  });

  const saldoPeriodo = totalEntradas - totalSaidas;
  const saldoFinal = saldoAnterior + saldoPeriodo;

  return {
    account: {
      id: account.id,
      name: account.name,
      bankCode: account.bankCode,
      agency: account.agency,
      accountNumber: account.accountNumber,
      type: account.type,
      initialBalance: Number(account.initialBalance),
      currentBalance: saldoFinal,
    },
    transactions,
    saldoAnterior,
    totalEntradas,
    totalSaidas,
    saldoPeriodo,
    saldoFinal,
  };
}

export async function createBankTransfer(params: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description?: string;
}) {
  await requireWritePermission();

  if (params.amount <= 0) throw new Error("Valor da transferência deve ser maior que zero.");
  if (params.fromAccountId === params.toAccountId) throw new Error("Contas de origem e destino devem ser diferentes.");

  const [fromAcc, toAcc] = await Promise.all([
    db.bankAccount.findUnique({ where: { id: params.fromAccountId } }),
    db.bankAccount.findUnique({ where: { id: params.toAccountId } }),
  ]);
  if (!fromAcc || !toAcc) throw new Error("Conta não encontrada.");

  const dt = new Date(`${params.date}T12:00:00.000Z`);
  const desc = params.description?.trim() || `Transferência para: ${toAcc.name}`;

  // Executa tudo em transação
  await db.$transaction(async (tx) => {
    // 1. Registro de transferência
    const transfer = await tx.bankTransfer.create({
      data: {
        fromAccountId: params.fromAccountId,
        toAccountId: params.toAccountId,
        amount: params.amount,
        date: dt,
        description: desc,
      },
    });

    // 2. Débito na conta de origem
    await tx.bankTransaction.create({
      data: {
        accountId: params.fromAccountId,
        date: dt,
        amount: -params.amount,
        description: `Transferência para: ${toAcc.name}`,
        document: "TRANSFERÊNCIA",
        isReconciled: true,
      },
    });

    // 3. Crédito na conta de destino
    await tx.bankTransaction.create({
      data: {
        accountId: params.toAccountId,
        date: dt,
        amount: params.amount,
        description: `Transferência recebida de: ${fromAcc.name}`,
        document: "TRANSFERÊNCIA",
        isReconciled: true,
      },
    });
  });

  revalidatePath("/financeiro/extrato");
  return { success: true };
}

export async function toggleReconciliation(transactionId: string, isReconciled: boolean) {
  await requireWritePermission();

  await db.bankTransaction.update({
    where: { id: transactionId },
    data: { isReconciled },
  });

  revalidatePath("/financeiro/extrato");
  return { success: true };
}
