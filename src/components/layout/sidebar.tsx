"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Settings2,
  MessageSquare,
  BarChart3,
  Settings,
  Cloud,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "仪表盘", icon: LayoutDashboard },
  { href: "/hotels", label: "酒店管理", icon: Building2 },
  { href: "/configs", label: "拉取配置", icon: Settings2 },
  { href: "/reviews", label: "评价列表", icon: MessageSquare },
  { href: "/stats", label: "评价统计", icon: BarChart3 },
  { href: "/wordcloud", label: "评价词云", icon: Cloud },
  { href: "/ai-report", label: "AI 周报", icon: Sparkles },
  { href: "/track-match", label: "评价溯源", icon: ShieldCheck },
  { href: "/settings", label: "系统设置", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-56 border-r bg-card">
      <div className="flex h-full flex-col">
        <div className="flex h-14 items-center border-b px-4">
          <h1 className="text-lg font-semibold text-foreground">
            携程评价监控
          </h1>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
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
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4">
          <p className="text-xs text-muted-foreground">
            v0.1.0 · 本地部署
          </p>
        </div>
      </div>
    </aside>
  );
}
