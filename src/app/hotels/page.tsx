"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, ExternalLink, Trash2, Power, RefreshCw, Edit } from "lucide-react";

export default function HotelsPage() {
  const [hotels, setHotels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<any>(null);
  const [hotelUrl, setHotelUrl] = useState("");
  const [fliggyUrl, setFliggyUrl] = useState("");
  const [ctripHotelId, setCtripHotelId] = useState("");
  const [fliggyHotelId, setFliggyHotelId] = useState("");
  const [hotelName, setHotelName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadHotels();
  }, []);

  const loadHotels = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hotels");
      if (res.ok) {
        const data = await res.json();
        setHotels(data);
      }
    } catch (err) {
      console.error("加载酒店列表失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleParseCtripUrl = () => {
    const match = hotelUrl.match(/hotels\.ctrip\.com\/hotels\/(\d+)/);
    if (match) {
      setCtripHotelId(match[1]);
      setError("");
    } else {
      setError("无法解析携程酒店ID，请检查URL格式");
    }
  };

  const handleParseFliggyUrl = () => {
    const match = fliggyUrl.match(/shid=(\d+)/);
    if (match) {
      setFliggyHotelId(match[1]);
      setError("");
    } else {
      setError("无法解析飞猪酒店ID，请检查URL格式");
    }
  };

  const handleAddHotel = async () => {
    setError("");
    
    if (!hotelName) {
      setError("请填写酒店名称");
      return;
    }

    try {
      const res = await fetch("/api/hotels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelName,
          ctripHotelId: ctripHotelId || null,
          fliggyHotelId: fliggyHotelId || null,
          city: null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setHotels([...hotels, data]);
        setIsAddDialogOpen(false);
        resetForm();
      } else {
        setError(data.error || "添加失败");
      }
    } catch (err) {
      setError("网络错误，请重试");
    }
  };

  const handleEditHotel = async () => {
    setError("");
    
    if (!editingHotel) return;
    
    if (!editingHotel.hotelName) {
      setError("请填写酒店名称");
      return;
    }

    try {
      const res = await fetch(`/api/hotels/${editingHotel.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelName: editingHotel.hotelName,
          ctripHotelId: editingHotel.ctripHotelId || null,
          fliggyHotelId: editingHotel.fliggyHotelId || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setHotels(hotels.map(h => h.id === editingHotel.id ? data : h));
        setIsEditDialogOpen(false);
        setEditingHotel(null);
      } else {
        setError(data.error || "更新失败");
      }
    } catch (err) {
      setError("网络错误，请重试");
    }
  };

  const resetForm = () => {
    setHotelUrl("");
    setFliggyUrl("");
    setCtripHotelId("");
    setFliggyHotelId("");
    setHotelName("");
    setError("");
  };

  const openEditDialog = (hotel: any) => {
    setEditingHotel({ ...hotel });
    setIsEditDialogOpen(true);
  };

  const handleDeleteHotel = async (id: number) => {
    if (!confirm("确定删除该酒店？关联的评价数据也会被清除。")) return;
    
    try {
      const res = await fetch(`/api/hotels/${id}`, { method: "DELETE" });
      if (res.ok) {
        setHotels(hotels.filter(h => h.id !== id));
      }
    } catch (err) {
      console.error("删除失败:", err);
    }
  };

  const handleToggleActive = async (hotel: any) => {
    try {
      const res = await fetch(`/api/hotels/${hotel.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !hotel.isActive }),
      });
      if (res.ok) {
        setHotels(hotels.map(h => h.id === hotel.id ? { ...h, isActive: !h.isActive } : h));
      }
    } catch (err) {
      console.error("更新失败:", err);
    }
  };

  const openCtripPage = (ctripHotelId: string) => {
    window.open(`https://hotels.ctrip.com/hotels/${ctripHotelId}.html`, "_blank");
  };

  const openFliggyPage = (fliggyHotelId: string) => {
    window.open(`https://hotel.alitrip.com/hotel_detail2.htm?shid=${fliggyHotelId}&_output_charset=utf8`, "_blank");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">酒店管理</h2>
            <p className="text-muted-foreground">
              维护需要监控评价的酒店列表（支持携程和飞猪平台）
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadHotels} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  添加酒店
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>添加酒店</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="hotelName">酒店名称 *</Label>
                    <Input
                      id="hotelName"
                      placeholder="上海世博木棉花凯悦臻选酒店"
                      value={hotelName}
                      onChange={(e) => setHotelName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="url">携程酒店详情页 URL（可选）</Label>
                    <Input
                      id="url"
                      placeholder="https://hotels.ctrip.com/hotels/128045084.html"
                      value={hotelUrl}
                      onChange={(e) => setHotelUrl(e.target.value)}
                    />
                    <Button variant="outline" size="sm" onClick={handleParseCtripUrl}>
                      解析携程 URL
                    </Button>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ctripHotelId">携程酒店 ID（可选）</Label>
                    <Input
                      id="ctripHotelId"
                      placeholder="128045084"
                      value={ctripHotelId}
                      onChange={(e) => setCtripHotelId(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="fliggyUrl">飞猪酒店详情页 URL（可选）</Label>
                    <Input
                      id="fliggyUrl"
                      placeholder="https://hotel.alitrip.com/hotel_detail2.htm?shid=77034255&_output_charset=utf8"
                      value={fliggyUrl}
                      onChange={(e) => setFliggyUrl(e.target.value)}
                    />
                    <Button variant="outline" size="sm" onClick={handleParseFliggyUrl}>
                      解析飞猪 URL
                    </Button>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="fliggyHotelId">飞猪酒店 ID（可选）</Label>
                    <Input
                      id="fliggyHotelId"
                      placeholder="77034255"
                      value={fliggyHotelId}
                      onChange={(e) => setFliggyHotelId(e.target.value)}
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-500">{error}</p>
                  )}
                  <Button onClick={handleAddHotel}>确认添加</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>编辑酒店</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="editHotelName">酒店名称 *</Label>
                <Input
                  id="editHotelName"
                  placeholder="酒店名称"
                  value={editingHotel?.hotelName || ""}
                  onChange={(e) => setEditingHotel({ ...editingHotel, hotelName: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editCtripHotelId">携程酒店 ID（可选）</Label>
                <Input
                  id="editCtripHotelId"
                  placeholder="128045084"
                  value={editingHotel?.ctripHotelId || ""}
                  onChange={(e) => setEditingHotel({ ...editingHotel, ctripHotelId: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editFliggyHotelId">飞猪酒店 ID（可选）</Label>
                <Input
                  id="editFliggyHotelId"
                  placeholder="77034255"
                  value={editingHotel?.fliggyHotelId || ""}
                  onChange={(e) => setEditingHotel({ ...editingHotel, fliggyHotelId: e.target.value })}
                />
              </div>
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
              <Button onClick={handleEditHotel}>保存修改</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>酒店列表 ({hotels.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                加载中...
              </div>
            ) : hotels.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <p>暂无酒店，点击上方按钮添加</p>
              </div>
            ) : (
              <div className="space-y-4">
                {hotels.map((hotel) => (
                  <div
                    key={hotel.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${!hotel.isActive ? 'opacity-50' : ''}`}
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{hotel.hotelName}</h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          {hotel.ctripHotelId && `携程ID: ${hotel.ctripHotelId}`}
                          {hotel.ctripHotelId && hotel.fliggyHotelId && " · "}
                          {hotel.fliggyHotelId && `飞猪ID: ${hotel.fliggyHotelId}`}
                          {!hotel.ctripHotelId && !hotel.fliggyHotelId && "未配置平台ID"}
                        </p>
                        <p>
                          评价数: {hotel._count?.reviews || 0} · 
                          平均评分: {hotel.avgScore?.toFixed(1) || '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hotel.ctripHotelId && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openCtripPage(hotel.ctripHotelId)}
                          title="在携程查看"
                        >
                          <ExternalLink className="h-4 w-4 text-blue-500" />
                        </Button>
                      )}
                      {hotel.fliggyHotelId && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openFliggyPage(hotel.fliggyHotelId)}
                          title="在飞猪查看"
                        >
                          <ExternalLink className="h-4 w-4 text-orange-500" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openEditDialog(hotel)}
                        title="编辑"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleToggleActive(hotel)}
                        title={hotel.isActive ? "停用" : "启用"}
                      >
                        <Power className={`h-4 w-4 ${hotel.isActive ? 'text-green-500' : 'text-gray-400'}`} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-500"
                        onClick={() => handleDeleteHotel(hotel.id)}
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