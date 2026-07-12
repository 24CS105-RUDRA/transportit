import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { Providers } from "@/components/Providers";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <Providers>
      <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Sidebar role={session.role} name={session.name} email={session.email} />
        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-end gap-3 border-b border-zinc-200 bg-white px-8 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto p-8">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
