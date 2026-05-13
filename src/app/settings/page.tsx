"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Cookie, Save, Loader2, CheckCircle, Key, ShieldCheck } from "lucide-react";

export default function SettingsPage() {
  const [fliggyCookie, setFliggyCookie] = useState("");
  const [ctripCookie, setCtripCookie] = useState("");
  const [deepseekApiKey, setDeepseekApiKey] = useState("");
  const [esUrl, setEsUrl] = useState("");
  const [esIndex, setEsIndex] = useState("");
  const [remoteHotelApiUrl, setRemoteHotelApiUrl] = useState("");
  const [trackMinSimilarity, setTrackMinSimilarity] = useState("70");
  const [loading, setLoading] = useState(false);
  const [savingCookie, setSavingCookie] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [savingTrack, setSavingTrack] = useState(false);
  const [cookieSaved, setCookieSaved] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [trackSaved, setTrackSaved] = useState(false);

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
        setCtripCookie(data.ctrip_cookie || "");
        setDeepseekApiKey(data.deepseek_api_key || "");
        setEsUrl(data.es_url || "");
        setEsIndex(data.es_index || "");
        setRemoteHotelApiUrl(data.remote_hotel_api_url || "");
        setTrackMinSimilarity(data.track_min_similarity || "70");
      }
    } catch (err) {
      console.error("加载设置失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFliggyCookie = async () => {
    setSavingCookie(true);
    setCookieSaved(false);
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
        setCookieSaved(true);
        setTimeout(() => setCookieSaved(false), 2000);
      } else {
        const data = await res.json();
        alert(data.error || "保存失败");
      }
    } catch (err) {
      alert("网络错误");
    } finally {
      setSavingCookie(false);
    }
  };

  const handleSaveDeepseekApiKey = async () => {
    setSavingApiKey(true);
    setApiKeySaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "deepseek_api_key",
          value: deepseekApiKey,
          description: "DeepSeek API Key（用于 AI 周报生成）",
        }),
      });

      if (res.ok) {
        setApiKeySaved(true);
        setTimeout(() => setApiKeySaved(false), 2000);
      } else {
        const data = await res.json();
        alert(data.error || "保存失败");
      }
    } catch (err) {
      alert("网络错误");
    } finally {
      setSavingApiKey(false);
    }
  };

  const handleSaveTrackConfig = async () => {
    setSavingTrack(true);
    setTrackSaved(false);
    try {
      const settings = [
        { key: "es_url", value: esUrl, description: "Elasticsearch 地址" },
        { key: "es_index", value: esIndex, description: "ES 索引名称" },
        { key: "remote_hotel_api_url", value: remoteHotelApiUrl, description: "后台酒店列表接口 URL" },
        { key: "track_min_similarity", value: trackMinSimilarity, description: "评价溯源最小相似度(%)" },
      ];

      for (const s of settings) {
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s),
        });
      }

      setTrackSaved(true);
      setTimeout(() => setTrackSaved(false), 2000);
    } catch (err) {
      alert("网络错误");
    } finally {
      setSavingTrack(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">系统设置</h2>
          <p className="text-muted-foreground">配置系统运行参数</p>
        </div>

        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-500" />
              DeepSeek API Key
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-medium mb-2">使用说明：</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>访问 DeepSeek 开放平台 (platform.deepseek.com) 注册账号</li>
                <li>在 API Keys 页面创建新的 API Key</li>
                <li>将 API Key 粘贴到下方输入框并保存</li>
                <li>保存后即可在 &quot;AI 周报&quot; 页面生成评价摘要报告</li>
              </ol>
            </div>
            <div className="grid gap-2">
              <Label>API Key</Label>
              <Input
                type="password"
                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                value={deepseekApiKey}
                onChange={(e) => setDeepseekApiKey(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                用于调用 DeepSeek API 生成评价摘要报告，未配置时将无法使用 AI 周报功能。
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveDeepseekApiKey}
                disabled={savingApiKey || loading}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {savingApiKey ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    保存中...
                  </>
                ) : apiKeySaved ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    已保存
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    保存 API Key
                  </>
                )}
              </Button>
              {deepseekApiKey && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  API Key 已配置
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-500" />
              评价溯源配置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-800">
              <p className="font-medium mb-2">配置说明：</p>
              <ul className="list-disc list-inside space-y-1 text-purple-700">
                <li>ES 地址和索引用于查询 H5 页面「复制评价内容」的埋点数据</li>
                <li>后台酒店列表接口用于在添加酒店时搜索匹配</li>
                <li>相似度阈值控制匹配的严格程度，默认 70%</li>
              </ul>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>ES 地址</Label>
                <Input
                  placeholder="http://10.31.177.15:9200"
                  value={esUrl}
                  onChange={(e) => setEsUrl(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label>ES 索引名称</Label>
                <Input
                  placeholder="mobile_hotel_h5_log-*"
                  value={esIndex}
                  onChange={(e) => setEsIndex(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>后台酒店列表接口 URL</Label>
              <Input
                placeholder="https://api-jdagent.stqcloud.com/hotel/callback/ai/hotelList"
                value={remoteHotelApiUrl}
                onChange={(e) => setRemoteHotelApiUrl(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label>最小匹配相似度 (%)</Label>
              <Input
                type="number"
                min={30}
                max={100}
                placeholder="70"
                value={trackMinSimilarity}
                onChange={(e) => setTrackMinSimilarity(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                低于此阈值的匹配将被视为未匹配，建议 60-80 之间
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveTrackConfig}
                disabled={savingTrack || loading}
                className="bg-purple-500 hover:bg-purple-600"
              >
                {savingTrack ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    保存中...
                  </>
                ) : trackSaved ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    已保存
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    保存溯源配置
                  </>
                )}
              </Button>
              {esUrl && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  溯源配置已填写
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-green-500" />
              携程 Cookie 配置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
              <p className="font-medium mb-2">使用说明：</p>
              <ol className="list-decimal list-inside space-y-1 text-green-700">
                <li>登录携程官网 (hotels.ctrip.com)</li>
                <li>使用 Chrome 插件 EditThisCookie 或 Cookie-Editor 导出 Cookie</li>
                <li>将导出的 JSON 格式 Cookie 粘贴到下方输入框</li>
                <li>保存后，使用 API 模式拉取携程评价时将使用此 Cookie</li>
              </ol>
              <p className="mt-2 text-green-600 font-medium">推荐使用 API 模式，比 CDP 浏览器拦截更稳定</p>
            </div>
            <div className="grid gap-2">
              <Label>携程 Cookie (JSON 格式)</Label>
              <Textarea
                placeholder={`从浏览器导出的 Cookie JSON，例如：\n[\n  {"name": "_bfa", "value": "xxx", "domain": ".ctrip.com"},\n  {"name": "UUID", "value": "xxx", "domain": ".ctrip.com"}\n]`}
                value={ctripCookie}
                onChange={(e) => setCtripCookie(e.target.value)}
                rows={10}
                className="font-mono text-xs"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                配置后可使用 API 模式直接请求携程接口，无需启动浏览器，速度更快更稳定。
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={async () => {
                  setSavingCookie(true);
                  setCookieSaved(false);
                  try {
                    const res = await fetch("/api/settings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        key: "ctrip_cookie",
                        value: ctripCookie,
                        description: "携程平台全局 Cookie",
                      }),
                    });
                    if (res.ok) {
                      setCookieSaved(true);
                      setTimeout(() => setCookieSaved(false), 2000);
                    } else {
                      const data = await res.json();
                      alert(data.error || "保存失败");
                    }
                  } catch {
                    alert("网络错误");
                  } finally {
                    setSavingCookie(false);
                  }
                }}
                disabled={savingCookie || loading}
                className="bg-green-500 hover:bg-green-600"
              >
                {savingCookie ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    保存中...
                  </>
                ) : cookieSaved ? (
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
              {ctripCookie && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Cookie 已配置
                </span>
              )}
            </div>
          </CardContent>
        </Card>

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
                placeholder={`从浏览器导出的 Cookie JSON，例如：\n[\n  {"name": "_m_h5_tk", "value": "xxx", "domain": ".alitrip.com"},\n  {"name": "cookie2", "value": "xxx", "domain": ".alitrip.com"}\n]`}
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
                disabled={savingCookie || loading}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {savingCookie ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    保存中...
                  </>
                ) : cookieSaved ? (
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
                <p className="text-sm text-muted-foreground">保存评价的完整原始 JSON 数据</p>
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
