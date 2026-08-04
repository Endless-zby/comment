"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAGE_PERMISSIONS } from "@/lib/permissions";
import { RefreshCw, Save, ShieldPlus } from "lucide-react";

interface RoleItem {
  id: number;
  name: string;
  isAdmin: boolean;
  userCount: number;
  permissions: string[];
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>(["dashboard"]);
  const [rolePermissions, setRolePermissions] = useState<Record<number, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [savingRoleId, setSavingRoleId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const loadRoles = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/roles", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "加载角色失败");

      setRoles(data.data || []);
      const nextPermissions: Record<number, string[]> = {};
      for (const role of data.data || []) {
        nextPermissions[role.id] = role.permissions || [];
      }
      setRolePermissions(nextPermissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const toggleNewPermission = (pageKey: string) => {
    setNewRolePermissions((current) =>
      current.includes(pageKey)
        ? current.filter((key) => key !== pageKey)
        : [...current, pageKey]
    );
  };

  const toggleRolePermission = (roleId: number, pageKey: string) => {
    setRolePermissions((current) => {
      const existing = current[roleId] || [];
      return {
        ...current,
        [roleId]: existing.includes(pageKey)
          ? existing.filter((key) => key !== pageKey)
          : [...existing, pageKey],
      };
    });
  };

  const createRole = async () => {
    setError("");
    const response = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newRoleName, permissions: newRolePermissions }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "创建角色失败");
      return;
    }
    setNewRoleName("");
    setNewRolePermissions(["dashboard"]);
    await loadRoles();
  };

  const savePermissions = async (roleId: number) => {
    setSavingRoleId(roleId);
    setError("");
    try {
      const response = await fetch(`/api/admin/roles/${roleId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: rolePermissions[roleId] || [] }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "保存权限失败");
        return;
      }
      await loadRoles();
    } finally {
      setSavingRoleId(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">角色权限</h2>
            <p className="text-muted-foreground">按页面分配账号可访问范围</p>
          </div>
          <Button variant="outline" onClick={loadRoles} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>

        {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <Card>
          <CardHeader>
            <CardTitle>创建角色</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid max-w-md gap-2">
              <Label htmlFor="roleName">角色名称</Label>
              <Input
                id="roleName"
                value={newRoleName}
                onChange={(event) => setNewRoleName(event.target.value)}
              />
            </div>
            <PermissionGrid selected={newRolePermissions} onToggle={toggleNewPermission} />
            <Button onClick={createRole}>
              <ShieldPlus className="h-4 w-4" />
              创建角色
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span>{role.name}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {role.isAdmin ? "管理员角色" : `${role.userCount} 个账号`}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <PermissionGrid
                  disabled={role.isAdmin}
                  selected={rolePermissions[role.id] || []}
                  onToggle={(pageKey) => toggleRolePermission(role.id, pageKey)}
                />
                {!role.isAdmin && (
                  <Button
                    variant="outline"
                    onClick={() => savePermissions(role.id)}
                    disabled={savingRoleId === role.id}
                  >
                    <Save className="h-4 w-4" />
                    {savingRoleId === role.id ? "保存中..." : "保存权限"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

function PermissionGrid({
  selected,
  disabled = false,
  onToggle,
}: {
  selected: string[];
  disabled?: boolean;
  onToggle: (pageKey: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {PAGE_PERMISSIONS.map((page) => (
        <label
          key={page.key}
          className="flex items-center gap-2 rounded-md border p-3 text-sm"
        >
          <input
            type="checkbox"
            disabled={disabled}
            checked={disabled || selected.includes(page.key)}
            onChange={() => onToggle(page.key)}
          />
          <span>{page.label}</span>
        </label>
      ))}
    </div>
  );
}
