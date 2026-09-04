"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  requireAuth,
  requireWritePermission,
  requireAdmin,
} from "@/lib/auth-guards";

export interface SearchSuppliersParams {
  query?: string;
  category?: string;
  state?: string;
  page?: number;
  pageSize?: number;
}

export async function searchSuppliers({
  query = "",
  category = "",
  state = "",
  page = 1,
  pageSize = 20,
}: SearchSuppliersParams) {
  await requireAuth();

  const q = query.trim();
  const where: any = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { tradeName: { contains: q, mode: "insensitive" } },
      { cnpj: { contains: q } },
      { phone: { contains: q } },
      { mobile: { contains: q } },
      { email: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
    ];
  }

  if (category && category !== "ALL") {
    where.category = category;
  }

  if (state && state !== "ALL") {
    where.state = state;
  }

  const [total, suppliers] = await Promise.all([
    db.supplier.count({ where }),
    db.supplier.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedSuppliers = suppliers.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  return {
    suppliers: serializedSuppliers,
    total,
    totalPages: Math.ceil(total / pageSize),
    page,
  };
}

export async function getSupplierStats() {
  await requireAuth();

  const [total, withCnpj, withPhone, withEmail, categories] = await Promise.all([
    db.supplier.count(),
    db.supplier.count({ where: { cnpj: { not: null } } }),
    db.supplier.count({
      where: {
        OR: [{ phone: { not: null } }, { mobile: { not: null } }],
      },
    }),
    db.supplier.count({ where: { email: { not: null } } }),
    db.supplier.groupBy({
      by: ["category"],
      _count: { category: true },
      where: { category: { not: null } },
      orderBy: { _count: { category: "desc" } },
      take: 10,
    }),
  ]);

  return {
    total,
    withCnpj,
    withPhone,
    withEmail,
    categories: categories.map((c) => ({
      name: c.category as string,
      count: c._count.category,
    })),
  };
}

export async function updateSupplier(id: string, data: any) {
  try {
    await requireWritePermission();

    const updated = await db.supplier.update({
      where: { id },
      data: {
        name: data.name,
        tradeName: data.tradeName || null,
        cnpj: data.cnpj || null,
        ie: data.ie || null,
        category: data.category || null,
        phone: data.phone || null,
        mobile: data.mobile || null,
        email: data.email || null,
        website: data.website || null,
        address: data.address || null,
        number: data.number || null,
        complement: data.complement || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
        notes: data.notes || null,
      },
    });

    revalidatePath("/fornecedores");
    return { success: true, supplier: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao atualizar fornecedor" };
  }
}

export async function createSupplier(data: any) {
  try {
    await requireWritePermission();

    const created = await db.supplier.create({
      data: {
        name: data.name,
        tradeName: data.tradeName || null,
        cnpj: data.cnpj || null,
        ie: data.ie || null,
        category: data.category || "Parceiro Geral",
        phone: data.phone || null,
        mobile: data.mobile || null,
        email: data.email || null,
        website: data.website || null,
        address: data.address || null,
        number: data.number || null,
        complement: data.complement || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
        notes: data.notes || null,
      },
    });

    revalidatePath("/fornecedores");
    return { success: true, supplier: created };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao criar fornecedor" };
  }
}

export async function deleteSupplier(id: string) {
  try {
    await requireAdmin();

    await db.supplier.delete({ where: { id } });
    revalidatePath("/fornecedores");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao excluir fornecedor" };
  }
}

export async function getSupplierDetails(id: string) {
  await requireAuth();

  const supplier = await db.supplier.findUnique({
    where: { id },
    include: {
      financialEntries: {
        orderBy: { dueDate: "desc" },
      },
    },
  });

  if (!supplier) return null;

  const totalInvoiced = supplier.financialEntries.reduce(
    (acc, e) => acc + Number(e.amount),
    0
  );
  const totalPaid = supplier.financialEntries
    .filter((e) => e.paidAt !== null)
    .reduce((acc, e) => acc + Number(e.amount), 0);
  const totalPending = totalInvoiced - totalPaid;

  return {
    supplier: {
      ...supplier,
      createdAt: supplier.createdAt.toISOString(),
      updatedAt: supplier.updatedAt.toISOString(),
      financialEntries: supplier.financialEntries.map((e) => ({
        ...e,
        amount: Number(e.amount),
        dueDate: e.dueDate.toISOString(),
        paidAt: e.paidAt?.toISOString() ?? null,
        createdAt: e.createdAt.toISOString(),
      })),
    },
    financialSummary: {
      totalInvoiced,
      totalPaid,
      totalPending,
      entriesCount: supplier.financialEntries.length,
    },
  };
}

