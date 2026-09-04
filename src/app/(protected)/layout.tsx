import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-(--background)">
      <Sidebar />
      
      <div className="flex-1 flex flex-col ml-[260px] min-w-0 overflow-x-hidden transition-all duration-300" id="main-content">
        {/* Header */}
        <header className="h-16 bg-(--surface) border-b border-(--border) flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-(--text-title)">
              Destino Certo
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserMenu user={session.user} />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
