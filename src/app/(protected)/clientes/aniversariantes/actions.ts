"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";

export interface BirthdayCustomer {
  id: string;
  name: string;
  birthDate: string;
  day: number;
  month: number;
  year: number | null;
  turningAge: number | null;
  mobile: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  cpf: string | null;
}

export interface MonthlyCount {
  month: number;
  count: number;
}

export async function getBirthdaysByMonth(
  month: number,
  targetYear?: number
): Promise<BirthdayCustomer[]> {
  await requireAuth();

  const safeMonth = Math.min(Math.max(Number(month) || 1, 1), 12);
  const currentYear = targetYear || new Date().getFullYear();

  const rows = await db.$queryRaw<
    Array<{
      id: string;
      name: string;
      birthDate: Date;
      day: number;
      month: number;
      year: number;
      mobile: string | null;
      phone: string | null;
      email: string | null;
      city: string | null;
      state: string | null;
      cpf: string | null;
    }>
  >`
    SELECT
      id,
      name,
      "birthDate",
      EXTRACT(DAY FROM "birthDate")::int AS day,
      EXTRACT(MONTH FROM "birthDate")::int AS month,
      EXTRACT(YEAR FROM "birthDate")::int AS year,
      mobile,
      phone,
      email,
      city,
      state,
      cpf
    FROM "Customer"
    WHERE "birthDate" IS NOT NULL
      AND EXTRACT(MONTH FROM "birthDate") = ${safeMonth}
    ORDER BY EXTRACT(DAY FROM "birthDate") ASC, name ASC
  `;

  return rows.map((r) => {
    const validYear = r.year && r.year > 1900 && r.year <= currentYear ? r.year : null;
    const turningAge = validYear ? currentYear - validYear : null;

    return {
      id: r.id,
      name: r.name,
      birthDate: r.birthDate.toISOString(),
      day: r.day,
      month: r.month,
      year: validYear,
      turningAge,
      mobile: r.mobile,
      phone: r.phone,
      email: r.email,
      city: r.city,
      state: r.state,
      cpf: r.cpf,
    };
  });
}

export async function getMonthlyBirthdayCounts(): Promise<MonthlyCount[]> {
  await requireAuth();

  const rows = await db.$queryRaw<
    Array<{
      month: number;
      count: number;
    }>
  >`
    SELECT
      EXTRACT(MONTH FROM "birthDate")::int AS month,
      COUNT(*)::int AS count
    FROM "Customer"
    WHERE "birthDate" IS NOT NULL
    GROUP BY EXTRACT(MONTH FROM "birthDate")
    ORDER BY month ASC
  `;

  // Preencher todos os 12 meses mesmo se algum mês não tiver registros
  const countsMap = new Map<number, number>();
  rows.forEach((r) => countsMap.set(Number(r.month), Number(r.count)));

  const result: MonthlyCount[] = [];
  for (let m = 1; m <= 12; m++) {
    result.push({
      month: m,
      count: countsMap.get(m) || 0,
    });
  }

  return result;
}
