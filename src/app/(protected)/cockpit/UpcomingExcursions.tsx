"use client";

import Link from "next/link";
import { Compass, Calendar, Users, ArrowRight, CheckCircle, Clock } from "lucide-react";

export interface ExcursionSummary {
  id: string;
  name: string;
  periodStart: string | null;
  periodEnd: string | null;
  slots: number;
  status: string;
  blocksCount: number;
}

interface UpcomingExcursionsProps {
  excursions: ExcursionSummary[];
}

function formatDate(dStr: string | null) {
  if (!dStr) return "Data a definir";
  return new Date(dStr).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function getCountdown(startStr: string | null) {
  if (!startStr) return null;
  const start = new Date(startStr);
  const now = new Date();
  start.setUTCHours(0, 0, 0, 0);
  now.setUTCHours(0, 0, 0, 0);
  const diffTime = start.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: "Viagem realizada", color: "text-(--text-muted) bg-slate-500/10" };
  if (diffDays === 0) return { text: "Embarque hoje! 🚀", color: "text-emerald-600 bg-emerald-500/10 font-bold animate-pulse" };
  if (diffDays === 1) return { text: "Embarque amanhã! ⏰", color: "text-amber-600 bg-amber-500/10 font-bold" };
  return { text: `Faltam ${diffDays} dias`, color: "text-primary bg-primary/10 font-semibold" };
}

export function UpcomingExcursions({ excursions }: UpcomingExcursionsProps) {
  return (
    <div className="p-6 rounded-3xl bg-(--surface) border border-(--border) shadow-(--shadow-card) space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Compass size={20} />
          </div>
          <div>
            <h3 className="font-bold text-base text-(--text-title)">
              Próximos Embarques & Viagens
            </h3>
            <p className="text-xs text-(--text-muted)">
              Excursões ativas no calendário da agência
            </p>
          </div>
        </div>

        <Link
          href="/excursoes"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
        >
          <span>Ver Todas</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      <div className="space-y-3">
        {excursions.length === 0 ? (
          <div className="py-8 text-center text-(--text-muted)">
            <Compass size={32} className="mx-auto mb-2 opacity-30" />
            <p className="font-semibold text-sm">Nenhuma excursão programada</p>
            <Link
              href="/excursoes"
              className="mt-2 inline-block text-xs text-primary font-semibold hover:underline"
            >
              Criar nova excursão
            </Link>
          </div>
        ) : (
          excursions.slice(0, 5).map((exc) => {
            const cd = getCountdown(exc.periodStart);

            return (
              <Link
                key={exc.id}
                href={`/excursoes/${exc.id}`}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-(--surface-subtle)/50 hover:bg-(--surface-subtle) border border-(--border) hover:border-primary/30 transition-all gap-3 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-(--text-title) group-hover:text-primary transition-colors truncate max-w-[280px]">
                      {exc.name}
                    </p>
                    {cd && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${cd.color}`}>
                        {cd.text}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-(--text-muted)">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>{formatDate(exc.periodStart)}</span>
                      {exc.periodEnd && (
                        <span> até {formatDate(exc.periodEnd)}</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className="flex items-center gap-1.5 text-xs text-(--text-title) font-semibold bg-(--surface) px-2.5 py-1 rounded-lg border border-(--border)">
                    <Users size={13} className="text-(--text-muted)" />
                    <span>{exc.slots} vagas</span>
                  </div>
                  <ArrowRight size={14} className="text-(--text-muted) group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
