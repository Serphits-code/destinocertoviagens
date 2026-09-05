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

import { z } from "zod";

const supplierInputSchema = z.object({
  name: z.string().trim().min(2, "Nome da empresa/parceiro deve ter no mínimo 2 caracteres."),
  tradeName: z.string().trim().optional().nullable(),
  cnpj: z.string().trim().optional().nullable(),
  ie: z.string().trim().optional().nullable(),
  category: z.string().trim().optional().nullable(),
  phone: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")).nullable(),
  website: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  complement: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function getSupplierStats() {
  await requireAuth();

  const [statsRows, categories] = await Promise.all([
    db.$queryRaw<Array<{ total: number; withCnpj: number; withPhone: number; withEmail: number }>>`
      SELECT
        COUNT(*)::int AS total,
        COUNT(cnpj)::int AS "withCnpj",
        COUNT(CASE WHEN phone IS NOT NULL OR mobile IS NOT NULL THEN 1 END)::int AS "withPhone",
        COUNT(email)::int AS "withEmail"
      FROM "Supplier"
    `,
    db.supplier.groupBy({
      by: ["category"],
      _count: { category: true },
      where: { category: { not: null } },
      orderBy: { _count: { category: "desc" } },
      take: 10,
    }),
  ]);

  const stats = statsRows[0] || { total: 0, withCnpj: 0, withPhone: 0, withEmail: 0 };

  return {
    total: stats.total,
    withCnpj: stats.withCnpj,
    withPhone: stats.withPhone,
    withEmail: stats.withEmail,
    categories: categories.map((c) => ({
      name: c.category as string,
      count: c._count.category,
    })),
  };
}

export async function updateSupplier(id: string, data: any) {
  try {
    await requireWritePermission();

    const parsed = supplierInputSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const clean = parsed.data;

    const updated = await db.supplier.update({
      where: { id },
      data: {
        name: clean.name,
        tradeName: clean.tradeName || null,
        cnpj: clean.cnpj?.replace(/[^\d]/g, "") || null,
        ie: clean.ie || null,
        category: clean.category || null,
        phone: clean.phone || null,
        mobile: clean.mobile || null,
        email: clean.email || null,
        website: clean.website || null,
        address: clean.address || null,
        number: clean.number || null,
        complement: clean.complement || null,
        neighborhood: clean.neighborhood || null,
        city: clean.city || null,
        state: clean.state || null,
        zipCode: clean.zipCode?.replace(/[^\d]/g, "") || null,
        notes: clean.notes || null,
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

    const parsed = supplierInputSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const clean = parsed.data;

    const created = await db.supplier.create({
      data: {
        name: clean.name,
        tradeName: clean.tradeName || null,
        cnpj: clean.cnpj?.replace(/[^\d]/g, "") || null,
        ie: clean.ie || null,
        category: clean.category || "Parceiro Geral",
        phone: clean.phone || null,
        mobile: clean.mobile || null,
        email: clean.email || null,
        website: clean.website || null,
        address: clean.address || null,
        number: clean.number || null,
        complement: clean.complement || null,
        neighborhood: clean.neighborhood || null,
        city: clean.city || null,
        state: clean.state || null,
        zipCode: clean.zipCode?.replace(/[^\d]/g, "") || null,
        notes: clean.notes || null,
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

