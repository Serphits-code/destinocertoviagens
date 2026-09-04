import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserNotes, getUserDrawings } from "@/lib/actions/notes";
import { NotesCanvasContent } from "./NotesCanvasContent";

export const metadata = {
  title: "Quadro de Notas Pessoais | Destino Certo",
  description: "Seu espaço pessoal de anotações, lembretes e ideias estilo Miro.",
};

export default async function NotesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [notes, drawings] = await Promise.all([
    getUserNotes(),
    getUserDrawings(),
  ]);

  return (
    <NotesCanvasContent
      initialNotes={notes}
      initialDrawings={drawings}
      userName={session.user.name}
    />
  );
}
