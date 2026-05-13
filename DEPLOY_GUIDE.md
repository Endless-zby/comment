# 酒店评价监控系统 — 部署指南

> 面向运营人员，使用 Docker Desktop 快速部署。

---

## 一、安装 Docker Desktop

1. 下载安装：[https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
2. 安装完成后启动 Docker Desktop
3. 等待左下角状态变为 **绿色（Running）**

---

## 二、拉取镜像

在 Docker Desktop 搜索栏或终端中执行：

```bash
docker pull zhaoboya/ctrip-review-monitor:latest
```

---

## 三、启动服务

```bash
docker run -d \
  --name ctrip-review \
  -p 3000:3000 \
  -v review_data:/app/prisma/data \
  --shm-size=2gb \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e DATABASE_URL=file:/app/prisma/data/reviews.db \
  zhaoboya/ctrip-review-monitor:latest
```

**参数说明：**

| 参数 | 含义 |
|------|------|
| `-p 3000:3000` | 端口映射，浏览器通过 3000 端口访问 |
| `-v review_data:/app/prisma/data` | 数据持久化，删除容器数据不丢失 |
| `--shm-size=2gb` | Chrome 运行所需共享内存，**必须** |
| `--restart unless-stopped` | 开机/Docker 重启后自动启动 |

启动后等待约 30 秒，浏览器打开 **http://localhost:3000** 即可使用。

---

## 四、系统设置

首次使用需在 **「系统设置」** 页面配置：

| 配置项 | 说明 | 何时需要 |
|--------|------|----------|
| 携程 Cookie | 登录携程后导出的 Cookie（JSON 格式） | 采集携程评价（推荐 API 模式） |
| 飞猪 Cookie | 登录飞猪后导出的 Cookie（JSON 格式） | 采集飞猪评价 |
| DeepSeek API Key | AI 评价周报功能 | 使用 AI 周报时 |
| ES 地址 / 索引 | 评价溯源功能 | 使用溯源功能时 |

> 💡 Cookie 获取：浏览器登录目标平台 → F12 开发者工具 → Application → Cookies → 使用 Cookie-Editor 插件导出 JSON。

---

## 五、日常管理

```bash
# 查看状态
docker ps --filter name=ctrip-review

# 查看日志
docker logs --tail 100 ctrip-review

# 重启
docker restart ctrip-review

# 停止
docker stop ctrip-review

# 启动
docker start ctrip-review
```

---

## 六、数据备份

```bash
# 备份数据库
docker cp ctrip-review:/app/prisma/data/reviews.db ./reviews_backup_$(date +%Y%m%d).db

# 恢复数据库：停止容器 → 替换文件 → 启动容器
docker stop ctrip-review
docker cp ./reviews_backup_YYYYMMDD.db ctrip-review:/app/prisma/data/reviews.db
docker start ctrip-review
```

---

## 七、升级版本

```bash
docker pull zhaoboya/ctrip-review-monitor:latest
docker stop ctrip-review
docker rm ctrip-review
docker run -d \
  --name ctrip-review \
  -p 3000:3000 \
  -v review_data:/app/prisma/data \
  --shm-size=2gb \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e DATABASE_URL=file:/app/prisma/data/reviews.db \
  zhaoboya/ctrip-review-monitor:latest
```

> 数据在 Docker Volume 中，删除容器不会丢失。

---

## 八、常见问题

| 问题 | 解决 |
|------|------|
| 无法访问 localhost:3000 | 等待 30 秒；确认 `docker ps` 显示 Up |
| 评价采集失败 | 检查 Cookie 是否过期（通常 1-3 天需更新） |
| Chrome 崩溃 | 确认启动命令含 `--shm-size=2gb` |
| 端口冲突 | 改用其他端口：`-p 3001:3000` |
