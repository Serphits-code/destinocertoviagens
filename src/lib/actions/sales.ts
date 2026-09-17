"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";

export interface SaleSummaryItem {
  id: string;
  saleNumber: string;
  saleDate: string;
  departureDate: string | null;
  returnDate: string | null;
  customerName: string;
  customerDoc: string | null;
  sellerName: string | null;
  status: string;
  finalAmount: number;
  itemsCount: number;
  passengersCount: number;
}

export async function getSales(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  await requireAuth();

  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, params?.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where: any = {};

  if (params?.search && params.search.trim()) {
    const q = params.search.trim();
    where.OR = [
      { saleNumber: { contains: q, mode: "insensitive" } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
      { customer: { cpf: { contains: q } } },
      { seller: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  if (params?.status && params.status !== "ALL") {
    where.status = params.status;
  }

  if (params?.startDate || params?.endDate) {
    where.saleDate = {};
    if (params.startDate) where.saleDate.gte = new Date(`${params.startDate}T00:00:00.000Z`);
    if (params.endDate) where.saleDate.lte = new Date(`${params.endDate}T23:59:59.999Z`);
  }

  const [total, rows, aggregations] = await Promise.all([
    db.sale.count({ where }),
    db.sale.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { saleDate: "desc" },
      include: {
        customer: { select: { name: true, cpf: true } },
        seller: { select: { name: true } },
        _count: { select: { items: true, passengers: true } },
      },
    }),
    db.sale.aggregate({
      _sum: { finalAmount: true },
      where,
    }),
  ]);

  const sales: SaleSummaryItem[] = rows.map((r) => ({
    id: r.id,
    saleNumber: r.saleNumber,
    saleDate: r.saleDate.toISOString().slice(0, 10),
    departureDate: r.departureDate ? r.departureDate.toISOString().slice(0, 10) : null,
    returnDate: r.returnDate ? r.returnDate.toISOString().slice(0, 10) : null,
    customerName: r.customer.name,
    customerDoc: r.customer.cpf,
    sellerName: r.seller?.name || null,
    status: r.status,
    finalAmount: Number(r.finalAmount),
    itemsCount: r._count.items,
    passengersCount: r._count.passengers,
  }));

  return {
    sales,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    totalFaturado: Number(aggregations._sum.finalAmount ?? 0),
  };
}

export async function getSaleDetail(id: string) {
  await requireAuth();

  const sale = await db.sale.findUnique({
    where: { id },
    include: {
      customer: true,
      seller: true,
      excursion: { select: { id: true, name: true, destination: true } },
      items: {
        include: { supplier: { select: { id: true, name: true, category: true } } },
        orderBy: { createdAt: "asc" },
      },
      passengers: {
        include: { customer: { select: { id: true, name: true, cpf: true, birthDate: true, mobile: true } } },
      },
      financialEntries: {
        orderBy: { dueDate: "asc" },
      },
    },
  });

  if (!sale) return null;

  return {
    ...sale,
    totalProducts: Number(sale.totalProducts),
    totalTaxes: Number(sale.totalTaxes),
    serviceFee: Number(sale.serviceFee),
    discount: Number(sale.discount),
    finalAmount: Number(sale.finalAmount),
    saleDate: sale.saleDate.toISOString().slice(0, 10),
    departureDate: sale.departureDate ? sale.departureDate.toISOString().slice(0, 10) : null,
    returnDate: sale.returnDate ? sale.returnDate.toISOString().slice(0, 10) : null,
    items: sale.items.map((i) => ({
      ...i,
      unitPrice: Number(i.unitPrice),
      taxAmount: Number(i.taxAmount),
      totalAmount: Number(i.totalAmount),
      startDate: i.startDate ? i.startDate.toISOString().slice(0, 10) : null,
      endDate: i.endDate ? i.endDate.toISOString().slice(0, 10) : null,
    })),
    financialEntries: sale.financialEntries.map((f) => ({
      ...f,
      amount: Number(f.amount),
      dueDate: f.dueDate.toISOString().slice(0, 10),
      paidAt: f.paidAt ? f.paidAt.toISOString().slice(0, 10) : null,
    })),
  };
}
