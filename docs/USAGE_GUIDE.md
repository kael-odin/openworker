# OpenWorker 使用指南（用户视角）

> 本文是写给「准备自己装来用」的人的实战指南，不是代码审计。安全细节见同目录的 `AUDIT_REPORT.md`，本文只在「注意事项」里点出与日常使用直接相关的几条并指向该报告。
>
> 仓库本地路径：`D:\Github_Open\openworker`。当前 HEAD：`f96ad4c`（2026-07 用量统计合并）。状态：开放 Beta。

---

## Part 1 — 它是什么 / 一句话定位

**一句话（非开发者版）**：OpenWorker 是一个住在你电脑桌面上的 AI 同事。你告诉它「把这件事办了」——比如准备一份客户简报、理清我这周的日历、查一下发布进度在 Jira 和 GitHub 上卡在哪——它会自己拆步骤、打开你授权过的工具去干活，遇到要发消息/改日历/跑命令这类有后果的操作会先找你确认，最后给你一份**做好的成品**（一个文档、一封写好的邮件、一张更新过的表），而不是一份 to-do 清单。

**稍技术一点的定位**：OpenWorker 是 Andrew Ng 团队开源的、本地优先（local-first）的桌面 AI agent。它的引擎基于 [aisuite](https://github.com/andrewyng/aisuite)（一个跨 LLM 厂商的统一 chat-completions + agents 层），跑在你本机的一个 Python 服务里；上层是 React + Tauri 的桌面壳。它有三个核心特征：

1. **交付物导向**：不是「聊天 + 工具调用」，而是「跑完一个任务，落地成文件」。会话本身有一个 scratch 目录，产出的 docx/xlsx/md/html 会作为 artifact 沉淀下来。
2. **桌面级操作 + 审批闸门**：agent 有 shell、本地文件、git 等真实工具；但所有写操作、发送操作、shell 命令默认走 approval-gating，要你点确认才执行。
3. **模型不锁定**：自带 13 个 provider descriptor + 一张经过验证的「curated model matrix」，你可以贴任何一家的 key，也可以指向本地 Ollama，随时切换。

它和「AI 聊天框」最大的区别是：聊天框给你文字，OpenWorker 给你**办完的事**。

---

## Part 2 — 核心功能清单

### 2.1 任务执行与交付物（agent loop + artifacts）

**它做什么**：你描述目标，agent 进一个「思考 → 调工具 → 看结果 → 再思考」的循环（aisuite 的 agent loop），中途用 `todo_write` 维护一份可见的进度清单，最后产出成品文件。

**适合什么**：任何「我想要一个做好的东西，而不是一段文字回答」的场景。

**具体例子**：
- 「读一下这个项目，给我 5 条 bullet 的概览」→ 产出一个 `overview.md`。
- 「把这周的日历和 inbox 整理成一份每日简报」→ 产出 `weekly_brief.md`，里面已经按天分组。
- 「把这批 CSV 汇总成一张带图表的分析表」→ 产出 `.xlsx`。

**交付物去哪了**：每个会话有一个 per-session 的 scratch 目录（Cowork persona 启动时由服务端自动分配并回传）。文件落在这个目录下；UI 右侧的 RightRail / Artifacts 面板会列出本次会话产生的文件，点开可直接在应用内预览（markdown、代码、HTML、图片等）。当 RightRail 被隐藏时，顶栏会出现「Artifacts (N)」按钮，确保产出的文件不会被埋没。

**相关的 UI 事件链**：`assistant_delta` / `reasoning_delta`（流式回答 + 推理过程）、`tool_proposed` + `tool_finished`（工具调用卡片）、`assistant_message`（带 `usage` 用量边车）、`turn_done`。

### 2.2 桌面操作能力（shell / 本地文件 / git / 搜索 / 子 agent）

agent 能在你机器上做的事，由 `coworker/tools/` 下的工具定义：

| 工具 | 能力 | 备注 |
|---|---|---|
| `shell` (`run_shell`) | 跑终端命令 | 持久化 shell：`cd`/`export`/激活的 venv 跨调用保留。POSIX 用 `/bin/bash`，Windows 用 `powershell.exe`。默认超时 120s，上限 600s。支持后台任务（`run_in_background`，独立进程，不被会话关闭杀掉）。**所有 shell 命令走审批**。 |
| `files` (`read_file` / `write_file` / `apply_patch` / `apply_unified_diff` / `replace_in_file`) | 读写、改本地文件 | 写工具是 approval-gated 的重点对象。 |
| `git` | git 操作 | 内置 `_run_git`，GitHub token 走 `-c http.extraHeader=`。 |
| `search` | 代码/文本搜索 | |
| `directories` | 目录访问授权 | agent 想访问某个目录时会发起 `directory_requested` 请求，你授予（可读/可写）后才访问。 |
| `subagent` | 派生子 agent | 把子任务委托给一个独立上下文的子 agent。 |
| `todo` (`todo_write`) | 进度清单 | agent 每个涉及工具的任务都从一份 todo 开始，RightRail 的 Progress 面板就是从它渲染的。 |
| `plan` | 提交计划等你批 | agent 可以先给一个计划（`plan_proposed`），你 approve/reject 后再动手。 |
| `ask` (`ask_user`) | 反问你 | 需要人决策时，inline 弹问题卡（多选/文本）。 |

**关键设计**：这些工具不是「模型说跑就跑」。`shell`、写文件、发送类 connector 工具都是 high-risk，会触发 `permission_required` 事件，UI 弹 ApprovalCard。你可以单次批准，也可以对某个 automation 配「standing scoped approval」（见 2.4）。

### 2.3 25+ 集成 connectors

连接器分两种接入方式：
- **托管（managed）OAuth**：走 OpenWorker Cloud 的一个小云服务做 OAuth 握手（这是整个产品唯一的云组件），一键连接。前提是登录 cloud 账号。
- **手动凭证 / API key / PAT**：不登录 cloud 也能用，自己贴 token。

连接后还能做**per-tool control**：在 `IntegrationsView` 里可以开关单个工具（`PATCH /v1/connectors/{name}/tools`），也可以对某个工具做 allow/disallow 绑定。

完整清单（来自 `coworker/connectors/catalog_copy.py` 的 ACCESS 声明，每条都是「连接后实际授予的权限」的诚实描述）：

**消息 / 协作**
- **Slack** — 读 bot 所在频道与 DM、以 bot 身份发消息/传文件、读成员与频道名。可连多个 workspace，每个有自己的 allow-list。
- **Telegram** — 给你的 bot 发消息触发 agent，回复回到同一个 chat；只响应 allow-list 里的发送者。
- **Discord** — 读 bot 可见频道、以 bot 身份发消息。
- **WhatsApp** — 从你的 Cloud API 号码**外发**消息（只出不进，读不到你的聊天）。

**邮件 / 日历**
- **Gmail** — 搜索/读/发邮件；永不删信或改账户设置。可多账号并排。支持隐私过滤（隐藏指定 sender/label）。*(onboarding 里标 "Coming soon"，因 Google 验证/CASA 门禁，代码已就绪)*
- **Google Calendar** — 读事件与忙闲、创建/更新/删除事件。多账号并排。*(同上，Coming soon)*
- **Outlook** — 搜索/读/发 M365 邮件 + 跑日历（建会、挪会、回邀请）。多邮箱并排。
- **Email (IMAP)** — 任何 IMAP 账号（Gmail/iCloud/Fastmail/自建），用 app password 而非账户密码。

**代码 / 工单 / 项目管理**
- **GitHub** — 一键装 OpenWorker GitHub App 到你选的 repo；读代码/issue/PR/CI，建 issue、回复、review PR。在 issue/PR 上 @agent 它从你桌面回答。
- **GitLab** — 读 issue/MR；建 issue（需 `api` scope，`read_api` 保持只读）。
- **Linear** — 读/搜索 issue；建 issue。
- **Jira** — 读/搜索你能见的 issue；建/更新/流转 issue、以你身份评论。
- **monday.com** — 读 board/item/updates；建 item、改值、发 updates。一键登录，跑在本机对接 monday 自己的 agent 服务，只暴露精选工具集。
- **Asana** — 读/搜索 task/project；建 task、评论。用 PAT 连接。
- **ClickUp** — 读/搜索 task/doc；建/更新 task、评论。
- **Confluence** — 读/搜索 space/page；建 page。

**CRM / 销售**
- **HubSpot** — 读 contact/company/deal/ticket；read & write 模式额外可记 note/task、更新记录、建 contact（永不删除）。可在 consent 时选只读 vs 读写，可隐藏指定 property。
- **Attio** — 读 object/record/list/note；记 note（永不建/改 record）。
- **Close** — 读 lead/contact/opportunity；建 lead、更新 opportunity、记 note。
- **Apollo** — 搜索/丰富 person/company，消耗你的 Apollo credit。
- **Hunter** — 查找/验证邮箱，消耗你的 Hunter 配额。

**文档 / 文件 / 设计**
- **Notion** — 只读你 share 给连接的 page/database；建 page（永不改/删已有）。
- **Google Drive** — 只读搜索/浏览/读文件；永不改/删。
- **Dropbox** — 只读文件名与内容。
- **Box** — 只读文件名与内容。
- **Canva** — 只读浏览/导出你的设计。
- **Figma** — 读设计文件与评论、导出资源；可评论（永不改设计）。

**支付 / 财务 / 合同**
- **Stripe** — 只读 customer/charge/invoice（用 restricted key 时写权限压根不可能）。
- **QuickBooks** — 只读 customer/invoice/report。
- **DocuSign** — 读 envelope 与签署状态；以你身份发文档给人签。

**分析**
- **PostHog** — 只读查询（event/funnel/insight）。
- **Mixpanel** — 只读查询。
- **Amplitude** — 只读图表查询（active user、event total）。

**浏览器**
- **Browser** — 内置一个独立于你个人浏览器的浏览器会话，agent 用来读页面、在网站上操作；点击/输入/上传只在那个会话里，操作受审批。*(注：审计报告里 `browser_screenshot` 路径穿越、`browser_upload_file` 可上传任意本地文件属已知安全问题，见 AUDIT_REPORT.md §2.8/§2.9)*

**MCP（任意工具扩展）**
- 任何符合 [Model Context Protocol](https://modelcontextprotocol.io/) 的工具都能接进来，per-tool 控制。路由：`/v1/mcp`（列/加）、`/v1/mcp/{name}/connect`、`/mcp/oauth/callback`。支持 stdio 和 streamable HTTP（代码里 pin 了 `mcp<2`，因 2.0.0 移除了 `streamablehttp_client`）。

### 2.4 自动化与调度（automations）

**它做什么**：把一个「任务说明」变成一个持久化的 `ScheduledTask`，按计划触发；每次触发是一个全新的 `TaskRun`，有自己的会话线程和工作目录，跑完落回应用里带完整 transcript。

**调度类型**（`coworker/automation/models.py`）：
- **cron**：标准 5 段 cron（本地时区，不是 UTC）。UI 会把简单 cron 渲染成人话（`0 7 * * *` → "Every day at ~7:00 AM"）。
- **once**：一次性，指定 ISO 时间触发，跑完自动停用。

**调度器策略**（`scheduler.py`）：
- **run-once-catch-up**：服务器关机期间错过的任务，开机后补跑一次。
- **skip-on-overlap**：上一次还没跑完，不叠加新的一次。
- tick 间隔 30s。

**standing scoped approvals（§25）**：对无人值守的 automation，你可以预先授权「这个工具、这个目标」的写权限（如「允许往 `#release-status` 频道发消息」），绑在任务记录上，可按 automation 单独撤销、删任务时一起带走。只有声明了 target 参数的工具能被授权（exec/破坏性工具天然被排除），reads 只展示不存储——fail-closed。

**典型用法**：
- **晨报（morning brief）**：每天 7:00 拉昨日 Slack/Jira/CI 汇总成一份简报。
- **周报（weekly report）**：每周一汇总上周活动产出 `.md`。
- **standing watch**：盯一个频道或 inbox，有动静就处理/汇总。

**无人值守时审批怎么办**：未 attended 的运行里，agent 遇到需要审批的操作不会自己动手，而是把请求「停泊」到 **Inbox**（见下），等你回来处理。

### 2.5 Slack 协作（@OpenWorker → 桌面会话 → 线程回复）

在 Slack 频道里 @OpenWorker，会在你桌面开一个会话，用你本机的工具去干活，回答以**线程回复**的形式回到 Slack。每个 workspace 可连多个，每个有自己的 allow-list（谁能跟 agent 说话）。Slack 还能配 approval-owner（`/v1/connectors/slack/approval-owners/add`），把审批请求路由给指定的人。

这套「消息进来 → 桌面会话 → 回答回去」的模式同样适用于 Telegram（消息到 bot → agent → 回复回 chat）。

### 2.6 语音输入（STT sidecar）

`stt/` 是一个 Rust 写的**本地、离线**语音转文字引擎（`stt/src/lib.rs`）：
- 基于 `whisper-rs`（whisper.cpp 绑定），默认模型 `ggml-base.en.bin`（~142MB，从 HuggingFace 下载，带 SHA256 校验）。
- 故意不依赖 Tauri/UI/剪贴板/全局快捷键——host 自己管 UX 和权限，这个 crate 只管麦克风采集、模型 provision、转写。
- 16kHz 采样，单麦克风。
- 在 Settings ▸ Voice 配置，Composer 有语音输入入口。

**特点**：完全离线、本地推理，音频不出本机。

### 2.7 多模型 BYOK（自带 key）

**支持的 provider**（`coworker/providers/registry.py` 的 DESCRIPTORS，共 13 个 + Ollama）：

| Provider | 接入方式 | 备注 |
|---|---|---|
| **OpenAI** | API key（可选自定义 endpoint：Azure OpenAI、vLLM 等任何 OpenAI 兼容服务） | 默认 provider，`sk-…` |
| **Anthropic (Claude)** | API key（`sk-ant-…`） | 原生 Messages API；extended thinking 默认开 |
| **Gemini (Google)** | API key（`AIza…`） | 原生 GenAI API |
| **AWS Bedrock** | region + 三选一：Bedrock API key / AWS profile / IAM keys | 跑在你自己 AWS 账号里；Claude 走原生路径，其它走 Converse |
| **Vertex AI (GCP)** | project + location + 三选一：ADC（`gcloud auth application-default login`）/ service account JSON / API key | 跑在你自己 GCP 项目里；Gemini & Claude 原生，开源权重走 MaaS |
| **Z AI (GLM)** | key + 预填 endpoint | 国际/国内端点可选 |
| **DeepSeek** | key | |
| **Kimi (Moonshot)** | key + 预填 endpoint | 国际/国内端点可选 |
| **MiniMax** | key | |
| **Qwen (Alibaba)** | key + 预填 endpoint | 国际/国内端点可选 |
| **xAI (Grok)** | key | |
| **Mistral** | key | |
| **Meta (Muse Spark)** | key | 公开预览，US-only |
| **Together / Fireworks / OpenRouter** | 各家一个 key | 转售商，一个 key 用多家模型 |
| **Ollama** | 无需 key，填 server URL（默认 `http://localhost:11434`） | 完全本地 |

**curated model matrix（`providers/matrix.py`）**：这是一张**经过验证、官方背书**的模型清单——只收录当代、agent 可用（支持 tool-calling）的模型。每个条目带：UI 显示名、能力（tools/vision/pdf/parallel_tool_calls/streaming）、上下文窗口（已核对 vendor 文档的才填，否则留 `None` 让 UI 的 context-fill meter 隐藏而不是瞎显示一个分母）。

清单里包括（摘录）：GPT-5.6 Sol/Terra/Luna、GPT-5.5、Claude Fable 5 / Opus 4.8 / Sonnet 4.6 / Haiku 4.5、Gemini 3.1 Pro / 3.6 Flash / 2.5 Pro / 2.5 Flash、GLM-5.2、DeepSeek V4 Flash/Pro、Kimi K2.6、MiniMax M2.5、Qwen3 Max、Grok 4.3、Mistral Large、Muse Spark 1.1、Llama 4 Maverick，以及 Bedrock/Vertex 上的对应型号。

**重要**：清单不可编辑，但你可以**加任意自定义模型字符串**——它会回退到 `capabilities.py` 的保守启发式判断，风险自担（可能 tool-calling 退化）。

**Test 按钮**：每个 provider 配置时有 verify 探测（`/v1/providers/verify`），用一次只读调用（list models / countTokens）验凭证，存之前先测。onboarding 还能根据 key 形状自动猜 provider（`sk-ant-` → anthropic、`AIza` → gemini、`sk-or-` → openrouter、`sk-` → openai）。

### 2.8 隐私与本地优先

- **本地优先**：agent loop、对话历史、connector token、模型 key 全在应用本地（凭据存储是明文 JSON，POSIX 0600 / Windows ACL——见 AUDIT_REPORT.md §2.15）。
- **唯一的云组件**：一个 broker OAuth 握手的小服务。你可以完全不登录 cloud，用手动凭证/API key 用 connector。
- **数据只在「你选的模型 + 你连的集成」出去**：你选哪个 provider，请求才去那里；你连哪个 connector，它才碰那个工具的数据。
- **审批 gating**：写/发/shell 默认要确认，无人值守时停泊到 Inbox 而非自作主张。
- **prompt injection 防御**：目前主要靠 system prompt（把工具/日志/网页内容当不可信数据），无结构化围栏——见 AUDIT_REPORT.md §2.11，对连了浏览器/邮件的 agent 要保持警惕。

### 2.9 使用量统计（token metering）

- 每条 assistant 消息带一个 `usage` 边车：`{model, input, output, cache_read, cache_write}`。
- UI 按会话累计，**按 model 维度**分组（`usage.ts`）。
- Composer 有一个用量 chip 显示总 token，并带一个 **context-fill meter**：用 curated matrix 里核对的上下文窗口做分母，显示当前上下文占满多少。未核对窗口的模型则隐藏分母。
- 支持 **prompt caching**：`cache_read`（命中缓存，便宜）/ `cache_write`（写缓存）。Usage popover 在存在 cache 拆分时会标 "Uncached input" 行，并显示累计 Total input 行。
- 非 reporting 后端/老服务器不发 usage，UI 优雅降级为不显示。

### 2.10 personas 与 skills

**Personas（`coworker/personas/`）**：定义 agent 「能成为什么角色」。格式是 YAML frontmatter + markdown 正文（正文即 system prompt）。

内置 personas（`registry.py`）：
- **cowork**（默认，knowledge family）——通用同事，做交付物，启动时自动分配 scratch 目录。
- **code**（code family）——在代码库里干活（files/git/shell），必须先选一个文件夹（FolderGate）。
- **chat**——纯对话，无 workspace。
- **ops**（`personas/builtin/ops.md`，knowledge family）——运维角色：查事故、跑 runbook、出事后总结；推荐连 GitHub/Slack/Datadog/PagerDuty。

Persona 的 frontmatter 字段（`manifest.py`）：`id`/`name`/`icon`/`tagline`/`family`(code|knowledge)/`workspace`(git|project|deliverable|none)/`tools`/`messaging`/`connectors`/`default_permission_mode`(discuss|plan|interactive|custom|auto)/`recommended_models`/`skills`/`mcp`/`recommends`（推荐的 connector/MCP，分 core/optional 两档）。

第三方 persona 可通过 gallery 安装（`/v1/personas/install`、`/v1/cloud/gallery`），走严格的 manifest 校验，格式不对会**报错而不是静默装一个坏的**。

**Skills（`coworker/skills/`）**：Anthropic SKILL.md 格式，**渐进式披露**——会话开始只注入 catalog（name + description），agent 觉得相关时调 `load_skill(name)` 才加载完整指令。一个 skill 是一个含 `SKILL.md` 的文件夹（frontmatter: name/description/可选 allowed-tools + markdown 正文 + 可选资源/脚本）。当前仓库内置 skills 目录是空的（`skills/base.py` 只提供加载机制），意味着 skills 主要靠你或第三方放进去。

---

## Part 3 — 如何使用（从零到第一个任务）

> 你在 Windows 上自己构建，所以下面重点讲 run-from-source 流程，同时给出官方安装包路径。

### 3.1 安装

**方式 A：官方安装包**
- macOS (Apple Silicon)：[download.openworker.com/mac](https://download.openworker.com/mac)，签名 + 公证 + 自动更新。
- Windows 10/11 x64：[download.openworker.com/windows](https://download.openworker.com/windows)。**未代码签名**，SmartScreen 会警告（点「仍要运行」），签名进行中。

**方式 B：从源码跑（你的情况）**

前置：Python 3.10+、Node 20+、Rust 工具链（[rustup](https://rustup.rs/)，桌面壳要用）。

```shell
git clone https://github.com/andrewyng/openworker
cd openworker

# 1. 一次性引导，建 .venv（Windows 上用 Git Bash 或 WSL 跑）
bash packaging/setup_dev_env.sh

# 2. 启动本地 agent server（另开终端）
#    Windows: .venv\Scripts\openworker-server.exe
.venv/bin/openworker-server --cwd ~/some/project --port 8765

# 3. 再开一个终端，起 UI
cd surfaces/gui
npm install
npm run dev        # 浏览器 UI，跑在 Vite dev 端口
```

**两种 UI 形态**：
- `npm run dev` → 浏览器 UI（Vite dev 端口）。
- `npm run tauri dev`（在 `surfaces/gui/`）→ 完整桌面窗口，Tauri 壳自己拉起并监督 server。

**鉴权 token**：standalone server 启动时生成一个 per-launch token 到 `<state-dir>/sidecar-8765.token`（user-only 权限）；Vite 启动时读它。直接调 API 要在 `X-OpenWorker-Token` 头里带这个值。桌面 app 用内存里的 launch token，不落盘。

> 安全提示：浏览器（非 Tauri）build 会把 dev token 编进 Vite bundle，sidecar token 挂在 `window` 全局——见 AUDIT_REPORT.md §2.3/§2.6。本地开发无妨，别把 dev build 暴露到网络上。

### 3.2 首次配置（加模型 key / 指向 Ollama）

桌面壳首次启动且未 onboarding 时，会弹 **Onboarding 向导**（`Onboarding.tsx`，两步）：

**Step 1 — 模型（Provider Gallery）**：13 个真实品牌卡，两列。点一张进表单：
- 单 key provider（OpenAI/Anthropic/Gemini/各 OpenAI 兼容厂商）：贴 key，endpoint 已预填可改。
- 多字段云 provider（Bedrock/Vertex）：选 auth method（Bedrock: API key / AWS profile / IAM keys；Vertex: ADC / service account / API key），按选项填。
- Ollama：无需 key，填 server URL（默认 `http://localhost:11434`）。
- 填完点 Next，会先 verify（一次只读调用）再存——不用先点 Test 再点 Continue 那种两步。
- 也可跳过（会要二次确认）。

**Step 2 — 连接日常工具**：一个两态页面，列出 managed OAuth connector（Outlook/Slack/GitHub/Notion/HubSpot/Attio 等），一键连。Gmail/Google Calendar 因 Google 验证门禁标 "Coming soon"。

完成后可从 Settings ▸ General ▸ "Run setup again" 重跑向导。

**Settings 路径**：`⌘,`（macOS）/`Ctrl+,`（Windows）或账号菜单进 Settings。Tabs：appearance / models / voice / personas。模型在 Settings ▸ Models（`ProviderSetup.tsx`，与 onboarding 共用同一套组件防漂移）。

### 3.3 连接工具（OAuth vs 手动 key）

进 **Integrations** 面（侧栏入口）：
- **托管 OAuth connector**：点 Connect，走系统浏览器完成 OAuth（cloud sign-in 用 PKCE + state，实现正确——见 AUDIT_REPORT.md §2.22）。多账号的（Gmail/Outlook/Google Calendar/HubSpot）可并排连多个，设默认账号。
- **手动凭证 connector**（Asana 用 PAT、email 用 app password、Stripe 用 restricted key 等）：在连接卡里贴 token。
- **per-tool control**：连上后可开关单个工具（`PATCH /v1/connectors/{name}/tools`），也可对工具做 allow/disallow 绑定。
- **隐私过滤**：HubSpot 可隐藏指定 property（agent 看记录前就剥掉），Gmail 可隐藏指定 sender/label。

每个 connector 在连接前会显示「About / Access」卡片（`catalog_copy.py` 的诚实声明），告诉你连接到底授予了什么——不会过度承诺。

### 3.4 发起第一个任务

回到主会话（Cowork persona，knowledge family）：

1. **描述结果**，不要描述步骤。例如：「帮我准备一份给 Acme 客户的简报，重点是我们这季度的三个案例，输出一个 docx。」
2. agent 会先 `todo_write` 列计划（RightRail 的 Progress 面板可见），然后开始调工具。
3. **审批打断**：当它要写文件、发消息、跑 shell 时，会弹 ApprovalCard（`permission_required` 事件）。你看它要干什么，点 Approve / Reject / 改方向。
   - 如果它要先给计划：弹 PlanCard，你 approve 后可选 mode（discuss/plan/interactive/auto）。
   - 如果它要访问一个目录：弹 DirectoryRequestCard，你授予（可读/可写）。
   - 如果它有疑问：弹 question 卡，inline 回答。
4. 跑的过程中你可以随时 Interrupt（中断），或 Retry 失败的 turn。

**mode**（composer 里切）：`interactive`（默认，写操作要批）/`discuss`（只聊）/`plan`（先出计划）/`auto`/`custom`。

**Unattended 模式**：composer 里有个「Send approvals to Inbox」开关。开了之后，agent 需要审批时不弹 live 卡，而是停泊到 Inbox——适合让它后台跑长任务，你回来统一处理。

### 3.5 看交付物

- 右侧 **RightRail**：Cowork persona 下显示 Artifacts 面板，列出本次会话产生的文件。点开在应用内预览（markdown/代码/HTML/图片）。预览全屏时会自动折叠左侧导航。
- 顶栏 **Artifacts (N)** 按钮：RightRail 隐藏时也能一键唤回。
- 文件物理位置：会话的 scratch 目录（服务端分配，`ready` 事件回传 `workspace`）。Code persona 下是你选的项目文件夹。
- `getArtifacts` / `reveal` 接口（`/v1/sessions/{id}/artifacts`、`/artifacts/reveal`）可在文件管理器里定位。

### 3.6 设置自动化

进 **Scheduled** 面（侧栏，`ScheduledView.tsx`）：
1. 新建 automation：填 **title**、**instructions**（任务说明，就像跟 agent 说话一样）、**schedule**（cron 或一次性 ISO 时间，本地时区）。
2. 选 workspace、agent（persona）、model。
3. **standing approvals**（可选）：预授权「某工具 + 某 target」的写权限，让无人值守时也能跑通。consent 卡上只读项只展示不存，写项才进 grant 列表，可随时撤销。
4. notify_on_completion：跑完通知（可额外推到 Telegram 等 `notify_target`）。
5. 保存后，到点自动跑。**Run now** 可手动立即触发一次（会开一个 live 会话，把 prompt 自动发出去，第一轮 turn 结束后 finalize）。

**run 落哪**：每次 run 有自己的会话线程（`__run__{run_id}`）和工作目录，transcript 完整保留。Scheduled 面里点开 automation 看 run 历史；automation 启动时右上角弹 5s toast，点 "View run" 跳进 live 会话。会话里有 "← Back to runs" 横幅。

**可靠性**：服务器关机期间错过的 cron 会在下次启动补跑一次（run-once-catch-up）；上一次没跑完不叠加（skip-on-overlap）。

### 3.7 从 Slack 触发

1. 在 Integrations 里连 Slack（托管 OAuth），选 workspace，配 allow-list（谁能跟 agent 说话）。
2. 把 bot 拉进目标频道。
3. 在频道里 `@OpenWorker 帮我查一下 release-2.0 的 PR 还差哪些没 merge`。
4. 你桌面会开一个会话，用你本机工具（GitHub connector 等）去查，回答以**线程回复**回到 Slack 那条消息下。
5. 也可配 approval-owner，把审批请求路由给指定的人。

同样的消息触发模式适用于 Telegram（消息到 bot → agent → 回 chat）。

---

## Part 4 — 与其它产品的区别

### 对比表

| 维度 | OpenWorker | Cursor / Windsurf | Claude Desktop / Code | ChatGPT 桌面 + GPTs | Devin / Factory / Cline | Microsoft Copilot (M365) | Zapier / n8n | Raycast AI |
|---|---|---|---|---|---|---|---|---|
| 本地优先 | ✅ 全本地 agent loop + 凭据 | ❌ 云为主 | 部分（Code 本地，Desktop 云） | ❌ 云 | ❌ 云容器 | ❌ 云 | n8n 可自托管；Zapier 云 | ✅ 本地壳 |
| BYOK 多厂商 | ✅ 13+ provider + Ollama，可切换 | ❌ 绑定厂商模型 | ❌ 仅 Claude | ❌ 仅 OpenAI | 各家不同 | ❌ 绑定 | N/A | 部分 |
| 桌面操作（shell/文件/git） | ✅ 强，审批 gated | ✅ 但限于编辑器内 | ✅（Code） | ❌ 受限 | ✅（容器内） | ❌ | ❌ | 弱 |
| 集成数 | ✅ 25+ connector + MCP | 编辑器内 | MCP | GPT actions | 代码相关 | M365 全家桶 | 数千 app | 少 |
| 自动化/调度 | ✅ cron + 一次性 + Inbox | ❌ | ❌ | 弱 | ❌ | 弱 | ✅ 核心能力 | ❌ |
| 开源 | ✅ MIT | ❌ | ❌ | ❌ | Cline 开源；Devin/Factory 闭 | ❌ | n8n 可开源；Zapier 闭 | ❌ |
| 交付物形态 | ✅ 落地文件（docx/xlsx/md/html） | 代码 diff | 文字/代码/文件 | 文字 | 代码/PR | 文档内编辑 | 数据流转 | 文字/快捷操作 |
| 审批 gating | ✅ 写/发/shell 默认批 | ❌ | ✅（Code 权限） | ❌ | ✅ | ❌ | N/A | ❌ |

### 逐项展开

**Cursor / Windsurf（AI 代码编辑器）**
- 是什么：把 AI 深度嵌进 IDE 的代码编辑器，强项是代码补全、跨文件重构、inline edit。
- OpenWorker 区别：OpenWorker 不是编辑器，是通用桌面 agent——能写代码也能写文档/跑运维/发邮件/管日历。代码只是它众多能力之一（code persona）。它的交付物不限于代码 diff，可以是任何文件。
- 谁选谁：纯粹写代码、要 AI 嵌进编辑流→Cursor/Windsurf。要一个能跨「代码 + 办公 + 通讯」办事的桌面同事→OpenWorker。两者可并用。

**Claude Desktop / Claude Code（Anthropic 官方）**
- 是什么：Claude Desktop 是桌面聊天 + MCP；Claude Code 是终端里跑的 agent，强项代码与文件操作。
- OpenWorker 区别：OpenWorker 不绑 Claude——你能用 Claude 当模型，也能用 GPT-5.6/Gemini/GLM/Ollama。OpenWorker 多了自动化调度、Slack/Telegram 触发、25+ 开箱 connector、交付物 artifact 面板。Claude Code 的代码 agent 体验更聚焦，OpenWorker 更「全场景办公」。
- 谁选谁：深度用 Claude、要最强代码 agent→Claude Code。要多厂商 + 调度 + 多工具协作→OpenWorker（且可把 Claude 设为模型）。

**ChatGPT 桌面 app + GPTs**
- 是什么：OpenAI 桌面客户端 + 可定制的 GPT bot，生态大，但锁在 OpenAI。
- OpenWorker 区别：BYOK 不锁厂商；本地优先（对话/凭据在本机）；桌面操作能力远强于 ChatGPT（真 shell/文件/git）；有自动化和 Slack 触发；开源可自审。
- 谁选谁：只用 OpenAI、要最大 bot 生态→ChatGPT。要本地优先 + 多厂商 + 真桌面操作 + 调度→OpenWorker。

**Devin / Factory / Cline（自主编码 agent）**
- 是什么：Devin/Factory 是云容器里跑的自主编码 agent；Cline 是开源的（VSCode 插件形态）。
- OpenWorker 区别：OpenWorker 跑在你本机（不是云容器），操作的是你真实环境（审批 gated）。它的 code persona 能写代码，但定位是通用同事不是「专职软件工程师」。Cline 开源但锁在编辑器内；OpenWorker 是独立桌面 app，覆盖代码之外的场景。
- 谁选谁：要一个云端自主完成软件任务、产出 PR→Devin/Factory。要本机、开源、跨场景→OpenWorker（或 Cline 若只需代码）。

**Microsoft Copilot (M365)**
- 是什么：嵌在 Word/Excel/Outlook/Teams 里的 AI，深度集成 M365 数据。
- OpenWorker 区别：OpenWorker 不限于 M365——也连 GitHub/Linear/Notion/HubSpot/Slack 等。本地优先、BYOK、可调度、开源。Copilot 的优势是 M365 数据的深度与企业合规。
- 谁选谁：组织强绑定 M365、要企业合规→Copilot。要跨工具 + 本地 + 多厂商→OpenWorker（且 OpenWorker 自己也能连 Outlook）。

**Zapier / n8n（自动化）**
- 是什么：以「触发 → 动作」为核心的自动化平台，数千 app 集成，确定性流程。
- OpenWorker 区别：OpenWorker 的自动化是「告诉 agent 目标，它自己拆步骤办事」（非确定性、能推理），不是固定 DAG。它也有 25+ connector，但强项是用 LLM 判断该干什么。Zapier/n8n 适合固定、可重复、确定性的数据流转；OpenWorker 适合「需要判断」的重复任务（如晨报要挑重点）。
- 谁选谁：固定流程、要稳→Zapier/n8n。需要 LLM 判断的重复任务→OpenWorker。两者可组合（n8n 触发 OpenWorker）。

**Raycast AI / 通用 AI 助手**
- 是什么：桌面快捷启动器 + AI，强项是快速调用、剪贴板、窗口管理。
- OpenWorker 区别：OpenWorker 是「会办事的 agent」不是「快速助手」——它跑长任务、产交付物、能调度、能被 Slack 触发。Raycast 适合「按一下、问一句、得个答案」。
- 谁选谁：要快速、轻量、即问即答→Raycast。要 agent 跑任务交成品→OpenWorker。

### OpenWorker 适合谁 / 不适合谁

**适合**：
- 想要一个本机跑、数据不锁云的桌面 AI 同事，且能接受自己管 key 和审批。
- 跨多个工具办公（Slack + GitHub + 邮件 + 日历 + Notion/CRM）的人，想让一个 agent 串起来。
- 想要定时自动化（晨报/周报/盯频道）且任务需要 LLM 判断的人。
- 关注隐私、想用本地 Ollama 或自选厂商的人。
- 愿意 fork、自建、自己排错的技术用户（你正是这类）。

**不适合**：
- 只想要一个纯代码 AI 编辑器（用 Cursor/Windsurf 更顺手）。
- 只想要最强单厂商代码 agent（用 Claude Code）。
- 要企业级 M365 深度合规（用 Copilot）。
- 要稳定、确定性、数千 app 的固定流程自动化（用 Zapier/n8n）。
- 不能容忍 Beta 粗糙边、不能接受自己点审批的人。

---

## Part 5 — 上手建议与注意事项

### 模型/Provider 起步建议

- **第一次跑**：用你最熟的那家 key。如果你有 OpenAI 或 Anthropic 的 key，直接贴——它们的 native provider 支持 PDF、vision、parallel tool calls，体验最稳（matrix 里标了 `_AGENTIC_VISION`）。
- **想完全本地/零成本**：装 Ollama，`ollama pull qwen3-coder:30b`（官方推荐，tool-calling 可靠、编码强），在 Settings ▸ Models 选 Ollama，填 server URL。注意本地模型 tool-calling 质量普遍弱于 GPT-5.6/Claude Opus 4.8，复杂多步任务可能退化。
- **想省钱用开源权重**：用 Together/Fireworks/OpenRouter 一个 key 跑多家（GLM-5.2 / Kimi K2.6 / Llama 4 Maverick 等，matrix 里都有验证过的条目）。
- **企业云**：Bedrock/Vertex 跑在你自己 AWS/GCP 账号里，合规友好，但配置多一步（auth method）。Bedrock API key 是最简路径（标了 "Easiest"）。
- **避开**：别一上来就用自定义模型字符串（matrix 外的），tool-calling 可能退化。先在 curated list 里挑。

### 第一个 connector 试哪个

- **Slack** 或 **GitHub** 最有体感：Slack 能体验「@触发 → 桌面会话 → 线程回复」这条核心链路；GitHub 能让 agent 帮你看 PR/issue。
- 想看交付物链路：连 Notion（让 agent 把结果写成 page）或直接用本地文件（不需连任何 connector，Cowork 默认产文件到 scratch 目录）。
- 先连**只读**的（Stripe/Google Drive/PostHog）练手，确认审批 gating 行为后再连**读写**的（Outlook/HubSpot）。

### 怎么理解审批 gating

- 默认 `interactive` mode：写文件、发消息、跑 shell 都会弹卡。**这是特性不是 bug**——agent 在你机器上有真实权限，gating 是安全带。
- 觉得烦时有两个出口：(1) 切 mode（`auto` 更少打断，但风险自担）；(2) 对**自动化**配 standing scoped approval（精确到「某工具 + 某 target」，不是全开）。
- **永远不要**为了省事给 exec/破坏性工具开 standing approval——系统设计上就排除了这类工具的 standing 授权，别绕。
- 无人值守时开 Unattended（「Send approvals to Inbox」），请求停泊到 Inbox，你回来统一批——别让它后台自作主张发邮件/改日历。

### 已知坑与注意事项

**Windows 构建**：
- 官方 Windows 包**未签名**，SmartScreen 会警告（README 已说明，签名进行中）。从源码跑无此问题。
- shell 工具在 Windows 上用 `powershell.exe`（不是 bash），注意命令语法差异。
- onboarding 引导脚本 `packaging/setup_dev_env.sh` 在 Windows 要用 Git Bash 或 WSL 跑。

**Beta 粗糙边**：
- README 明确说「open beta，fully usable，actively polishing rough edges」。遇到问题去 [Issues](https://github.com/andrewyng/openworker/issues)。app 会自动更新，修复推得快。
- Gmail / Google Calendar 标 "Coming soon"（Google 验证/CASA 门禁），代码就绪但未开放。
- 非_reporting 后端不发 usage，用量 chip 可能不显示——正常降级。
- context overflow 无自动处理（见 AUDIT_REPORT.md §3.2）：长会话可能撑爆上下文，留意 composer 的 context-fill meter，满了就开新会话。
- provider SDK 无 timeout/retry（AUDIT_REPORT.md §3.1）：网络抖动时可能卡住，靠 Interrupt。

**安全相关（细节见 AUDIT_REPORT.md，这里只点与使用直接相关的）**：
- **Tauri webview CSP 被关闭** + **artifact iframe sandbox 可逃逸** + **sidecar token 挂 window 全局**（§2.1/§2.2/§2.3）——构成一条完整链。含义：**别在 OpenWorker 里预览/打开不可信的 HTML artifact 或网页**，尤其连了浏览器 connector 时。XSS 即等于 sidecar 接管。
- **MCP stdio server 的 `command`/`args` 完全不校验**（§2.4）——加 MCP server 时只接你信任的，等于它能跑任意命令。
- **`COWORKER_API_TOKEN` 不设时 sidecar API 完全无鉴权**（§2.5）——standalone server 跑起来确认 token 文件生成了；别让 8765 端口暴露到网络。
- **browser_screenshot 路径穿越 / browser_upload_file 可上传任意本地文件（含 secrets.json）**（§2.8/§2.9）——用 browser connector 时心里有数。
- **email 头注入**（§2.10）——发邮件场景留意。
- **prompt injection 仅靠 system prompt 防御**（§2.11）——agent 读网页/邮件/issue 内容时，把那些当不可信数据；别让「网页里的指令」驱动它做写操作（gating 是你的最后防线）。
- **凭据明文 JSON 存储**（§2.15）——本机物理安全要管好。
- 正面设计（§2.20-2.23）：破坏性 action 的 gating 模型正确、shell allowlist 防操作符注入、cloud sign-in PKCE+state 正确、更新机制 minisign 验签 + tag-pinned URL——这些是可信的基础。

### 实操节奏建议

1. 先跑通「Cowork + 一个模型 key + 不连任何 connector」，让它产一个本地文件，熟悉审批 gating 和 Artifacts 面板。
2. 连一个只读 connector（如 GitHub），让它查 issue 汇总，熟悉 connector 工具调用。
3. 连一个读写 connector（如 Outlook 或 Slack），发一条你控制目标的消息，熟悉 standing approval 的边界。
4. 设一个一次性（once）automation 跑个简单晨报，熟悉 Scheduled 面和 Inbox 停泊。
5. 再尝试 Slack @触发，体验跨端协作链路。

这样从低风险到高风险渐进，每一步都验证了 gating 行为，再放开下一步的权限。
