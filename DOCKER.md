# Docker 部署指南

## 快速开始

### 1. 构建镜像

```bash
docker build -t ctrip-review-monitor:latest .
```

### 2. 使用 Docker Compose 运行（推荐）

```bash
docker-compose up -d
```

### 3. 查看日志

```bash
docker-compose logs -f
```

### 4. 停止服务

```bash
docker-compose down
```

## 手动运行 Docker 容器

```bash
docker run -d \
  --name ctrip-review-monitor \
  -p 3000:3000 \
  -v $(pwd)/prisma/data:/app/prisma/data \
  --shm-size=2gb \
  --restart unless-stopped \
  ctrip-review-monitor:latest
```

## 数据持久化

项目使用本地 `prisma/data/reviews.db` 数据库文件，通过目录挂载直接使用：

```yaml
volumes:
  - ./prisma/data:/app/prisma/data
```

**优点**：
- 数据库文件直接存储在宿主机，方便查看和备份
- 容器重启/删除不会丢失数据
- 可以直接用本地工具访问数据库

**备份数据**：

```bash
# 直接复制数据库文件
cp prisma/data/reviews.db prisma/data/reviews.db.backup

# 或打包备份
tar czf reviews-db-backup-$(date +%Y%m%d).tar.gz prisma/data/
```

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `NODE_ENV` | `production` | 运行环境 |
| `DATABASE_URL` | `file:/app/prisma/data/reviews.db` | 数据库路径 |
| `PORT` | `3000` | 服务端口 |

## 常见问题

### 1. Puppeteer 无法启动

确保容器有足够的共享内存：

```yaml
services:
  comment-monitor:
    shm_size: '2gb'
```

或在 `docker run` 时添加：

```bash
docker run --shm-size=2gb ...
```

### 2. 权限问题

如果遇到权限错误，可以以 root 用户运行：

```yaml
services:
  comment-monitor:
    user: "0:0"
```

### 3. 查看容器内日志

```bash
docker exec -it ctrip-review-monitor sh
ls -la /app/prisma/data/
```

## 生产环境建议

1. **使用反向代理**：在容器前部署 Nginx 或 Traefik
2. **监控告警**：配置健康检查和日志收集
3. **定期备份**：设置定时任务备份 SQLite 数据
4. **资源限制**：设置 CPU 和内存限制

```yaml
services:
  comment-monitor:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```