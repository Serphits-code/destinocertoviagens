"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";

export interface ReceivableItem {
  id: string;
  mondeId: string | null;
  saleId: string | null;
  saleNumber: string | null;
  customerName: string;
  customerDoc: string | null;
  description: string;
  document: string | null;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  status: string;
  paymentMethod: string | null;
  paymentMethodName: string | null;
}

export interface MethodDistribution {
  key: string;
  label: string;
  count: number;
  total: number;
  percentage: number;
}

export interface ReceivablesKPIs {
  totalAmount: number;
  totalCount: number;
  paidAmount: number;
  pendingAmount: number;
  methods: MethodDistribution[];
}

export async function getReceivables(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  paymentMethod?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  dateType?: "PAID" | "DUE";
}) {
  await requireAuth();

  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, params?.pageSize ?? 25));
  const skip = (page - 1) * pageSize;
  const dateType = params?.dateType ?? "PAID";

  const andConditions: any[] = [{ kind: "RECEBIMENTO" }];

  if (params?.search && params.search.trim()) {
    const q = params.search.trim();
    andConditions.push({
      OR: [
        { description: { contains: q, mode: "insensitive" } },
        { customer: { name: { contains: q, mode: "insensitive" } } },
        { customer: { cpf: { contains: q } } },
        { sale: { saleNumber: { contains: q, mode: "insensitive" } } },
        { document: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (params?.paymentMethod && params.paymentMethod !== "ALL") {
    if (params.paymentMethod === "PIX") {
      andConditions.push({
        OR: [
          { paymentMethod: "PIX" },
          { document: { contains: "PIX", mode: "insensitive" } },
        ],
      });
    } else if (params.paymentMethod === "DEPOSITO_CONTA") {
      andConditions.push({
        OR: [
          { paymentMethod: "DEPOSITO_CONTA" },
          { document: { contains: "DEPOS", mode: "insensitive" } },
          { document: { contains: "DEPOD", mode: "insensitive" } },
        ],
      });
    } else if (params.paymentMethod === "BOLETO") {
      andConditions.push({
        OR: [
          { paymentMethod: "BOLETO" },
          { document: { contains: "BOLETO", mode: "insensitive" } },
        ],
      });
    } else if (params.paymentMethod === "DINHEIRO") {
      andConditions.push({
        OR: [
          { paymentMethod: "DINHEIRO" },
          { document: { contains: "DINHEIRO", mode: "insensitive" } },
        ],
      });
    } else {
      andConditions.push({ paymentMethod: params.paymentMethod });
    }
  }

  if (params?.status && params.status !== "ALL") {
    andConditions.push({ status: params.status });
  }

  if (params?.startDate || params?.endDate) {
    if (dateType === "PAID") {
      const dateFilter: any = {};
      if (params.startDate) dateFilter.gte = new Date(`${params.startDate}T00:00:00.000Z`);
      if (params.endDate) dateFilter.lte = new Date(`${params.endDate}T23:59:59.999Z`);
      andConditions.push({ paidAt: dateFilter });
    } else {
      const dateFilter: any = {};
      if (params.startDate) dateFilter.gte = new Date(`${params.startDate}T00:00:00.000Z`);
      if (params.endDate) dateFilter.lte = new Date(`${params.endDate}T23:59:59.999Z`);
      andConditions.push({ dueDate: dateFilter });
    }
  }

  const where = { AND: andConditions };

  const orderBy =
    dateType === "PAID" && (params?.startDate || params?.endDate)
      ? [{ paidAt: "desc" as const }, { dueDate: "desc" as const }]
      : [{ dueDate: "desc" as const }];

  const [total, rows, aggregations] = await Promise.all([
    db.financialEntry.count({ where }),
    db.financialEntry.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: {
        customer: { select: { name: true, cpf: true } },
        sale: { select: { id: true, saleNumber: true } },
      },
    }),
    db.financialEntry.aggregate({
      _sum: { amount: true },
      where,
    }),
  ]);

  const items: ReceivableItem[] = rows.map((r) => ({
    id: r.id,
    mondeId: r.mondeId,
    saleId: r.sale?.id || null,
    saleNumber: r.sale?.saleNumber || null,
    customerName: r.customer?.name || "Cliente Não Informado",
    customerDoc: r.customer?.cpf || null,
    description: r.description,
    document: r.document,
    amount: Number(r.amount),
    dueDate: r.dueDate.toISOString().slice(0, 10),
    paidAt: r.paidAt ? r.paidAt.toISOString().slice(0, 10) : null,
    status: r.status,
    paymentMethod: r.paymentMethod,
    paymentMethodName: r.paymentMethodName || "Não Especificado",
  }));

  const totalPages = Math.ceil(total / pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    totalAmount: Number(aggregations._sum.amount ?? 0),
  };
}

export async function getReceivablesKPIs(params?: {
  startDate?: string;
  endDate?: string;
  dateType?: "PAID" | "DUE";
}): Promise<ReceivablesKPIs> {
  await requireAuth();

  const dateType = params?.dateType ?? "PAID";
  const where: any = {
    kind: "RECEBIMENTO",
  };

  if (params?.startDate || params?.endDate) {
    if (dateType === "PAID") {
      where.paidAt = {};
      if (params.startDate) where.paidAt.gte = new Date(`${params.startDate}T00:00:00.000Z`);
      if (params.endDate) where.paidAt.lte = new Date(`${params.endDate}T23:59:59.999Z`);
    } else {
      where.dueDate = {};
      if (params.startDate) where.dueDate.gte = new Date(`${params.startDate}T00:00:00.000Z`);
      if (params.endDate) where.dueDate.lte = new Date(`${params.endDate}T23:59:59.999Z`);
    }
  }

  const allReceipts = await db.financialEntry.findMany({
    where,
    select: {
      amount: true,
      status: true,
      paymentMethod: true,
      paymentMethodName: true,
    },
  });

  let totalAmount = 0;
  let paidAmount = 0;
  let pendingAmount = 0;

  const methodBuckets: Record<string, { label: string; count: number; total: number }> = {
    PIX: { label: "PIX", count: 0, total: 0 },
    DEPOSITO_CONTA: { label: "Depósito em Conta", count: 0, total: 0 },
    BOLETO: { label: "Boleto", count: 0, total: 0 },
    DINHEIRO: { label: "Dinheiro", count: 0, total: 0 },
    CARTAO_CREDITO: { label: "Cartão de Crédito", count: 0, total: 0 },
    CARTAO_DEBITO: { label: "Cartão de Débito", count: 0, total: 0 },
    BANCO: { label: "Débito em Conta", count: 0, total: 0 },
    CREDITO: { label: "Crédito Agência", count: 0, total: 0 },
    FATURADO: { label: "Faturado", count: 0, total: 0 },
    OUTROS: { label: "Outros", count: 0, total: 0 },
  };

  for (const r of allReceipts) {
    const val = Number(r.amount);
    totalAmount += val;
    if (r.status === "PAGO") paidAmount += val;
    else pendingAmount += val;

    const key = r.paymentMethod && methodBuckets[r.paymentMethod] ? r.paymentMethod : "OUTROS";
    methodBuckets[key].count++;
    methodBuckets[key].total += val;
  }

  const methods: MethodDistribution[] = Object.entries(methodBuckets)
    .filter(([, v]) => v.count > 0)
    .map(([key, v]) => ({
      key,
      label: v.label,
      count: v.count,
      total: v.total,
      percentage: totalAmount > 0 ? (v.total / totalAmount) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    totalAmount,
    totalCount: allReceipts.length,
    paidAmount,
    pendingAmount,
    methods,
  };
}
