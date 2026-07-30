"""Pre-connect catalog copy: what each connector is for and what access it gets.

Served with every /v1/connectors entry so the GUI's pre-connect detail page
(UX-DECISIONS §38) can show About / Access before any credentials exist. Plain
statements of behavior, not marketing: every bullet must stay true to the
connector's actual tools (tool_defs.py) and, for managed connectors, the scopes
the OpenWorker Cloud app requests. Overclaiming here is a product bug.

ABOUT is optional (the list blurb is the fallback subtitle); ACCESS is required
for every available connector — tests/test_connectors.py enforces it.
"""

from __future__ import annotations

ABOUT: dict[str, str] = {
    "telegram": "在 Telegram 里与你的同事对话。发给机器人的消息会到达 "
    "agent，回复也会发回同一个会话——只有你允许列表中的发送者能通过。",
    "slack": "把你的同事接入 Slack：在频道里 @ 它，或私聊它，"
    "回复会落在原话题里。可以连接任意数量的工作区，"
    "每个都自带一份「谁可以和 agent 对话」的允许列表。",
    "email": "在任意 IMAP 账号上收发、搜索邮件——Gmail、iCloud、"
    "Fastmail 或你自己的服务器——使用应用专用密码而非账号密码。",
    "gmail": "在你的 Gmail 上搜索、摘要并发送。可同时连接多个账号，"
    "隐私过滤器还能把选定的发件人或标签对 agent 完全隐藏。",
    "google_calendar": "查看空闲情况、总结你的一周、管理日程。"
    "可同时连接多个 Google 账号。",
    "browser": "一个内置浏览器供 agent 驱动，读取网页并在网站上执行操作——"
    "与你个人浏览器相互独立，操作需经审批。",
    "github": "处理 issue、PR、仓库文件和 CI 状态。一键即可在你选择的仓库上"
    "安装 OpenWorker GitHub App；在 issue 或 PR 上 @ agent，它就会从你的桌面"
    "给出回复。",
    "outlook": "搜索、摘要并发送 Microsoft 365 邮件，打理你的日历——"
    "创建和移动会议、回复邀请。可同时连接多个邮箱。",
    "hubspot": "搜索并读取你的 CRM；可选地记录备注与任务、更新记录。"
    "只读还是读写由授权时决定，选定的属性还能对 agent 完全隐藏。",
    "notion": "搜索并读取你与该连接共享的页面和数据库，并创建新页面。"
    "由你精确指定它能看到哪些页面。",
    "attio": "读取你的 Attio CRM——对象、记录和列表——为会议做准备、"
    "回答管线相关的问题，并在工作中记录备注。",
    "google_drive": "跨你的 Drive 搜索、浏览并读取文件。"
    "可同时连接多个账号。",
    "monday": "处理你的 monday.com 看板——读取条目、总结并汇总看板数据、"
    "创建条目、发布更新。一键登录完全在本机运行，对接 monday.com 自带的 "
    "agent 服务；agent 只会拿到一小撮精选工具，绝不会是完整目录。",
    "asana": "跟进你的 Asana 工作——搜索并读取任务与项目、创建任务、"
    "发表评论。使用来自 Asana 开发者控制台的个人访问令牌连接。",
}

# What connecting actually grants, as short honest bullets. Write powers always
# name themselves; reads state their boundary ("…your account can see").
ACCESS: dict[str, list[str]] = {
    "telegram": [
        "读取发给机器人的消息——绝不读你的私人聊天。",
        "以机器人身份发送消息。",
        "只回应允许列表中的发送者。",
    ],
    "slack": [
        "读取机器人被邀请加入的频道及其私信。",
        "以机器人身份发布消息、上传文件。",
        "读取那些频道里共享的文件。",
        "读取成员和频道名称，以分辨是谁在说话。",
    ],
    "email": [
        "通过 IMAP 读取并搜索邮件。",
        "以你的地址发送邮件，并把附件保存到本地。",
        "用应用专用密码登录——绝非你的账号密码。",
    ],
    "gmail": [
        "读取并搜索你的邮件。",
        "以你的身份发送邮件。",
        "绝不删除邮件或更改账号设置。",
    ],
    "google_calendar": [
        "读取你各个日历的日程和空闲情况。",
        "创建、更新和删除日程。",
    ],
    "browser": [
        "在它自己的浏览器会话里打开并读取网页。",
        "点击、输入、上传文件都只发生在该会话内。",
        "绝不触碰你的个人浏览器或其中的登录信息。",
    ],
    "github": [
        "读取你授权的仓库中的代码、issue、PR 和 CI。",
        "创建 issue、回复并审查 PR。",
        "由你在 GitHub 上挑选仓库——单个、多个或全部。",
    ],
    "outlook": [
        "读取并搜索你的邮件。",
        "以你的身份发送邮件。",
        "读取你的日历。",
        "创建、修改和取消日程；以你的身份回复邀请。",
    ],
    "jira": [
        "读取并搜索你账号可见的 issue。",
        "创建、更新和流转 issue；以你的身份评论。",
    ],
    "monday": [
        "读取你账号可见的看板、条目和更新。",
        "创建条目、修改条目值，并以你的身份发布更新。",
    ],
    "asana": [
        "读取并搜索你账号可见的任务。",
        "以你的身份创建任务。",
    ],
    "confluence": [
        "读取并搜索你账号可见的空间和页面。",
        "以你的身份创建页面。",
    ],
    "zendesk": [
        "读取并搜索你的 agent 账号可见的工单。",
        "以你的身份创建工单。",
    ],
    "linear": [
        "读取并搜索你账号可见的 issue。",
        "以你的身份创建 issue。",
    ],
    "gitlab": [
        "读取你令牌权限范围内的 issue 和合并请求。",
        "创建 issue（需 api 权限；read_api 仍为只读）。",
    ],
    "discord": [
        "读取机器人可见的频道。",
        "以机器人身份发送消息。",
    ],
    "stripe": [
        "读取客户、扣款和发票——只读。",
        "受限的只读密钥意味着写入根本不可能发生。",
    ],
    "hubspot": [
        "读取联系人、公司、商机和工单。",
        "读写还会增加：记录备注与任务、更新记录、创建联系人——绝不删除。",
        "你隐藏的属性会在 agent 看到记录之前就被剥离。",
    ],
    "dropbox": [
        "读取文件名和内容——只读。",
    ],
    "box": [
        "读取文件名和内容——只读。",
    ],
    "whatsapp": [
        "从你的 Cloud API 号码发送消息。",
        "仅限外发——它读不到你的聊天。",
    ],
    "quickbooks": [
        "读取客户、发票和报表——只读。",
    ],
    "docusign": [
        "读取信封及其签署状态。",
        "以你的身份发送待签文件。",
    ],
    "clickup": [
        "读取并搜索你账号可见的任务和文档。",
        "以你的身份创建、更新任务并发表评论。",
    ],
    "google_drive": [
        "读取并搜索你的文件——只读。",
        "绝不编辑或删除你 Drive 中的任何内容。",
    ],
    "canva": [
        "浏览你的设计并导出——只读。",
    ],
    "figma": [
        "读取设计文件和评论；导出素材。",
        "以你的身份评论——绝不编辑设计。",
    ],
    "close": [
        "读取线索、联系人和机会。",
        "以你的身份创建线索、更新机会、记录备注。",
    ],
    "notion": [
        "只读取与该连接共享的页面和数据库。",
        "创建页面——绝不编辑或删除既有页面。",
    ],
    "attio": [
        "读取对象、记录、列表和备注。",
        "记录备注——绝不创建或更改记录。",
    ],
    "posthog": [
        "对已连接项目运行只读查询：事件、漏斗、"
        "洞察。",
    ],
    "mixpanel": [
        "对已连接项目运行只读查询。",
    ],
    "amplitude": [
        "运行只读图表查询：活跃用户、事件总量。",
    ],
    "apollo": [
        "使用你的 Apollo 额度搜索并补全人物与公司"
        "信息。",
    ],
    "hunter": [
        "使用你的 Hunter 配额查找并验证邮箱地址。",
    ],
}

# Experimental / future connectors fall back to this rather than shipping
# without an access statement.
_DEFAULT_ACCESS = [
    "访问范围仅限于你提供的凭据所允许的。",
]


def about_for(name: str) -> str:
    return ABOUT.get(name, "")


def access_for(name: str) -> list[str]:
    return list(ACCESS.get(name) or _DEFAULT_ACCESS)
