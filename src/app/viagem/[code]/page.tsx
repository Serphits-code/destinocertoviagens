// src/app/viagem/[code]/page.tsx
import { notFound } from "next/navigation";
import { getPublicTripData } from "@/lib/actions/share-package";
import { TripPortalView } from "./TripPortalView";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const trip = await getPublicTripData(code);

  if (!trip.found) {
    return {
      title: "Viagem não encontrada | Destino Certo",
    };
  }

  return {
    title: `${trip.title || "Guia da Viagem"} | Destino Certo`,
    description: `Roteiro, voos e detalhes da viagem para ${trip.destination || trip.title}`,
  };
}

export default async function PublicTripPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const trip = await getPublicTripData(code);

  if (!trip.found) {
    if (trip.reason === "INACTIVE") {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
              ⏳
            </div>
            <h2 className="text-xl font-bold text-white">Link Temporariamente Suspenso</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              O acesso a esta viagem foi suspenso temporariamente pela agência. Por favor, entre em contato com seu agente da Destino Certo.
            </p>
          </div>
        </div>
      );
    }

    notFound();
  }

  return <TripPortalView trip={trip} shareCode={code} />;
}
