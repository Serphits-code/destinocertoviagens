import { Metadata } from "next";
import { getSellersSummary } from "@/lib/actions/sellers";
import { SellersContent } from "./SellersContent";

export const metadata: Metadata = {
  title: "Vendedores & Metas | Destino Certo",
  description: "Acompanhamento da equipe comercial, metas e comissões.",
};

export default async function SellersPage() {
  const sellers = await getSellersSummary();

  return (
    <div className="space-y-6">
      <SellersContent sellers={sellers} />
    </div>
  );
}
