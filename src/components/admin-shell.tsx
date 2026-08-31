import Link from "next/link";
import { Flag, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/logout/actions";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/verification", label: "Verification", icon: ShieldCheck },
  { href: "/admin/reports", label: "Reports", icon: Flag },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-lg font-bold text-primary">
              HireUp Admin
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <Button key={href} asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                  <Link href={href}>
                    <Icon className="size-4" />
                    {label}
                  </Link>
                </Button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="icon" aria-label="Log out">
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-border px-2 py-1 sm:hidden">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Button key={href} asChild variant="ghost" size="sm" className="shrink-0 gap-1.5 text-muted-foreground">
              <Link href={href}>
                <Icon className="size-4" />
                {label}
              </Link>
            </Button>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
