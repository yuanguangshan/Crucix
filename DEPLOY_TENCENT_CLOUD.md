# Crucix 腾讯云部署指南

本目录包含用于在腾讯云服务器上自动部署 Crucix 的脚本。

## 脚本说明

### 1. `deploy-quick.sh` - 一键部署（推荐）

自动配置所有环境变量并部署，适合首次部署。

```bash
# 上传脚本到服务器后
chmod +x deploy-quick.sh
./deploy-quick.sh
```

脚本会交互式询问：
- LLM Provider
- API Key
- Telegram 配置
- 端口号

### 2. `deploy-tencent-cloud.sh` - 标准部署

手动配置环境变量，使用 `.env.example` 模板。

```bash
chmod +x deploy-tencent-cloud.sh
./deploy-tencent-cloud.sh

# 部署后手动编辑配置
nano /opt/crucix/.env
pm2 restart crucix
```

### 3. `update-tencent-cloud.sh` - 更新脚本

更新已有部署到最新版本。

```bash
chmod +x update-tencent-cloud.sh
./update-tencent-cloud.sh
```

## 腾讯云控制台配置

### 防火墙规则

在腾讯云控制台添加防火墙规则：

| 类型 | 端口 | 来源 |
|------|------|------|
| TCP | 3117 | 0.0.0.0/0 |

### 轻量应用服务器 (Lighthouse)

1. 购买服务器
2. 选择镜像：`Ubuntu 22.04` 或 `Node.js`
3. 配置：2核2GB 起步
4. 使用 Web Shell 或 SSH 连接

### 云服务器 (CVM)

1. 创建实例
2. 选择操作系统：`Ubuntu 22.04/24.04`
3. 配置安全组开放端口 3117

## PM2 常用命令

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs crucix

# 实时监控
pm2 monit

# 重启
pm2 restart crucix

# 停止
pm2 stop crucix

# 删除
pm2 delete crucix
```

## 配置域名（可选）

### 安装 Nginx

```bash
apt install nginx -y
```

### 配置反向代理

创建配置文件 `/etc/nginx/sites-available/crucix`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3117;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 启用配置

```bash
ln -s /etc/nginx/sites-available/crucix /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 安装 SSL 证书

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d your-domain.com
```

## 故障排除

### 检查服务状态
```bash
pm2 status
pm2 logs crucix --lines 100
```

### 检查端口占用
```bash
lsof -i:3117
```

### 重置防火墙
```bash
# 在腾讯云控制台操作，或使用 UFW
ufw allow 3117/tcp
```

## 目录结构

部署后的目录结构：

```
/opt/crucix/
├── server.mjs              # 主服务器
├── crucix.config.mjs       # 配置文件
├── .env                    # 环境变量（包含敏感信息）
├── apis/                   # API 源码
├── dashboard/              # 仪表板
├── lib/                    # 核心库
└── runs/                   # 运行时数据
```
