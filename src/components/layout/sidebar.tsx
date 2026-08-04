"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PAGE_PERMISSIONS, PageKey } from "@/lib/permissions";
import { useAuthUser } from "./auth-provider";
import {
  BarChart3,
  Bell,
  Building2,
  Cloud,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserCog,
  UsersRound,
} from "lucide-react";

const iconMap: Record<PageKey, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  hotels: Building2,
  configs: Settings2,
  reviews: MessageSquare,
  stats: BarChart3,
  wordcloud: Cloud,
  "ai-report": Sparkles,
  "track-match": ShieldCheck,
  alerts: Bell,
  settings: Settings,
  "admin-users": UsersRound,
  "admin-roles": UserCog,
};

function canShowItem(userPermissions: string[], pageKey: PageKey) {
  return userPermissions.includes("*") || userPermissions.includes(pageKey);
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthUser();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!canShowItem(user.permissions, "alerts")) return;

    const es = new EventSource("/api/alerts/stream");
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "alert-count") {
          setUnreadCount(data.unreadCount);
        }
      } catch {}
    };
    es.onerror = () => es.close();

    return () => es.close();
  }, [user.permissions]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  const visibleItems = PAGE_PERMISSIONS.filter((item) => {
    if (item.key.startsWith("admin-") && !user.role?.isAdmin) return false;
    return canShowItem(user.permissions, item.key);
  });

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-56 border-r bg-card">
      <div className="flex h-full flex-col">
        <div className="flex h-14 items-center border-b px-4">
          <h1 className="text-lg font-semibold text-foreground">酒店评价监控</h1>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {visibleItems.map((item) => {
            const Icon = iconMap[item.key];
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{item.label}</span>
                {item.href === "/alerts" && unreadCount > 0 && (
                  <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4">
          <div className="mb-3 min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {user.nickname || user.username || `用户 ${user.id}`}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.role?.name || "未分配角色"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? "退出中..." : "退出登录"}
          </button>
          <p className="mt-3 text-xs text-muted-foreground">v0.1.0 本地部署</p>
        </div>
      </div>
    </aside>
  );
}
