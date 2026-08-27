import { useEffect, useRef, useState } from "react";
import type { SlackWorkspace } from "../../api";
import { currentLang } from "../../i18n/I18nProvider";
import zh from "../../i18n/zh.json";
import en from "../../i18n/en.json";

// UX-027: the post-connect "how mentions reach you" card. A tabbed carousel of
// animated split-scenes — Slack on the left (pinned to light-Slack colors, so it
// reads as a screenshot of Slack), OpenWorker on the right (app tokens). Tabs
// auto-advance through one full tour, then idle on a loop of the current scene;
// clicking a tab takes over. The chevron collapses the carousel to the status
// line — collapsed IS the seen-state (stored locally, survives restarts).
// "Listen to a channel" is deliberately absent: owner wants that scene reworked
// before it ships (UX-027 rev 4).

const KEY = "ocw.slack.howitworks.collapsed";
const DUR = 8000; // per-scene loop, ms
const TABS = ["slack.hiw_tab_mention", "slack.hiw_tab_threads", "slack.hiw_tab_teammates"];
const CAPTIONS = [
  "slack.hiw_cap_mention",
  "slack.hiw_cap_threads",
  "slack.hiw_cap_teammates",
];

type Dict = Record<string, string>;
const DICTS: Record<string, Dict> = { zh: zh as Dict, en: en as Dict };
const EN: Dict = en as Dict;
function tt(key: string, params?: Record<string, string | number>): string {
  const d = DICTS[currentLang()] ?? DICTS.zh;
  let raw = d[key] ?? EN[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) raw = raw.replace(`{${k}}`, String(v));
  return raw;
}

function readCollapsed(): boolean {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function SlackHowItWorks({ workspaces }: { workspaces: SlackWorkspace[] }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [tab, setTab] = useState(0);
  const [cycle, setCycle] = useState(0); // bump = remount the scene = restart its animations
  const tourRef = useRef(TABS.length); // auto-advances left in the one-time story tour

  useEffect(() => {
    if (collapsed) return;
    const timer = window.setTimeout(() => {
      if (tourRef.current > 1) {
        tourRef.current -= 1;
        setTab((x) => (x + 1) % TABS.length);
      } else {
        tourRef.current = 0;
        setCycle((c) => c + 1); // keep looping the current scene quietly
      }
    }, DUR);
    return () => window.clearTimeout(timer);
  }, [tab, cycle, collapsed]);

  const jump = (i: number) => {
    tourRef.current = 0; // a click takes over: no more auto-advance
    setTab(i);
    setCycle((c) => c + 1);
  };
  const toggle = () => {
    const v = !collapsed;
    setCollapsed(v);
    try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* best effort */ }
  };

  // Personalize when the install pre-added the connecting user (setup.py):
  // their workspace names the status line; the scenes call them by first name.
  const mine = workspaces.find(
    (w) => w.installer_user_id && w.allowed_users.includes(w.installer_user_id)
  );
  const ws = mine ?? workspaces[0];
  const meName =
    (mine &&
      (mine.installer_name ||
        mine.allowed_user_names?.[mine.installer_user_id ?? ""])) ||
    "You";
  const meFirst = meName.split(/\s+/)[0];
  const meInitial = (meName[0] || "Y").toUpperCase();

  return (
    // Rev 7 (owner): BORDERLESS — a proper section title + quiet status line;
    // the only boxes on screen are the two mini-windows, which own their frames.
    <div className="mb-5" data-testid="slack-howitworks">
      <div className="flex items-baseline gap-2.5">
        <h3 className="text-[13px] font-semibold tracking-tight">
          {tt("slack.hiw_title")}
        </h3>
        <button
          className="ml-auto shrink-0 inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-ink"
          data-testid="hiw-collapse"
          title={collapsed ? tt("slack.hiw_collapse_show") : tt("slack.hiw_collapse_hide")}
          onClick={toggle}
        >
          {collapsed ? tt("slack.hiw_show") : tt("slack.hiw_hide")}
          <span
            className="text-[9px] transition-transform"
            style={collapsed ? { transform: "rotate(-90deg)" } : undefined}
          >
            ▼
          </span>
        </button>
      </div>
      <div className="text-[12px] text-muted mt-0.5">
        <span className="text-ok font-bold">✓ </span>
        {tt("slack.hiw_ws_connected", { ws: ws?.account || tt("slack.hiw_ws_default") })}
        {mine ? tt("slack.hiw_on_list") : tt("slack.hiw_how")}
      </div>

      {!collapsed && (
        <div className="mt-3">
          <div className="flex gap-1 border-b border-line mb-3">
            {TABS.map((tabKey, i) => (
              <button
                key={tabKey}
                className={"hiw-tab" + (i === tab ? " on" : "")}
                data-testid={`hiw-tab-${i}`}
                style={{ "--hiw-dur": `${DUR}ms` } as React.CSSProperties}
                onClick={() => jump(i)}
              >
                {tt(tabKey)}
                <span className="hiw-prog"><i /></span>
              </button>
            ))}
          </div>

          <div className="hiw-scene hiw-play" key={`${tab}:${cycle}`} data-testid="hiw-scene">
            {tab === 0 && <SceneMention meFirst={meFirst} meInitial={meInitial} />}
            {tab === 1 && <SceneThread meFirst={meFirst} meInitial={meInitial} />}
            {tab === 2 && <SceneTeammates />}
          </div>
          <div className="mt-2.5 text-[12px] text-muted" data-testid="hiw-caption">
            {tt(CAPTIONS[tab])}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- shared miniature furniture ---- */

// The scenes deliberately play in a FICTIONAL workspace ("Lumina Labs") — a real
// account name here (or anything resembling our own product) reads as confusing
// or fake in an educational animation; the card's status line above keeps the
// user's real workspace name.
const WS_NAME = "Lumina Labs";

/* Post-it notes (rev 7, owner-approved): the concept in five hand-written words,
   slapped onto the scene at its beat; they fade out near the end of each loop so
   they read as annotation, never as UI. */
function Sticky({
  d: delay, r, pos, children,
}: {
  d: string; r?: boolean; pos: React.CSSProperties; children: React.ReactNode;
}) {
  return (
    <div
      className={"hiw-sticky hiw-k" + (r ? " r" : "")}
      style={{ "--d": delay, ...pos } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

const ThreadsIcon = () => (
  <svg className="hiw-ic" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21 11.5a8.5 8.5 0 1 1-4.7-7.6L21 3l-.9 4.7a8.5 8.5 0 0 1 .9 3.8z" />
    <path d="M8 10h8M8 14h5" />
  </svg>
);
const SendIcon = () => (
  <svg className="hiw-ic" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22 2 11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

function SlackRail({ active }: { active: string }) {
  return (
    <div className="hiw-slrail">
      <div className="hiw-ws">{WS_NAME} ▾</div>
      <div className="hiw-slnav"><ThreadsIcon /> {tt("slack.hiw_threads")}</div>
      <div className="hiw-slnav"><SendIcon /> {tt("slack.hiw_drafts")}</div>
      <div className="hiw-sect">{tt("slack.hiw_channels")}</div>
      <div className={"hiw-ch" + (active === "general" ? " on" : "")}># general</div>
      <div className={"hiw-ch" + (active === "launch-room" ? " on" : "")}># launch-room</div>
      <div className="hiw-sect">{tt("slack.hiw_dms")}</div>
      <div className="hiw-slnav"><span className="hiw-pres" />Priya N</div>
      <div className="hiw-slnav"><span className="hiw-pres" />Emma W</div>
      <div className="hiw-sect">{tt("slack.hiw_agents_apps")}</div>
      <div className="hiw-slnav"><span className="hiw-appav">OW</span>OpenWorker</div>
    </div>
  );
}

function SlackWin({ children }: { children: React.ReactNode }) {
  return (
    <div className="hiw-win hiw-sl">
      <div className="hiw-sltop">
        <span className="hiw-dots"><i /><i /><i /></span>
        <span className="hiw-slsearch">{tt("slack.hiw_search_ph")}</span>
      </div>
      <div className="hiw-slbody">{children}</div>
    </div>
  );
}

/* Slack's two-row message box: formatting toolbar, then + / placeholder / send. */
function SlackComposer({ placeholder }: { placeholder: string }) {
  return (
    <div className="hiw-slcomposer">
      <div className="hiw-slctools">
        <b>B</b><i>I</i><u>U</u><s>S</s><span>⛓</span><span>≔</span><span>≡</span><span>{"</>"}</span>
      </div>
      <div className="hiw-slcrow">
        <span className="hiw-plus">＋</span> {placeholder}
        <span className="hiw-send">➤</span>
      </div>
    </div>
  );
}

function SlackDate({ label }: { label: string }) {
  return (
    <div className="hiw-sldate">
      <span>{label} ▾</span>
    </div>
  );
}

function OwWin({ children }: { children: React.ReactNode }) {
  return (
    <div className="hiw-win hiw-ow">
      <div className="hiw-owtop">
        <span className="hiw-dots"><i /><i /><i /></span> OpenWorker
      </div>
      <div className="hiw-owbody">{children}</div>
    </div>
  );
}

function OwRail({ hot, hotSub, glow }: { hot?: string; hotSub?: string; glow?: boolean }) {
  return (
    <div className="hiw-owrail">
      <div className="hiw-brand">OpenWorker</div>
      <div className="hiw-newbtn">{tt("slack.hiw_new_session")}</div>
      <div className="hiw-ownav">{tt("slack.hiw_search")}</div>
      <div className="hiw-ownav">{tt("slack.hiw_automations")}</div>
      <div className="hiw-sect">{tt("slack.hiw_recent")}</div>
      {hot && (
        <div
          className={"hiw-sess hot" + (glow ? " hiw-glow hiw-k" : " hiw-stay")}
          style={glow ? ({ "--d": "2.5s", "--g": "2.9s" } as React.CSSProperties) : undefined}
        >
          <b>{hot}</b>
          {hotSub}
        </div>
      )}
      <div className="hiw-sess"><b>{tt("slack.hiw_session_jira")}</b>Coworker</div>
    </div>
  );
}

const d = (delay: string, extra?: Record<string, string>) =>
  ({ "--d": delay, ...extra } as React.CSSProperties);

function Msg({
  av, avBg, name, ts, app, children, delay, extra,
}: {
  av: string; avBg: string; name: string; ts: string; app?: boolean;
  children: React.ReactNode; delay?: string; extra?: React.ReactNode;
}) {
  return (
    <div className={"hiw-slm" + (delay ? " hiw-k" : "")} style={delay ? d(delay) : undefined}>
      <span className="hiw-sav" style={{ background: avBg }}>{av}</span>
      <span className="min-w-0">
        <span className="hiw-nm">{name}{app && <span className="hiw-appb">APP</span>}</span>
        <span className="hiw-ts">{ts}</span>
        <br />
        <span>{children}</span>
        {extra}
      </span>
    </div>
  );
}

/* ---- scene 1: mention in a channel → new session, reply via thread panel ---- */
function SceneMention({ meFirst, meInitial }: { meFirst: string; meInitial: string }) {
  return (
    <>
      <span className="hiw-spark" style={d("1.9s")} />
      <Sticky d="3.1s" pos={{ left: "51%", top: "8%" }}>{tt("slack.hiw_sticky_mention1")}</Sticky>
      <Sticky d="5.8s" r pos={{ left: "27%", bottom: "5%" }}>{tt("slack.hiw_sticky_mention2")}</Sticky>
      <SlackWin>
        <SlackRail active="launch-room" />
        <div className="hiw-slmain">
          <div className="hiw-slhead"># launch-room <span className="hiw-sub">{tt("slack.hiw_members", { n: 24 })}</span></div>
          <div className="hiw-slmsgs">
            <SlackDate label={tt("slack.hiw_today")} />
            <Msg av="P" avBg="#7c6cd0" name="Priya N" ts="6:31 PM">
              {tt("slack.hiw_signups_spike")}
            </Msg>
            <Msg
              av={meInitial} avBg="#3b82c4" name={meFirst} ts="6:33 PM" delay=".8s"
              extra={
                <span className="hiw-replybar hiw-k" style={d("4.6s")}>
                  <span className="hiw-sav2">OW</span> {tt("slack.hiw_1_reply")}
                  <span className="hiw-later">{tt("slack.hiw_today_at", { time: "6:34 PM" })}</span>
                </span>
              }
            >
              <span className="hiw-men">@OpenWorker</span> {tt("slack.hiw_summarize")}
            </Msg>
          </div>
          <SlackComposer placeholder={tt("slack.hiw_msg_chan", { chan: "#launch-room" })} />
          <div className="hiw-slthread hiw-k" style={d("5.1s")}>
            <div className="hiw-th">{tt("slack.hiw_thread")} <span className="hiw-sub"># launch-room</span><span className="hiw-x">✕</span></div>
            <div className="hiw-tmsgs">
              <Msg av={meInitial} avBg="#3b82c4" name={meFirst} ts="6:33 PM">
                <span className="hiw-men">@OpenWorker</span> {tt("slack.hiw_summarize")}
              </Msg>
              <div className="hiw-cnt">{tt("slack.hiw_1_reply")}</div>
              <Msg av="OW" avBg="#4a154b" name="OpenWorker" app ts="6:34 PM">
                {tt("slack.hiw_launch_traction")}
              </Msg>
            </div>
            <div className="hiw-treply">{tt("slack.hiw_reply")}</div>
          </div>
        </div>
      </SlackWin>
      <OwWin>
        <OwRail hot={tt("slack.hiw_summarize")} hotSub={tt("slack.hiw_via_slack_now")} glow />
        <div className="hiw-owmain">
          <div className="hiw-owtitle hiw-k" style={d("2.6s")}>
            {tt("slack.hiw_summarize")} <span className="hiw-via">{tt("slack.hiw_via_slack")}</span>
          </div>
          <div className="hiw-owchat">
            <div className="hiw-bub user hiw-k" style={d("2.8s")}>@OpenWorker {tt("slack.hiw_summarize")}</div>
            <div className="hiw-bub agent hiw-k" style={d("3.6s")}>
              {tt("slack.hiw_reading")}<i>{tt("slack.hiw_replying")}</i>
            </div>
          </div>
          <div className="hiw-owcomposer">{tt("slack.hiw_msg_ow")}</div>
        </div>
      </OwWin>
    </>
  );
}

/* ---- scene 2: mention INSIDE the open thread panel → the same session ---- */
function SceneThread({ meFirst, meInitial }: { meFirst: string; meInitial: string }) {
  return (
    <>
      <span className="hiw-spark" style={d("1.9s")} />
      <Sticky d="3.2s" r pos={{ left: "52%", top: "10%" }}>{tt("slack.hiw_sticky_thread1")}</Sticky>
      <SlackWin>
        <SlackRail active="launch-room" />
        <div className="hiw-slmain">
          <div className="hiw-slhead"># launch-room <span className="hiw-sub">{tt("slack.hiw_members", { n: 24 })}</span></div>
          <div className="hiw-slmsgs">
            <SlackDate label={tt("slack.hiw_today")} />
            <Msg av="P" avBg="#7c6cd0" name="Priya N" ts="6:31 PM">
              {tt("slack.hiw_signups_spike")}
            </Msg>
            <Msg
              av={meInitial} avBg="#3b82c4" name={meFirst} ts="6:33 PM"
              extra={
                <span className="hiw-replybar">
                  <span className="hiw-sav2">OW</span> {tt("slack.hiw_n_replies", { n: 2 })}
                  <span className="hiw-later">{tt("slack.hiw_today_at", { time: "6:36 PM" })}</span>
                </span>
              }
            >
              <span className="hiw-men">@OpenWorker</span> {tt("slack.hiw_summarize")}
            </Msg>
          </div>
          <SlackComposer placeholder={tt("slack.hiw_msg_chan", { chan: "#launch-room" })} />
          {/* thread panel open from the start — the new mentions play INSIDE it */}
          <div className="hiw-slthread">
            <div className="hiw-th">{tt("slack.hiw_thread")} <span className="hiw-sub"># launch-room</span><span className="hiw-x">✕</span></div>
            <div className="hiw-tmsgs">
              <Msg av={meInitial} avBg="#3b82c4" name={meFirst} ts="6:33 PM">
                <span className="hiw-men">@OpenWorker</span> {tt("slack.hiw_summarize")}
              </Msg>
              <div className="hiw-cnt">{tt("slack.hiw_n_replies", { n: 2 })}</div>
              <Msg av="OW" avBg="#4a154b" name="OpenWorker" app ts="6:34 PM">
                {tt("slack.hiw_launch_traction_short")}
              </Msg>
              <Msg av="P" avBg="#7c6cd0" name="Priya N" ts="6:36 PM" delay=".8s">
                <span className="hiw-men">@OpenWorker</span> {tt("slack.hiw_break_down")}
              </Msg>
              <Msg av="OW" avBg="#4a154b" name="OpenWorker" app ts="6:36 PM" delay="4.8s">
                {tt("slack.hiw_top_countries_short")}
              </Msg>
            </div>
            <div className="hiw-treply">{tt("slack.hiw_reply")}</div>
          </div>
        </div>
      </SlackWin>
      <OwWin>
        <div className="hiw-owrail">
          <div className="hiw-brand">OpenWorker</div>
          <div className="hiw-newbtn">{tt("slack.hiw_new_session")}</div>
          <div className="hiw-ownav">{tt("slack.hiw_search")}</div>
          <div className="hiw-ownav">{tt("slack.hiw_automations")}</div>
          <div className="hiw-sect">{tt("slack.hiw_recent")}</div>
          <div className="hiw-sess hot hiw-stay hiw-glow" style={{ "--g": "2.4s" } as React.CSSProperties}>
            <b>{tt("slack.hiw_summarize")}</b>{tt("slack.hiw_via_slack")}
          </div>
          <div className="hiw-sess"><b>{tt("slack.hiw_session_jira")}</b>Coworker</div>
        </div>
        <div className="hiw-owmain">
          <div className="hiw-owtitle">
            {tt("slack.hiw_summarize")} <span className="hiw-via">{tt("slack.hiw_via_slack_same")}</span>
          </div>
          <div className="hiw-owchat">
            <div className="hiw-bub agent hiw-stay">…{tt("slack.hiw_reading")}</div>
            <div className="hiw-bub user hiw-k" style={d("2.6s")}>{tt("slack.hiw_break_down")}</div>
            <div className="hiw-bub agent hiw-k" style={d("3.8s")}>
              {tt("slack.hiw_top_countries")}
            </div>
          </div>
          <div className="hiw-owcomposer">{tt("slack.hiw_msg_ow")}</div>
        </div>
      </OwWin>
    </>
  );
}

/* ---- scene 3: a teammate's first mention waits for your OK ---- */
function SceneTeammates() {
  return (
    <>
      <span className="hiw-spark" style={d("1.9s")} />
      <Sticky d="3.4s" pos={{ left: "53%", bottom: "10%" }}>{tt("slack.hiw_sticky_teammates1")}</Sticky>
      <SlackWin>
        <SlackRail active="launch-room" />
        <div className="hiw-slmain">
          <div className="hiw-slhead"># launch-room <span className="hiw-sub">{tt("slack.hiw_members", { n: 24 })}</span></div>
          <div className="hiw-slmsgs">
            <SlackDate label={tt("slack.hiw_today")} />
            <Msg
              av="P" avBg="#7c6cd0" name="Priya N" ts="6:41 PM" delay=".7s"
              extra={
                <span className="hiw-replybar hiw-k" style={d("5.6s")}>
                  <span className="hiw-sav2">OW</span> {tt("slack.hiw_1_reply")}
                  <span className="hiw-later">{tt("slack.hiw_after_allow")}</span>
                </span>
              }
            >
              <span className="hiw-men">@OpenWorker</span> {tt("slack.hiw_pull_numbers")}
            </Msg>
          </div>
          <SlackComposer placeholder={tt("slack.hiw_msg_chan", { chan: "#launch-room" })} />
        </div>
      </SlackWin>
      <OwWin>
        <OwRail hot={tt("slack.hiw_summarize")} hotSub={tt("slack.hiw_via_slack")} />
        <div className="hiw-owmain">
          <div className="hiw-owtitle">Slack — {WS_NAME}</div>
          <div className="hiw-waitrow hiw-k hiw-glow" style={d("2s", { "--g": "2.5s" })}>
            <span className="min-w-0"><b>Priya N</b>{tt("slack.hiw_waiting")}</span>
            <span className="hiw-allowbtn ml-auto">{tt("slack.hiw_allow_deliver")}</span>
          </div>
          <div className="hiw-waitcap hiw-k" style={d("3.4s")}>
            {tt("slack.hiw_wait_cap")}
          </div>
        </div>
      </OwWin>
    </>
  );
}
