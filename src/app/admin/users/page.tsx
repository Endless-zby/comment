"use client";

import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, ShieldCheck, UserCheck, UserX } from "lucide-react";

interface RoleItem {
  id: number;
  name: string;
  isAdmin: boolean;
}

interface UserItem {
  id: number;
  accountType: string;
  username: string | null;
  nickname: string | null;
  status: string;
  roleId: number | null;
  role: RoleItem | null;
  createdAt: string;
  approvedAt: string | null;
}

const statusLabel: Record<string, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已拒绝",
  disabled: "已停用",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalRoles = useMemo(() => roles.filter((role) => !role.isAdmin), [roles]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch("/api/admin/roles", { cache: "no-store" }),
      ]);
      const usersData = await usersResponse.json();
      const rolesData = await rolesResponse.json();

      if (!usersResponse.ok) throw new Error(usersData.error || "加载用户失败");
      if (!rolesResponse.ok) throw new Error(rolesData.error || "加载角色失败");

      setUsers(usersData.data || []);
      setRoles(rolesData.data || []);
      const nextSelected: Record<number, string> = {};
      for (const user of usersData.data || []) {
        nextSelected[user.id] = user.roleId ? String(user.roleId) : "";
      }
      setSelectedRoles(nextSelected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const approveUser = async (userId: number) => {
    const roleId = selectedRoles[userId];
    if (!roleId) {
      setError("请先选择角色");
      return;
    }
    await mutateUser(`/api/admin/users/${userId}/approve`, { roleId: Number(roleId) });
  };

  const rejectUser = async (userId: number) => {
    await mutateUser(`/api/admin/users/${userId}/reject`, {});
  };

  const assignRole = async (userId: number) => {
    const roleId = selectedRoles[userId];
    if (!roleId) {
      setError("请先选择角色");
      return;
    }
    await mutateUser(`/api/admin/users/${userId}/role`, { roleId: Number(roleId) });
  };

  const mutateUser = async (url: string, body: Record<string, unknown>) => {
    setError("");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "操作失败");
      return;
    }
    await loadData();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">用户审核</h2>
            <p className="text-muted-foreground">审核注册账号并分配页面权限角色</p>
          </div>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>

        {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <Card>
          <CardHeader>
            <CardTitle>账号列表 ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 pr-3 font-medium">账号</th>
                    <th className="py-3 pr-3 font-medium">类型</th>
                    <th className="py-3 pr-3 font-medium">状态</th>
                    <th className="py-3 pr-3 font-medium">角色</th>
                    <th className="py-3 pr-3 font-medium">注册时间</th>
                    <th className="py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="py-3 pr-3">
                        <div className="font-medium">{user.nickname || user.username || `用户 ${user.id}`}</div>
                        <div className="text-xs text-muted-foreground">{user.username || "-"}</div>
                      </td>
                      <td className="py-3 pr-3">{user.accountType}</td>
                      <td className="py-3 pr-3">{statusLabel[user.status] || user.status}</td>
                      <td className="py-3 pr-3">
                        {user.role?.isAdmin ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-600">
                            <ShieldCheck className="h-3 w-3" />
                            {user.role.name}
                          </span>
                        ) : (
                          <select
                            className="h-9 rounded-md border bg-background px-2 text-sm"
                            value={selectedRoles[user.id] || ""}
                            onChange={(event) =>
                              setSelectedRoles((current) => ({
                                ...current,
                                [user.id]: event.target.value,
                              }))
                            }
                          >
                            <option value="">选择角色</option>
                            {normalRoles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleString("zh-CN")}
                      </td>
                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          {user.status === "pending" && (
                            <>
                              <Button size="sm" onClick={() => approveUser(user.id)}>
                                <UserCheck className="h-4 w-4" />
                                通过
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => rejectUser(user.id)}>
                                <UserX className="h-4 w-4" />
                                拒绝
                              </Button>
                            </>
                          )}
                          {user.status === "approved" && !user.role?.isAdmin && (
                            <Button size="sm" variant="outline" onClick={() => assignRole(user.id)}>
                              保存角色
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
