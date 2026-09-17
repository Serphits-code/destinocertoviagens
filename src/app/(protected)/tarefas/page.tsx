import { Metadata } from "next";
import { getTasks } from "@/lib/actions/crm-tasks";
import { TasksContent } from "./TasksContent";

export const metadata: Metadata = {
  title: "Tarefas & Atendimento (CRM) | Destino Certo",
  description: "Gestão de follow-up, atendimentos e chamados de clientes.",
};

export default async function TasksPage(props: {
  searchParams?: Promise<{
    status?: string;
    priority?: string;
    search?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const status = searchParams?.status || "ALL";
  const priority = searchParams?.priority || "ALL";
  const search = searchParams?.search || "";

  const data = await getTasks({
    status,
    priority,
    search,
  });

  return (
    <div className="space-y-6">
      <TasksContent
        initialData={data}
        initialStatus={status}
        initialPriority={priority}
        initialSearch={search}
      />
    </div>
  );
}
