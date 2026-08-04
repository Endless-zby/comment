export const PAGE_PERMISSIONS = [
  { key: "dashboard", label: "仪表盘", href: "/dashboard" },
  { key: "hotels", label: "酒店管理", href: "/hotels" },
  { key: "configs", label: "拉取配置", href: "/configs" },
  { key: "reviews", label: "评价列表", href: "/reviews" },
  { key: "stats", label: "评价统计", href: "/stats" },
  { key: "wordcloud", label: "评价词云", href: "/wordcloud" },
  { key: "ai-report", label: "AI 周报", href: "/ai-report" },
  { key: "track-match", label: "评价溯源", href: "/track-match" },
  { key: "alerts", label: "评价预警", href: "/alerts" },
  { key: "settings", label: "系统设置", href: "/settings" },
  { key: "admin-users", label: "用户审核", href: "/admin/users" },
  { key: "admin-roles", label: "角色权限", href: "/admin/roles" },
] as const;

export type PageKey = (typeof PAGE_PERMISSIONS)[number]["key"];

export const PUBLIC_PATHS = ["/login", "/register", "/pending"];

export function getPageKeyByPath(pathname: string): PageKey | null {
  const match = PAGE_PERMISSIONS.find((page) => {
    return pathname === page.href || pathname.startsWith(`${page.href}/`);
  });
  return match?.key ?? null;
}
