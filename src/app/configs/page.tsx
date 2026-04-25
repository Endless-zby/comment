"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Play, Square, Trash2, History, RefreshCw, Loader2 } from "lucide-react";

export default function ConfigsPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [fetchingConfigId, setFetchingConfigId] = useState<number | null>(null);
  const [fetchStatus, setFetchStatus] = useState<any>(null);

  const [selectedHotelId, setSelectedHotelId] = useState("");
  const [fetchInterval, setFetchInterval] = useState(24);
  const [pageSize, setPageSize] = useState(20);
  const [fetchMode, setFetchMode] = useState("incremental");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
    const interval = setInterval(checkFetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [hotelsRes, configsRes] = await Promise.all([
        fetch("/api/hotels"),
        fetch("/api/configs"),
      ]);
      
      if (hotelsRes.ok) {
        const hotelsData = await hotelsRes.json();
        setHotels(hotelsData);
      }
      
      if (configsRes.ok) {
        const configsData = await configsRes.json();
        setConfigs(configsData);
      }
    } catch (err) {
      console.error("加载失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkFetchStatus = async () => {
    try {
      const res = await fetch("/api/fetch");
      if (res.ok) {
        const status = await res.json();
        setFetchStatus(status);
        
        if (!status.isRunning && fetchingConfigId) {
          setFetchingConfigId(null);
          loadData();
        }
      }
    } catch (err) {
      console.error("检查状态失败:", err);
    }
  };

  const handleAddConfig = async () => {
    setError("");
    
    if (!selectedHotelId) {
      setError("请选择酒店");
      return;
    }

    try {
      const res = await fetch("/api/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId: selectedHotelId,
          fetchIntervalHr: fetchInterval,
          pageSize,
          fetchMode,
          isActive: true,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setConfigs([...configs, data]);
        setIsAddDialogOpen(false);
        setSelectedHotelId("");
        setFetchInterval(24);
        setPageSize(20);
        setFetchMode("incremental");
      } else {
        setError(data.error || "创建失败");
      }
    } catch (err) {
      setError("网络错误");
    }
  };

  const handleFetch = async (configId: number) => {
    setFetchingConfigId(configId);
    try {
      const res = await fetch("/api/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "拉取失败");
        setFetchingConfigId(null);
      }
    } catch (err) {
      setError("网络错误");
      setFetchingConfigId(null);
    }
  };

  const handleToggleActive = async (config: any) => {
    try {
      const res = await fetch(`/api/configs/${config.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !config.isActive }),
      });
      if (res.ok) {
        setConfigs(configs.map(c => c.id === config.id ? { ...c, isActive: !c.isActive } : c));
      }
    } catch (err) {
      console.error("更新失败:", err);
    }
  };

  const handleDeleteConfig = async (id: number) => {
    if (!confirm("确定删除该配置？")) return;
    
    try {
      const res = await fetch(`/api/configs/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConfigs(configs.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error("删除失败:", err);
    }
  };

  const isFetching = fetchStatus?.isRunning;
  const currentFetchingHotel = fetchStatus?.currentHotelName;
  const progress = fetchStatus?.progress;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">拉取配置</h2>
            <p className="text-muted-foreground">
              为每个酒店设置评价拉取规则
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={hotels.length === 0}>
                  <Plus className="h-4 w-4" />
                  添加配置
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>添加拉取配置</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>选择酒店</Label>
                    <Select value={selectedHotelId} onValueChange={setSelectedHotelId}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择酒店" />
                      </SelectTrigger>
                      <SelectContent>
                        {hotels.length === 0 ? (
                          <SelectItem value="_empty" disabled>
                            暂无酒店，请先添加
                          </SelectItem>
                        ) : hotels.filter(h => h.isActive).length === 0 ? (
                          <SelectItem value="_disabled" disabled>
                            所有酒店已停用，请先启用
                          </SelectItem>
                        ) : hotels.filter(h => h.isActive).map((hotel) => (
                          <SelectItem key={hotel.hotelId} value={hotel.hotelId}>
                            {hotel.hotelName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="interval">拉取间隔（小时）</Label>
                    <Input
                      id="interval"
                      type="number"
                      min={1}
                      max={168}
                      value={fetchInterval}
                      onChange={(e) => setFetchInterval(parseInt(e.target.value) || 24)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pageSize">每页条数</Label>
                    <Input
                      id="pageSize"
                      type="number"
                      min={10}
                      max={50}
                      value={pageSize}
                      onChange={(e) => setPageSize(parseInt(e.target.value) || 20)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>拉取模式</Label>
                    <Select value={fetchMode} onValueChange={setFetchMode}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="incremental">增量拉取</SelectItem>
                        <SelectItem value="full">全量拉取</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {error && (
                    <p className="text-sm text-red-500">{error}</p>
                  )}
                  <Button onClick={handleAddConfig}>确认添加</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isFetching && (
          <Card className="border-blue-500">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <div>
                  <p className="font-medium">正在拉取: {currentFetchingHotel}</p>
                  {progress && (
                    <p className="text-sm text-muted-foreground">
                      第 {progress.currentPage} 页 · 新增 {progress.newCount} 条
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>配置列表 ({configs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                加载中...
              </div>
            ) : hotels.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <p>请先在「酒店管理」页面添加酒店</p>
              </div>
            ) : configs.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <p>暂无配置，点击上方按钮添加</p>
              </div>
            ) : (
              <div className="space-y-4">
                {configs.map((config) => (
                  <div
                    key={config.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${!config.isActive ? 'opacity-50' : ''}`}
                  >
                    <div className="space-y-1">
                      <h3 className="font-medium">{config.hotel?.hotelName || '未知酒店'}</h3>
                      <p className="text-sm text-muted-foreground">
                        间隔: {config.fetchIntervalHr}h · 每页: {config.pageSize} · 
                        模式: {config.fetchMode === "incremental" ? "增量" : "全量"} · 
                        已拉取: {config.totalFetched || 0} 条
                      </p>
                      {config.lastFetchedAt && (
                        <p className="text-xs text-muted-foreground">
                          上次拉取: {new Date(config.lastFetchedAt).toLocaleString('zh-CN')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleFetch(config.id)}
                        disabled={isFetching || fetchingConfigId === config.id}
                      >
                        {fetchingConfigId === config.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        立即拉取
                      </Button>
                      <Button variant="ghost" size="icon" title="查看日志">
                        <History className="h-4 w-4" />
                      </Button>
                      <Switch 
                        checked={config.isActive}
                        onCheckedChange={() => handleToggleActive(config)}
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-500"
                        onClick={() => handleDeleteConfig(config.id)}
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}