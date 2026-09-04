"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, requireWritePermission } from "@/lib/auth-guards";

export interface CustomerSearchResult {
  id: string;
  name: string;
  cpf: string | null;
  rg: string | null;
  birthDate: string | null;
  age: number | null;
  suggestedType: string;
  gender: string | null;
  mobile: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
}

function calculateAgeAndType(birthDate: Date | null): {
  age: number | null;
  suggestedType: string;
} {
  if (!birthDate) return { age: null, suggestedType: "Adulto" };
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < 2) return { age, suggestedType: "Bebê" };
  if (age < 12) return { age, suggestedType: "Criança (2a)" };
  return { age, suggestedType: "Adulto" };
}

export async function searchCustomersForRoomList(
  query = ""
): Promise<CustomerSearchResult[]> {
  await requireAuth();

  const q = query.trim();

  const where: any = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { cpf: { contains: q } },
      { mobile: { contains: q } },
      { phone: { contains: q } },
      { rg: { contains: q } },
    ];
  }

  const customers = await db.customer.findMany({
    where,
    take: 25,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      cpf: true,
      rg: true,
      birthDate: true,
      gender: true,
      mobile: true,
      phone: true,
      city: true,
      state: true,
      notes: true,
    },
  });

  return customers.map((c) => {
    const { age, suggestedType } = calculateAgeAndType(c.birthDate);
    return {
      id: c.id,
      name: c.name,
      cpf: c.cpf,
      rg: c.rg,
      birthDate: c.birthDate ? c.birthDate.toISOString().split("T")[0] : null,
      age,
      suggestedType,
      gender: c.gender,
      mobile: c.mobile,
      phone: c.phone,
      city: c.city,
      state: c.state,
      notes: c.notes,
    };
  });
}

export interface QuickCustomerInput {
  name: string;
  cpf?: string;
  rg?: string;
  birthDate?: string;
  mobile?: string;
  notes?: string;
}

export async function quickCreateCustomer(data: QuickCustomerInput): Promise<{
  success: boolean;
  customer?: CustomerSearchResult;
  error?: string;
}> {
  try {
    await requireWritePermission();

    if (!data.name || !data.name.trim()) {
      return { success: false, error: "Nome é obrigatório." };
    }

    const birthDateObj = data.birthDate ? new Date(data.birthDate) : null;

    const created = await db.customer.create({
      data: {
        name: data.name.trim().toUpperCase(),
        cpf: data.cpf?.trim() || null,
        rg: data.rg?.trim() || null,
        birthDate: birthDateObj,
        mobile: data.mobile?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    });

    const { age, suggestedType } = calculateAgeAndType(created.birthDate);

    revalidatePath("/clientes");

    return {
      success: true,
      customer: {
        id: created.id,
        name: created.name,
        cpf: created.cpf,
        rg: created.rg,
        birthDate: created.birthDate
          ? created.birthDate.toISOString().split("T")[0]
          : null,
        age,
        suggestedType,
        gender: created.gender,
        mobile: created.mobile,
        phone: created.phone,
        city: created.city,
        state: created.state,
        notes: created.notes,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Erro ao cadastrar passageiro.",
    };
  }
}

export async function getCustomersBirthdays(
  guests: Array<{ customerId?: string; name?: string; document?: string }>
): Promise<Record<string, string>> {
  try {
    await requireAuth();

    const ids = guests.map((g) => g.customerId).filter(Boolean) as string[];
    const names = guests.map((g) => g.name?.trim()).filter(Boolean) as string[];
    const docs = guests
      .map((g) => g.document?.replace(/\D/g, ""))
      .filter(Boolean) as string[];

    if (ids.length === 0 && names.length === 0 && docs.length === 0) {
      return {};
    }

    const orClauses: any[] = [];
    if (ids.length > 0) orClauses.push({ id: { in: ids } });
    if (names.length > 0) orClauses.push({ name: { in: names, mode: "insensitive" } });
    if (docs.length > 0) orClauses.push({ cpf: { in: docs } });

    const customers = await db.customer.findMany({
      where: {
        OR: orClauses,
        birthDate: { not: null },
      },
      select: {
        id: true,
        name: true,
        cpf: true,
        birthDate: true,
      },
    });

    const map: Record<string, string> = {};
    for (const c of customers) {
      if (c.birthDate) {
        const iso = c.birthDate.toISOString().split("T")[0];
        if (c.id) map[c.id] = iso;
        if (c.name) map[c.name.trim().toLowerCase()] = iso;
        if (c.cpf) map[c.cpf.replace(/\D/g, "")] = iso;
      }
    }

    return map;
  } catch (err) {
    console.error("Erro ao buscar aniversários de clientes:", err);
    return {};
  }
}
