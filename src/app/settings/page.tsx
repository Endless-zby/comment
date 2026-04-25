"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">系统设置</h2>
          <p className="text-muted-foreground">
            配置系统运行参数
          </p>
        </div>

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