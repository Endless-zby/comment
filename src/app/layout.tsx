import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "携程酒店评价监控系统",
  description: "自动采集携程酒店评价数据，提供评价浏览、统计图表等功能",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}