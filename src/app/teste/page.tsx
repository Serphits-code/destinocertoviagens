import type { Metadata } from "next";
import { WorldMapExperience } from "./WorldMapExperience";

export const metadata: Metadata = {
  title: "Mapa Mundi Interativo — De Recife para o Mundo | Destino Certo",
  description:
    "Mapa mundi interativo com zoom construtivo e flat design, iniciando no Recife (Marco Zero) e se expandindo pelos seis continentes ao rolar a página.",
};

export default function TestePage() {
  return (
    <main className="min-h-screen bg-[#070A12] text-slate-100 overflow-x-hidden">
      <WorldMapExperience />
    </main>
  );
}
