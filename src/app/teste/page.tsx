import type { Metadata } from "next";
import { WorldMapExperience } from "./WorldMapExperience";

export const metadata: Metadata = {
  title: "Mapa Mundi — Destino Certo",
  description: "Mapa mundi clean em linhas partindo de Recife com transição suave para preenchimento laranja.",
};

export default function TestePage() {
  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      <WorldMapExperience />
    </main>
  );
}
