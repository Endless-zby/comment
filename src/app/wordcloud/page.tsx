"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Cloud } from "lucide-react";

interface WordCloudItem {
  text: string;
  value: number;
}

interface Hotel {
  id: number;
  hotelName: string;
}

const PALETTE = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
  "#d946ef", "#0ea5e9", "#84cc16", "#e11d48", "#a855f7",
];

export default function WordCloudPage() {
  const [selectedHotelId, setSelectedHotelId] = useState("all");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [words, setWords] = useState<WordCloudItem[]>([]);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHotels();
  }, []);

  useEffect(() => {
    loadWords();
  }, [selectedHotelId, selectedPlatform]);

  useEffect(() => {
    if (words.length > 0 && canvasRef.current && containerRef.current) {
      renderWordCloud();
    }
  }, [words]);

  const loadHotels = async () => {
    try {
      const res = await fetch("/api/hotels");
      if (res.ok) setHotels(await res.json());
    } catch (err) {
      console.error("加载酒店失败:", err);
    }
  };

  const loadWords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedHotelId !== "all") params.set("hotelId", selectedHotelId);
      if (selectedPlatform !== "all") params.set("platform", selectedPlatform);
      params.set("limit", "80");
      const qs = params.toString();
      const res = await fetch(`/api/reviews/wordcloud?${qs}`);
      if (res.ok) setWords(await res.json());
    } catch (err) {
      console.error("加载词云数据失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const renderWordCloud = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = 400;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx || words.length === 0) return;

    ctx.clearRect(0, 0, width, height);

    const maxVal = words[0]?.value || 1;
    const minVal = words[words.length - 1]?.value || 1;
    const range = Math.max(maxVal - minVal, 1);

    const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
    const centerX = width / 2;
    const centerY = height / 2;

    words.forEach((word, index) => {
      const fontSize = Math.round(14 + ((word.value - minVal) / range) * 40);
      ctx.font = `${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
      const metrics = ctx.measureText(word.text);
      const textWidth = metrics.width + 8;
      const textHeight = fontSize + 4;

      let bestX = centerX;
      let bestY = centerY;
      let found = false;

      const spiralStep = 2;
      const maxRadius = Math.min(width, height) * 0.45;

      for (let r = 0; r < maxRadius && !found; r += spiralStep) {
        const angleStep = r === 0 ? Math.PI * 2 : (spiralStep * 2) / r;
        for (let a = 0; a < Math.PI * 2 && !found; a += angleStep) {
          const x = centerX + r * Math.cos(a + index * 0.5);
          const y = centerY + r * Math.sin(a + index * 0.5);
          const left = x - textWidth / 2;
          const top = y - textHeight / 2;

          if (left < 0 || top < 0 || left + textWidth > width || top + textHeight > height) continue;

          let collision = false;
          for (const p of placed) {
            if (
              left < p.x + p.w &&
              left + textWidth > p.x &&
              top < p.y + p.h &&
              top + textHeight > p.y
            ) {
              collision = true;
              break;
            }
          }

          if (!collision) {
            bestX = x;
            bestY = y;
            found = true;
            placed.push({ x: left, y: top, w: textWidth, h: textHeight });
          }
        }
      }

      if (found) {
        ctx.fillStyle = PALETTE[index % PALETTE.length];
        ctx.globalAlpha = 0.7 + 0.3 * ((word.value - minVal) / range);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
        ctx.fillText(word.text, bestX, bestY);
        ctx.globalAlpha = 1;
      }
    });
  }, [words]);

  useEffect(() => {
    const handleResize = () => {
      if (words.length > 0 && canvasRef.current && containerRef.current) {
        renderWordCloud();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [words, renderWordCloud]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">评价词云</h2>
            <p className="text-muted-foreground">
              基于评价内容的高频关键词可视化
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedHotelId} onValueChange={setSelectedHotelId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="选择酒店" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部酒店</SelectItem>
                {hotels.map((hotel) => (
                  <SelectItem key={hotel.id} value={String(hotel.id)}>
                    {hotel.hotelName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="选择平台" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部平台</SelectItem>
                <SelectItem value="ctrip">携程</SelectItem>
                <SelectItem value="fliggy">飞猪</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadWords} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              刷新
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-blue-500" />
              评价关键词词云
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                加载中...
              </div>
            ) : words.length === 0 ? (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                暂无评价数据，请先拉取评价
              </div>
            ) : (
              <div ref={containerRef} className="w-full">
                <canvas ref={canvasRef} className="w-full" style={{ height: 400 }} />
              </div>
            )}
          </CardContent>
        </Card>

        {words.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>高频词排行 TOP 30</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {words.slice(0, 30).map((word, idx) => (
                  <span
                    key={word.text}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm"
                    style={{
                      backgroundColor: `${PALETTE[idx % PALETTE.length]}15`,
                      color: PALETTE[idx % PALETTE.length],
                      fontSize: `${Math.max(12, 18 - idx * 0.3)}px`,
                    }}
                  >
                    {word.text}
                    <span className="text-xs opacity-60">({word.value})</span>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
