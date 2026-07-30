"""Connector descriptors — data that drives the guided setup wizard.

Adding a connector is (mostly) data, not UI code: a descriptor declares its auth method,
the fields the user pastes, step-by-step instructions, and a `validate` that confirms the
token by a real API call (and returns the bot identity to show back). Designed so a managed
one-click OAuth (`auth="oauth"`) can slot in later for the cloud product without changing the
data model — only the connect action differs.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Optional


@dataclass
class Field:
    key: str
    label: str
    secret: bool = False
    required: bool = True
    help: str = ""
    placeholder: str = ""

    def to_dict(self) -> dict:
        return {
            "key": self.key,
            "label": self.label,
            "secret": self.secret,
            "required": self.required,
            "help": self.help,
            "placeholder": self.placeholder,
        }


@dataclass
class ValidationResult:
    ok: bool
    identity: Optional[str] = (
        None  # e.g. "@mybot" — shown back to the user, never a secret
    )
    error: Optional[str] = None


@dataclass
class ConnectorDescriptor:
    name: str
    title: str
    icon: str
    blurb: str
    auth: str  # "bot_token" | "socket_app" | "oauth" | "token" | "api_token" | "none"
    two_way: bool
    fields: list[Field]
    instructions: list[str]
    available: bool = True  # False → shown as "soon"
    # Chat-platform capability, narrower than two_way: sessions can SUBSCRIBE to this
    # connector's channels (Sources ▸ Channels, listening-sessions block). GitHub is
    # two_way via the relay (inbound mentions) but has no channel semantics.
    channels: bool = False
    validate: Optional[Callable[[dict], ValidationResult]] = None
    # Registry metadata (UI-Refresh §1): the connector's brand color (hex; fallback gray) and a
    # stable logo id (e.g. "slack") the frontend maps to a bundled SVG. Empty logo → UI fallback.
    brand_color: str = "#6b7280"
    logo: str = ""
    # Extra search terms for the catalog typeahead — capability words the title
    # doesn't carry (e.g. "calendar" must surface Outlook, not just Google Calendar).
    aliases: tuple = ()
    # Vendor-hosted MCP server URL → this connector is MCP-BACKED: one-click connect
    # runs the local MCP OAuth flow (DCR, tokens on this Mac — no broker), and the
    # tool surface is the PINNED subset in tool_defs (names `mcp__<name>__<tool>`),
    # never the vendor's full catalog (drift can only shrink capability, not grow it).
    # A connector may carry BOTH mcp_url and manual fields (jira): the profile's
    # mode decides which tool set is live.
    mcp_url: str = ""
    # Experimental connectors are hidden unless the user enables them in settings, require an
    # explicit risk acknowledgment to connect, and ship in a separate package
    # (connectors/experimental/) that release builds exclude entirely.
    experimental: bool = False
    risk_notice: str = ""
    # One-click managed OAuth via OpenWorker Cloud (requires cloud sign-in).
    # Manual token paste ALWAYS remains available — signed out or in — managed
    # is an extra path, never a replacement (local-only open-source flow is
    # sacred).
    managed: bool = False
    # One-click temporarily unavailable (e.g. Google pending CASA verification):
    # the GUI shows a disabled button with a "Coming soon" badge, the server
    # refuses begin_managed_connect, and the manual path is unaffected.
    managed_paused: bool = False
    # Multi-account (accounts.py generic layer): the creds field that names an
    # account (e.g. "project_id"), or "@identity" = the validator's identity
    # string. Non-empty → profiles live at `<name>:account:<id>` and the
    # `:default` profile is pointer-only. Empty → single-profile connector.
    account_field: str = ""


# -- validators (sync httpx, one-shot) -----------------------------------------
def _validate_telegram(creds: dict) -> ValidationResult:
    import httpx

    token = creds.get("bot_token", "")
    try:
        data = httpx.get(
            f"https://api.telegram.org/bot{token}/getMe", timeout=15
        ).json()
    except Exception as exc:
        return ValidationResult(False, error=str(exc))
    if data.get("ok"):
        return ValidationResult(
            True, identity="@" + str(data["result"].get("username", "bot"))
        )
    return ValidationResult(False, error=data.get("description") or "机器人令牌无效")


def _validate_email(creds: dict) -> ValidationResult:
    from .email_tools import validate_email_account

    ok, identity, error = validate_email_account(creds)
    return ValidationResult(ok, identity=identity or None, error=error or None)


def _validate_slack(creds: dict) -> ValidationResult:
    import httpx

    token = creds.get("bot_token", "")
    try:
        data = httpx.post(
            "https://slack.com/api/auth.test",
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        ).json()
    except Exception as exc:
        return ValidationResult(False, error=str(exc))
    if data.get("ok"):
        return ValidationResult(
            True, identity=f"{data.get('team', '?')} / {data.get('user', 'bot')}"
        )
    return ValidationResult(False, error=data.get("error") or "机器人令牌无效")


def _validate_whoami(
    method: str,
    url: str,
    *,
    headers: dict,
    identity: Callable[[dict], str],
    json: Optional[dict] = None,
) -> ValidationResult:
    """Shared one-shot whoami check: 2xx + extractable identity, else a failure."""
    import httpx

    try:
        resp = httpx.request(method, url, headers=headers, json=json, timeout=15)
        data = resp.json()
    except Exception as exc:
        return ValidationResult(False, error=str(exc))
    if resp.status_code >= 400:
        detail = (
            (data.get("message") or data.get("error") or data.get("error_summary"))
            if isinstance(data, dict)
            else None
        )
        return ValidationResult(False, error=str(detail or f"HTTP {resp.status_code}"))
    try:
        return ValidationResult(True, identity=str(identity(data)))
    except Exception:
        return ValidationResult(False, error="API 返回了意外的响应")


def _validate_notion(creds: dict) -> ValidationResult:
    return _validate_whoami(
        "GET",
        "https://api.notion.com/v1/users/me",
        headers={
            "Authorization": f"Bearer {creds.get('access_token', '')}",
            "Notion-Version": "2022-06-28",
        },
        identity=lambda d: (d.get("bot") or {}).get("workspace_name") or d["name"],
    )


def _validate_attio(creds: dict) -> ValidationResult:
    return _validate_whoami(
        "GET",
        "https://api.attio.com/v2/self",
        headers={"Authorization": f"Bearer {creds.get('access_token', '')}"},
        identity=lambda d: d.get("workspace_name") or d["workspace_id"],
    )


def _validate_posthog(creds: dict) -> ValidationResult:
    base = str(creds.get("base_url") or "https://us.posthog.com").rstrip("/")
    return _validate_whoami(
        "GET",
        f"{base}/api/users/@me/",
        headers={"Authorization": f"Bearer {creds.get('api_key', '')}"},
        identity=lambda d: d["email"],
    )


def _validate_mixpanel(creds: dict) -> ValidationResult:
    import base64 as _b64

    pair = f"{creds.get('username', '')}:{creds.get('secret', '')}"
    return _validate_whoami(
        "GET",
        "https://mixpanel.com/api/app/me",
        headers={"Authorization": "Basic " + _b64.b64encode(pair.encode()).decode()},
        identity=lambda d, u=creds.get("username", ""): u,
    )


def _validate_amplitude(creds: dict) -> ValidationResult:
    import base64 as _b64

    pair = f"{creds.get('api_key', '')}:{creds.get('secret_key', '')}"
    return _validate_whoami(
        "GET",
        "https://amplitude.com/api/2/annotations",
        headers={"Authorization": "Basic " + _b64.b64encode(pair.encode()).decode()},
        # No user identity on this API — name the account by the key's tail so
        # two projects stay tellable-apart in the accounts list.
        identity=lambda d, k=str(creds.get("api_key", "")): f"密钥 …{k[-6:]}",
    )


def _validate_apollo(creds: dict) -> ValidationResult:
    return _validate_whoami(
        "GET",
        "https://api.apollo.io/api/v1/auth/health",
        headers={"X-Api-Key": creds.get("api_key", "")},
        identity=lambda d: str(creds.get("label") or "").strip() or "默认",
    )


def _validate_hunter(creds: dict) -> ValidationResult:
    return _validate_whoami(
        "GET",
        f"https://api.hunter.io/v2/account?api_key={creds.get('api_key', '')}",
        headers={},
        identity=lambda d: d["data"]["email"],
    )


def _validate_linear(creds: dict) -> ValidationResult:
    return _validate_whoami(
        "POST",
        "https://api.linear.app/graphql",
        headers={
            "Authorization": creds.get("api_key", ""),
            "Content-Type": "application/json",
        },
        json={"query": "{ viewer { name } }"},
        identity=lambda d: d["data"]["viewer"]["name"],
    )


def _validate_gitlab(creds: dict) -> ValidationResult:
    base = str(creds.get("base_url") or "https://gitlab.com").rstrip("/")
    return _validate_whoami(
        "GET",
        f"{base}/api/v4/user",
        headers={"PRIVATE-TOKEN": creds.get("token", "")},
        identity=lambda d: "@" + d["username"],
    )


def _validate_discord(creds: dict) -> ValidationResult:
    return _validate_whoami(
        "GET",
        "https://discord.com/api/v10/users/@me",
        headers={"Authorization": f"Bot {creds.get('bot_token', '')}"},
        identity=lambda d: d["username"],
    )


def _validate_asana(creds: dict) -> ValidationResult:
    return _validate_whoami(
        "GET",
        "https://app.asana.com/api/1.0/users/me",
        headers={"Authorization": f"Bearer {creds.get('token', '')}"},
        identity=lambda d: d["data"]["name"],
    )


def _validate_hubspot(creds: dict) -> ValidationResult:
    return _validate_whoami(
        "GET",
        "https://api.hubapi.com/account-info/v3/details",
        headers={"Authorization": f"Bearer {creds.get('token', '')}"},
        identity=lambda d: f"门户 {d['portalId']}",
    )


def _validate_dropbox(creds: dict) -> ValidationResult:
    return _validate_whoami(
        "POST",
        "https://api.dropboxapi.com/2/users/get_current_account",
        headers={"Authorization": f"Bearer {creds.get('access_token', '')}"},
        identity=lambda d: d["email"],
    )


def _quickbooks_host(creds: dict) -> str:
    env = str(creds.get("environment", "")).lower()
    return (
        "sandbox-quickbooks.api.intuit.com"
        if env.startswith("sand")
        else "quickbooks.api.intuit.com"
    )


def _validate_quickbooks(creds: dict) -> ValidationResult:
    realm = creds.get("realm_id", "")
    return _validate_whoami(
        "GET",
        f"https://{_quickbooks_host(creds)}/v3/company/{realm}/companyinfo/{realm}",
        headers={
            "Authorization": f"Bearer {creds.get('access_token', '')}",
            "Accept": "application/json",
        },
        identity=lambda d: d["CompanyInfo"]["CompanyName"],
    )


def _validate_box(creds: dict) -> ValidationResult:
    return _validate_whoami(
        "GET",
        "https://api.box.com/2.0/users/me",
        headers={"Authorization": f"Bearer {creds.get('access_token', '')}"},
        identity=lambda d: d["login"],
    )


def _validate_whatsapp(creds: dict) -> ValidationResult:
    return _validate_whoami(
        "GET",
        f"https://graph.facebook.com/v21.0/{creds.get('phone_number_id', '')}",
        headers={"Authorization": f"Bearer {creds.get('access_token', '')}"},
        identity=lambda d: d["display_phone_number"],
    )


def _validate_clickup(creds: dict) -> ValidationResult:
    return _validate_whoami(
        "GET",
        "https://api.clickup.com/api/v2/user",
        headers={"Authorization": creds.get("api_token", "")},
        identity=lambda d: d["user"]["username"],
    )


def _validate_close(creds: dict) -> ValidationResult:
    import base64 as _b64

    # Close authenticates with HTTP basic auth: the API key is the username, blank password.
    pair = f"{creds.get('api_key', '')}:"
    return _validate_whoami(
        "GET",
        "https://api.close.com/api/v1/me/",
        headers={"Authorization": "Basic " + _b64.b64encode(pair.encode()).decode()},
        identity=lambda d: d["email"],
    )


def _validate_figma(creds: dict) -> ValidationResult:
    return _validate_whoami(
        "GET",
        "https://api.figma.com/v1/me",
        headers={"X-Figma-Token": creds.get("access_token", "")},
        identity=lambda d: d["email"],
    )


def _validate_google_drive(creds: dict) -> ValidationResult:
    return _validate_whoami(
        "GET",
        "https://www.googleapis.com/drive/v3/about?fields=user",
        headers={"Authorization": f"Bearer {creds.get('access_token', '')}"},
        identity=lambda d: d["user"]["emailAddress"],
    )


def _validate_docusign(creds: dict) -> ValidationResult:
    # userinfo also carries accounts[] (account_id + base_uri); the tool layer
    # re-fetches and caches those on first use, so validation only needs identity.
    return _validate_whoami(
        "GET",
        "https://account.docusign.com/oauth/userinfo",
        headers={"Authorization": f"Bearer {creds.get('access_token', '')}"},
        identity=lambda d: d["email"],
    )


def _validate_canva(creds: dict) -> ValidationResult:
    return _validate_whoami(
        "GET",
        "https://api.canva.com/rest/v1/users/me/profile",
        headers={"Authorization": f"Bearer {creds.get('access_token', '')}"},
        identity=lambda d: d["profile"]["display_name"],
    )


def _validate_outlook(creds: dict) -> ValidationResult:
    return _validate_whoami(
        "GET",
        "https://graph.microsoft.com/v1.0/me",
        headers={"Authorization": f"Bearer {creds.get('access_token', '')}"},
        identity=lambda d: d.get("mail") or d["userPrincipalName"],
    )


_ALLOWED_FIELD = Field(
    key="allowed_users",
    label="允许的用户 ID",
    required=False,
    help="以逗号分隔的、允许向机器人发消息的用户 ID。留空后，先私信机器人再使用「捕获」。",
    placeholder="123456789",
)

DESCRIPTORS: list[ConnectorDescriptor] = [
    ConnectorDescriptor(
        name="telegram",
        title="Telegram",
        icon="✈",
        blurb="通过 Telegram 机器人进行双向消息通信。",
        auth="bot_token",
        two_way=True,
        channels=True,
        brand_color="#229ed9",
        logo="telegram",
        fields=[
            Field(
                "bot_token",
                "机器人令牌",
                secret=True,
                help="来自 @BotFather。",
                placeholder="123456:ABC-DEF…",
            ),
            _ALLOWED_FIELD,
        ],
        instructions=[
            "打开 Telegram 并给 @BotFather 发消息。",
            "发送 /newbot，选择名称和用户名。",
            "复制它给出的 HTTP API 令牌并粘贴到下方。",
            "连接后，先私信你的新机器人一次，再使用「捕获」获取你的用户 ID。",
        ],
        validate=_validate_telegram,
    ),
    ConnectorDescriptor(
        name="slack",
        title="Slack",
        icon="💬",
        blurb="双向消息通信——通过 OpenWorker Cloud 一键连接，或手动配置 Slack 应用（Socket 模式）。",
        auth="socket_app",
        two_way=True,
        channels=True,
        brand_color="#611f69",
        logo="slack",
        # One-click managed OAuth (the cloud relay): signed in, the GUI shows
        # "Connect Slack with one click" (no tokens). The manual Socket-Mode
        # fields below stay as the always-available fallback (slack → slack in
        # PROVIDER_FOR_CONNECTOR drives the broker start).
        managed=True,
        fields=[
            Field(
                "bot_token",
                "机器人令牌",
                secret=True,
                help="Bot User OAuth 令牌。",
                placeholder="xoxb-…",
            ),
            Field(
                "app_token",
                "应用令牌",
                secret=True,
                help="用于 Socket 模式的应用级令牌。",
                placeholder="xapp-…",
            ),
            _ALLOWED_FIELD,
        ],
        instructions=[
            "前往 api.slack.com/apps → Create New App（从零开始创建）。",
            "Settings → Socket Mode：启用它并生成一个带 connections:write 权限的应用级令牌（xapp-）。",
            "Features → Interactivity & Shortcuts：开启 Interactivity（Socket 模式下无需 Request URL）——这是「批准/拒绝」按钮所必需的。",
            "OAuth & Permissions：添加机器人权限 chat:write、files:write、app_mentions:read、im:history、channels:history、groups:history、users:read、channels:read、groups:read（files:write 让 agent 能发送文件；最后三项用于解析发送者/频道显示名）。",
            "安装到工作区并复制 Bot User OAuth 令牌（xoxb-）。",
            "将两个令牌都粘贴到下方并连接，然后邀请机器人到某个频道或私信它。",
        ],
        validate=_validate_slack,
    ),
    ConnectorDescriptor(
        name="email",
        title="邮件 (IMAP)",
        icon="✉",
        blurb="从任意 IMAP 账户读取、搜索和发送邮件——Gmail、iCloud、Fastmail 或自定义账户。",
        auth="app_password",
        two_way=False,
        logo="email",
        fields=[
            Field("address", "邮箱地址", placeholder="you@gmail.com"),
            Field(
                "app_password",
                "应用专用密码",
                secret=True,
                help="Gmail/iCloud：生成应用专用密码（需开启两步验证）。不是你的账户登录密码。",
            ),
            Field(
                "display_name",
                "显示名称",
                required=False,
                help="作为已发送邮件的发件人名称显示。",
            ),
            Field(
                "imap_host",
                "IMAP 主机（高级）",
                required=False,
                help="仅在我们无法自动识别的服务商时需要。",
                placeholder="imap.example.com",
            ),
            Field(
                "imap_port", "IMAP 端口（高级）", required=False, placeholder="993"
            ),
            Field(
                "smtp_host",
                "SMTP 主机（高级）",
                required=False,
                placeholder="smtp.example.com",
            ),
            Field(
                "smtp_port", "SMTP 端口（高级）", required=False, placeholder="587"
            ),
        ],
        instructions=[
            "Gmail：开启两步验证，然后在 myaccount.google.com/apppasswords 创建应用专用密码。",
            "iCloud：在 account.apple.com → 登录与安全中生成应用专用密码。",
            "在下方输入邮箱地址和应用专用密码。Gmail、iCloud 和 Fastmail 的服务器会自动识别；其他服务商请填写 IMAP/SMTP 主机。",
            "注意：Google Workspace 和 Microsoft 365 账户通常会被组织管理员禁用 IMAP 或应用专用密码。",
        ],
        validate=_validate_email,
    ),
    ConnectorDescriptor(
        name="gmail",
        title="Gmail",
        icon="✉",
        blurb="搜索、摘要、起草并发送邮件。",
        auth="oauth",
        two_way=False,
        brand_color="#ea4335",
        aliases=("email", "mail", "google"),
        logo="gmail",
        fields=[
            Field(
                "access_token",
                "OAuth 访问令牌",
                secret=True,
                help="带 Gmail 权限范围的 Google OAuth 令牌。",
            ),
        ],
        instructions=[
            "使用带 Gmail 只读和发送权限范围的 Google OAuth 访问令牌。",
            "将访问令牌粘贴到下方。",
        ],
        available=True,
        managed=True,
        # Google OAuth verification (CASA) pending — one-click off until it clears.
        managed_paused=True,
    ),
    ConnectorDescriptor(
        name="google_calendar",
        title="Google Calendar",
        icon="◷",
        blurb="读取空闲情况、摘要日程安排并创建活动。",
        auth="oauth",
        two_way=False,
        brand_color="#4285f4",
        logo="google_calendar",
        fields=[
            Field(
                "access_token",
                "OAuth 访问令牌",
                secret=True,
                help="带 Calendar 权限范围的 Google OAuth 令牌。",
            ),
        ],
        instructions=[
            "使用带 Calendar 读/写权限范围的 Google OAuth 访问令牌。",
            "将访问令牌粘贴到下方。",
        ],
        available=True,
        managed=True,
        managed_paused=True,  # same Google app as Gmail — paused until CASA clears
    ),
    ConnectorDescriptor(
        name="browser",
        title="浏览器",
        icon="⌕",
        blurb="让 agent 在审批后导航、阅读和操作网站。",
        auth="none",
        two_way=False,
        brand_color="#0ea5e9",
        logo="browser",
        fields=[],
        instructions=[
            "无需设置。浏览器工具可供 Cowork 会话使用。"
        ],
        available=True,
    ),
    ConnectorDescriptor(
        name="github",
        title="GitHub",
        icon="⌘",
        blurb="处理 issue、pull request、仓库文件和 CI 状态。",
        auth="token",
        # Managed relay makes GitHub two-way: @-mentions and the agent label
        # reach the desktop through the cloud relay (github-relay-spec §2.3);
        # the manual PAT path stays request/response only.
        two_way=True,
        brand_color="#1f2328",
        logo="github",
        fields=[
            Field(
                "token",
                "个人访问令牌",
                secret=True,
                help="细粒度或经典 GitHub 令牌。",
            ),
        ],
        instructions=[
            "创建一个能访问目标仓库的 GitHub 个人访问令牌。",
            "对于写操作，按需包含 Issue 或 Pull Request 的写入权限。",
        ],
        available=True,
        # One-click managed path: install the GitHub App — no tokens typed.
        managed=True,
    ),
    ConnectorDescriptor(
        name="outlook",
        title="Outlook",
        icon="◎",
        blurb="Microsoft 365 邮件和日历：搜索、起草并发送邮件；"
        "管理活动并响应邀请。",
        auth="oauth",
        two_way=False,
        brand_color="#0078d4",
        logo="outlook",
        aliases=("calendar", "email", "mail", "microsoft", "office"),
        fields=[
            Field(
                "access_token",
                "OAuth 访问令牌",
                secret=True,
                help="Microsoft Graph 访问令牌。",
            ),
        ],
        instructions=[
            "一键通过 OpenWorker Cloud 连接（推荐）。",
            "手动方式：粘贴带邮件和日历权限范围的 Microsoft Graph 访问令牌。",
        ],
        validate=_validate_outlook,
        available=True,
        managed=True,
        # Key each connected mailbox by its email (the broker's `account` field,
        # from the Microsoft id_token) — same multi-account shape as Gmail/Drive.
        account_field="@identity",
    ),
    ConnectorDescriptor(
        name="jira",
        title="Jira",
        icon="◆",
        blurb="搜索、摘要、创建和更新 issue。",
        auth="api_token",
        two_way=False,
        brand_color="#0052cc",
        logo="jira",
        aliases=("issues", "tickets", "atlassian", "project management"),
        mcp_url="https://mcp.atlassian.com/v1/mcp",
        fields=[
            Field(
                "base_url",
                "Atlassian 站点 URL",
                secret=False,
                help="示例：https://example.atlassian.net",
            ),
            Field("email", "账户邮箱", secret=False),
            Field("api_token", "API 令牌", secret=True, help="Atlassian API 令牌。"),
        ],
        instructions=[
            "一键通过浏览器中的 Atlassian 登录连接（推荐）。",
            "手动方式：创建一个 Atlassian API 令牌，并在下方粘贴你的站点 URL、账户邮箱和令牌。",
        ],
        available=True,
    ),
    ConnectorDescriptor(
        name="monday",
        title="monday.com",
        icon="▦",
        blurb="读取看板和条目、跟踪工作、创建条目并发布更新。",
        auth="oauth",
        two_way=False,
        brand_color="#6161ff",
        logo="monday",
        aliases=("project management", "tasks", "boards", "work management"),
        mcp_url="https://mcp.monday.com/mcp",
        fields=[],
        instructions=[
            "一键通过浏览器中的 monday.com 登录连接。",
            "登录完全在本地完成——令牌保留在本机上。",
        ],
        available=True,
    ),
    ConnectorDescriptor(
        name="confluence",
        title="Confluence",
        icon="◫",
        blurb="搜索空间、阅读页面并起草文档。",
        auth="api_token",
        two_way=False,
        brand_color="#172b4d",
        logo="confluence",
        fields=[
            Field(
                "base_url",
                "Atlassian 站点 URL",
                secret=False,
                help="示例：https://example.atlassian.net",
            ),
            Field("email", "账户邮箱", secret=False),
            Field("api_token", "API 令牌", secret=True, help="Atlassian API 令牌。"),
        ],
        instructions=[
            "为你的账户创建一个 Atlassian API 令牌。",
            "在下方粘贴你的站点 URL、账户邮箱和 API 令牌。",
        ],
        available=True,
    ),
    ConnectorDescriptor(
        name="zendesk",
        title="Zendesk",
        icon="◇",
        blurb="搜索工单、摘要客户上下文并起草回复。",
        auth="api_token",
        two_way=False,
        brand_color="#03363d",
        logo="zendesk",
        fields=[
            Field(
                "subdomain",
                "Zendesk 子域名",
                secret=False,
                help="例如 acme.zendesk.com 填「acme」。",
            ),
            Field("email", "客服邮箱", secret=False),
            Field("api_token", "API 令牌", secret=True),
        ],
        instructions=[
            "创建一个 Zendesk API 令牌。",
            "在下方粘贴你的子域名、客服邮箱和 API 令牌。",
        ],
        available=True,
    ),
    ConnectorDescriptor(
        name="linear",
        title="Linear",
        icon="⟋",
        blurb="搜索、阅读和创建 Linear issue。",
        auth="api_token",
        two_way=False,
        brand_color="#5e6ad2",
        logo="linear",
        fields=[
            Field(
                "api_key",
                "API 密钥",
                secret=True,
                help="来自 Linear 设置的个人 API 密钥。",
                placeholder="lin_api_…",
            ),
        ],
        instructions=[
            "在 Linear 中打开 Settings → Security & access → Personal API keys。",
            "创建一个密钥并粘贴到下方。",
        ],
        validate=_validate_linear,
    ),
    ConnectorDescriptor(
        name="gitlab",
        title="GitLab",
        icon="▲",
        blurb="处理 GitLab.com 或自托管实例上的 issue 和 merge request。",
        auth="token",
        two_way=False,
        brand_color="#fc6d26",
        logo="gitlab",
        fields=[
            Field(
                "base_url",
                "GitLab URL",
                required=False,
                help="gitlab.com 留空即可。",
                placeholder="https://gitlab.example.com",
            ),
            Field(
                "token",
                "个人访问令牌",
                secret=True,
                help="带 read_api 权限范围的令牌（写操作需 api 权限）。",
                placeholder="glpat-…",
            ),
        ],
        instructions=[
            "创建一个带 read_api 权限范围的 GitLab 个人访问令牌（写操作需 api 权限）。",
            "自托管 GitLab 请填写实例 URL；gitlab.com 留空即可。",
        ],
        validate=_validate_gitlab,
    ),
    ConnectorDescriptor(
        name="discord",
        title="Discord",
        icon="✦",
        blurb="通过 Discord 机器人读取频道并发送消息。",
        auth="bot_token",
        two_way=False,
        brand_color="#5865f2",
        logo="discord",
        fields=[
            Field(
                "bot_token",
                "机器人令牌",
                secret=True,
                help="来自你的 Discord 应用的 Bot 标签页。",
            ),
        ],
        instructions=[
            "前往 discord.com/developers/applications → New Application → Bot。",
            "复制机器人令牌并粘贴到下方。",
            "使用 OAuth2 URL 生成器，以「读取/发送消息」权限邀请机器人加入你的服务器。",
        ],
        validate=_validate_discord,
    ),
    ConnectorDescriptor(
        name="stripe",
        title="Stripe",
        icon="≋",
        blurb="对客户、扣款和发票的只读访问。",
        auth="api_token",
        two_way=False,
        brand_color="#635bff",
        logo="stripe",
        fields=[
            Field(
                "api_key",
                "受限 API 密钥",
                secret=True,
                help="建议使用只读受限密钥。",
                placeholder="rk_live_…",
            ),
        ],
        instructions=[
            "在 Stripe Dashboard 中创建一个受限 API 密钥，具备对客户、扣款和发票的读取权限。",
            "将密钥粘贴到下方。此连接器仅提供只读工具。",
        ],
    ),
    ConnectorDescriptor(
        name="asana",
        title="Asana",
        icon="⊙",
        blurb="搜索和阅读任务与项目；创建、更新和评论。",
        auth="token",
        two_way=False,
        brand_color="#f06a6a",
        logo="asana",
        aliases=("project management", "tasks", "work management"),
        # NO mcp_url (2026-07-20): Asana's V2 MCP server rejects Dynamic Client
        # Registration — it needs a pre-registered "MCP app" with an EXACT redirect
        # URI, which our dynamic sidecar port can't provide. One-click returns when
        # the broker-routed callback lands; the pinned mcp__asana__* defs sit
        # dormant until then. Manual token stays the connect path.
        fields=[
            Field(
                "token",
                "个人访问令牌",
                secret=True,
                help="来自 Asana 开发者控制台。",
            ),
        ],
        instructions=[
            "在 Asana 中打开 My Settings → Apps → Manage developer apps。",
            "创建一个个人访问令牌并粘贴到下方。",
        ],
        validate=_validate_asana,
    ),
    ConnectorDescriptor(
        name="hubspot",
        title="HubSpot",
        icon="⊚",
        blurb="搜索 CRM 记录；记录备注和任务、更新记录。不支持删除。",
        auth="token",
        two_way=False,
        brand_color="#ff7a59",
        logo="hubspot",
        fields=[
            Field(
                "token",
                "私有应用令牌",
                secret=True,
                help="HubSpot 私有应用的访问令牌。",
                placeholder="pat-…",
            ),
        ],
        instructions=[
            "在 HubSpot 中前往 Settings → Integrations → Private Apps 并创建一个应用。",
            "授予 CRM 对象读取权限（备注、任务和更新需额外添加 .write 权限）。",
            "复制访问令牌并粘贴到下方。",
        ],
        validate=_validate_hubspot,
        managed=True,
    ),
    ConnectorDescriptor(
        name="dropbox",
        title="Dropbox",
        icon="▣",
        blurb="在 Dropbox 中搜索、浏览和读取文件。",
        auth="oauth",
        two_way=False,
        brand_color="#0061ff",
        logo="dropbox",
        fields=[
            Field(
                "access_token",
                "OAuth 访问令牌",
                secret=True,
                help="带 files.metadata.read 和 files.content.read 权限范围的 Dropbox 令牌。",
            ),
        ],
        instructions=[
            "在 Dropbox App Console 中创建一个带 files.metadata.read 和 files.content.read 权限范围的应用。",
            "生成访问令牌并粘贴到下方。托管登录日后将替代此手动步骤。",
        ],
        validate=_validate_dropbox,
    ),
    ConnectorDescriptor(
        name="box",
        title="Box",
        icon="▢",
        blurb="在 Box 中搜索、浏览和读取文件。",
        auth="oauth",
        two_way=False,
        brand_color="#0061d5",
        logo="box",
        fields=[
            Field(
                "access_token",
                "OAuth 访问令牌",
                secret=True,
                help="Box 开发者令牌或 OAuth 访问令牌。",
            ),
        ],
        instructions=[
            "在 app.box.com/developers/console 创建一个 Box 应用。",
            "生成开发者令牌（或 OAuth 访问令牌）并粘贴到下方。托管登录日后将替代此手动步骤。",
        ],
        validate=_validate_box,
    ),
    ConnectorDescriptor(
        name="whatsapp",
        title="WhatsApp",
        icon="◌",
        blurb="通过 Meta 官方 Cloud API 发送 WhatsApp 消息（仅出站）。",
        auth="token",
        two_way=False,
        brand_color="#25d366",
        logo="whatsapp",
        fields=[
            Field(
                "access_token",
                "访问令牌",
                secret=True,
                help="来自你的 Meta 应用的 WhatsApp 设置页（长期访问请用系统用户令牌）。",
            ),
            Field(
                "phone_number_id",
                "电话号码 ID",
                help="Cloud API 的电话号码 ID（不是电话号码本身）。",
            ),
        ],
        instructions=[
            "在 developers.facebook.com 创建一个 Meta 应用并添加 WhatsApp 产品。",
            "从 API 设置页复制访问令牌和电话号码 ID。",
            "免费测试号码最多可向 5 个已验证收件人发消息，无需企业验证。",
            "自由格式消息仅能发送给过去 24 小时内给你发过消息的人；超出该时间窗口只能投递已审批的模板消息。",
        ],
        validate=_validate_whatsapp,
    ),
    ConnectorDescriptor(
        name="quickbooks",
        title="QuickBooks",
        icon="◴",
        blurb="对客户、发票和财务报表的只读访问。",
        auth="oauth",
        two_way=False,
        brand_color="#2ca01c",
        logo="quickbooks",
        fields=[
            Field(
                "access_token",
                "OAuth 访问令牌",
                secret=True,
                help="带 com.intuit.quickbooks.accounting 权限范围的 Intuit OAuth 令牌。每小时过期。",
            ),
            Field(
                "realm_id",
                "公司 ID（realm ID）",
                help="在 OAuth 授权时和开发者沙盒中显示。",
            ),
            Field(
                "environment",
                "环境",
                required=False,
                help="production（默认）或 sandbox。",
                placeholder="production",
            ),
        ],
        instructions=[
            "在 developer.intuit.com 创建一个应用，并针对你的公司完成授权（OAuth 沙盒可用于测试）。",
            "复制访问令牌和公司 ID（realm ID）并粘贴到下方。",
            "Intuit 访问令牌约一小时后过期。托管登录日后将替代此手动步骤。",
        ],
        validate=_validate_quickbooks,
    ),
    # -- placeholders (available=False) --------------------------------------------
    # Not yet shipped, but referenced by persona `recommends` (e.g. Ops → datadog/pagerduty) so
    # the GUI can render a brand badge + a "connect to enable" state. A placeholder has no fields,
    # no validate, and `available=False`, so there is no connect path (connect_connector rejects an
    # unavailable connector and _profile_connected reports it disconnected). github/hubspot are NOT
    # placeholders here — they already ship as real connectors above.
    ConnectorDescriptor(
        name="datadog",
        title="Datadog",
        icon="◍",
        blurb="拉取正在触发的告警、监控和事件时间线。",
        auth="none",
        two_way=False,
        fields=[],
        instructions=[],
        available=False,
        brand_color="#632ca6",
        logo="datadog",
    ),
    ConnectorDescriptor(
        name="salesforce",
        title="Salesforce",
        icon="☁",
        blurb="在 CRM 中读取和更新案例、客户和商机。",
        auth="none",
        two_way=False,
        fields=[],
        instructions=[],
        available=False,
        brand_color="#00a1e0",
        logo="salesforce",
    ),
    ConnectorDescriptor(
        name="docusign",
        title="Docusign",
        icon="✍",
        blurb="跟踪协议、查看信封状态并发送文档以供签名。",
        auth="oauth",
        two_way=False,
        brand_color="#4c00ff",
        logo="docusign",
        fields=[
            Field(
                "access_token",
                "OAuth 访问令牌",
                secret=True,
                help="来自 Docusign 应用的访问令牌（JWT 或授权码模式）。",
            ),
        ],
        instructions=[
            "在 Docusign 开发者控制台创建一个应用并完成 OAuth 授权。",
            "将访问令牌粘贴到下方；账户和 API 地址会自动发现。",
        ],
        validate=_validate_docusign,
        available=True,
    ),
    ConnectorDescriptor(
        name="clickup",
        title="ClickUp",
        icon="⌃",
        blurb="搜索任务和文档；创建和更新条目。",
        auth="api_token",
        two_way=False,
        brand_color="#7b68ee",
        logo="clickup",
        fields=[
            Field(
                "api_token",
                "个人 API 令牌",
                secret=True,
                help="ClickUp → Settings → Apps → API Token。",
                placeholder="pk_…",
            ),
        ],
        instructions=[
            "在 ClickUp 中打开 Settings → Apps 并生成个人 API 令牌。",
            "将其粘贴到下方。",
        ],
        validate=_validate_clickup,
        available=True,
    ),
    ConnectorDescriptor(
        name="google_drive",
        title="Google Drive",
        icon="◬",
        blurb="在 Google Drive 中搜索、浏览和读取文件。",
        auth="oauth",
        two_way=False,
        brand_color="#4285f4",
        logo="google_drive",
        fields=[
            Field(
                "access_token",
                "OAuth 访问令牌",
                secret=True,
                help="带 Drive 读取权限范围的 Google OAuth 令牌。",
            ),
        ],
        instructions=[
            "使用带 Drive 只读权限范围的 Google OAuth 访问令牌。",
            "将访问令牌粘贴到下方。",
        ],
        validate=_validate_google_drive,
        available=True,
        managed=True,
        managed_paused=True,  # same Google app as Gmail — paused until CASA clears
        # Key each connected account by its Google email (the broker's `account`
        # field) so multiple Drive accounts list the same way Gmail's do, rather
        # than by the opaque `sub` that account_field="account_id" would use.
        account_field="@identity",
    ),
    ConnectorDescriptor(
        name="canva",
        title="Canva",
        icon="◠",
        blurb="浏览、创建和导出设计。",
        auth="oauth",
        two_way=False,
        brand_color="#00c4cc",
        logo="canva",
        fields=[
            Field(
                "access_token",
                "OAuth 访问令牌",
                secret=True,
                help="来自 Canva Connect 集成的访问令牌。",
            ),
        ],
        instructions=[
            "在 canva.com/developers 创建一个 Connect 集成并完成 OAuth 授权。",
            "将访问令牌粘贴到下方。",
        ],
        validate=_validate_canva,
        available=True,
    ),
    ConnectorDescriptor(
        name="figma",
        title="Figma",
        icon="◐",
        blurb="读取设计文件和评论；导出素材。",
        auth="api_token",
        two_way=False,
        brand_color="#f24e1e",
        logo="figma",
        fields=[
            Field(
                "access_token",
                "个人访问令牌",
                secret=True,
                help="Figma → Settings → Security → Personal access tokens。",
                placeholder="figd_…",
            ),
        ],
        instructions=[
            "在 Figma 中打开 Settings → Security 并生成个人访问令牌。",
            "将其粘贴到下方。",
        ],
        validate=_validate_figma,
        available=True,
    ),
    ConnectorDescriptor(
        name="descript",
        title="Descript",
        icon="≣",
        blurb="通过转写文稿读取和编辑音视频项目。",
        auth="none",
        two_way=False,
        fields=[],
        instructions=[],
        available=False,
        brand_color="#0062ff",
        logo="descript",
    ),
    ConnectorDescriptor(
        name="clay",
        title="Clay",
        icon="⌒",
        blurb="丰富人员和公司信息；运行外联研究工作流。",
        auth="none",
        two_way=False,
        fields=[],
        instructions=[],
        available=False,
        brand_color="#1f2328",
        logo="clay",
    ),
    ConnectorDescriptor(
        name="close",
        title="Close",
        icon="❋",
        blurb="在 CRM 中读取和更新线索、联系人和商机。",
        auth="api_token",
        two_way=False,
        brand_color="#276392",
        logo="close",
        fields=[
            Field(
                "api_key",
                "API 密钥",
                secret=True,
                help="Close → Settings → Developer → API Keys。",
                placeholder="api_…",
            ),
        ],
        instructions=[
            "在 Close 中打开 Settings → Developer → API Keys 并创建一个密钥。",
            "将其粘贴到下方。",
        ],
        validate=_validate_close,
        available=True,
    ),
    ConnectorDescriptor(
        name="notion",
        title="Notion",
        icon="◰",
        blurb="搜索页面、阅读内容、查询数据库、创建页面。",
        auth="oauth",
        two_way=False,
        fields=[
            Field(
                "access_token",
                "集成密钥",
                secret=True,
                help="来自 notion.so/my-integrations 的内部集成；"
                "把需要它访问的页面共享给该集成。",
                placeholder="ntn_…",
            ),
        ],
        instructions=[
            "一键通过 OpenWorker Cloud 连接（推荐）。",
            "手动方式：在 notion.so/my-integrations 创建一个内部集成，",
            "复制其密钥，并将相关页面共享给该集成。",
        ],
        validate=_validate_notion,
        brand_color="#1f2328",
        logo="notion",
        managed=True,
        # Managed profiles key by the workspace id the broker sends
        # (account_id); a manual integration token falls back to the
        # validator's workspace name.
        account_field="account_id",
    ),
    ConnectorDescriptor(
        name="attio",
        title="Attio",
        icon="◵",
        blurb="读取你的 Attio CRM：对象、记录、备注。",
        auth="oauth",
        two_way=False,
        fields=[
            Field(
                "access_token",
                "API 密钥",
                secret=True,
                help="Workspace Settings → Developers → API keys。",
            ),
        ],
        instructions=[
            "一键通过 OpenWorker Cloud 连接（推荐）。",
            "手动方式：在 Workspace Settings → Developers 下创建一个 API 密钥。",
        ],
        validate=_validate_attio,
        brand_color="#2d7ff9",
        logo="attio",
        managed=True,
        account_field="account_id",
    ),
    ConnectorDescriptor(
        name="posthog",
        title="PostHog",
        icon="◫",
        blurb="查询产品分析：事件、漏斗、已保存的洞察。",
        auth="api_token",
        two_way=False,
        fields=[
            Field(
                "base_url",
                "PostHog URL",
                required=False,
                help="美国云留空即可；欧盟云或自托管请填写。",
                placeholder="https://us.posthog.com",
            ),
            Field(
                "api_key",
                "个人 API 密钥",
                secret=True,
                help="Settings → Personal API keys（只读权限即可）。",
                placeholder="phx_…",
            ),
            Field(
                "project_id",
                "项目 ID",
                help="Settings → Project → Project ID。更多项目作为额外账户添加。",
            ),
        ],
        instructions=[
            "在 PostHog 中打开 Settings → Personal API keys 并创建一个密钥。",
            "从 Settings → Project 复制你的项目 ID。",
            "每个账户对应一个项目——再次连接即可添加另一个项目。",
        ],
        validate=_validate_posthog,
        brand_color="#f54e00",
        logo="posthog",
        account_field="project_id",
    ),
    ConnectorDescriptor(
        name="mixpanel",
        title="Mixpanel",
        icon="◭",
        blurb="查询 Mixpanel 事件和分群分析。",
        auth="api_token",
        two_way=False,
        fields=[
            Field("username", "服务账号用户名", secret=False),
            Field("secret", "服务账号密钥", secret=True),
            Field(
                "project_id",
                "项目 ID",
                help="更多项目作为额外账户添加。",
            ),
        ],
        instructions=[
            "在 Mixpanel 中打开 Organization Settings → Service Accounts 并创建一个。",
            "复制用户名、密钥和你的项目 ID（Project Settings）。",
        ],
        validate=_validate_mixpanel,
        brand_color="#7856ff",
        logo="mixpanel",
        account_field="project_id",
    ),
    ConnectorDescriptor(
        name="amplitude",
        title="Amplitude",
        icon="∿",
        blurb="查询 Amplitude 图表数据：活跃用户、事件总量。",
        auth="api_token",
        two_way=False,
        fields=[
            Field(
                "api_key", "API 密钥", secret=True, help="Project Settings → API Keys。"
            ),
            Field("secret_key", "密钥", secret=True),
        ],
        instructions=[
            "在 Amplitude 中打开 Settings → Projects → 你的项目 → API Keys。",
            "复制 API 密钥和密钥。每个账户对应一个项目。",
        ],
        validate=_validate_amplitude,
        brand_color="#1e61f0",
        logo="amplitude",
        account_field="@identity",
    ),
    ConnectorDescriptor(
        name="apollo",
        title="Apollo.io",
        icon="☄",
        blurb="丰富人员和公司信息；搜索 B2B 数据库。",
        auth="api_token",
        two_way=False,
        fields=[
            Field(
                "api_key", "API 密钥", secret=True, help="Settings → Integrations → API。"
            ),
            Field(
                "label",
                "账户标签",
                required=False,
                help="为此账户命名（连接多个账户时使用）。",
                placeholder="work",
            ),
        ],
        instructions=[
            "在 Apollo 中打开 Settings → Integrations → API 并创建一个 API 密钥。",
            "丰富和搜索接口需要付费的 Apollo 套餐。",
        ],
        validate=_validate_apollo,
        brand_color="#fbbf24",
        logo="apollo",
        account_field="@identity",
    ),
    ConnectorDescriptor(
        name="hunter",
        title="Hunter",
        icon="✉",
        blurb="按域名查找和验证职业邮箱地址。",
        auth="api_token",
        two_way=False,
        fields=[
            Field(
                "api_key", "API 密钥", secret=True, help="hunter.io → API → API keys。"
            ),
        ],
        instructions=[
            "在 Hunter 中打开 API → API keys 并复制你的密钥。",
        ],
        validate=_validate_hunter,
        brand_color="#fa5320",
        logo="hunter",
        account_field="@identity",
    ),
    ConnectorDescriptor(
        name="pagerduty",
        title="PagerDuty",
        icon="◔",
        blurb="在呼叫前查看值班人员和活跃事件。",
        auth="none",
        two_way=False,
        fields=[],
        instructions=[],
        available=False,
        brand_color="#06ac38",
        logo="pagerduty",
    ),
]

_BY_NAME = {d.name: d for d in DESCRIPTORS}


def register_descriptor(descriptor: ConnectorDescriptor) -> None:
    """Register an extra connector (used by the experimental package and tests)."""
    DESCRIPTORS.append(descriptor)
    _BY_NAME[descriptor.name] = descriptor


# Experimental connectors live in a separate package so release builds can exclude the code
# entirely (see packaging/openworker-server.spec). When the package is absent this is a no-op.
try:
    from .experimental import EXPERIMENTAL_DESCRIPTORS as _EXPERIMENTAL
except ImportError:
    _EXPERIMENTAL = []
for _exp in _EXPERIMENTAL:
    _exp.experimental = True  # enforced here, not trusted from the author
    register_descriptor(_exp)


def list_descriptors() -> list[ConnectorDescriptor]:
    return list(DESCRIPTORS)


def get_descriptor(name: str) -> Optional[ConnectorDescriptor]:
    return _BY_NAME.get(name)
