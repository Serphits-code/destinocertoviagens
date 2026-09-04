import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCustomerSocialGraph } from "@/lib/actions/social-network";
import { SocialNetworkContent } from "./SocialNetworkContent";

export const metadata = {
  title: "Rede Social de Clientes — Destino Certo",
  description:
    "Visualização interativa das conexões entre clientes e companhias de viagem estilo Obsidian Graph View.",
};

export default async function RedeSocialPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const graphData = await getCustomerSocialGraph({
    minConnections: 1,
    limit: 180,
  });

  return <SocialNetworkContent initialData={graphData} />;
}
