"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getPageKeyByPath, PageKey } from "@/lib/permissions";

export interface AuthUser {
  id: number;
  accountType: string;
  username: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  status: string;
  role: {
    id: number;
    name: string;
    isAdmin: boolean;
  } | null;
  permissions: string[];
}

interface AuthContextValue {
  user: AuthUser;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function canAccessPage(user: AuthUser, pageKey: PageKey | null) {
  if (!pageKey) return true;
  if (pageKey.startsWith("admin-") && !user.role?.isAdmin) return false;
  if (user.permissions.includes("*")) return true;
  return user.permissions.includes(pageKey);
}

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const loadUser = useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.user) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      const nextUser = data.user as AuthUser;
      if (nextUser.status !== "approved") {
        router.replace("/pending");
        return;
      }

      if (!canAccessPage(nextUser, getPageKeyByPath(pathname))) {
        setForbidden(true);
        setUser(nextUser);
        return;
      }

      setUser(nextUser);
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const value = useMemo<AuthContextValue | null>(() => {
    if (!user) return null;
    return { user, refresh: loadUser };
  }, [loadUser, user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        正在验证登录状态...
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold">无权访问该页面</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            当前账号未分配此页面权限，请联系管理员调整角色。
          </p>
          <Button asChild className="mt-5">
            <Link href="/dashboard">返回仪表盘</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!value) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthUser() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuthUser must be used inside AuthGate");
  }
  return value;
}
