// ConnectorMessageCard — renders a connector-delivered inbound message (§3.3) as a structured card:
// a brand-tinted header (ConnectorBadge + channel/sender names + relative time + "via {label}") over
// the raw message body, with a brand-colored left edge. Pure presentational; generalizes to any
// connector via the Phase-1 registry — no Slack special-casing.
//
// Brand color/logo: the message `source` (§3.1) carries only the `connector` id, not visuals. The
// logo + label resolve from the connector registry by that id (FALLBACK plug glyph for unknown ids);
// the brand color isn't in the source, so it comes from an optional `brandColor` prop and otherwise
// falls back to the registry's neutral gray (the descriptor's `brand_color` is the source of truth,
// so callers that have the connector list can thread the real color through later).
//
// Id-on-hover swap: hovering (or focusing) the header replaces the resolved names with
// `channel_id · sender_id`. Driven by React state (not CSS :hover) so the swap is testable and works
// for keyboard focus too; the ids are also mirrored into the header `title` for quick reference.

import { useState, type CSSProperties } from "react";
import type { MessageSource } from "../api";
import { ConnectorBadge, hexToRgba, NEUTRAL } from "../connectors/ConnectorIcon";
import { resolveConnector } from "../connectors/registry";
import { currentLang } from "../i18n/I18nProvider";
import zh from "../i18n/zh.json";
import en from "../i18n/en.json";

type Dict = Record<string, string>;
const DICTS: Record<string, Dict> = { zh: zh as Dict, en: en as Dict };
const EN: Dict = en as Dict;

function tt(key: string, params?: Record<string, string | number>): string {
  const d = DICTS[currentLang()] ?? DICTS.zh;
  const raw = d[key] ?? EN[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? String(params[k]) : `{${k}}`));
}

/** Coarse relative time from epoch seconds: "just now" / "5m ago" / "2h ago" / "3d ago" / a date. */
function relativeTime(tsSeconds: number): string {
  if (!tsSeconds || !isFinite(tsSeconds)) return "";
  const then = tsSeconds * 1000;
  const diff = Date.now() - then;
  if (diff < 0) return tt("connector.just_now");
  if (diff < 45_000) return tt("connector.just_now");
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return tt("connector.minutes_ago", { n: mins });
  const hrs = Math.round(diff / 3_600_000);
  if (hrs < 24) return tt("connector.hours_ago", { n: hrs });
  const days = Math.round(diff / 86_400_000);
  if (days < 7) return tt("connector.days_ago", { n: days });
  return new Date(then).toLocaleDateString();
}

/** Absolute clock time (for the time element's title), e.g. "2:14 PM". */
function clockTime(tsSeconds: number): string {
  if (!tsSeconds || !isFinite(tsSeconds)) return "";
  return new Date(tsSeconds * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function ConnectorMessageCard({
  source,
  brandColor,
}: {
  source: MessageSource;
  brandColor?: string;
}) {
  const [showIds, setShowIds] = useState(false);
  const { key, entry } = resolveConnector(source.connector);
  const color = (brandColor || "").trim() || NEUTRAL;
  const soft = hexToRgba(color, 0.12) || "var(--line)";
  // Only the brand custom props on the article (NOT `color`, so the body keeps normal text color);
  // the header/channel pull `var(--brand)` and the badge computes its own tint from the prop.
  const styleVars = { ["--brand"]: color, ["--brand-soft"]: soft } as CSSProperties;
  const ids = `${source.channel_id} · ${source.sender_id}`;

  const reveal = () => setShowIds(true);
  const hide = () => setShowIds(false);

  return (
    <article
      className="connector-card rounded-xl2 border border-line bg-panel overflow-hidden"
      data-brand={key}
      style={styleVars}
    >
      <header
        className="connector-card-head flex items-center gap-2 px-3.5 py-2 border-b border-line outline-none"
        tabIndex={0}
        onMouseEnter={reveal}
        onMouseLeave={hide}
        onFocus={reveal}
        onBlur={hide}
        title={ids}
        style={{ background: "var(--brand-soft)" }}
      >
        <ConnectorBadge connector={{ logo: source.connector, brand_color: color }} size={20} title={entry.label} />
        {showIds ? (
          <span className="font-mono text-[12px] text-faint">{ids}</span>
        ) : (
          <>
            <span className="text-[13px] font-semibold" style={{ color: "var(--brand)" }}>
              {source.channel_name}
            </span>
            <span className="text-faint">·</span>
            <span className="text-[13px] font-medium">{source.sender_name}</span>
            <span className="text-[11px] text-faint ml-0.5">{tt("connector.via", { label: entry.label })}</span>
          </>
        )}
        <time className="ml-auto text-[11px] text-faint whitespace-nowrap" title={clockTime(source.ts)}>
          {relativeTime(source.ts)}
        </time>
      </header>
      <div className="px-3.5 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap">{source.text}</div>
    </article>
  );
}
