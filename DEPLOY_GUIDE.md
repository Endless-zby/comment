# 酒店评价监控系统 — Windows 部署操作指南

> 本文档面向运营人员，指导在 Windows 11 系统上通过 WSL2 + Docker 部署酒店评价监控系统。
> 使用 WSL2 镜像网络模式，容器可直接访问宿主机 VPN 网络（ES、hotelList 等内网接口）。

---

## 一、前置条件

| 项目 | 要求 |
|------|------|
| 操作系统 | Windows 11 22H2 或更高版本 |
| WSL2 | 已安装并更新至最新版本 |
| VPN | 宿主机已连接公司 VPN（如需访问内网 ES 等接口） |

### 1.1 确认 WSL2 已安装

打开 **PowerShell**，执行：

```powershell
wsl --version
```

如果提示"未识别"，需先安装 WSL2：

```powershell
wsl --install
```

安装完成后**重启电脑**。

### 1.2 确认 Ubuntu 已安装

```powershell
wsl -l -v
```

应看到类似输出：

```
  NAME              STATE           VERSION
* Ubuntu-20.04      Running         2
```

如果列表中没有 Ubuntu，执行：

```powershell
wsl --install -d Ubuntu-20.04
```

---

## 二、配置 WSL2 镜像网络模式

> **关键步骤**：镜像网络模式让 WSL2 与 Windows 共享同一网络栈，VPN 流量直接可达容器。

### 2.1 创建 .wslconfig 文件

在 PowerShell 中执行：

```powershell
Set-Content -Path "$env:USERPROFILE\.wslconfig" -Value @"
[wsl2]
networkingMode=mirrored
"@
```

### 2.2 重启 WSL 使配置生效

```powershell
wsl --shutdown
```

等待约 5 秒后，WSL 会自动重新启动。

### 2.3 验证镜像网络模式

```powershell
wsl -d Ubuntu-20.04 -- ip addr show eth0
```

如果输出的 IP 地址与 Windows 宿主机的 IP 相同，说明镜像模式已生效。

---

## 三、在 WSL2 内安装 Docker Engine

> 不使用 Docker Desktop，直接在 WSL2 内安装原生 Docker Engine。

### 3.1 进入 WSL

```powershell
wsl -d Ubuntu-20.04
```

### 3.2 安装 Docker

在 WSL 终端中依次执行：

```bash
# 更新包管理器
sudo apt-get update

# 安装依赖
sudo apt-get install -y ca-certificates curl gnupg

# 添加 Docker 官方 GPG 密钥
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 添加 Docker 软件源
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

### 3.3 启动 Docker 服务

```bash
sudo service docker start
```

### 3.4 免 sudo 使用 Docker

```bash
sudo usermod -aG docker $USER
```

执行后**退出 WSL 并重新进入**：

```bash
exit
```

```powershell
wsl -d Ubuntu-20.04
```

### 3.5 验证 Docker 安装

```bash
docker --version
docker run hello-world
```

看到 `Hello from Docker!` 即表示安装成功。

### 3.6 设置 Docker 开机自启

WSL 每次启动后需要手动启动 Docker 服务。为避免每次手动操作，添加自动启动配置：

```bash
# 编辑 bashrc
echo '
# Auto-start Docker
if ! service docker status > /dev/null 2>&1; then
  sudo service docker start > /dev/null 2>&1
fi' >> ~/.bashrc

# 配置免密 sudo 启动 docker
sudo visudo -f /etc/sudoers.d/docker-start
```

在打开的编辑器中输入：

```
%sudo ALL=(root) NOPASSWD: /usr/sbin/service docker start
```

保存退出（Ctrl+X → Y → Enter）。

---

## 四、部署系统

### 4.1 拉取镜像并启动

在 WSL 终端中执行：

```bash
docker run -d \
  --name ctrip-review \
  --network host \
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
| `-d` | 后台运行 |
| `--name ctrip-review` | 容器名称，后续管理用这个名字 |
| `--network host` | 使用宿主机网络，**容器可直接访问 VPN 资源** |
| `-v review_data:/app/prisma/data` | 数据持久化，删除容器不会丢失数据 |
| `--shm-size=2gb` | Chrome 运行需要共享内存，必须 ≥ 2GB |
| `--restart unless-stopped` | Docker 重启后自动启动容器 |

### 4.2 等待启动完成

首次拉取镜像需要几分钟（约 1.5GB），启动后等待约 30 秒。

检查启动状态：

```bash
docker ps
```

看到 `ctrip-review` 状态为 `Up` 即表示成功。

### 4.3 访问系统

在 Windows 浏览器中打开：

```
http://localhost:3000
```

> 镜像网络模式下，WSL2 与 Windows 共享网络，直接用 `localhost` 即可访问。

首次打开数据库为空，需要先完成初始化配置（见下一节）。

---

## 五、系统初始化配置

登录系统后，点击左侧菜单 **「系统设置」**，按以下顺序配置：

### 5.1 Cookie 配置（采集评价必需）

| 配置项 | 说明 | 是否必填 |
|--------|------|----------|
| **飞猪 Cookie** | 飞猪平台的登录 Cookie，用于采集飞猪评价 | 采集飞猪评价时必填 |

> 💡 Cookie 获取方式：在浏览器登录飞猪后，按 F12 打开开发者工具 → Network → 刷新页面 → 点击任意请求 → Headers → 找到 `Cookie` 字段，复制完整值。

### 5.2 AI 评价周报配置

| 配置项 | 说明 | 是否必填 |
|--------|------|----------|
| **DeepSeek API Key** | 用于 AI 自动生成评价周报 | 使用 AI 周报功能时必填 |

> 💡 API Key 获取：访问 [DeepSeek 开放平台](https://platform.deepseek.com/) 注册并创建 API Key。

### 5.3 评价溯源配置

| 配置项 | 说明 | 默认值 | 是否必填 |
|--------|------|--------|----------|
| **ES 地址** | Elasticsearch 服务地址 | `http://10.31.177.15:9200` | 使用溯源功能时必填 |
| **ES 索引名称** | 埋点数据索引 | `mobile_hotel_h5_log-*` | 使用溯源功能时必填 |
| **后台酒店列表接口 URL** | 远程酒店查询 API 地址 | `https://api-jdagent.stqcloud.com/hotel/callback/ai/hotelList` | 使用溯源功能时必填 |
| **最小匹配相似度 (%)** | 低于此阈值的匹配视为未匹配 | `70` | 建议保持默认 |

> 💡 评价溯源功能用于识别从 AI 工具复制的评价内容。使用 `--network host` 部署，容器可直接通过 VPN 访问内网 ES 服务。

### 5.4 添加酒店

配置完成后，进入 **「酒店管理」** 页面：

1. 点击 **「添加酒店」**
2. 输入酒店名称（输入时可搜索后台酒店列表自动填充）
3. 填写携程酒店 ID 和/或飞猪酒店 ID
4. 设置入驻日期（可选，用于图表对比入驻前后数据变化）
5. 点击 **保存**

添加酒店后，系统会自动开始定时采集评价数据。

---

## 六、日常管理命令

以下命令均在 **WSL 终端** 中执行。

```powershell
# 从 Windows 进入 WSL
wsl -d Ubuntu-20.04
```

### 6.1 查看状态

```bash
docker ps -a --filter name=ctrip-review
```

### 6.2 查看日志

```bash
# 查看最近 100 行日志
docker logs --tail 100 ctrip-review

# 实时跟踪日志（Ctrl+C 退出）
docker logs -f ctrip-review
```

### 6.3 重启服务

```bash
docker restart ctrip-review
```

### 6.4 停止服务

```bash
docker stop ctrip-review
```

### 6.5 启动服务

```bash
docker start ctrip-review
```

### 6.6 删除容器（数据不会丢失）

```bash
docker stop ctrip-review
docker rm ctrip-review
```

> ⚠️ 删除容器后数据保留在 Docker Volume 中。如需重新启动，重新执行第四章的 `docker run` 命令即可。

---

## 七、数据备份与恢复

### 7.1 备份数据库

```bash
# 创建备份目录
mkdir -p ~/review-backup

# 从容器中复制数据库文件
docker cp ctrip-review:/app/prisma/data/reviews.db ~/review-backup/reviews_$(date +%Y%m%d).db
```

> 建议每周备份一次，备份文件按日期命名。

### 7.2 从 Windows 访问备份文件

WSL 的 home 目录在 Windows 资源管理器中的路径为：

```
\\wsl$\Ubuntu-20.04\home\<你的用户名>\review-backup\
```

也可以在 WSL 中直接复制到 Windows 目录：

```bash
cp ~/review-backup/reviews_$(date +%Y%m%d).db /mnt/d/review-backup/
```

### 7.3 恢复数据库

```bash
# 1. 停止并删除当前容器
docker stop ctrip-review
docker rm ctrip-review

# 2. 找到 Volume 在 WSL 中的实际路径
docker volume inspect review_data
# 输出中的 MountPoint 字段就是实际路径

# 3. 将备份的 .db 文件复制到该路径下，替换 reviews.db
sudo cp ~/review-backup/reviews_YYYYMMDD.db <MountPoint路径>/reviews.db

# 4. 重新启动容器
docker run -d \
  --name ctrip-review \
  --network host \
  -v review_data:/app/prisma/data \
  --shm-size=2gb \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e DATABASE_URL=file:/app/prisma/data/reviews.db \
  zhaoboya/ctrip-review-monitor:latest
```

### 7.4 使用本地目录存储数据（推荐）

如果希望数据文件直接存在 Windows 磁盘上（方便备份和管理），可以挂载 Windows 目录：

```bash
# 在 WSL 中创建挂载点
sudo mkdir -p /mnt/d/review-data

# 启动容器，挂载 Windows D 盘目录
docker run -d \
  --name ctrip-review \
  --network host \
  -v /mnt/d/review-data:/app/prisma/data \
  --shm-size=2gb \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e DATABASE_URL=file:/app/prisma/data/reviews.db \
  zhaoboya/ctrip-review-monitor:latest
```

> ⚠️ SQLite 运行时会产生 `reviews.db`、`reviews.db-wal`、`reviews.db-shm` 三个文件，**必须挂载整个目录**，不能只挂载单个 `.db` 文件。

---

## 八、系统升级

当有新版本发布时，在 WSL 终端中执行：

```bash
# 1. 拉取最新镜像
docker pull zhaoboya/ctrip-review-monitor:latest

# 2. 停止并删除旧容器
docker stop ctrip-review
docker rm ctrip-review

# 3. 使用新镜像启动（数据不会丢失）
docker run -d \
  --name ctrip-review \
  --network host \
  -v review_data:/app/prisma/data \
  --shm-size=2gb \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e DATABASE_URL=file:/app/prisma/data/reviews.db \
  zhaoboya/ctrip-review-monitor:latest
```

> 💡 升级后系统会自动执行数据库迁移，无需手动操作。

---

## 九、功能页面速览

| 页面 | 路径 | 功能说明 |
|------|------|----------|
| 仪表盘 | `/dashboard` | 数据概览、评分分布、近期评价 |
| 酒店管理 | `/hotels` | 添加/编辑/删除酒店，设置入驻日期，绑定后台酒店 |
| 评价列表 | `/reviews` | 多维度筛选评价，查看图片，导出 Excel |
| 配置管理 | `/configs` | 设置拉取参数，手动触发拉取，查看日志 |
| 统计分析 | `/stats` | 周趋势图、评分折线图、情感时间线、热力图 |
| 词云分析 | `/wordcloud` | 评价关键词词云、Top N 标签统计 |
| AI 周报 | `/ai-report` | 生成 AI 评价周报，查看历史报告 |
| 评价溯源 | `/track-match` | 查询 H5 埋点复制事件，匹配平台评价，识别 AI 生成评价 |
| 系统设置 | `/settings` | Cookie、API Key、溯源参数等配置 |

---

## 十、常见问题

### Q1: 启动后无法访问 http://localhost:3000

**排查步骤：**

1. 确认容器正在运行：`docker ps`
2. 查看启动日志：`docker logs ctrip-review`
3. 等待 30-60 秒后重试（首次启动较慢）
4. 确认 WSL2 镜像网络模式已生效：
   ```powershell
   # 在 PowerShell 中
   wsl -d Ubuntu-20.04 -- ip addr show eth0
   ```
   如果 IP 与 Windows 不同，说明镜像模式未生效，检查 `.wslconfig` 并执行 `wsl --shutdown`

### Q2: WSL 内 Docker 服务未启动

WSL 每次冷启动后需要手动启动 Docker：

```bash
sudo service docker start
```

如果已按 3.6 节配置了自动启动，则无需手动操作。

### Q3: 拉取镜像很慢

Docker Hub 在国内访问可能较慢，可以配置镜像加速器：

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": ["https://mirror.ccs.tencentyun.com"]
}
EOF
sudo service docker restart
```

### Q4: 容器无法访问内网 ES / hotelList 接口

1. 确认 Windows 宿主机已连接 VPN
2. 确认 WSL2 使用镜像网络模式（`.wslconfig` 中 `networkingMode=mirrored`）
3. 确认容器使用 `--network host` 启动
4. 在 WSL 中测试连通性：
   ```bash
   curl -s http://10.31.177.15:9200
   ```
5. 如果 WSL 内也无法访问，尝试重启 WSL：`wsl --shutdown`

### Q5: 评价采集不工作

1. 进入「系统设置」确认 Cookie 是否已配置且未过期
2. Cookie 有效期通常 1-3 天，过期后需重新获取并更新
3. 进入「配置管理」确认对应酒店的拉取配置已启用
4. 查看容器日志排查错误：`docker logs --tail 50 ctrip-review`

### Q6: Chrome 相关错误

如果日志中出现 Chrome 崩溃相关错误，确认启动命令中包含 `--shm-size=2gb` 参数。Chrome 运行需要足够的共享内存，缺少此参数会导致崩溃。

### Q7: WSL 重启后容器没有自动启动

WSL 重启后 Docker 服务需要先启动，然后容器才会自动运行（因为 `--restart unless-stopped`）。

确保已按 3.6 节配置 Docker 自动启动，或手动执行：

```bash
sudo service docker start
```

### Q8: 数据丢失了怎么办

- 如果使用 Docker Volume（`-v review_data:...`），数据不会因容器删除而丢失
- 如果误删了 Volume，只能从备份恢复
- **强烈建议**定期执行第七章的备份操作

---

## 十一、完整启动命令速查

### 方式一：使用 Docker Volume（默认）

```bash
docker run -d \
  --name ctrip-review \
  --network host \
  -v review_data:/app/prisma/data \
  --shm-size=2gb \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e DATABASE_URL=file:/app/prisma/data/reviews.db \
  zhaoboya/ctrip-review-monitor:latest
```

### 方式二：使用 Windows 本地目录存储

```bash
docker run -d \
  --name ctrip-review \
  --network host \
  -v /mnt/d/review-data:/app/prisma/data \
  --shm-size=2gb \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e DATABASE_URL=file:/app/prisma/data/reviews.db \
  zhaoboya/ctrip-review-monitor:latest
```

### 方式三：使用 docker-compose

1. 在 WSL 中创建 `docker-compose.yml` 文件：

```bash
mkdir -p ~/ctrip-review && cd ~/ctrip-review
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  comment-monitor:
    image: zhaoboya/ctrip-review-monitor:latest
    container_name: ctrip-review-monitor
    restart: unless-stopped
    network_mode: "host"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/app/prisma/data/reviews.db
    volumes:
      - review_data:/app/prisma/data
    shm_size: '2gb'

volumes:
  review_data:
    driver: local
EOF
```

2. 启动：

```bash
cd ~/ctrip-review
docker compose up -d
```

3. 停止：

```bash
docker compose down
```

> 💡 `docker compose down` 只停止容器，不会删除 Volume 数据。加 `--volumes` 才会删除数据，**请勿使用**。
