"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  requireAuth,
  requireWritePermission,
  requireAdmin,
} from "@/lib/auth-guards";

export interface SearchClientsParams {
  query?: string;
  state?: string;
  page?: number;
  pageSize?: number;
}

export async function searchClients({
  query = "",
  state = "",
  page = 1,
  pageSize = 20,
}: SearchClientsParams) {
  await requireAuth();

  const q = query.trim();
  const where: any = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { cpf: { contains: q } },
      { mobile: { contains: q } },
      { phone: { contains: q } },
      { email: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
    ];
  }

  if (state && state !== "ALL") {
    where.state = state;
  }

  const [total, clients] = await Promise.all([
    db.customer.count({ where }),
    db.customer.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedClients = clients.map((c) => ({
    ...c,
    birthDate: c.birthDate?.toISOString() ?? null,
    firstSaleDate: c.firstSaleDate?.toISOString() ?? null,
    lastSaleDate: c.lastSaleDate?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return {
    clients: serializedClients,
    total,
    totalPages: Math.ceil(total / pageSize),
    page,
  };
}

export async function getClientStats() {
  await requireAuth();

  const [total, withCpf, withMobile, withSales, states] = await Promise.all([
    db.customer.count(),
    db.customer.count({ where: { cpf: { not: null } } }),
    db.customer.count({ where: { mobile: { not: null } } }),
    db.customer.count({
      where: {
        OR: [{ firstSaleDate: { not: null } }, { lastSaleDate: { not: null } }],
      },
    }),
    db.customer.groupBy({
      by: ["state"],
      _count: { state: true },
      where: { state: { not: null } },
      orderBy: { _count: { state: "desc" } },
      take: 10,
    }),
  ]);

  return {
    total,
    withCpf,
    withMobile,
    withSales,
    states: states.map((s) => ({ state: s.state as string, count: s._count.state })),
  };
}

export async function updateClient(id: string, data: any) {
  try {
    await requireWritePermission();

    const updated = await db.customer.update({
      where: { id },
      data: {
        name: data.name,
        cpf: data.cpf || null,
        rg: data.rg || null,
        passport: data.passport || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        gender: data.gender || null,
        phone: data.phone || null,
        mobile: data.mobile || null,
        email: data.email || null,
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

    revalidatePath("/clientes");
    return { success: true, client: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao atualizar cliente" };
  }
}

export async function createClient(data: any) {
  try {
    await requireWritePermission();

    const created = await db.customer.create({
      data: {
        name: data.name,
        cpf: data.cpf || null,
        rg: data.rg || null,
        passport: data.passport || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        gender: data.gender || null,
        phone: data.phone || null,
        mobile: data.mobile || null,
        email: data.email || null,
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

    revalidatePath("/clientes");
    return { success: true, client: created };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao criar cliente" };
  }
}

export async function deleteClient(id: string) {
  try {
    await requireAdmin();

    await db.customer.delete({ where: { id } });
    revalidatePath("/clientes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao excluir cliente" };
  }
}

export async function getClientDetails(id: string) {
  await requireAuth();

  const client = await db.customer.findUnique({
    where: { id },
    include: {
      financialEntries: {
        orderBy: { dueDate: "desc" },
      },
      trips: {
        orderBy: { departureDate: "desc" },
      },
    },
  });

  if (!client) return null;

  const totalPurchased = client.financialEntries.reduce(
    (acc, e) => acc + Number(e.amount),
    0
  );
  const totalPaid = client.financialEntries
    .filter((e) => e.paidAt !== null)
    .reduce((acc, e) => acc + Number(e.amount), 0);
  const totalPending = totalPurchased - totalPaid;

  // Agregação de Companheiros Frequentes ("Com quem costuma viajar")
  const companionMap = new Map<
    string,
    {
      companionId: string;
      name: string;
      tripsCount: number;
      lastTripName: string;
      lastTripDate: string | null;
    }
  >();

  client.trips.forEach((t) => {
    const companions = (t.companionsJson as { customerId: string; name: string }[]) || [];
    companions.forEach((c) => {
      if (!companionMap.has(c.customerId)) {
        companionMap.set(c.customerId, {
          companionId: c.customerId,
          name: c.name,
          tripsCount: 0,
          lastTripName: t.groupName,
          lastTripDate: t.departureDate ? t.departureDate.toISOString() : null,
        });
      }
      const item = companionMap.get(c.customerId)!;
      item.tripsCount++;
    });
  });

  const frequentCompanions = Array.from(companionMap.values()).sort(
    (a, b) => b.tripsCount - a.tripsCount
  );

  return {
    client: {
      ...client,
      birthDate: client.birthDate?.toISOString() ?? null,
      firstSaleDate: client.firstSaleDate?.toISOString() ?? null,
      lastSaleDate: client.lastSaleDate?.toISOString() ?? null,
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
      financialEntries: client.financialEntries.map((e) => ({
        ...e,
        amount: Number(e.amount),
        dueDate: e.dueDate.toISOString(),
        paidAt: e.paidAt?.toISOString() ?? null,
        createdAt: e.createdAt.toISOString(),
      })),
      trips: client.trips.map((t) => ({
        ...t,
        departureDate: t.departureDate?.toISOString() ?? null,
        returnDate: t.returnDate?.toISOString() ?? null,
        createdAt: t.createdAt.toISOString(),
        companions: (t.companionsJson as { customerId: string; name: string }[]) || [],
      })),
    },
    financialSummary: {
      totalPurchased,
      totalPaid,
      totalPending,
      entriesCount: client.financialEntries.length,
    },
    travelSummary: {
      totalTrips: client.trips.length,
      groupTripsCount: client.trips.filter((t) => t.isGroupTrip).length,
      frequentCompanions,
    },
  };
}

