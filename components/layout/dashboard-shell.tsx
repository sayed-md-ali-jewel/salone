import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import {
  BarChart3,
  Banknote,
  BriefcaseBusiness,
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Scissors,
  Settings,
  Users,
  WalletCards
} from "lucide-react";
import { AuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/employees", label: "Employees", icon: BriefcaseBusiness },
  { href: "/services", label: "Services", icon: Scissors },
  { href: "/entries", label: "Daily Entry", icon: CalendarCheck },
  { href: "/expenses", label: "Expenses", icon: WalletCards },
  { href: "/staff-payments", label: "Staff Payments", icon: Banknote },
  { href: "/offers", label: "Offers", icon: Megaphone },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings }
] as const;

export function DashboardShell({ user, children }: { user: AuthUser; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card px-4 py-5 lg:block">
        <Link href="/dashboard" className="mb-8 flex items-center gap-3">
          <Image src="/royal-arob.jpeg" alt="Royale Arab Men's Club logo" width={48} height={48} className="h-12 w-12 rounded-full border object-cover" priority />
          <div>
            <div className="text-sm font-semibold">Royale Arab</div>
            <div className="text-xs text-muted-foreground">Management Suite</div>
          </div>
        </Link>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Welcome back</p>
              <h1 className="text-lg font-semibold">{user.name}</h1>
            </div>
            <div className="flex items-center gap-3">
              <Badge>{user.role}</Badge>
              <form action="/api/auth/logout" method="post">
                <Button type="submit" variant="outline" size="sm">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </form>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
