"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";

export interface SellerMetricItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  commissionRate: number;
  salesCount: number;
  totalVolume: number;
  estimatedCommission: number;
}

export async function getSellersSummary(): Promise<SellerMetricItem[]> {
  await requireAuth();

  const sellers = await db.seller.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: {
      sales: {
        select: { finalAmount: true },
      },
    },
  });

  return sellers.map((s) => {
    const totalVolume = s.sales.reduce((acc, sale) => acc + Number(sale.finalAmount), 0);
    const estimatedCommission = totalVolume * (s.commissionRate / 100);

    return {
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      commissionRate: s.commissionRate,
      salesCount: s.sales.length,
      totalVolume,
      estimatedCommission,
    };
  });
}
