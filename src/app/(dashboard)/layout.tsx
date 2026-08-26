import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { OfflineIndicator } from "@/components/OfflineIndicator";

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊", adminOnly: false },
  { href: "/transaksi", label: "Transaksi (POS)", icon: "🛒", adminOnly: false },
  { href: "/produk", label: "Produk", icon: "📦", adminOnly: false },
  { href: "/laporan", label: "Laporan", icon: "📈", adminOnly: true },
  { href: "/user", label: "User", icon: "👥", adminOnly: true },
  { href: "/settings", label: "Settings", icon: "⚙️", adminOnly: true },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top navbar */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-blue-600">POS-SaaS</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems
              .filter((item) => !item.adminOnly || role === "ADMIN")
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-800">
                {session.user.name}
              </p>
              <p className="text-xs text-gray-500">{role}</p>
            </div>
            <form action={handleSignOut}>
              <button
                type="submit"
                className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              >
                Logout
              </button>
            </form>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex overflow-x-auto gap-1 px-4 pb-2">
          {navItems
            .filter((item) => !item.adminOnly || role === "ADMIN")
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                {item.icon} {item.label}
              </Link>
            ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>

      {/* Offline-first sync indicator */}
      <OfflineIndicator />
    </div>
  );
}
