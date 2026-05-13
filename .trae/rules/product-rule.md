---
alwaysApply: false
description: 项目功能开发需要遵守的开发规则
---
# 携程酒店评价监控系统 - 技术方案

## 开发环境

| 项目 | 值 |
|------|-----|
| 操作系统 | Windows |
| Shell | PowerShell（Trae IDE 内置终端） |
| 包管理器 | pnpm |
| Node.js | >= 18.0 |
| 项目根目录 | `d:\Claude_Project\comment` |

### PowerShell 注意事项

> **关键**：Trae IDE 内置终端为 PowerShell，**不支持 `&&` 作为命令分隔符**。

| 写法 | 是否支持 | 替代方案 |
|------|----------|----------|
| `cd dir && git status` | ❌ 报错 | `cd dir; git status` |
| `pnpm build && pnpm start` | ❌ 报错 | `pnpm build; pnpm start` |
| `cd dir; git status` | ✅ | — |
| `npx prisma db push; npx prisma generate` | ✅ | — |

**规则**：在 RunCommand 工具中执行多条命令时，**必须使用分号 `;` 而非 `&&`** 连接命令。

### 常用开发命令

```powershell
# 安装依赖
pnpm install

# 数据库初始化
npx prisma db push; npx prisma generate

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# Docker 构建
docker build -t ctrip-review-monitor:latest .

# Git 操作
git status; git diff; git add .; git commit -m "message"
```

---

## 项目开发规则

本章节定义项目后续迭代开发必须遵循的规范，确保代码一致性、可维护性和可扩展性。

### 一、系统架构规则

#### 1.1 分层架构原则

系统采用严格的三层架构，各层职责明确，禁止跨层调用：

| 层级 | 目录 | 职责 | 禁止事项 |
|------|------|------|----------|
| **表现层** | `src/app/`, `src/components/` | UI渲染、用户交互、API路由入口 | 直接调用Prisma、包含业务逻辑 |
| **服务层** | `src/services/` | 业务逻辑、数据处理、外部服务集成 | 直接操作DOM、包含UI代码 |
| **数据层** | `src/lib/prisma.ts`, `prisma/schema.prisma` | 数据持久化、ORM映射 | 包含业务逻辑、直接暴露给表现层 |

#### 1.2 API Route 规范

- **命名规范**：API路由文件统一命名为 `route.ts`
- **RESTful设计**：
  - `GET` → 查询操作
  - `POST` → 创建操作
  - `PUT` → 更新操作
  - `DELETE` → 删除操作
- **响应格式**：统一使用 `NextResponse.json()`，包含 `success`、`data`、`error` 字段
- **错误处理**：所有API必须包含try-catch，返回标准错误响应

```typescript
// 标准API响应结构
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 标准错误响应
return NextResponse.json({ success: false, error: "错误描述" }, { status: 400 });
```

#### 1.3 服务层模块化

- **模块划分**：按功能域划分服务模块（crawler、scheduler、logger）
- **单例模式**：浏览器实例、Prisma客户端、调度器任务均采用单例管理
- **依赖注入**：服务间依赖通过函数参数传递，禁止硬编码依赖

#### 1.4 数据库字段映射

- **命名约定**：数据库字段使用 `snake_case`，通过 `@map()` 映射
- **索引策略**：高频查询字段必须添加索引（如 `hotelId`、`reviewDate`）
- **级联删除**：关联数据使用 `onDelete: Cascade` 或 `SetNull`

---

### 二、爬虫规范

#### 2.1 浏览器管理规范

- **单例浏览器**：全局维护单一Browser实例，避免资源浪费
- **页面复用**：Page实例可复用，关闭后重新创建
- **资源释放**：每次拉取完成后必须调用 `closeBrowser()`

```typescript
// 浏览器生命周期管理
let browser: Browser | null = null;  // 全局单例
let page: Page | null = null;        // 可复用页面

// 强制释放时机
await closeBrowser();  // 每次fetch完成后
```

#### 2.2 CDP拦截规范

- **协议选择**：使用 `Fetch` 协议而非 `Network` 协议（更稳定）
- **URL匹配**：使用通配符模式匹配API请求
- **请求拦截**：拦截请求阶段修改请求参数（pageSize、orderBy）
- **响应解析**：必须处理 `base64Encoded` 编码

```typescript
// CDP拦截配置
await client.send("Fetch.enable", {
  patterns: [
    { urlPattern: "*getHotelCommentList*", requestStage: "Response" },
    { urlPattern: "*commentList*", requestStage: "Response" },
  ],
});

// 请求参数修改规范
const TARGET_PAGE_SIZE = 50;
if (bodyJson.pageSize && bodyJson.pageSize !== TARGET_PAGE_SIZE) {
  bodyJson.pageSize = TARGET_PAGE_SIZE;
}
if (bodyJson.orderBy !== 1) {
  bodyJson.orderBy = 1;  // 按最新评价排序
}
```

#### 2.3 反检测策略

- **注入时机**：使用 `evaluateOnNewDocument` 在页面加载前注入
- **关键属性**：必须覆盖 `navigator.webdriver`、`navigator.plugins`、`window.chrome`
- **User-Agent**：设置真实Chrome UA，版本号需与Puppeteer内置Chrome版本匹配

```typescript
// 必须注入的反检测脚本
const ANTI_DETECT_SCRIPT = `
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
  window.chrome = { runtime: {} };
`;
```

#### 2.4 数据解析规范

- **字段映射**：携程API字段 → 系统字段，统一在 `parseCommentListResponse` 函数处理
- **空值处理**：所有可选字段必须提供默认值或 `null`
- **原始数据**：保留 `rawJson` 用于后续分析

```typescript
// 字段映射规范
commentId: String(item.id),           // 必转String
rating: item.rating || 0,             // 默认值0
content: item.content || "",          // 默认值空字符串
roomName: item.roomTypeName || null,  // 可选字段null
```

#### 2.5 增量拉取策略

- **判断逻辑**：首次拉取（本地无数据）→ 多页拉取；后续 → 单页增量
- **停止条件**：遇到已存在 `commentId` 时停止
- **并发控制**：全局维护 `isFetching` 标志，禁止并发拉取

```typescript
// 增量拉取判断
const existingCount = await prisma.review.count({ where: { hotelId } });
const shouldFetchMultiplePages = existingCount === 0;
const targetPages = shouldFetchMultiplePages ? INITIAL_FETCH_PAGES : 1;
```

---

### 三、UI设计规范

#### 3.1 设计系统

- **组件库**：统一使用 shadcn/ui（基于 Radix UI）
- **设计原则**：简洁、功能导向、无过度装饰
- **响应式**：支持桌面端（≥1024px），暂不支持移动端

#### 3.2 色彩系统

使用 CSS 变量定义语义化色彩，支持亮色/暗色主题切换：

| 变量 | 用途 | 亮色值 | 暗色值 |
|------|------|--------|--------|
| `--background` | 页面背景 | `#ffffff` | `#0f172a` |
| `--foreground` | 文字颜色 | `#0f172a` | `#f8fafc` |
| `--primary` | 主色调（按钮、链接） | `#3b82f6` | `#3b82f6` |
| `--destructive` | 危险操作（删除） | `#ef4444` | `#ef4444` |
| `--muted` | 次级背景 | `#f1f5f9` | `#334155` |
| `--border` | 边框颜色 | `#e2e8f0` | `#334155` |

#### 3.3 评分色彩映射

| 评分范围 | 标签 | 背景色 | 文字色 |
|----------|------|--------|--------|
| 4-5星 | 好评 | `bg-green-100` | `text-green-700` |
| 3星 | 中评 | `bg-yellow-100` | `text-yellow-700` |
| 1-2星 | 差评 | `bg-red-100` | `text-red-700` |

#### 3.4 图表色彩

- **好评**：`#22c55e`（绿色）
- **中评**：`#f59e0b`（橙色）
- **差评**：`#ef4444`（红色）
- **评分趋势线**：`#3b82f6`（蓝色）

---

### 四、前端风格规范

#### 4.1 组件结构规范

- **目录划分**：
  - `src/components/ui/` → 基础UI组件（shadcn/ui）
  - `src/components/layout/` → 布局组件（Sidebar、AppLayout）
- **命名规范**：组件文件使用 `kebab-case.tsx`，导出使用 `PascalCase`
- **组件职责**：单一职责，禁止在UI组件中包含API调用逻辑

#### 4.2 页面组件规范

- **客户端组件**：所有页面必须标记 `"use client"`
- **状态管理**：使用 `useState` 管理本地状态，禁止引入Redux等全局状态库
- **数据获取**：使用 `fetch` 调用API，在 `useEffect` 中初始化数据

```typescript
// 页面组件标准结构
"use client";
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";

export default function PageName() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => { ... };
  
  return <AppLayout>...</AppLayout>;
}
```

#### 4.3 样式规范

- **CSS方案**：Tailwind CSS 原子化样式，禁止自定义CSS类
- **样式组合**：使用 `cn()` 函数合并样式类
- **间距系统**：统一使用 Tailwind 间距单位（`p-6`、`gap-4`、`space-y-6`）
- **圆角**：统一使用 `rounded-xl`（Card）或 `rounded-md`（Button/Input）

```typescript
// 样式组合示例
import { cn } from "@/lib/utils";

<div className={cn(
  "rounded-xl border bg-card text-card-foreground shadow",
  className  // 允许外部覆盖
)} />
```

#### 4.4 布局规范

- **侧边栏宽度**：固定 `w-56`（224px）
- **主内容区**：`ml-56` 左边距 + `container mx-auto p-6` 内边距
- **卡片间距**：`space-y-6` 垂直间距
- **网格布局**：`grid gap-4 md:grid-cols-2 lg:grid-cols-4`

---

### 五、代码开发结构规范

#### 5.1 目录结构规范

```
src/
├── app/           # Next.js App Router（页面 + API）
│   ├── api/       # API Routes，按资源划分
│   └── [page]/    # 页面，每个页面独立目录
├── components/    # React组件
│   ├── ui/        # 基础UI组件（shadcn/ui）
│   └── layout/    # 布局组件
├── lib/           # 工具库（无业务逻辑）
│   ├── prisma.ts  # Prisma单例
│   ├── utils.ts   # 通用工具函数
│   └── validators.ts  # Zod验证器
├── services/      # 服务层（业务逻辑）
│   ├── crawler/   # 爬虫服务
│   ├── scheduler/ # 定时调度
│   └── logger/    # 日志服务
└── types/         # TypeScript类型定义
    └── index.ts   # 统一导出所有类型
```

#### 5.2 类型定义规范

- **集中管理**：所有类型定义集中在 `src/types/index.ts`
- **命名规范**：接口使用 `PascalCase`，属性使用 `camelCase`
- **数据库映射**：类型定义与Prisma Schema保持一致

```typescript
// 类型定义示例
export interface Hotel {
  id: number;
  hotelId: string;      // 对应 Prisma @map("hotel_id")
  hotelName: string;    // 对应 Prisma @map("hotel_name")
  ...
}
```

#### 5.3 导入规范

- **路径别名**：统一使用 `@/` 别名引用src目录
- **导入顺序**：
  1. 外部库（React、Next.js）
  2. 内部组件（`@/components`）
  3. 内部工具（`@/lib`）
  4. 内部服务（`@/services`）
  5. 类型定义（`@/types`）

```typescript
// 导入顺序示例
import { useState, useEffect } from "react";           // 1. 外部库
import { AppLayout } from "@/components/layout/app-layout";  // 2. 内部组件
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";                      // 3. 内部工具
import { fetchReviews } from "@/services/crawler";     // 4. 内部服务
import { Hotel, Review } from "@/types";               // 5. 类型定义
```

#### 5.4 错误处理规范

- **API层**：统一try-catch，返回标准错误响应
- **服务层**：抛出错误，由API层捕获处理
- **前端层**：显示错误信息，不抛出异常

```typescript
// API层错误处理
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // 业务逻辑
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

#### 5.5 日志规范

- **日志模块**：使用 `createLogger(moduleName)` 创建模块日志器
- **日志级别**：`info`、`warn`、`error`、`debug`
- **日志格式**：`[timestamp] [LEVEL] [module] message`

```typescript
// 日志使用示例
import { createLogger } from "@/services/logger";
const log = createLogger("Fetcher");

log.info("开始拉取评价");
log.error(`拉取失败: ${err.message}`);
```

#### 5.6 常量管理规范

- **定义位置**：服务层顶部定义常量
- **命名规范**：使用 `UPPER_SNAKE_CASE`
- **禁止硬编码**：所有配置值必须定义为常量

```typescript
// 常量定义示例
const COMMENT_API_PATTERN = /getHotelCommentList|commentList/i;
const INITIAL_FETCH_PAGES = 5;
const MAX_LOGS = 1000;
```

---

### 六、后续迭代开发指引

#### 6.1 新增功能开发流程

1. **类型定义**：在 `src/types/index.ts` 添加新类型
2. **数据库变更**：修改 `prisma/schema.prisma`，执行 `prisma db push`
3. **服务层实现**：在 `src/services/` 添加业务逻辑
4. **API层实现**：在 `src/app/api/` 添加路由处理
5. **前端实现**：在 `src/app/` 添加页面，在 `src/components/` 添加组件

#### 6.2 Prisma Schema 变更规范

**重要**：修改 Prisma Schema 后必须重新生成 Prisma Client，否则 TypeScript 类型和运行时客户端将不同步。

```bash
# 修改 schema.prisma 后执行
npx prisma generate
```

**注意事项**：
- 如果开发服务器正在运行，需要先停止服务器再执行 `prisma generate`，因为 Prisma Client 的文件可能被锁定
- 执行顺序：`prisma db push` → `prisma generate` → 重启开发服务器
- 常见错误：`Unknown argument 'xxx'` 表示 Prisma Client 未同步，需要重新生成

#### 6.3 禁止事项

- ❌ 在API Route中直接操作浏览器
- ❌ 在前端组件中包含业务逻辑
- ❌ 硬编码API URL或数据库字段名
- ❌ 跳过类型定义直接使用 `any`
- ❌ 在服务层引入UI组件依赖

#### 6.4 代码审查要点

- 分层架构是否正确（表现层→服务层→数据层）
- 类型定义是否完整
- 错误处理是否覆盖所有异常路径
- 日志记录是否充分
- 常量是否集中管理

---

### 七、Docker 构建与推送

每次修改代码后，如需更新 Docker Hub 上的镜像，按以下步骤操作。

#### 7.1 关键文件速览

| 文件 | 作用 |
|------|------|
| `Dockerfile` | 三阶段构建：deps → builder → runner（含 Chrome） |
| `docker-entrypoint.sh` | 容器启动入口，自动执行 `prisma db push` |
| `docker-compose.yml` | 开发环境 Compose（指定 build 上下文） |
| `docker-compose.prod.yml` | 生产环境 Compose（直接用镜像，免源码） |
| `.dockerignore` | 排除 `node_modules`、`.next`、`.env`、`*.db` |
| `next.config.ts` | `output: "standalone"` + `serverExternalPackages` |

#### 7.2 构建核心要点

```typescript
// next.config.ts — 保证 standalone 输出
const nextConfig: NextConfig = {
  output: "standalone",              // 自包含输出
  serverExternalPackages: [          // 不打包进 bundle 的包
    "puppeteer",
    "puppeteer-extra",
    "puppeteer-extra-plugin-stealth",
    "better-sqlite3",
    "@prisma/client",
  ],
};
```

```prisma
// prisma/schema.prisma — Docker 环境必需的 binaryTargets
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}
```

#### 7.3 完整构建命令

```bash
# 1. 确保 Prisma Client 是最新的（停止 dev server 后执行）
npx prisma generate

# 2. 构建镜像（当前目录执行）
docker build -t ctrip-review-monitor:latest .
```

构建耗时约 3-5 分钟，包含三步：
1. deps 阶段：pnpm 安装依赖（首次慢，后续缓存）
2. builder 阶段：`prisma generate` + `pnpm build`（Next.js standalone 输出）
3. runner 阶段：安装 Chrome 运行库 + 解包 Chrome `.deb` + 安装 `prisma@6` CLI

#### 7.4 本地验证

```bash
# 先停掉当前容器（如果有）
docker rm -f ctrip-review-monitor 2>/dev/null

# 用本地数据库启动验证
docker run -d \
  --name ctrip-review-monitor \
  -p 3000:3000 \
  -v "`pwd`/prisma/data:/app/prisma/data" \
  --shm-size=2gb \
  -e NODE_ENV=production \
  -e DATABASE_URL=file:/app/prisma/data/reviews.db \
  ctrip-review-monitor:latest

# 检查 Chrome 是否正常
docker exec ctrip-review-monitor google-chrome-stable --version

# 检查 API
curl http://localhost:3000/api/hotels
```

#### 7.5 推送到 Docker Hub

```bash
# 登录（只需首次执行一次）
docker login

# 打标签
docker tag ctrip-review-monitor:latest zhaoboya/ctrip-review-monitor:latest

# 推送
docker push zhaoboya/ctrip-review-monitor:latest
```

#### 7.6 常见坑

| 问题 | 原因 | 解决 |
|------|------|------|
| Chrome 找不到共享库 (`libglib` 等) | `dpkg-deb -x` 解包不装依赖 | Dockerfile 预先 `apt-get install libglib2.0-0 libnss3 ...` |
| `prisma: "unknown option --skip-generate"` | 全局装了 Prisma v7 | 锁定 `npm install -g prisma@6` |
| Prisma Client 引擎不匹配 | 未添加 `binaryTargets` | schema.prisma 加 `debian-openssl-3.0.x` |
| Debian 官方源 502 | 大陆网络访问 deb.debian.org 不稳定 | 已将 openssl 等必要包内置于镜像 |
| pnpm `packages field missing` | `pnpm-workspace.yaml` 格式不完整 | 确认 `packages: []` 存在 |
| Windows 下 `prisma generate` 报 EPERM | dev server 锁了 native engine DLL | 先 `Ctrl+C` 停掉 dev server |