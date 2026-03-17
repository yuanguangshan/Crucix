<div align="center">

# Crucix

**你自己的智能终端。27 个数据源。一条命令。零云服务。**

[![Node.js 22+](https://img.shields.io/badge/node-22%2B-brightgreen)](#quick-start)
[![License: AGPL v3](https://img.shields.io/badge/license-AGPLv3-blue.svg)](LICENSE)
[![Dependencies](https://img.shields.io/badge/dependencies-1%20(express)-orange)](#architecture)
[![Sources](https://img.shields.io/badge/OSINT%20sources-27-cyan)](#数据源-27)
[![Docker](https://img.shields.io/badge/docker-ready-blue?logo=docker)](#docker)

![Crucix 仪表盘](docs/dashboard.png)

<details>
<summary>更多截图</summary>

| 启动序列 | 世界地图 |
|:---:|:---:|
| ![启动](docs/boot.png) | ![地图](docs/map.png) |

| 3D 地球视图 |
|:---:|
| ![地球](docs/globe.png) |

</details>

</div>

Crucix 从 27 个开源情报源并行拉取卫星火灾检测、航班追踪、辐射监控、卫星星座追踪、经济指标、实时市场价格、冲突数据、制裁名单和社交情绪数据——每 15 分钟刷新一次——并将所有内容呈现在一个独立的 Jarvis 风格仪表盘上。

将其连接到 LLM，它就变成了一个**双向智能助手**——当发生有意义的变化时，向 Telegram 和 Discord 推送多层次警报，从手机响应 `/brief` 和 `/sweep` 等命令，并基于真实跨领域数据生成可操作的交易思路。属于你自己的分析师，在你睡觉时监控世界。

无云服务。无遥测。无订阅。只需 `node server.mjs` 即可运行。

---

## 为什么存在

世界上大部分实时智能数据——卫星图像、辐射水平、冲突事件、经济指标、航班追踪、海上活动——都是公开可用的。只是分散在几十个政府 API、研究机构和开放数据源中，没人有时间单独检查。

Crucix 将所有内容整合到一个地方。不隐藏在付费墙后，不锁定在企业平台中，不需要安全许可。只需在您自己的机器上聚合和交叉关联开放数据，每 15 分钟更新一次。

它是为任何想要了解世界当前实际情况的人构建的——研究人员、记者、交易员、OSINT 分析师，或者只是相信信息获取不应取决于预算的好奇者。

---

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/calesthio/Crucix.git
cd crucix

# 2. 安装依赖（只需 Express）
npm install

# 3. 复制环境变量模板并添加你的 API 密钥（见下文）
cp .env.example .env

# 4. 启动仪表盘
npm run dev
```

> **如果 `npm run dev` 静默失败**（无输出退出），直接运行 Node：
> ```bash
> node --trace-warnings server.mjs
> ```
> 这绕过了 npm 的脚本运行器，它在某些系统（尤其是 Windows 上的 PowerShell）可能会吞掉错误。你也可以运行 `node diag.mjs` 来诊断确切问题——它检查你的 Node 版本、单独测试每个模块导入并验证端口可用性。参见[故障排除](#故障排除)了解更多。

仪表盘会自动在 `http://localhost:3117` 打开，并立即开始首次情报扫描。这次初始扫描并行查询所有 27 个数据源，通常需要 30-60 秒——在扫描完成并推送第一次数据更新之前，仪表盘看起来是空的。之后，它通过 SSE（服务器发送事件）每 15 分钟自动刷新。无需手动刷新页面。

**要求：** Node.js 22+（使用原生 `fetch`、顶层 `await`、ESM）

### Docker

```bash
git clone https://github.com/calesthio/Crucix.git
cd crucix
cp .env.example .env    # 添加你的 API 密钥
docker compose up -d
```

仪表盘地址 `http://localhost:3117`。扫描数据通过卷挂载持久化在 `./runs/` 中。包含健康检查端点。

---

## 你将获得

### 实时仪表盘
一个独立的 Jarvis 风格 HUD，具有：
- **3D WebGL 地球**（Globe.gl）带大气光晕、星空和平滑旋转——以及经典平面地图切换
- **两种视图中的 9 种标记类型**：火灾检测、空中交通、辐射站点、海上咽喉点、SDR 接收器、OSINT 事件、健康警报、地理定位新闻、冲突事件
- **动画 3D 航班走廊弧线**连接空中交通热点和全球枢纽
- **区域过滤器**（世界、美洲、欧洲、中东、亚太、非洲）——旋转地球或缩放平面地图
- **实时市场数据**——指数、加密货币、能源、大宗商品（通过 Yahoo Finance，无需 API 密钥）
- **风险仪表**——VIX、高收益利差、供应链压力指数
- **OSINT 信息流**——来自 17 个 Telegram 智能频道的英语帖子（可扩展）
- **新闻滚动条**——合并的 RSS + GDELT 标题 + Telegram 帖子，自动滚动
- **扫描增量**——实时面板显示自上次扫描以来的变化（新信号、升级、降级及其严重程度）
- **跨源信号**——跨卫星、经济、冲突和社会领域的关联情报
- **核监控**——来自 Safecast + EPA RadNet 的实时辐射读数
- **太空监控**——CelesTrak 卫星追踪：最近发射、ISS、军事星座、Starlink/OneWeb 计数
- **可利用的思路**——AI 生成的交易思路（带 LLM）或信号关联思路（不带）

### 自动刷新
服务器每 15 分钟运行一次扫描周期（可配置）。每个周期：
1. 并行查询所有 27 个数据源（约 30 秒）
2. 将原始数据合成为仪表盘格式
3. 计算与上次运行的增量（变化了什么、升级、降级）——在仪表盘的**扫描增量**面板中可见
4. 生成 LLM 交易思路（如果配置）
5. 评估突发新闻警报——多层次（FLASH / PRIORITY / ROUTINE）带语义去重。如果配置则发送到 Telegram 和/或 Discord。支持 LLM 评估或在 LLM 不可用时回退到基于规则的警报。
6. 通过 SSE 将更新推送到所有连接的浏览器

### Telegram 机器人（双向）
Crucix 也是一个交互式 Telegram 机器人。除了发送警报，它直接从你的聊天中响应命令：

| 命令 | 功能 |
|---------|-------------|
| `/status` | 系统健康、最后扫描时间、数据源状态、LLM 状态 |
| `/sweep` | 触发手动扫描周期 |
| `/brief` | 最新情报的紧凑文本摘要（方向、关键指标、顶级 OSINT） |
| `/portfolio` | 投资组合状态（如果连接了 Alpaca） |
| `/alerts` | 最近的警报历史及级别 |
| `/mute` / `/mute 2h` | 静音警报 1 小时（或自定义时长） |
| `/unmute` | 恢复警报 |
| `/help` | 显示所有可用命令 |

这需要在 `.env` 中设置 `TELEGRAM_BOT_TOKEN` 和 `TELEGRAM_CHAT_ID`。机器人每 5 秒轮询一次消息（可通过 `TELEGRAM_POLL_INTERVAL` 配置）。

### Discord 机器人（双向）

Crucix 也支持 Discord 作为全功能机器人，带斜杠命令和富嵌入警报。它镜像了 Telegram 机器人的功能，采用 Discord 原生格式。

| 命令 | 功能 |
|---------|-------------|
| `/status` | 系统健康、最后扫描时间、数据源状态、LLM 状态 |
| `/sweep` | 触发手动扫描周期 |
| `/brief` | 最新情报的紧凑文本摘要 |
| `/portfolio` | 投资组合状态（如果连接了 Alpaca） |

警报以富嵌入形式传递，带有颜色编码侧边栏：红色代表 FLASH，黄色代表 PRIORITY，蓝色代表 ROUTINE。每个嵌入包含信号详情、置信度评分和跨领域关联。

**设置需要：** `DISCORD_BOT_TOKEN`、`DISCORD_CHANNEL_ID`，以及可选的 `DISCORD_GUILD_ID` 用于即时斜杠命令注册。参见 [API 密钥设置](#api-密钥设置) 了解详情。

**Webhook 回退：** 如果你不想运行完整的机器人，设置 `DISCORD_WEBHOOK_URL`。这启用单向警报（无斜杠命令），零依赖——不需要 `discord.js`。

**可选依赖：** 完整机器人需要 `discord.js`。使用 `npm install discord.js` 安装。如果未安装，Crucix 自动回退到仅 webhook 模式。

### 可选 LLM 层
连接 4 个 LLM 提供商中的任何一个以增强分析：
- **AI 交易思路**——量化分析师产生 5-8 个可操作思路，引用具体数据
- **更智能的警报评估**——LLM 将信号分类为 FLASH/PRIORITY/ROUTINE 级别，带跨领域关联和置信度评分
- 提供商：Anthropic Claude、OpenAI、Google Gemini、OpenAI Codex（ChatGPT 订阅）
- 优雅回退——当 LLM 不可用时，基于规则的引擎接管警报评估。LLM 故障从不中断扫描周期。

---

## API 密钥设置

在项目根目录将 `.env.example` 复制为 `.env`：

```bash
cp .env.example .env
```

### 最佳结果所需（全部免费）

| 密钥 | 数据源 | 获取方式 |
|-----|--------|------------|
| `FRED_API_KEY` | 联储经济数据 | [fred.stlouisfed.org](https://fred.stlouisfed.org/docs/api/api_key.html) ——即时，免费 |
| `FIRMS_MAP_KEY` | NASA FIRMS（卫星火灾数据） | [firms.modaps.eosdis.nasa.gov](https://firms.modaps.eosdis.nasa.gov/api/area/) ——即时，免费 |
| `EIA_API_KEY` | 美国能源信息署 | [api.eia.gov](https://www.eia.gov/opendata/register.php) ——即时，免费 |

这三个解锁了最有价值的经济和卫星数据。每个注册大约需要 60 秒。

### 可选（启用额外数据源）

| 密钥 | 数据源 | 获取方式 |
|-----|--------|------------|
| `ACLED_EMAIL` + `ACLED_PASSWORD` | 武装冲突事件数据 | [acleddata.com/register](https://acleddata.com/register/) ——免费，OAuth2 |
| `AISSTREAM_API_KEY` | 海上 AIS 船舶追踪 | [aisstream.io](https://aisstream.io/) ——免费 |
| `ADSB_API_KEY` | 无过滤航班追踪 | [RapidAPI](https://rapidapi.com/adsbexchange/api/adsbexchange-com1) ——约 $10/月 |

### LLM 提供商（可选，用于 AI 增强思路）

将 `LLM_PROVIDER` 设置为以下之一：`anthropic`、`openai`、`gemini`、`codex`

| 提供商 | 所需密钥 | 默认模型 |
|----------|-------------|---------------|
| `anthropic` | `LLM_API_KEY` | claude-sonnet-4-6 |
| `openai` | `LLM_API_KEY` | gpt-5.4 |
| `gemini` | `LLM_API_KEY` | gemini-3.1-pro |
| `codex` | 无（使用 `~/.codex/auth.json`） | gpt-5.3-codex |

对于 Codex，运行 `npx @openai/codex login` 通过你的 ChatGPT 订阅进行身份验证。

### Telegram 机器人 + 警报（可选）

| 密钥 | 获取方式 |
|-----|------------|
| `TELEGRAM_BOT_TOKEN` | 通过 Telegram 上的 [@BotFather](https://t.me/BotFather) 创建 |
| `TELEGRAM_CHAT_ID` | 通过 [@userinfobot](https://t.me/userinfobot) 获取 |
| `TELEGRAM_CHANNELS` | *(可选)* 额外要监控的频道 ID，逗号分隔，除了内置的 17 个频道 |
| `TELEGRAM_POLL_INTERVAL` | *(可选)* 机器人命令轮询间隔，单位毫秒（默认：5000） |

### Discord 机器人 + 警报（可选）

| 密钥 | 获取方式 |
|-----|------------|
| `DISCORD_BOT_TOKEN` | 在 [Discord 开发者门户](https://discord.com/developers/applications)创建 → Bot → Token |
| `DISCORD_CHANNEL_ID` | 在 Discord 中右键点击频道（开启开发者模式）→ 复制频道 ID |
| `DISCORD_GUILD_ID` | *(可选)* 右键点击服务器 → 复制服务器 ID。启用即时斜杠命令注册（否则全局命令可能需要长达 1 小时） |
| `DISCORD_WEBHOOK_URL` | *(可选)* 频道设置 → 集成 → Webhooks → 新 Webhook → 复制 URL。用于仅警报模式，无需机器人 |

**Discord 机器人设置：**
1. 前往 [Discord 开发者门户](https://discord.com/developers/applications) 并创建新应用
2. 前往 **Bot** → 点击 **Reset Token** → 将 token 复制到 `DISCORD_BOT_TOKEN`
3. 在 **Privileged Gateway Intents** 下，启用 **Message Content Intent**
4. 前往 **OAuth2** → **URL Generator** → 选择 `bot` + `applications.commands` 范围 → 选择 `Send Messages` + `Embed Links` 权限
5. 复制生成的 URL 并在浏览器中打开以邀请机器人到你的服务器
6. 安装依赖：`npm install discord.js`

警报在 Telegram 和 Discord 上无论是否有 LLM 都能工作。配置了 LLM 时，信号评估更丰富和上下文感知。没有时，确定性规则引擎基于严重程度、跨领域关联和信号计数评估信号。

### 没有任何密钥

Crucix 在零 API 密钥的情况下仍然可以工作。18+ 数据源完全不需要身份验证。需要密钥的数据源返回结构化错误，其余扫描正常继续。

---

## 架构

```
crucix/
├── server.mjs                 # Express 开发服务器（SSE、自动刷新、LLM、机器人命令）
├── crucix.config.mjs          # 配置带环境变量覆盖 + 增量阈值
├── diag.mjs                   # 诊断脚本 ——服务器启动失败时运行
├── .env.example               # 所有记录的环境变量
├── package.json               # 运行时：express | 可选：discord.js
├── docs/                      # README 的截图
│
├── apis/
│   ├── briefing.mjs           # 主编排器 ——并行运行所有 27 个数据源
│   ├── save-briefing.mjs      # CLI：保存时间戳 + latest.json
│   ├── BRIEFING_PROMPT.md     # 智能合成协议
│   ├── BRIEFING_TEMPLATE.md   # 简报输出结构
│   ├── utils/
│   │   ├── fetch.mjs          # safeFetch() ——超时、重试、中止、自动 JSON
│   │   └── env.mjs            # .env 加载器（无 dotenv 依赖）
│   └── sources/               # 27 个自包含数据源模块
│       ├── gdelt.mjs          # 每个导出 briefing() → 结构化数据
│       ├── fred.mjs           # 可独立运行：node apis/sources/fred.mjs
│       ├── space.mjs          # CelesTrak 卫星追踪
│       ├── yfinance.mjs       # Yahoo Finance ——免费实时市场数据
│       └── ...                # 还有 23 个
│
├── dashboard/
│   ├── inject.mjs             # 数据合成 + 独立 HTML 注入
│   └── public/
│       └── jarvis.html        # 独立 Jarvis HUD
│
├── lib/
│   ├── llm/                   # LLM 抽象（4 个提供商，原生 fetch，无 SDK）
│   │   ├── provider.mjs       # 基类
│   │   ├── anthropic.mjs      # Claude
│   │   ├── openai.mjs         # GPT
│   │   ├── gemini.mjs         # Gemini
│   │   ├── codex.mjs          # Codex（ChatGPT 订阅）
│   │   ├── ideas.mjs          # LLM 驱动的交易思路生成
│   │   └── index.mjs          # 工厂：createLLMProvider()
│   ├── delta/                 # 扫描之间的变化追踪
│   │   ├── engine.mjs         # 增量计算 ——语义去重、可配置阈值、严重程度评分
│   │   ├── memory.mjs         # 热内存（3 次运行，原子写入）+ 冷存储（每日归档）
│   │   └── index.mjs          # 重新导出
│   └── alerts/
│       ├── telegram.mjs       # 多层次警报（FLASH/PRIORITY/ROUTINE）+ 双向机器人命令
│       └── discord.mjs        # Discord 机器人（斜杠命令、富嵌入）+ webhook 回退
│
└── runs/                      # 运行时数据（git 忽略）
    ├── latest.json            # 最近扫描输出
    └── memory/                # 增量内存（hot.json + cold/YYYY-MM-DD.json）
```

### 设计原则
- **纯 ESM**——每个文件都是 `.mjs` 带显式导入
- **最小依赖**——Express 是唯一的运行时依赖。`discord.js` 是可选的（用于 Discord 机器人）。LLM 提供商使用原生 `fetch()`，无 SDK。
- **并行执行**——`Promise.allSettled()` 同时触发所有 27 个数据源
- **优雅降级**——缺少的密钥产生错误，不崩溃。LLM 故障不会终止扫描。
- **每个数据源独立**——运行 `node apis/sources/gdelt.mjs` 独立测试任何数据源
- **自包含仪表盘**——HTML 文件有服务器和没有服务器都可以工作

---

## 数据源（27）

### 第 1 层：核心 OSINT 和地缘政治（11）

| 数据源 | 追踪内容 | 身份验证 |
|--------|---------------|------|
| **GDELT** | 全球新闻事件、冲突映射（100+ 语言） | 无 |
| **OpenSky** | 6 个热点区域的实时 ADS-B 航班追踪 | 无 |
| **NASA FIRMS** | 卫星火灾/热异常检测（3 小时延迟） | 免费密钥 |
| **海上/AIS** | 船舶追踪、幽灵船、制裁规避 | 免费密钥 |
| **Safecast** | 6 个核遗址附近的公民科学辐射监控 | 无 |
| **ACLED** | 武装冲突事件：战役、爆炸、抗议 | 免费（OAuth2） |
| **ReliefWeb** | 联合国人道主义危机追踪 | 无 |
| **WHO** | 疾病爆发和卫生紧急情况 | 无 |
| **OFAC** | 美国财政部制裁（SDN 列表） | 无 |
| **OpenSanctions** | 聚合全球制裁（30+ 数据源） | 部分 |
| **ADS-B Exchange** | 无过滤航班追踪包括军用 | 付费 |

### 第 2 层：经济和金融（7）

| 数据源 | 追踪内容 | 身份验证 |
|--------|---------------|------|
| **FRED** | 22 个关键指标：收益率曲线、CPI、VIX、联邦基金、M2 | 免费密钥 |
| **美国财政部** | 国债、收益率、财政数据 | 无 |
| **BLS** | CPI、失业率、非农就业、PPI | 无 |
| **EIA** | WTI/布伦特原油、天然气、库存 | 免费密钥 |
| **GSCPI** | 纽约联储全球供应链压力指数 | 无 |
| **USAspending** | 联邦支出和国防合同 | 无 |
| **联合国商品贸易** | 主要大国之间战略商品贸易流 | 无 |

### 第 3 层：天气、环境、技术、社会、SIGINT（7）

| 数据源 | 追踪内容 | 身份验证 |
|--------|---------------|------|
| **NOAA/NWS** | 活跃美国天气警报 | 无 |
| **EPA RadNet** | 美国政府辐射监控 | 无 |
| **USPTO 专利** | 7 个战略技术领域的专利申请 | 无 |
| **Bluesky** | 地缘政治/市场主题的社交情绪 | 无 |
| **Reddit** | 关键子版块的社交情绪 | OAuth |
| **Telegram** | 17 个精选 OSINT/冲突/金融频道（网络爬取，可通过配置扩展） | 无 |
| **KiwiSDR** | 全球 HF 无线电接收器网络（约 600 个接收器） | 无 |

### 第 4 层：太空和卫星（1）

| 数据源 | 追踪内容 | 身份验证 |
|--------|---------------|------|
| **CelesTrak** | 卫星发射、ISS 追踪、军事星座、Starlink/OneWeb 计数 | 无 |

### 第 5 层：实时市场数据（1）

| 数据源 | 追踪内容 | 身份验证 |
|--------|---------------|------|
| **Yahoo Finance** | 实时价格：SPY、QQQ、BTC、黄金、WTI、VIX + 9 个更多 | 无 |

---

## npm 脚本

| 脚本 | 命令 | 描述 |
|--------|---------|-------------|
| `npm run dev` | `node --trace-warnings server.mjs` | 启动仪表盘带自动刷新 |
| `npm run sweep` | `node apis/briefing.mjs` | 运行单次扫描，输出 JSON 到 stdout |
| `npm run inject` | `node dashboard/inject.mjs` | 将最新数据注入静态 HTML |
| `npm run brief:save` | `node apis/save-briefing.mjs` | 运行扫描 + 保存时间戳 JSON |
| `npm run diag` | `node diag.mjs` | 运行诊断（Node 版本、导入、端口检查） |

---

## 配置

所有设置都在 `.env` 中，带有合理默认值：

| 变量 | 默认值 | 描述 |
|----------|---------|-------------|
| `PORT` | `3117` | 仪表盘服务器端口 |
| `REFRESH_INTERVAL_MINUTES` | `15` | 自动刷新间隔 |
| `LLM_PROVIDER` | 禁用 | `anthropic`、`openai`、`gemini` 或 `codex` |
| `LLM_API_KEY` | — | API 密钥（codex 不需要） |
| `LLM_MODEL` | 每个提供商默认值 | 覆盖模型选择 |
| `TELEGRAM_BOT_TOKEN` | 禁用 | 用于 Telegram 警报 + 机器人命令 |
| `TELEGRAM_CHAT_ID` | — | 你的 Telegram 聊天 ID |
| `TELEGRAM_CHANNELS` | — | 额外要监控的频道 ID（逗号分隔） |
| `TELEGRAM_POLL_INTERVAL` | `5000` | 机器人命令轮询间隔（毫秒） |
| `DISCORD_BOT_TOKEN` | 禁用 | 用于 Discord 警报 + 斜杠命令 |
| `DISCORD_CHANNEL_ID` | — | Discord 警报频道 |
| `DISCORD_GUILD_ID` | — | 服务器 ID（即时斜杠命令注册） |
| `DISCORD_WEBHOOK_URL` | — | Webhook URL（仅警报回退，无需机器人） |

增量引擎阈值（系统对扫描之间变化的敏感程度）可以在 `crucix.config.mjs` 的 `delta.thresholds` 部分自定义。默认值经过调优，可过滤噪音同时捕获有意义的变化。

---

## API 端点

运行 `npm run dev` 时：

| 端点 | 描述 |
|----------|-------------|
| `GET /` | Jarvis HUD 仪表盘 |
| `GET /api/data` | 当前合成的智能数据（JSON） |
| `GET /api/health` | 服务器状态、运行时间、数据源计数、LLM 状态 |
| `GET /events` | SSE 流用于实时推送更新 |

---

## 故障排除

### `npm run dev` 静默退出（无输出、无错误）

这是一个已知问题，npm 的脚本运行器可能会吞掉错误，特别是在 Windows PowerShell 上。按顺序尝试这些：

**1. 直接运行 Node（绕过 npm）：**
```bash
node --trace-warnings server.mjs
```
这在功能上与 `npm run dev` 相同，但给你完整的错误输出。

**2. 运行诊断脚本：**
```bash
node diag.mjs
```
这会逐一测试每个导入，检查你的 Node.js 版本，并验证端口 3117 可用。它会确切告诉你什么失败了。

**3. 检查端口 3117 是否已被使用：**

以前的 Crucix 实例可能仍在后台运行。

```powershell
# Windows PowerShell
netstat -ano | findstr 3117
taskkill /F /PID <上面的_PID>

# 或终止所有 Node 进程
taskkill /F /IM node.exe
```

```bash
# macOS / Linux
lsof -ti:3117 | xargs kill
```

然后尝试重新启动。你也可以在 `.env` 文件中设置 `PORT=3118` 来更改端口。

**4. 检查 Node.js 版本：**
```bash
node --version
```
Crucix 需要 Node.js 22 或更高版本。如果你有旧版本，从 [nodejs.org](https://nodejs.org/) 下载最新的 LTS。

### 首次启动后仪表盘显示空面板

这是正常的——首次扫描需要 30-60 秒来查询所有 27 个数据源。一旦扫描完成，仪表盘会自动填充。检查终端的扫描进度日志。

### 某些数据源显示错误

预期行为。需要 API 密钥的数据源在未设置密钥时会返回结构化错误。其余扫描正常继续。检查仪表盘的数据源完整性部分（或服务器日志），查看哪些数据源失败了以及原因。要添加的最有影响力的 3 个免费密钥是 `FRED_API_KEY`、`FIRMS_MAP_KEY` 和 `EIA_API_KEY`。

### Telegram 机器人不响应命令

确保 `.env` 中同时设置了 `TELEGRAM_BOT_TOKEN` 和 `TELEGRAM_CHAT_ID`。机器人只响应来自配置的聊天 ID 的消息（安全措施）。你应该在服务器启动时的日志中看到 `[Crucix] Telegram alerts enabled` 和 `[Crucix] Bot command polling started`。如果没有，使用 `curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe` 再次检查你的 token。

### Discord 机器人不响应斜杠命令

按顺序检查这些：
1. 确保 `.env` 中设置了 `DISCORD_BOT_TOKEN` 和 `DISCORD_CHANNEL_ID`
2. 验证 `discord.js` 已安装：`npm ls discord.js`。如果缺失，运行 `npm install discord.js`
3. 如果斜杠命令未出现，设置 `DISCORD_GUILD_ID`——没有它，全局命令可能需要长达 1 小时传播。公会特定命令即时注册
4. 确认机器人被邀请时带有 `bot` + `applications.commands` 范围，在目标频道中有 `Send Messages` + `Embed Links` 权限
5. 检查服务器日志中启动时的 `[Discord] Bot logged in as ...`。如果你看到 `[Discord] discord.js not installed`，安装它并重启
6. **仅 Webhook 回退：** 如果你只想要警报而没有斜杠命令，设置 `DISCORD_WEBHOOK_URL` 而不是机器人 token。不需要 `discord.js`。

---

## 截图

`docs/` 文件夹包含本 README 引用的仪表盘截图：

| 文件 | 描述 |
|------|-------------|
| `docs/dashboard.png` | 完整仪表盘——本 README 顶部的英雄图片 |
| `docs/boot.png` | 电影式启动序列动画 |
| `docs/map.png` | D3 世界地图带标记类型和航班弧线 |
| `docs/globe.png` | 3D WebGL 地球视图带大气光晕和标记 |

要更新它们：运行仪表盘，等待扫描完成，然后使用浏览器的 DevTools（`F12` → `Ctrl+Shift+P` → "Capture full size screenshot"）或像 [LICEcap](https://www.cockos.com/licecap/) 这样的工具制作 GIF。

---

## 开发

### 分支策略

本项目使用基于分支的开发工作流程：

- **master** — 稳定生产分支
- **dev** — 所有新功能和修改的开发分支

**工作流程：**
1. 在 `dev` 分支上进行所有更改
2. 在 `dev` 上彻底测试
3. 仅在测试完成后合并到 `master`

**设置：**
```bash
# 已配置 ——dev 分支存在带上游追踪
git checkout dev    # 切换到开发分支
git push            # 默认推送到 origin/dev
```

### 最近更新

- **2025-03-17**：创建了 `dev` 分支，配置了上游追踪，更新了远程仓库 URL 到 `git@github.com:yuanguangshan/Crucix.git`

---

## 贡献

发现了 bug？想添加第 28 个数据源？欢迎 PR。每个数据源都是 `apis/sources/` 中的独立模块——只需导出一个 `briefing()` 函数返回结构化数据，并将其添加到 `apis/briefing.mjs` 中的编排器。

如果你觉得有用，给个星标帮助其他人找到它。

关于贡献指南、审查期望和数据源添加规则，参见 `CONTRIBUTING.md`。关于安全报告，参见 `SECURITY.md`。

## 联系

对于合作伙伴关系、集成或其他非问题询问，你可以通过 `celesthioailabs@gmail.com` 联系我。

对于 bug 和功能请求，请使用 GitHub Issues，使讨论保持可见和可操作。

---

## 许可证

AGPL-3.0
