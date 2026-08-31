"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notifications";
import type { Database } from "@/lib/supabase/database.types";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

function describeNotification(n: NotificationRow): { message: string; href: string } {
  if (n.type === "application_status_changed") {
    const status = (n.payload as { status?: string }).status ?? "updated";
    return { message: `Your application status changed to "${status}"`, href: "/applications" };
  }
  const conversationId = (n.payload as { conversation_id?: string }).conversation_id;
  return { message: "You have a new message", href: conversationId ? `/messages/${conversationId}` : "/messages" };
}

export function NotificationsBell({
  userId,
  initialNotifications,
}: {
  userId: string;
  initialNotifications: NotificationRow[];
}) {
  const [notifications, setNotifications] = React.useState(initialNotifications);
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          setNotifications((prev) => [payload.new as NotificationRow, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function handleOpenNotification(n: NotificationRow) {
    if (!n.read_at) {
      setNotifications((prev) => prev.map((p) => (p.id === n.id ? { ...p, read_at: new Date().toISOString() } : p)));
      await markNotificationRead(n.id);
    }
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((p) => ({ ...p, read_at: p.read_at ?? new Date().toISOString() })));
    await markAllNotificationsRead();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 justify-center px-1 text-[10px]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
        ) : (
          notifications.map((n) => {
            const { message, href } = describeNotification(n);
            return (
              <DropdownMenuItem key={n.id} asChild onClick={() => handleOpenNotification(n)}>
                <Link href={href} className="flex flex-col items-start gap-0.5 whitespace-normal">
                  <span className={n.read_at ? "text-muted-foreground" : "font-medium"}>{message}</span>
                  <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
                </Link>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
