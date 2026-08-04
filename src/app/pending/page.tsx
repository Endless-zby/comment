"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, LogOut } from "lucide-react";

export default function PendingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>("pending");

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (data?.user?.status === "approved") {
          router.replace("/dashboard");
          return;
        }
        setStatus(data?.user?.status || "pending");
      })
      .catch(() => {});
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Clock className="h-5 w-5" />
            {status === "rejected" ? "账号未通过审核" : "账号待审核"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {status === "rejected"
              ? "当前账号已被管理员拒绝，请联系管理员确认原因。"
              : "当前账号已提交注册，管理员审核并分配角色后即可进入系统。"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              退出登录
            </Button>
            <Button asChild>
              <Link href="/login">返回登录</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
