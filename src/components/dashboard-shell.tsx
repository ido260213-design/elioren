import Link from "next/link";
import {
  Bookmark,
  Briefcase,
  LayoutDashboard,
  ListChecks,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  User as UserIcon,
  LogOut,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsBell } from "@/components/notifications-bell";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserRole } from "@/lib/supabase/database.types";
import { dashboardPathForRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/logout/actions";

function navItemsForRole(role: UserRole) {
  if (role === "teen") {
    return [
      { href: dashboardPathForRole(role), label: "Dashboard", icon: LayoutDashboard },
      { href: "/jobs", label: "Browse jobs", icon: Search },
      { href: "/map", label: "Map", icon: MapPin },
      { href: "/applications", label: "My applications", icon: ListChecks },
      { href: "/saved", label: "Saved", icon: Bookmark },
      { href: "/messages", label: "Messages", icon: MessageSquare },
      { href: "/assistant", label: "AI Assistant", icon: Sparkles },
    ];
  }

  return [
    { href: dashboardPathForRole(role), label: "Dashboard", icon: LayoutDashboard },
    { href: "/jobs/new", label: "Post a job", icon: Plus },
    { href: "/applications", label: "Applicants", icon: ListChecks },
    { href: "/messages", label: "Messages", icon: MessageSquare },
  ];
}

export async function DashboardShell({
  role,
  email,
  children,
}: {
  role: UserRole;
  email: string;
  children: React.ReactNode;
}) {
  const navItems = navItemsForRole(role);
  const initials = email.slice(0, 2).toUpperCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: notifications } = user
    ? await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href={dashboardPathForRole(role)} className="flex items-center gap-1.5 text-lg font-bold text-primary">
              <Briefcase className="size-5" />
              HireUp
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {navItems.map(({ href, label, icon: Icon }) => (
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
            {user && <NotificationsBell userId={user.id} initialNotifications={notifications ?? []} />}
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full">
                  <Avatar>
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-xs text-muted-foreground">{email}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <UserIcon />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={signOut}>
                  <button type="submit" className="w-full">
                    <DropdownMenuItem variant="destructive" asChild>
                      <span>
                        <LogOut />
                        Log out
                      </span>
                    </DropdownMenuItem>
                  </button>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-border px-2 py-1 sm:hidden">
          {navItems.map(({ href, label, icon: Icon }) => (
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
