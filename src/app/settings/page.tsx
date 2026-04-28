"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Cookie, Save, Loader2, CheckCircle } from "lucide-react";

export default function SettingsPage() {
  const [fliggyCookie, setFliggyCookie] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setFliggyCookie(data.fliggy_cookie || "");
      }
    } catch (err) {
      console.error("加载设置失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFliggyCookie = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "fliggy_cookie",
          value: fliggyCookie,
          description: "飞猪平台全局 Cookie",
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const data = await res.json();
        alert(data.error || "保存失败");
      }
    } catch (err) {
      alert("网络错误");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">系统设置</h2>
          <p className="text-muted-foreground">
            配置系统运行参数
          </p>
        </div>

        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-orange-500" />
              飞猪 Cookie 配置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800">
              <p className="font-medium mb-2">使用说明：</p>
              <ol className="list-decimal list-inside space-y-1 text-orange-700">
                <li>登录飞猪官网 (hotel.alitrip.com)</li>
                <li>使用 Chrome 插件 EditThisCookie 或 Cookie-Editor 导出 Cookie</li>
                <li>将导出的 JSON 格式 Cookie 粘贴到下方输入框</li>
                <li>保存后，所有酒店的飞猪评价拉取都将使用此 Cookie</li>
              </ol>
            </div>
            <div className="grid gap-2">
              <Label>飞猪 Cookie (JSON 格式)</Label>
              <Textarea
                placeholder='从浏览器导出的 Cookie JSON，例如：
[
  {"name": "_m_h5_tk", "value": "xxx", "domain": ".alitrip.com"},
  {"name": "cookie2", "value": "xxx", "domain": ".alitrip.com"}
]'
                value={fliggyCookie}
                onChange={(e) => setFliggyCookie(e.target.value)}
                rows={10}
                className="font-mono text-xs"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                配置一次，所有酒店的飞猪评价拉取都将使用此 Cookie，无需逐个配置。
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleSaveFliggyCookie} 
                disabled={saving || loading}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    保存中...
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    已保存
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    保存 Cookie
                  </>
                )}
              </Button>
              {fliggyCookie && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Cookie 已配置
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>爬虫设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>显示浏览器窗口</Label>
                <p className="text-sm text-muted-foreground">
                  拉取评价时显示 Puppeteer 浏览器窗口（调试用）
                </p>
              </div>
              <Switch />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timeout">请求超时时间（秒）</Label>
              <Input id="timeout" type="number" defaultValue={30} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="retry">失败重试次数</Label>
              <Input id="retry" type="number" defaultValue={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>数据设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>保留原始 JSON</Label>
                <p className="text-sm text-muted-foreground">
                  保存评价的完整原始 JSON 数据
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex gap-2">
              <Button variant="outline">导出数据库</Button>
              <Button variant="outline">清空数据</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>关于</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>版本: 0.1.0</p>
              <p>技术栈: Next.js + Puppeteer + Prisma + SQLite</p>
              <p className="text-muted-foreground">
                本系统仅供学习研究使用，请遵守携程平台的使用条款。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}